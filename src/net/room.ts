import { isCharacterId } from '../data/characters';
import type { CharacterId, Difficulty } from '../data/types';
import { MAX_PLAYERS, type PlayerSlot } from '../sim/Entity';
import type { GameEvent } from '../sim/events';
import type { InputFrame, InputSource } from '../sim/InputFrame';
import type { PlayerLoadout, World } from '../sim/World';
import { SnapshotEncoder, applyDelta, type SnapDelta } from './delta';
import {
  NET_VERSION,
  RemoteInputSource,
  isDifficulty,
  packInput,
  sanitizeLoadout,
  type GuestMsg,
  type HostMsg,
  type RoomOptions,
  type RoomPhase,
  type RoomPlayer,
  type StartMsg,
} from './protocol';
import { NetError, type Endpoint, type Link, type Transport, type VoicePeer } from './transport';
import type { NetAdapter } from './types';

/** Intervalo dos "sinais de vida" e quanto tempo sem notícias derruba a conexão. */
const PING_MS = 1000;
const TIMEOUT_MS = 8000;
/** O estado vai a cada 3 ticks (20 vezes por segundo). */
const SNAP_EVERY = 3;
/** Estados guardados no máximo (~1 min); passou disso, pede um quadro completo. */
const MAX_QUEUE = 1200;
/** Troca de anfitrião: quanto tempo o novo anfitrião guarda o lugar de quem ainda vai se reconectar. */
const REJOIN_WAIT_MS = 20000;
/** Troca de anfitrião: quanto tempo os outros tentam se conectar no novo anfitrião. */
const REJOIN_TRY_MS = 20000;

type Clock = () => number;
const defaultClock: Clock = () => performance.now();

interface Guest {
  slot: PlayerSlot;
  link: Link;
  lo: PlayerLoadout;
  ready: boolean;
  loaded: boolean;
  /** Está na partida em andamento (recebe o estado). */
  inGame: boolean;
  /** Pediu um quadro completo (vai no próximo envio). */
  needKey: boolean;
  /** Microfone ligado. */
  mic: boolean;
  input: RemoteInputSource;
  seen: number;
}

export interface RoomNotice {
  kind: 'joined' | 'left';
  slot: PlayerSlot;
  name: string;
  /** Quem saiu era o anfitrião. */
  host?: boolean;
}

type Snap = { s: SnapDelta; ev: GameEvent[] };

/** Lugar guardado para quem ainda vai se reconectar depois da troca de anfitrião. */
interface Expected {
  player: RoomPlayer;
  inGame: boolean;
  at: number;
}

/**
 * Sala do anfitrião: aceita até 4 pessoas, guarda o personagem e o "pronto" de cada uma, começa a partida e
 * repassa o estado do jogo. Quem cria a sala é o P1; quem assume depois de uma troca de anfitrião continua com o
 * próprio número.
 */
export class HostRoom {
  readonly role = 'host' as const;
  phase: RoomPhase = 'lobby';
  onChange: (() => void) | null = null;
  onNotice: ((n: RoomNotice) => void) | null = null;
  /** Alguém saiu no meio da partida (o jogador dele sai do jogo). */
  onGuestLeft: ((slot: PlayerSlot) => void) | null = null;
  /** Dificuldade da partida (escolhida pelo anfitrião). */
  difficulty: Difficulty;
  /** Chat de voz permitido nesta sala. */
  voice: boolean;
  code = '';
  /** Microfone do anfitrião ligado. */
  private myMic = false;
  private guests = new Map<PlayerSlot, Guest>();
  private expected = new Map<PlayerSlot, Expected>();
  private ep: Endpoint | null = null;
  private timer: ReturnType<typeof setInterval>;
  private closed = false;

  private constructor(
    public me: PlayerLoadout,
    public mapId: string,
    public levelIdx: number,
    opts: RoomOptions,
    private now: Clock,
  ) {
    this.difficulty = opts.difficulty;
    this.voice = opts.voice;
    this.timer = setInterval(() => this.heartbeat(), PING_MS);
  }

  static async open(
    t: Transport,
    me: PlayerLoadout,
    target: { mapId: string; levelIdx: number },
    opts: RoomOptions = { difficulty: 'normal', voice: true },
    now: Clock = defaultClock,
  ): Promise<HostRoom> {
    const room = new HostRoom({ ...me, slot: 0 }, target.mapId, target.levelIdx, opts, now);
    try {
      const { code, ep } = await t.host();
      room.attach(ep, code);
    } catch (e) {
      clearInterval(room.timer);
      throw e;
    }
    return room;
  }

  /**
   * O anfitrião saiu e este jogador (o de menor número) assume a sala: a mesma sala e o mesmo código, os mesmos
   * jogadores (que se reconectam aqui) e a partida continua. A porta do código passa para este aparelho.
   */
  static takeOver(g: GuestRoom, now: Clock = defaultClock): HostRoom {
    const mine = g.me();
    const me = { ...g.loadout, slot: g.slot, character: mine?.char ?? g.loadout.character };
    const room = new HostRoom(me, g.mapId, g.levelIdx, { difficulty: g.difficulty, voice: g.voice }, now);
    room.phase = g.phase;
    room.myMic = g.micOn;
    for (const p of g.players)
      if (p.slot !== g.slot && p.slot !== g.hostSlot)
        room.expected.set(p.slot, { player: { ...p, mic: false }, inGame: g.phase === 'playing', at: now() });
    room.attach(g.endpoint, g.code);
    void g.endpoint.openDoor(g.code);
    return room;
  }

  private attach(ep: Endpoint, code: string): void {
    this.ep = ep;
    this.code = code;
    ep.onLink = (l) => this.accept(l);
  }

  get guestCount(): number {
    return this.guests.size;
  }

  /** Voz do anfitrião (ausente quando o transporte não tem áudio). */
  get voicePeer(): VoicePeer | undefined {
    return this.ep?.voice;
  }

  get mySlot(): PlayerSlot {
    return this.me.slot;
  }

  get full(): boolean {
    return this.guests.size + this.expected.size >= MAX_PLAYERS - 1;
  }

  /** Todos que entraram estão prontos (e entrou pelo menos um). */
  allReady(): boolean {
    return this.guests.size > 0 && [...this.guests.values()].every((g) => g.ready);
  }

  /** Quem está na partida já carregou a fase. */
  allLoaded(): boolean {
    return [...this.guests.values()].every((g) => !g.inGame || g.loaded);
  }

  players(): RoomPlayer[] {
    const me = this.me;
    const out: RoomPlayer[] = [
      {
        slot: me.slot,
        name: me.name,
        char: me.character,
        ready: true,
        level: me.level,
        pid: this.ep?.id,
        mic: this.myMic,
      },
    ];
    for (const g of this.guests.values())
      out.push({
        slot: g.slot,
        name: g.lo.name,
        char: g.lo.character,
        ready: g.ready,
        level: g.lo.level,
        pid: g.link.peerId,
        mic: g.mic,
      });
    // quem ainda está voltando depois da troca de anfitrião continua na lista
    for (const x of this.expected.values()) out.push(x.player);
    return out.sort((a, b) => a.slot - b.slot);
  }

  /** Entradas de quem está na partida (lida a cada tick: quem se reconecta volta a jogar na hora). */
  remoteSources(): InputSource[] {
    return [...this.guests.values()].filter((g) => g.inGame).map((g) => g.input);
  }

  /** Muda a dificuldade e/ou se a voz é permitida (antes de começar). */
  setOptions(o: Partial<RoomOptions>): void {
    if (o.difficulty && isDifficulty(o.difficulty)) this.difficulty = o.difficulty;
    if (typeof o.voice === 'boolean') this.voice = o.voice;
    this.changed();
  }

  /** O anfitrião ligou ou desligou o microfone. */
  setMic(on: boolean): void {
    if (this.myMic === on) return;
    this.myMic = on;
    this.changed();
  }

  setMyCharacter(c: CharacterId): void {
    this.me.character = c;
    this.changed();
  }

  setTarget(mapId: string, levelIdx: number): void {
    this.mapId = mapId;
    this.levelIdx = levelIdx;
    this.changed();
  }

  /** Começa a partida para todos que estão na sala (na dificuldade da sala). */
  start(o: Omit<StartMsg, 't' | 'loadouts' | 'mapId' | 'levelIdx' | 'difficulty'>): StartMsg {
    const msg: StartMsg = {
      t: 'start',
      ...o,
      difficulty: this.difficulty,
      mapId: this.mapId,
      levelIdx: this.levelIdx,
      loadouts: [{ ...this.me }],
    };
    // quem não voltou a tempo depois da troca de anfitrião fica fora da nova partida
    this.expireAll();
    for (const g of this.guests.values()) {
      g.inGame = true;
      g.loaded = false;
      g.input = new RemoteInputSource(g.slot, this.now);
      msg.loadouts.push({ ...g.lo, slot: g.slot });
    }
    msg.loadouts.sort((a, b) => a.slot - b.slot);
    this.phase = 'playing';
    this.broadcast(msg);
    this.changed();
    return msg;
  }

  /** Fim da fase (tela de resultado): quem estiver fora pode entrar para a próxima. */
  toResult(): void {
    this.phase = 'result';
    this.changed();
  }

  /** Volta todos para a sala (escolher personagem de novo). */
  toLobby(): void {
    this.phase = 'lobby';
    for (const g of this.guests.values()) {
      g.inGame = false;
      g.ready = false;
    }
    for (const x of this.expected.values()) x.inGame = false;
    this.changed();
  }

  /** Adaptador de rede da partida: entrada local + a dos convidados; publica o estado. */
  adapter(local: InputSource, onTickEnd?: () => void): HostAdapter {
    return new HostAdapter(this, local, onTickEnd);
  }

  /**
   * Estado para quem está na partida: as diferenças para todos, e um quadro completo (do mesmo tick) para quem
   * pediu — depois dele, as próximas diferenças valem também para essa pessoa.
   */
  sendSnap(w: World, s: SnapDelta, ev: GameEvent[]): void {
    let full: SnapDelta | null = null;
    for (const g of this.guests.values()) {
      if (!g.inGame) continue;
      if (g.needKey && !s.f) {
        g.needKey = false;
        full ??= new SnapshotEncoder().encode(w);
        g.link.send({ t: 'snap', s: full, ev } satisfies HostMsg);
      } else {
        g.needKey = false;
        g.link.send({ t: 'snap', s, ev } satisfies HostMsg);
      }
    }
  }

  /** Sair da sala: os outros ficam sabendo na hora e um deles assume como anfitrião. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    for (const g of this.guests.values()) {
      g.link.send({ t: 'bye' } satisfies HostMsg);
      g.link.onClose = null;
      g.link.close();
    }
    this.guests.clear();
    this.expected.clear();
    this.ep?.close();
  }

  private broadcast(m: HostMsg): void {
    for (const g of this.guests.values()) g.link.send(m);
  }

  private changed(): void {
    this.broadcast({
      t: 'room',
      players: this.players(),
      phase: this.phase,
      mapId: this.mapId,
      levelIdx: this.levelIdx,
      host: this.me.slot,
      difficulty: this.difficulty,
      voice: this.voice,
    });
    this.onChange?.();
  }

  private freeSlot(): PlayerSlot {
    let s = 0;
    while (s === this.me.slot || this.guests.has(s as PlayerSlot) || this.expected.has(s as PlayerSlot)) s++;
    return s as PlayerSlot;
  }

  private accept(link: Link): void {
    if (this.closed) {
      link.close();
      return;
    }
    let slot: PlayerSlot | null = null;
    const helloTimer = setTimeout(() => {
      if (slot === null) link.close();
    }, 10000);
    link.onMessage = (raw) => {
      const m = raw as GuestMsg;
      if (!m || typeof m !== 'object') return;
      if (slot === null) {
        if (m.t !== 'hello') return;
        clearTimeout(helloTimer);
        // o mesmo aparelho já está na sala (aviso repetido da conexão): não vira outro jogador; este link é
        // ignorado sem fechar (pode ser a mesma conexão do jogador que já entrou)
        if (link.peerId && [...this.guests.values()].some((x) => x.link.peerId === link.peerId)) {
          link.onMessage = null;
          return;
        }
        // voltando depois da troca de anfitrião: o lugar dele estava guardado (mesmo no meio da partida)
        const back = m.rejoin !== undefined ? this.expected.get(m.rejoin) : undefined;
        const why =
          m.v !== NET_VERSION
            ? 'version'
            : back
              ? null
              : this.phase === 'playing'
                ? 'started'
                : this.full
                  ? 'full'
                  : null;
        if (why) {
          link.send({ t: 'reject', why } satisfies HostMsg);
          setTimeout(() => link.close(), 300);
          return;
        }
        const s = back ? back.player.slot : this.freeSlot();
        if (back) this.expected.delete(s);
        slot = s;
        const g: Guest = {
          slot: s,
          link,
          lo: sanitizeLoadout(m.lo, s),
          ready: back ? back.player.ready : false,
          loaded: !!back,
          inGame: !!back?.inGame,
          // de volta no meio da partida: recebe um quadro completo
          needKey: !!back?.inGame,
          mic: false,
          input: new RemoteInputSource(s, this.now),
          seen: this.now(),
        };
        if (back) g.lo.character = back.player.char;
        this.guests.set(s, g);
        link.send({ t: 'welcome', slot: s } satisfies HostMsg);
        if (!back) this.onNotice?.({ kind: 'joined', slot: s, name: g.lo.name });
        this.changed();
        return;
      }
      const g = this.guests.get(slot);
      if (!g || g.link !== link) return;
      g.seen = this.now();
      switch (m.t) {
        case 'in':
          if (Array.isArray(m.f)) g.input.push(m.f);
          break;
        case 'pick':
          if (isCharacterId(m.char)) g.lo.character = m.char;
          g.ready = !!m.ready;
          this.changed();
          break;
        case 'loaded':
          g.loaded = true;
          this.onChange?.();
          break;
        case 'key':
          g.needKey = true;
          break;
        case 'mic':
          g.mic = !!m.on;
          this.changed();
          break;
        case 'bye':
          this.drop(slot);
          break;
        default:
          break;
      }
    };
    link.onClose = () => {
      clearTimeout(helloTimer);
      if (slot !== null && this.guests.get(slot)?.link === link) this.drop(slot);
    };
  }

  private drop(slot: PlayerSlot): void {
    const g = this.guests.get(slot);
    if (!g) return;
    this.guests.delete(slot);
    g.link.onClose = null;
    g.link.close();
    this.onNotice?.({ kind: 'left', slot, name: g.lo.name });
    if (g.inGame) this.onGuestLeft?.(slot);
    this.changed();
  }

  /** Quem não se reconectou a tempo depois da troca de anfitrião saiu de vez. */
  private expire(slot: PlayerSlot): void {
    const x = this.expected.get(slot);
    if (!x) return;
    this.expected.delete(slot);
    this.onNotice?.({ kind: 'left', slot, name: x.player.name });
    if (x.inGame) this.onGuestLeft?.(slot);
  }

  private expireAll(): void {
    if (!this.expected.size) return;
    for (const s of [...this.expected.keys()]) this.expire(s);
  }

  private heartbeat(): void {
    const now = this.now();
    for (const g of [...this.guests.values()]) {
      if (now - g.seen > TIMEOUT_MS) this.drop(g.slot);
      else g.link.send({ t: 'ping' } satisfies HostMsg);
    }
    let gone = false;
    for (const [s, x] of [...this.expected])
      if (now - x.at > REJOIN_WAIT_MS) {
        this.expire(s);
        gone = true;
      }
    if (gone) this.changed();
  }
}

/** Anfitrião na partida: junta as entradas (própria + convidados) e publica o estado a cada 3 ticks. */
export class HostAdapter implements NetAdapter {
  readonly role = 'host' as const;
  private overrides = new Map<PlayerSlot, InputSource>();
  private enc = new SnapshotEncoder();
  private events: GameEvent[] = [];
  private since = SNAP_EVERY - 1;

  constructor(
    private room: HostRoom,
    private local: InputSource,
    private onTickEnd?: () => void,
  ) {}

  localSlots(): PlayerSlot[] {
    return [this.local.slot];
  }

  setOverride(s: InputSource | null, slot: PlayerSlot = s?.slot ?? this.local.slot): void {
    if (s) this.overrides.set(slot, s);
    else this.overrides.delete(slot);
  }

  collectInputs(tick: number): Map<PlayerSlot, InputFrame> {
    const out = new Map<PlayerSlot, InputFrame>();
    for (const src of [this.local, ...this.room.remoteSources()])
      out.set(src.slot, (this.overrides.get(src.slot) ?? src).sample(tick));
    this.onTickEnd?.();
    return out;
  }

  publish(_tick: number, w: World, events: GameEvent[]): void {
    if (events.length) this.events.push(...events);
    if (++this.since < SNAP_EVERY) return;
    this.since = 0;
    const ev = this.events;
    this.events = [];
    this.room.sendSnap(w, this.enc.encode(w), ev);
  }

  dispose(): void {}
}

/** Por que a conexão com a sala acabou. */
export type LeaveReason = 'host-left' | 'lost';

/** Apresenta-se ao anfitrião (entrando ou voltando depois da troca) e espera o número de jogador. */
function handshake(link: Link, lo: PlayerLoadout, rejoin?: PlayerSlot): Promise<PlayerSlot> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      link.onClose = null;
      link.close();
      reject(new NetError('timeout', 'welcome'));
    }, 10000);
    link.onMessage = (raw) => {
      const m = raw as HostMsg;
      if (m?.t === 'welcome') {
        clearTimeout(timer);
        link.onMessage = null;
        link.onClose = null;
        resolve(m.slot);
      } else if (m?.t === 'reject') {
        clearTimeout(timer);
        link.onClose = null;
        link.close();
        reject(new NetError(m.why));
      }
    };
    link.onClose = () => {
      clearTimeout(timer);
      reject(new NetError('lost'));
    };
    link.send({ t: 'hello', v: NET_VERSION, lo, rejoin } satisfies GuestMsg);
  });
}

/**
 * Quem entrou numa sala: vê a lista, escolhe o personagem, fica pronto e espera o anfitrião começar. Se o
 * anfitrião sair, o jogador de menor número assume (`onPromote`) e os outros se reconectam nele sozinhos.
 */
export class GuestRoom {
  readonly role = 'guest' as const;
  phase: RoomPhase = 'lobby';
  players: RoomPlayer[] = [];
  mapId = '';
  levelIdx = 0;
  difficulty: Difficulty = 'normal';
  /** Chat de voz permitido pelo anfitrião (desligado até a sala dizer). */
  voice = false;
  /** Número do anfitrião atual. */
  hostSlot: PlayerSlot = 0;
  onChange: (() => void) | null = null;
  onStart: ((m: StartMsg) => void) | null = null;
  onClosed: ((why: LeaveReason) => void) | null = null;
  /** Alguém entrou ou saiu da sala (inclusive o anfitrião). */
  onNotice: ((n: RoomNotice) => void) | null = null;
  /** O anfitrião saiu e este jogador assume a sala (criar o `HostRoom.takeOver`). */
  onPromote: ((oldHost: RoomPlayer | undefined) => void) | null = null;
  /** Reconectando no novo anfitrião (`to`) ou de volta (null). */
  onReconnect: ((to: RoomPlayer | null) => void) | null = null;
  /** Estado que chegou antes da partida deste aparelho terminar de carregar. */
  private buffer: Snap[] = [];
  private waitKey = false;
  private client: ClientAdapter | null = null;
  private seen: number;
  private timer: ReturnType<typeof setInterval>;
  private closed = false;
  private rejoining = false;
  private gotRoom = false;
  private myMic = false;

  private constructor(
    private ep: Endpoint,
    private link: Link,
    readonly code: string,
    readonly slot: PlayerSlot,
    readonly loadout: PlayerLoadout,
    private now: Clock,
  ) {
    this.seen = now();
    this.useLink(link);
    this.timer = setInterval(() => {
      if (this.rejoining) return;
      if (this.now() - this.seen > TIMEOUT_MS) this.hostLost();
      else this.send({ t: 'ping' });
    }, PING_MS);
  }

  /** Conecta, se apresenta e espera o "bem-vindo" do anfitrião. */
  static async join(
    t: Transport,
    code: string,
    lo: PlayerLoadout,
    now: Clock = defaultClock,
  ): Promise<GuestRoom> {
    const { ep, link } = await t.join(code);
    try {
      const slot = await handshake(link, lo);
      return new GuestRoom(ep, link, code, slot, lo, now);
    } catch (e) {
      ep.close();
      throw e;
    }
  }

  me(): RoomPlayer | undefined {
    return this.players.find((p) => p.slot === this.slot);
  }

  get mySlot(): PlayerSlot {
    return this.slot;
  }

  /** Este aparelho no serviço de conexão (continua se o anfitrião mudar). */
  get endpoint(): Endpoint {
    return this.ep;
  }

  /** Voz deste aparelho (ausente quando o transporte não tem áudio). */
  get voicePeer(): VoicePeer | undefined {
    return this.ep.voice;
  }

  /** Microfone deste aparelho ligado. */
  get micOn(): boolean {
    return this.myMic;
  }

  /** Ligou ou desligou o microfone: os outros veem 🎤/🔇. */
  setMic(on: boolean): void {
    if (this.myMic === on) return;
    this.myMic = on;
    const me = this.me();
    if (me) me.mic = on;
    this.send({ t: 'mic', on });
    this.onChange?.();
  }

  send(m: GuestMsg): void {
    if (!this.closed && !this.rejoining) this.link.send(m);
  }

  pick(char: CharacterId, ready: boolean): void {
    const me = this.me();
    if (me) {
      me.char = char;
      me.ready = ready;
    }
    this.loadout.character = char;
    this.send({ t: 'pick', char, ready });
    this.onChange?.();
  }

  /** Ficou para trás demais: descarta o que tem e pede um quadro completo ao anfitrião. */
  requestKey(): void {
    this.buffer = [];
    this.waitKey = true;
    this.send({ t: 'key' });
  }

  /** A partida deste aparelho está pronta: recebe o estado guardado e avisa o anfitrião. */
  attach(c: ClientAdapter): void {
    this.client = c;
    for (const s of this.buffer) c.push(s);
    this.buffer = [];
    this.send({ t: 'loaded' });
  }

  detach(c: ClientAdapter): void {
    if (this.client === c) this.client = null;
  }

  /** Sai da sala de vez. */
  leave(): void {
    if (this.closed) return;
    this.send({ t: 'bye' });
    this.closed = true;
    clearInterval(this.timer);
    this.link.onClose = null;
    this.link.close();
    this.ep.close();
  }

  /** Virou anfitrião: esta sala de convidado some, mas o aparelho (voz, id) continua com o `HostRoom`. */
  private handOver(): void {
    this.closed = true;
    clearInterval(this.timer);
  }

  private useLink(link: Link): void {
    this.link = link;
    link.onMessage = (raw) => this.recv(raw as HostMsg);
    link.onClose = () => this.hostLost();
  }

  private end(why: LeaveReason): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    this.ep.close();
    this.onClosed?.(why);
  }

  /**
   * A conexão com o anfitrião acabou (ele saiu ou caiu): o jogador de menor número entre os que ficaram assume;
   * este aparelho vira o anfitrião ou se conecta no novo.
   */
  private hostLost(): void {
    if (this.closed || this.rejoining) return;
    const old = this.players.find((p) => p.slot === this.hostSlot);
    this.link.onClose = null;
    this.link.onMessage = null;
    this.link.close();
    if (old) this.onNotice?.({ kind: 'left', slot: old.slot, name: old.name, host: true });
    this.players = this.players.filter((p) => p.slot !== this.hostSlot);
    const next = [...this.players].sort((a, b) => a.slot - b.slot)[0];
    if (!next || next.slot === this.slot) {
      this.handOver();
      this.onPromote?.(old);
      return;
    }
    this.rejoining = true;
    this.onReconnect?.(next);
    void this.rejoin(next);
  }

  private async rejoin(next: RoomPlayer): Promise<void> {
    const until = this.now() + REJOIN_TRY_MS;
    const lo = { ...this.loadout, character: this.me()?.char ?? this.loadout.character };
    while (!this.closed && next.pid && this.now() < until) {
      try {
        const link = await this.ep.connect(next.pid);
        await handshake(link, lo, this.slot);
        if (this.closed) {
          link.close();
          return;
        }
        this.rejoining = false;
        this.hostSlot = next.slot;
        this.seen = this.now();
        this.useLink(link);
        if (this.myMic) this.send({ t: 'mic', on: true });
        // no meio da partida o novo anfitrião manda um quadro completo; até lá a tela espera
        if (this.phase === 'playing') {
          this.buffer = [];
          this.waitKey = true;
        }
        this.onReconnect?.(null);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    this.rejoining = false;
    this.end('host-left');
  }

  /** Quem entrou e quem saiu, comparando a lista nova com a anterior. */
  private notices(before: RoomPlayer[], after: RoomPlayer[]): void {
    if (!this.gotRoom) return;
    const was = new Map(before.map((p) => [p.slot, p]));
    const now = new Set(after.map((p) => p.slot));
    for (const p of after)
      if (!was.has(p.slot)) this.onNotice?.({ kind: 'joined', slot: p.slot, name: p.name });
    for (const p of before)
      if (!now.has(p.slot) && p.slot !== this.hostSlot)
        this.onNotice?.({ kind: 'left', slot: p.slot, name: p.name });
  }

  private recv(m: HostMsg): void {
    if (!m || typeof m !== 'object') return;
    this.seen = this.now();
    switch (m.t) {
      case 'room': {
        const before = this.players;
        this.players = m.players;
        this.phase = m.phase;
        this.mapId = m.mapId;
        this.levelIdx = m.levelIdx;
        if (typeof m.host === 'number') this.hostSlot = m.host;
        if (isDifficulty(m.difficulty)) this.difficulty = m.difficulty;
        this.voice = m.voice === true;
        this.notices(before, m.players);
        this.gotRoom = true;
        this.onChange?.();
        break;
      }
      case 'start':
        this.buffer = [];
        this.waitKey = false;
        this.client = null;
        this.phase = 'playing';
        this.onStart?.(m);
        break;
      case 'snap':
        // esperando o quadro completo pedido: as diferenças até lá não servem
        if (this.waitKey) {
          if (!m.s.f) break;
          this.waitKey = false;
        }
        if (this.client) this.client.push(m);
        else if (this.buffer.length < MAX_QUEUE) this.buffer.push(m);
        else this.requestKey();
        break;
      case 'bye':
        // o anfitrião saiu: um dos jogadores assume
        this.hostLost();
        break;
      default:
        break;
    }
  }
}

/** Mais de tantos estados atrasados de uma vez: só os efeitos dos mais recentes são mostrados. */
const MAX_EVENT_SNAPS = 8;
/** Atraso da tela em relação ao anfitrião (ticks): começa em ~100 ms e se ajusta à rede (67 a 300 ms). */
const DELAY_START = 6;
const DELAY_MIN = 4;
const DELAY_MAX = 18;
/** Mais atrasado que isso (ticks além do atraso desejado): pula direto para o estado mais novo. */
const JUMP_TICKS = 30;

/**
 * Quem entrou na sala, durante a partida: manda a própria entrada (quando muda, e pelo menos a cada 100 ms) e
 * mostra o estado recebido. Os estados passam por um pequeno "buffer" e são mostrados no ritmo do anfitrião (um
 * relógio de reprodução), deslizando entre um e outro: se a rede atrasa e entrega vários de uma vez (voz ligada,
 * Wi-Fi fraco), a tela continua andando lisa em vez de parar e dar um salto. O atraso se ajusta sozinho: cresce
 * quando falta estado e diminui devagar quando a rede está boa.
 */
export class ClientAdapter implements NetAdapter {
  readonly role = 'client' as const;
  private queue: Snap[] = [];
  private override: InputSource | null = null;
  private lastSent = '';
  private sinceSend = 0;
  /** Relógio de reprodução (tick do anfitrião sendo mostrado, fracionado); NaN antes do 1º estado. */
  private clock = NaN;
  /** Tick do estado aplicado (alvo do deslize) e do anterior. */
  private cur = 0;
  private prev = 0;
  private delay = DELAY_START;
  private lastFrame = -1;
  /** Tempo sem faltar estado (para diminuir o atraso). */
  private calm = 0;
  /** Esperando o próximo estado (a folga já aumentou nesta espera). */
  private starved = false;

  constructor(
    private room: GuestRoom,
    private local: InputSource,
    private onTickEnd?: () => void,
    private now: Clock = defaultClock,
  ) {}

  localSlots(): PlayerSlot[] {
    return [this.local.slot];
  }

  setOverride(s: InputSource | null): void {
    this.override = s;
  }

  push(m: Snap): void {
    if (this.queue.length >= MAX_QUEUE) {
      // aba ficou muito tempo em segundo plano: mais barato recomeçar de um quadro completo
      this.queue = [];
      this.room.requestKey();
      return;
    }
    // quadro completo: recomeça o relógio a partir dele
    if (m.s.f) {
      this.queue = [];
      this.clock = NaN;
    }
    this.queue.push(m);
  }

  collectInputs(tick: number): Map<PlayerSlot, InputFrame> {
    const f = (this.override ?? this.local).sample(tick);
    this.onTickEnd?.();
    const p = packInput(f);
    const key = p.join(',');
    if (key !== this.lastSent || ++this.sinceSend >= 6) {
      this.room.send({ t: 'in', f: p });
      this.lastSent = key;
      this.sinceSend = 0;
    }
    return new Map();
  }

  publish(): void {}

  /** Atraso atual da tela (ticks do anfitrião). */
  get bufferTicks(): number {
    return this.delay;
  }

  alpha(): number {
    if (Number.isNaN(this.clock) || this.cur <= this.prev) return 1;
    return Math.max(0, Math.min(1, (this.clock - this.prev) / (this.cur - this.prev)));
  }

  receive(w: World): GameEvent[] {
    const now = this.now();
    const dtMs = this.lastFrame < 0 ? 0 : Math.min(250, now - this.lastFrame);
    this.lastFrame = now;
    if (Number.isNaN(this.clock)) {
      if (!this.queue.length) return [];
      // primeiro estado (ou quadro completo): mostra na hora e começa o relógio um pouco atrás
      this.clock = this.queue[0]!.s.k - this.delay;
      this.prev = this.cur = this.clock;
    } else if (this.queue.length) {
      const newest = this.queue[this.queue.length - 1]!.s.k;
      const lead = newest - this.clock;
      // muito para trás (aba parada, rede voltou): pula; um pouco atrás ou à frente: acelera ou freia de leve
      if (lead > this.delay + JUMP_TICKS) this.clock = newest - this.delay;
      else {
        const rate = lead > this.delay + 6 ? 1.1 : lead < this.delay - 3 ? 0.92 : 1;
        this.clock += dtMs * 0.06 * rate;
      }
    } else this.clock += dtMs * 0.06;

    const events: GameEvent[] = [];
    if (this.queue.length && this.clock >= this.cur) {
      const due: Snap[] = [];
      while (this.queue.length && this.clock >= this.cur) {
        const m = this.queue.shift()!;
        due.push(m);
        this.prev = this.cur;
        this.cur = m.s.k;
      }
      // aplica todos menos o último; a posição que ficou é o começo do deslize até o último (no relógio)
      const last = due.length - 1;
      const start = new Map<number, [number, number, number]>();
      due.forEach((m, i) => {
        if (i === last) for (const e of w.entities) start.set(e.id, [e.t.x, e.t.y, e.t.z]);
        applyDelta(w, m.s);
        if (i >= due.length - MAX_EVENT_SNAPS) events.push(...m.ev);
        else for (const ev of m.ev) if (ev.t === 'victory' || ev.t === 'gameOver') events.push(ev);
      });
      for (const e of w.entities) {
        const t = e.t;
        const s = start.get(e.id);
        // teleporte (renascer, entrar em cena): sem deslize
        if (s && Math.abs(s[0] - t.x) + Math.abs(s[1] - t.y) + Math.abs(s[2] - t.z) < 5) {
          t.px = s[0];
          t.py = s[1];
          t.pz = s[2];
        } else {
          t.px = t.x;
          t.py = t.y;
          t.pz = t.z;
        }
      }
    }
    // chegou ao último estado e o próximo não veio: espera nele e aumenta a folga (uma vez por espera)
    if (!this.queue.length && this.clock >= this.cur) {
      if (!this.starved) {
        this.starved = true;
        this.delay = Math.min(DELAY_MAX, this.delay + 2);
        this.calm = 0;
      }
      this.clock = this.cur;
    } else {
      this.starved = false;
      // rede tranquila há um tempo: diminui a folga (menos atraso)
      if ((this.calm += dtMs) > 8000 && this.delay > DELAY_MIN) {
        this.delay--;
        this.calm = 0;
      }
    }
    return events;
  }

  dispose(): void {
    this.room.detach(this);
  }
}
