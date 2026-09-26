import type { PlayerSlot } from '../sim/Entity';
import type { RoomPlayer } from './protocol';
import type { VoiceCall, VoicePeer } from './transport';

/**
 * Chat de voz da sala: todos falam com todos e todos ouvem todos. Cada par de aparelhos tem uma chamada de áudio
 * direta (malha); os dados do jogo continuam passando pelo anfitrião. Cada aparelho sempre envia uma trilha:
 * silêncio com o microfone desligado e o microfone quando ligado (a troca não religa as chamadas).
 */

/** Nível (amplitude 0..1) a partir do qual alguém está falando. */
export const SPEAK_LEVEL = 0.02;
/** Depois de parar de falar, o indicador fica aceso mais um pouco (não pisca entre as palavras). */
export const SPEAK_HOLD = 0.35;
/** Chamada que não trouxe áudio nesse tempo é desfeita e tentada de novo. */
const CONNECT_MS = 15000;
/** Chamada de alguém que ainda não aparece na lista da sala (a lista pode chegar depois da chamada). */
const GRACE_MS = 10000;
const RETRY_MIN_MS = 1500;
const RETRY_MAX_MS = 20000;
const TICK_MS = 50;

export interface VoiceMember {
  slot: PlayerSlot;
  pid: string;
}

/**
 * Quem liga para quem: em cada par, o de slot menor liga e o outro atende. Devolve para quem ligar agora (ainda sem
 * chamada) e quais chamadas desfazer (quem saiu da sala).
 */
export function callPlan(
  members: readonly VoiceMember[],
  me: PlayerSlot,
  connected: Iterable<string>,
): { call: string[]; close: string[] } {
  const mine = members.find((m) => m.slot === me)?.pid;
  const ids = new Set(members.map((m) => m.pid));
  const have = new Set(connected);
  return {
    call: members.filter((m) => m.slot > me && m.pid !== mine && !have.has(m.pid)).map((m) => m.pid),
    close: [...have].filter((id) => !ids.has(id)),
  };
}

/** Amplitude média (RMS) de um trecho de áudio (amostras de −1 a 1). */
export function rms(samples: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < samples.length; i++) s += samples[i]! * samples[i]!;
  return samples.length ? Math.sqrt(s / samples.length) : 0;
}

/**
 * Nível médio entre duas leituras da energia acumulada do WebRTC (`totalAudioEnergy` / `totalSamplesDuration`):
 * pega até um som curto que caiu entre as leituras. null na primeira leitura ou se o contador voltou.
 */
export function levelBetween(
  prev: { energy: number; duration: number } | null,
  cur: { energy: number; duration: number },
): number | null {
  if (!prev) return null;
  const d = cur.duration - prev.duration;
  if (d <= 0) return d === 0 ? 0 : null;
  return Math.sqrt(Math.max(0, cur.energy - prev.energy) / d);
}

/** "Está falando": acende acima do limiar e segura um pouco depois que a voz para. */
export class SpeakingDetector {
  speaking = false;
  private hold = 0;

  update(level: number, dt: number): boolean {
    this.hold = level >= SPEAK_LEVEL ? SPEAK_HOLD : Math.max(0, this.hold - dt);
    this.speaking = this.hold > 0;
    return this.speaking;
  }

  reset(): void {
    this.hold = 0;
    this.speaking = false;
  }
}

/** Por que o microfone não ligou. */
export type MicProblem =
  /** A pessoa (ou o aparelho) não deu permissão. */
  | 'denied'
  /** Nenhum microfone encontrado. */
  | 'no-mic'
  /** Outro app está usando o microfone. */
  | 'busy'
  /** Página sem HTTPS: o navegador não deixa usar o microfone. */
  | 'insecure'
  /** Navegador sem suporte. */
  | 'unsupported'
  | 'error';

/** Estado da permissão do microfone antes de pedir (quando o navegador informa). */
export type MicPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

/** Traduz o erro do `getUserMedia` num problema que dá para explicar. */
export function micProblem(e: unknown): MicProblem {
  const name = (e as { name?: string } | null)?.name ?? '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'no-mic';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'busy';
    case 'TypeError':
      return 'unsupported';
    default:
      return 'error';
  }
}

type SessionType = 'auto' | 'play-and-record';

/** iPhone (Safari 16.4+): com o microfone ligado, o áudio da página grava e toca ao mesmo tempo. */
function setAudioSession(type: SessionType): void {
  const s = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  try {
    if (s && s.type !== type) s.type = type;
  } catch {
    /* sem suporte */
  }
}

interface Remote {
  pid: string;
  call: VoiceCall;
  since: number;
  stream: MediaStream | null;
  audio: HTMLAudioElement | null;
  det: SpeakingDetector;
  /** Só quando o navegador não informa o nível do áudio recebido. */
  analyser: AnalyserNode | null;
  src: MediaStreamAudioSourceNode | null;
  /** Última leitura da energia acumulada (null = ainda não leu, ou o navegador não informa). */
  energy: { energy: number; duration: number } | null;
  /** Estatísticas indisponíveis neste navegador: usa o nível instantâneo. */
  noStats: boolean;
  reading: boolean;
  at: number;
}

export interface VoiceState {
  mic: boolean;
  starting: boolean;
  permission: MicPermission;
  problem: MicProblem | null;
  peers: number;
  speaking: PlayerSlot[];
  blocked: boolean;
}

export class VoiceChat {
  /** Microfone ligado (a voz está indo para a sala). */
  micOn = false;
  /** Pedindo o microfone ao aparelho. */
  starting = false;
  problem: MicProblem | null = null;
  permission: MicPermission = 'unknown';
  /** O navegador bloqueou o som das vozes até um toque na tela (iPhone principalmente). */
  blocked = false;
  /** Algo que a tela mostra mudou (microfone, quem fala, conexões, permissão). */
  onChange: (() => void) | null = null;
  /** Outra pessoa começou/parou de falar (a música abaixa). */
  onTalking: ((on: boolean) => void) | null = null;

  private remotes = new Map<string, Remote>();
  private members: VoiceMember[] = [];
  private slots = new Map<string, PlayerSlot>();
  private retry = new Map<string, { at: number; wait: number }>();
  private ctx: AudioContext | null = null;
  private silent: MediaStreamTrack | null = null;
  private mic: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micSrc: MediaStreamAudioSourceNode | null = null;
  /** Muda a cada pedido/desligamento do microfone: um pedido antigo que responde depois é descartado. */
  private micToken = 0;
  private meDet = new SpeakingDetector();
  private buf: Float32Array<ArrayBuffer> | null = null;
  private timer: ReturnType<typeof setInterval>;
  private ticks = 0;
  private talking = false;
  private volume = 1;
  private muted = false;
  private disposed = false;
  private box: HTMLElement;
  private lastKey = '';

  /** O aparelho consegue participar da voz (ouvir e mandar áudio pela internet). */
  static supported(): boolean {
    return (
      typeof RTCPeerConnection !== 'undefined' &&
      typeof MediaStream !== 'undefined' &&
      typeof AudioContext !== 'undefined'
    );
  }

  constructor(
    private peer: VoicePeer,
    private code: string,
    readonly mySlot: PlayerSlot,
    private now: () => number = () => performance.now(),
  ) {
    this.box = document.createElement('div');
    this.box.className = 'voice-audio';
    this.box.hidden = true;
    document.body.appendChild(this.box);
    peer.onCall = (c) => this.incoming(c);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    for (const ev of ['pointerdown', 'touchend', 'click', 'keydown'])
      addEventListener(ev, this.unlock, { capture: true, passive: true });
    void this.watchPermission();
  }

  /** Quem está na sala agora (com o id de voz de cada aparelho). */
  setMembers(players: readonly RoomPlayer[]): void {
    this.members = players.filter((p) => !!p.pid).map((p) => ({ slot: p.slot, pid: p.pid! }));
    this.slots = new Map(this.members.map((m) => [m.pid, m.slot]));
    for (const pid of [...this.retry.keys()]) if (!this.slots.has(pid)) this.retry.delete(pid);
    this.plan();
    this.changed();
  }

  /** Liga ou desliga o microfone. Devolve se ficou como pedido. */
  async setMic(on: boolean): Promise<boolean> {
    if (this.disposed) return false;
    if (!on) {
      this.stopMic();
      this.changed();
      return true;
    }
    if (this.micOn) return true;
    if (this.starting) return false;
    const md = navigator.mediaDevices;
    if (!md?.getUserMedia) {
      this.problem = globalThis.isSecureContext === false ? 'insecure' : 'unsupported';
      this.changed();
      return false;
    }
    this.starting = true;
    this.problem = null;
    const token = ++this.micToken;
    this.changed();
    this.resumeCtx();
    setAudioSession('play-and-record');
    try {
      const s = await md.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const track = s.getAudioTracks()[0];
      // desligou (ou saiu da sala) enquanto o aparelho pedia a permissão
      if (this.disposed || token !== this.micToken) {
        for (const t of s.getTracks()) t.stop();
        return false;
      }
      if (!track) {
        for (const t of s.getTracks()) t.stop();
        throw Object.assign(new Error('no track'), { name: 'NotFoundError' });
      }
      this.mic = s;
      // microfone desconectado ou permissão retirada no meio
      track.addEventListener('ended', () => {
        if (this.mic === s) {
          this.stopMic();
          this.changed();
        }
      });
      for (const r of this.remotes.values()) r.call.replaceTrack(track);
      this.listenMic(s);
      this.micOn = true;
      this.permission = 'granted';
    } catch (e) {
      if (token === this.micToken) {
        setAudioSession('auto');
        this.problem = micProblem(e);
        if (this.problem === 'denied') this.permission = 'denied';
      }
    } finally {
      if (token === this.micToken) this.starting = false;
      if (!this.disposed) this.changed();
    }
    return this.micOn;
  }

  /** Alguém está falando agora (este aparelho inclusive, com o microfone ligado). */
  speaking(slot: PlayerSlot): boolean {
    if (slot === this.mySlot) return this.micOn && this.meDet.speaking;
    for (const r of this.remotes.values()) if (this.slots.get(r.pid) === slot && r.det.speaking) return true;
    return false;
  }

  /** Pessoas com o áudio chegando. */
  get peers(): number {
    let n = 0;
    for (const r of this.remotes.values()) if (r.stream) n++;
    return n;
  }

  /** Volume das vozes recebidas (0..1) e "silenciar tudo". */
  setVolume(v: number, muted: boolean): void {
    this.volume = Math.max(0, Math.min(1, v));
    this.muted = muted;
    for (const r of this.remotes.values()) this.applyVolume(r);
  }

  state(): VoiceState {
    return {
      mic: this.micOn,
      starting: this.starting,
      permission: this.permission,
      problem: this.problem,
      peers: this.peers,
      speaking: this.members.map((m) => m.slot).filter((s) => this.speaking(s)),
      blocked: this.blocked,
    };
  }

  /** Toque na tela: libera o som das vozes (e o contexto de áudio) quando o navegador tinha bloqueado. */
  readonly unlock = (): void => {
    if (this.disposed) return;
    this.resumeCtx();
    if (!this.blocked) return;
    for (const r of this.remotes.values()) if (r.audio) this.play(r);
  };

  dispose(): void {
    if (this.disposed) return;
    this.stopMic();
    this.disposed = true;
    clearInterval(this.timer);
    if (this.peer.onCall) this.peer.onCall = null;
    for (const ev of ['pointerdown', 'touchend', 'click', 'keydown'])
      removeEventListener(ev, this.unlock, { capture: true });
    for (const pid of [...this.remotes.keys()]) this.drop(pid);
    if (this.talking) this.onTalking?.(false);
    this.silent?.stop();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.box.remove();
    this.onChange = null;
  }

  // ------------------------------------------------------------------ interno

  private changed(): void {
    this.onChange?.();
  }

  private async watchPermission(): Promise<void> {
    try {
      const st = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (this.disposed) return;
      const set = () => {
        this.permission = st.state === 'granted' || st.state === 'denied' ? st.state : 'prompt';
        if (this.permission === 'denied' && this.micOn) this.stopMic();
        this.changed();
      };
      st.addEventListener('change', set);
      set();
    } catch {
      /* navegador não informa: descobre ao pedir */
    }
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx || this.disposed) return this.ctx;
    try {
      this.ctx = new AudioContext();
    } catch {
      return null;
    }
    return this.ctx;
  }

  private resumeCtx(): void {
    const c = this.ensureCtx();
    if (c && c.state !== 'running' && c.state !== 'closed') void c.resume().catch(() => {});
  }

  /** Trilha de silêncio: vai nas chamadas enquanto o microfone está desligado. */
  private silentTrack(): MediaStreamTrack | null {
    if (this.silent && this.silent.readyState === 'live') return this.silent;
    const c = this.ensureCtx();
    if (!c) return null;
    this.silent = c.createMediaStreamDestination().stream.getAudioTracks()[0] ?? null;
    return this.silent;
  }

  private currentTrack(): MediaStreamTrack | null {
    const t = this.mic?.getAudioTracks()[0];
    return this.micOn && t && t.readyState === 'live' ? t : this.silentTrack();
  }

  private stopMic(): void {
    const s = this.mic;
    this.micToken++;
    this.starting = false;
    this.mic = null;
    this.micOn = false;
    this.meDet.reset();
    this.micSrc?.disconnect();
    this.micSrc = null;
    this.micAnalyser = null;
    if (s) {
      const silent = this.silentTrack();
      if (silent) for (const r of this.remotes.values()) r.call.replaceTrack(silent);
      // a luz de "gravando" do aparelho apaga
      for (const t of s.getTracks()) t.stop();
    }
    setAudioSession('auto');
  }

  private listenMic(s: MediaStream): void {
    const c = this.ensureCtx();
    if (!c) return;
    try {
      this.micSrc = c.createMediaStreamSource(s);
      this.micAnalyser = c.createAnalyser();
      // ~43 ms de áudio por leitura (lida a cada 50 ms)
      this.micAnalyser.fftSize = 2048;
      this.micSrc.connect(this.micAnalyser);
    } catch {
      this.micSrc = null;
      this.micAnalyser = null;
    }
  }

  private level(a: AnalyserNode): number {
    if (!this.buf || this.buf.length !== a.fftSize) this.buf = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(this.buf);
    return rms(this.buf);
  }

  private remoteLevel(r: Remote): number {
    const lv = r.call.audioLevel();
    if (lv !== null) return lv;
    if (!r.analyser && r.stream && this.ctx?.state === 'running') {
      try {
        r.src = this.ctx.createMediaStreamSource(r.stream);
        r.analyser = this.ctx.createAnalyser();
        r.analyser.fftSize = 2048;
        r.src.connect(r.analyser);
      } catch {
        return 0;
      }
    }
    return r.analyser ? this.level(r.analyser) : 0;
  }

  /** Nível de quem está do outro lado desde a última leitura (energia acumulada; senão, o nível do momento). */
  private sampleRemote(r: Remote): void {
    if (r.noStats) {
      this.remoteLevelUpdate(r, this.remoteLevel(r));
      return;
    }
    if (r.reading) return;
    r.reading = true;
    r.call.audioEnergy().then(
      (st) => {
        r.reading = false;
        if (this.remotes.get(r.pid) !== r) return;
        if (!st) {
          r.noStats = true;
          return;
        }
        const lv = levelBetween(r.energy, st);
        r.energy = st;
        if (lv !== null) this.remoteLevelUpdate(r, lv);
      },
      () => {
        r.reading = false;
        r.noStats = true;
      },
    );
  }

  private remoteLevelUpdate(r: Remote, level: number): void {
    const now = this.now();
    r.det.update(level, Math.min(1, (now - r.at) / 1000));
    r.at = now;
  }

  private tick(): void {
    if (this.disposed) return;
    const dt = TICK_MS / 1000;
    if (++this.ticks % 20 === 0) this.plan();
    this.meDet.update(this.micOn && this.micAnalyser ? this.level(this.micAnalyser) : 0, dt);
    let talking = false;
    for (const r of this.remotes.values()) {
      if (!r.stream) continue;
      this.sampleRemote(r);
      if (r.det.speaking) talking = true;
    }
    if (talking !== this.talking) {
      this.talking = talking;
      this.onTalking?.(talking);
    }
    const key = this.state().speaking.join();
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.changed();
    }
  }

  /** Liga para quem falta, desfaz chamadas de quem saiu e as que não conectaram. */
  private plan(): void {
    if (this.disposed) return;
    const now = this.now();
    for (const [pid, r] of [...this.remotes]) {
      const gone = !this.slots.has(pid) && now - r.since > GRACE_MS;
      const stuck = !r.stream && now - r.since > CONNECT_MS;
      if (gone || stuck) {
        this.drop(pid);
        if (stuck) this.backoff(pid);
      }
    }
    const { call } = callPlan(this.members, this.mySlot, this.remotes.keys());
    for (const pid of call) if (now >= (this.retry.get(pid)?.at ?? 0)) this.dial(pid);
  }

  private backoff(pid: string): void {
    const wait = Math.min(RETRY_MAX_MS, (this.retry.get(pid)?.wait ?? RETRY_MIN_MS / 2) * 2);
    this.retry.set(pid, { at: this.now() + wait, wait });
  }

  private dial(pid: string): void {
    const track = this.currentTrack();
    if (!track) return;
    let c: VoiceCall;
    try {
      c = this.peer.call(pid, new MediaStream([track]), { room: this.code });
    } catch {
      this.backoff(pid);
      return;
    }
    this.add(pid, c);
  }

  private incoming(c: VoiceCall): void {
    const track = this.disposed ? null : this.currentTrack();
    if (!track || c.metadata?.room !== this.code) {
      c.close();
      return;
    }
    // ligou de novo (a anterior caiu): fica a nova
    if (this.remotes.has(c.peer)) this.drop(c.peer);
    this.add(c.peer, c);
    c.answer(new MediaStream([track]));
  }

  private add(pid: string, call: VoiceCall): void {
    const r: Remote = {
      pid,
      call,
      since: this.now(),
      stream: null,
      audio: null,
      det: new SpeakingDetector(),
      analyser: null,
      src: null,
      energy: null,
      noStats: false,
      reading: false,
      at: this.now(),
    };
    call.onStream = (s) => this.attach(r, s);
    call.onClose = () => {
      if (this.remotes.get(pid) !== r) return;
      this.drop(pid);
      this.backoff(pid);
    };
    this.remotes.set(pid, r);
  }

  private attach(r: Remote, s: MediaStream): void {
    if (this.remotes.get(r.pid) !== r) return;
    r.stream = s;
    this.retry.delete(r.pid);
    if (!r.audio) {
      const a = document.createElement('audio');
      a.autoplay = true;
      a.setAttribute('playsinline', '');
      a.dataset.pid = r.pid;
      this.box.appendChild(a);
      r.audio = a;
    }
    r.audio.srcObject = s;
    this.applyVolume(r);
    this.play(r);
    this.changed();
  }

  private play(r: Remote): void {
    const a = r.audio;
    if (!a) return;
    a.play().then(
      () => {
        if (this.blocked && [...this.remotes.values()].every((x) => !x.audio || !x.audio.paused)) {
          this.blocked = false;
          this.changed();
        }
      },
      (e: unknown) => {
        if ((e as { name?: string })?.name === 'NotAllowedError' && !this.blocked) {
          this.blocked = true;
          this.changed();
        }
      },
    );
  }

  private applyVolume(r: Remote): void {
    if (!r.audio) return;
    r.audio.volume = this.volume;
    r.audio.muted = this.muted;
  }

  private drop(pid: string): void {
    const r = this.remotes.get(pid);
    if (!r) return;
    this.remotes.delete(pid);
    r.call.onClose = null;
    r.call.onStream = null;
    r.call.close();
    r.src?.disconnect();
    if (r.audio) {
      r.audio.srcObject = null;
      r.audio.remove();
    }
    if (this.blocked && ![...this.remotes.values()].some((x) => x.audio?.paused)) this.blocked = false;
    this.changed();
  }
}
