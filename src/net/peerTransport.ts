import type { DataConnection, MediaConnection, Peer, PeerError, PeerOptions } from 'peerjs';
import { randomCode } from './protocol';
import {
  NetError,
  netRandom,
  type Endpoint,
  type Link,
  type NetErrorKind,
  type Transport,
  type VoiceCall,
  type VoicePeer,
} from './transport';

/** Prefixo dos ids no serviço público do PeerJS (o código da sala vem depois). */
const PREFIX = 'zumbibot-v1-';
const OPEN_TIMEOUT = 15000;
const CONNECT_TIMEOUT = 20000;
/** Ligação de voz que chega antes de o chat de voz deste aparelho começar (quem acabou de entrar) espera um pouco. */
const HOLD_CALL_MS = 10000;

type PeerCtor = typeof Peer;
let loading: Promise<PeerCtor> | null = null;

/** O PeerJS só é baixado quando alguém abre o jogo online. */
function loadPeer(): Promise<PeerCtor> {
  loading ??= import('peerjs').then((m) => m.Peer);
  return loading.catch((e: unknown) => {
    loading = null;
    throw new NetError(navigator.onLine === false ? 'offline' : 'server', String(e));
  });
}

function mapError(err: PeerError<string> | Error): NetError {
  const type = (err as { type?: string }).type ?? '';
  let kind: NetErrorKind;
  if (navigator.onLine === false) kind = 'offline';
  else if (type === 'peer-unavailable') kind = 'not-found';
  else if (type === 'browser-incompatible') kind = 'unsupported';
  else if (type === 'webrtc') kind = 'blocked';
  else kind = 'server';
  return new NetError(kind, `${type} ${err.message}`);
}

class PeerLink implements Link {
  onMessage: ((msg: unknown) => void) | null = null;
  onClose: (() => void) | null = null;
  private closed = false;

  constructor(private c: DataConnection) {
    c.on('data', (d) => this.onMessage?.(d));
    c.on('close', () => this.end());
    c.on('error', () => this.end());
    // WebRTC: rede caiu de vez
    c.on('iceStateChanged', (s) => {
      if (s === 'failed' || s === 'closed') this.end();
    });
  }

  get peerId(): string {
    return this.c.peer;
  }

  send(msg: unknown): void {
    if (this.closed || !this.c.open) return;
    try {
      void this.c.send(msg);
    } catch {
      this.end();
    }
  }

  close(): void {
    if (this.closed) return;
    try {
      this.c.close();
    } catch {
      /* já fechada */
    }
    this.end();
  }

  private end(): void {
    if (this.closed) return;
    this.closed = true;
    this.onClose?.();
  }
}

/**
 * Voz leve: Opus mono até 24 kbps, com DTX (não transmite nas pausas) e correção de perdas. Cada lado pede isso ao
 * outro no próprio SDP. Assim sobra rede para o estado do jogo, que não trava quando a voz está ligada.
 */
export function tuneOpus(sdp: string): string {
  const m = /a=rtpmap:(\d+) opus\/48000[^\r\n]*/i.exec(sdp);
  if (!m) return sdp;
  const pt = m[1];
  const want = 'minptime=10;useinbandfec=1;usedtx=1;stereo=0;sprop-stereo=0;maxaveragebitrate=24000';
  const fmtp = new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`);
  if (fmtp.test(sdp))
    return sdp.replace(fmtp, (_all, params: string) => {
      const kept = params
        .split(';')
        .map((x) => x.trim())
        .filter(
          (x) => x && !/^(minptime|useinbandfec|usedtx|stereo|sprop-stereo|maxaveragebitrate)=/.test(x),
        );
      return `a=fmtp:${pt} ${[...kept, want].join(';')}`;
    });
  return sdp.replace(m[0], `${m[0]}\r\na=fmtp:${pt} ${want}`);
}

class PeerVoiceCall implements VoiceCall {
  onStream: ((s: MediaStream) => void) | null = null;
  onClose: (() => void) | null = null;
  private ended = false;

  constructor(private c: MediaConnection) {
    c.on('stream', (st) => this.onStream?.(st));
    c.on('close', () => this.end());
    c.on('error', () => this.end());
    c.on('iceStateChanged', (st) => {
      if (st === 'failed' || st === 'closed') this.end();
    });
  }

  get peer(): string {
    return this.c.peer;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.c.metadata as Record<string, unknown> | undefined;
  }

  answer(stream: MediaStream): void {
    this.c.answer(stream, { sdpTransform: tuneOpus });
  }

  replaceTrack(track: MediaStreamTrack | null): void {
    const sender = this.c.peerConnection
      ?.getSenders()
      .find((snd) => !snd.track || snd.track.kind === 'audio');
    void sender?.replaceTrack(track).catch(() => {});
  }

  private receiver(): RTCRtpReceiver | undefined {
    return this.c.peerConnection?.getReceivers().find((r) => r.track?.kind === 'audio');
  }

  async audioEnergy(): Promise<{ energy: number; duration: number } | null> {
    const rcv = this.receiver();
    if (!rcv?.getStats) return null;
    const report = await rcv.getStats();
    for (const st of report.values() as IterableIterator<Record<string, unknown>>) {
      if (st.type !== 'inbound-rtp' || (st.kind ?? st.mediaType) !== 'audio') continue;
      const energy = st.totalAudioEnergy;
      const duration = st.totalSamplesDuration;
      return typeof energy === 'number' && typeof duration === 'number' ? { energy, duration } : null;
    }
    // ainda não chegou nenhum pacote de áudio
    return { energy: 0, duration: 0 };
  }

  audioLevel(): number | null {
    const rcv = this.receiver();
    if (!rcv?.getSynchronizationSources) return null;
    const src = rcv.getSynchronizationSources()[0];
    if (!src) return 0;
    return typeof src.audioLevel === 'number' ? src.audioLevel : null;
  }

  close(): void {
    try {
      this.c.close();
    } catch {
      /* já fechada */
    }
    this.end();
  }

  get closed(): boolean {
    return this.ended;
  }

  private end(): void {
    if (this.ended) return;
    this.ended = true;
    this.onClose?.();
  }
}

/** Voz sobre o Peer já aberto (chamadas de áudio diretas entre os aparelhos da sala). */
function voicePeer(peer: Peer): VoicePeer {
  let handler: ((c: VoiceCall) => void) | null = null;
  // quem acabou de entrar recebe ligações antes de o chat de voz dele começar: elas esperam (senão só depois
  // de o outro lado desistir e ligar de novo)
  const waiting = new Set<PeerVoiceCall>();
  const vp: VoicePeer = {
    id: peer.id,
    get onCall() {
      return handler;
    },
    set onCall(h) {
      handler = h;
      if (!h) return;
      for (const c of [...waiting]) {
        waiting.delete(c);
        if (!c.closed) h(c);
      }
    },
    call: (to, stream, meta) => {
      const mc = peer.call(to, stream, { metadata: meta, sdpTransform: tuneOpus });
      if (!mc) throw new NetError('lost', 'voice call');
      return new PeerVoiceCall(mc);
    },
  };
  peer.on('call', (c) => {
    const vc = new PeerVoiceCall(c);
    if (handler) {
      handler(vc);
      return;
    }
    waiting.add(vc);
    setTimeout(() => {
      if (waiting.delete(vc)) vc.close();
    }, HOLD_CALL_MS);
  });
  return vp;
}

/** Perdeu o serviço de conexão: quem já está conectado continua; tenta voltar (entrada de gente nova, voz). */
function keepSignaling(peer: Peer): () => void {
  let retry: ReturnType<typeof setTimeout> | null = null;
  peer.on('disconnected', () => {
    if (peer.destroyed || retry) return;
    retry = setTimeout(() => {
      retry = null;
      if (!peer.destroyed && peer.disconnected) peer.reconnect();
    }, 2000);
  });
  return () => {
    if (retry) clearTimeout(retry);
  };
}

/** Espera o Peer abrir no serviço de conexão (ou falhar). */
function opened(peer: Peer): Promise<'ok' | 'taken'> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new NetError('timeout', 'open')), OPEN_TIMEOUT);
    peer.once('open', () => {
      clearTimeout(timer);
      resolve('ok');
    });
    peer.once('error', (err) => {
      clearTimeout(timer);
      if (err.type === 'unavailable-id') resolve('taken');
      else reject(mapError(err));
    });
  });
}

/** Conexão que chega a um Peer vira um link (só uma vez: o navegador às vezes avisa "aberta" duas vezes). */
function acceptLinks(peer: Peer, onLink: (l: Link) => void): void {
  const linked = new WeakSet<DataConnection>();
  peer.on('connection', (c) => {
    c.once('open', () => {
      if (linked.has(c)) return;
      linked.add(c);
      onLink(new PeerLink(c));
    });
  });
}

/** Conecta num Peer pelo id e espera abrir. */
function connectTo(peer: Peer, to: string): Promise<Link> {
  const c = peer.connect(to, { reliable: true, serialization: 'json' });
  return new Promise<Link>((resolve, reject) => {
    const timer = setTimeout(() => {
      c.close();
      reject(new NetError('timeout', 'connect'));
    }, CONNECT_TIMEOUT);
    const fail = (err: PeerError<string> | Error) => {
      clearTimeout(timer);
      peer.off('error', fail);
      reject(mapError(err));
    };
    c.once('open', () => {
      clearTimeout(timer);
      peer.off('error', fail);
      resolve(new PeerLink(c));
    });
    c.once('error', fail);
    peer.once('error', fail);
  });
}

/** Tempo entre as tentativas de abrir a porta do código (o antigo anfitrião ainda pode estar registrado). */
const DOOR_RETRY_MS = 3000;
const DOOR_TRIES = 40;

/** Este aparelho no PeerJS: o Peer (id, voz, conexões) e, no anfitrião novo, a porta do código. */
class PeerEndpoint implements Endpoint {
  onLink: ((l: Link) => void) | null = null;
  readonly voice: VoicePeer;
  private door: Peer | null = null;
  private stops: (() => void)[] = [];
  private closed = false;

  constructor(
    private PeerC: PeerCtor,
    private peer: Peer,
    private opts: PeerOptions,
  ) {
    this.voice = voicePeer(peer);
    this.listen(peer);
    peer.on('error', () => {
      /* erros depois de aberto: conexões individuais avisam por conta própria */
    });
  }

  get id(): string {
    return this.peer.id;
  }

  private listen(p: Peer): void {
    acceptLinks(p, (l) => {
      if (this.onLink && !this.closed) this.onLink(l);
      else l.close();
    });
    this.stops.push(keepSignaling(p));
  }

  connect(to: string): Promise<Link> {
    if (this.closed) return Promise.reject(new NetError('lost', 'closed'));
    return connectTo(this.peer, to);
  }

  async openDoor(code: string): Promise<boolean> {
    const id = PREFIX + code;
    if (this.peer.id === id || this.door) return true;
    for (let i = 0; i < DOOR_TRIES && !this.closed; i++) {
      const d = new this.PeerC(id, this.opts);
      let res: 'ok' | 'taken' | 'fail';
      try {
        res = await opened(d);
      } catch {
        res = 'fail';
      }
      if (res === 'ok' && !this.closed) {
        this.door = d;
        d.on('error', () => {});
        this.listen(d);
        return true;
      }
      d.destroy();
      await new Promise((r) => setTimeout(r, DOOR_RETRY_MS));
    }
    return false;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.onLink = null;
    for (const s of this.stops) s();
    this.door?.destroy();
    this.peer.destroy();
  }
}

/**
 * Transporte de verdade: WebRTC com o serviço público e gratuito do PeerJS para os aparelhos se acharem pelo
 * código (depois a conversa é direta entre eles, ou por um servidor de retransmissão quando a rede exige).
 */
export class PeerTransport implements Transport {
  /** `server`: outro servidor PeerJS ("host:porta/caminho", sem https), para testes ou servidor próprio. */
  constructor(private server?: string | null) {}

  private options(): PeerOptions {
    if (!this.server) return { debug: 0 };
    const m = /^([^:/]+)(?::(\d+))?(\/.*)?$/.exec(this.server);
    if (!m) return { debug: 0 };
    return { debug: 0, host: m[1], port: Number(m[2] ?? 80), path: m[3] ?? '/', secure: false };
  }

  async host(): Promise<{ code: string; ep: Endpoint }> {
    const PeerC = await loadPeer();
    for (let i = 0; i < 6; i++) {
      const code = randomCode(netRandom);
      const peer = new PeerC(PREFIX + code, this.options());
      let res: 'ok' | 'taken';
      try {
        res = await opened(peer);
      } catch (e) {
        peer.destroy();
        throw e;
      }
      if (res === 'taken') {
        peer.destroy();
        continue;
      }
      return { code, ep: new PeerEndpoint(PeerC, peer, this.options()) };
    }
    throw new NetError('server', 'no free code');
  }

  async join(code: string): Promise<{ ep: Endpoint; link: Link }> {
    const PeerC = await loadPeer();
    const peer = new PeerC(this.options());
    try {
      await opened(peer);
      const link = await connectTo(peer, PREFIX + code);
      return { ep: new PeerEndpoint(PeerC, peer, this.options()), link };
    } catch (e) {
      peer.destroy();
      throw e instanceof NetError ? e : mapError(e as Error);
    }
  }
}
