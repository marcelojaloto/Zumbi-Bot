import { isCharacterId } from '../data/characters';
import type { CharacterId } from '../data/types';
import { MAX_PLAYERS, type PlayerSlot } from '../sim/Entity';
import type { GameEvent } from '../sim/events';
import type { InputFrame, InputSource } from '../sim/InputFrame';
import type { PlayerLoadout, World } from '../sim/World';
import { SnapshotEncoder, applyDelta, type SnapDelta } from './delta';
import {
  NET_VERSION,
  RemoteInputSource,
  packInput,
  sanitizeLoadout,
  type GuestMsg,
  type HostMsg,
  type RoomPhase,
  type RoomPlayer,
  type StartMsg,
} from './protocol';
import { NetError, type Link, type RoomServer, type Transport } from './transport';
import type { NetAdapter } from './types';

/** Intervalo dos "sinais de vida" e quanto tempo sem notícias derruba a conexão. */
const PING_MS = 1000;
const TIMEOUT_MS = 12000;
/** O estado vai a cada 3 ticks (20 vezes por segundo). */
const SNAP_EVERY = 3;
/** Estados guardados no máximo (~1 min); passou disso, pede um quadro completo. */
const MAX_QUEUE = 1200;

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
  input: RemoteInputSource;
  seen: number;
}

export interface RoomNotice {
  kind: 'joined' | 'left';
  slot: PlayerSlot;
  name: string;
}

type Snap = { s: SnapDelta; ev: GameEvent[] };

/**
 * Sala do anfitrião: aceita até 4 pessoas, guarda o personagem e o "pronto" de cada uma, começa a partida e
 * repassa o estado do jogo. O anfitrião é sempre o P1 (slot 0).
 */
export class HostRoom {
  readonly role = 'host' as const;
  phase: RoomPhase = 'lobby';
  onChange: (() => void) | null = null;
  onNotice: ((n: RoomNotice) => void) | null = null;
  /** Alguém saiu no meio da partida (o jogador dele sai do jogo). */
  onGuestLeft: ((slot: PlayerSlot) => void) | null = null;
  private guests = new Map<PlayerSlot, Guest>();
  private server: RoomServer | null = null;
  private timer: ReturnType<typeof setInterval>;
  private closed = false;

  private constructor(
    public me: PlayerLoadout,
    public mapId: string,
    public levelIdx: number,
    private now: Clock,
  ) {
    this.timer = setInterval(() => this.heartbeat(), PING_MS);
  }

  static async open(
    t: Transport,
    me: PlayerLoadout,
    target: { mapId: string; levelIdx: number },
    now: Clock = defaultClock,
  ): Promise<HostRoom> {
    const room = new HostRoom({ ...me, slot: 0 }, target.mapId, target.levelIdx, now);
    try {
      room.server = await t.host((l) => room.accept(l));
    } catch (e) {
      clearInterval(room.timer);
      throw e;
    }
    return room;
  }

  get code(): string {
    return this.server?.code ?? '';
  }

  get guestCount(): number {
    return this.guests.size;
  }

  get full(): boolean {
    return this.guests.size >= MAX_PLAYERS - 1;
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
    const out: RoomPlayer[] = [{ slot: 0, name: me.name, char: me.character, ready: true, level: me.level }];
    for (const g of [...this.guests.values()].sort((a, b) => a.slot - b.slot))
      out.push({ slot: g.slot, name: g.lo.name, char: g.lo.character, ready: g.ready, level: g.lo.level });
    return out;
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

  /** Começa a partida para todos que estão na sala. */
  start(o: Omit<StartMsg, 't' | 'loadouts' | 'mapId' | 'levelIdx'>): StartMsg {
    const msg: StartMsg = {
      t: 'start',
      ...o,
      mapId: this.mapId,
      levelIdx: this.levelIdx,
      loadouts: [{ ...this.me, slot: 0 }],
    };
    for (const g of [...this.guests.values()].sort((a, b) => a.slot - b.slot)) {
      g.inGame = true;
      g.loaded = false;
      g.input = new RemoteInputSource(g.slot, this.now);
      msg.loadouts.push({ ...g.lo, slot: g.slot });
    }
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
    this.changed();
  }

  /** Adaptador de rede da partida: entrada local + a dos convidados; publica o estado. */
  adapter(local: InputSource, onTickEnd?: () => void): HostAdapter {
    const remote = [...this.guests.values()].filter((g) => g.inGame).map((g) => g.input);
    return new HostAdapter(this, [local, ...remote], onTickEnd);
  }

  /**
   * Estado para quem está na partida: as diferenças para todos, e um quadro completo (do mesmo tick) para quem
   * pediu — depois dele, as próximas diferenças valem também para essa pessoa.
   */
  sendSnap(w: World, s: SnapDelta, ev: GameEvent[]): void {
    let full: SnapDelta | null = null;
    for (const g of this.guests.values()) {
      if (!g.inGame) continue;
      if (g.needKey) {
        g.needKey = false;
        full ??= new SnapshotEncoder().encode(w);
        g.link.send({ t: 'snap', s: full, ev } satisfies HostMsg);
      } else g.link.send({ t: 'snap', s, ev } satisfies HostMsg);
    }
  }

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
    this.server?.close();
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
    });
    this.onChange?.();
  }

  private freeSlot(): PlayerSlot {
    let s = 1;
    while (this.guests.has(s as PlayerSlot)) s++;
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
        const why =
          m.v !== NET_VERSION ? 'version' : this.phase === 'playing' ? 'started' : this.full ? 'full' : null;
        if (why) {
          link.send({ t: 'reject', why } satisfies HostMsg);
          setTimeout(() => link.close(), 300);
          return;
        }
        const s = this.freeSlot();
        slot = s;
        const g: Guest = {
          slot: s,
          link,
          lo: sanitizeLoadout(m.lo, s),
          ready: false,
          loaded: false,
          inGame: false,
          needKey: false,
          input: new RemoteInputSource(s, this.now),
          seen: this.now(),
        };
        this.guests.set(s, g);
        link.send({ t: 'welcome', slot: s } satisfies HostMsg);
        this.onNotice?.({ kind: 'joined', slot: s, name: g.lo.name });
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

  private heartbeat(): void {
    const now = this.now();
    for (const g of [...this.guests.values()]) {
      if (now - g.seen > TIMEOUT_MS) this.drop(g.slot);
      else g.link.send({ t: 'ping' } satisfies HostMsg);
    }
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
    private sources: InputSource[],
    private onTickEnd?: () => void,
  ) {}

  localSlots(): PlayerSlot[] {
    return [0];
  }

  setOverride(s: InputSource | null, slot: PlayerSlot = s?.slot ?? 0): void {
    if (s) this.overrides.set(slot, s);
    else this.overrides.delete(slot);
  }

  collectInputs(tick: number): Map<PlayerSlot, InputFrame> {
    const out = new Map<PlayerSlot, InputFrame>();
    for (const src of this.sources) out.set(src.slot, (this.overrides.get(src.slot) ?? src).sample(tick));
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

/** Quem entrou numa sala: vê a lista, escolhe o personagem, fica pronto e espera o anfitrião começar. */
export class GuestRoom {
  readonly role = 'guest' as const;
  phase: RoomPhase = 'lobby';
  players: RoomPlayer[] = [];
  mapId = '';
  levelIdx = 0;
  onChange: (() => void) | null = null;
  onStart: ((m: StartMsg) => void) | null = null;
  onClosed: ((why: LeaveReason) => void) | null = null;
  /** Estado que chegou antes da partida deste aparelho terminar de carregar. */
  private buffer: Snap[] = [];
  private waitKey = false;
  private client: ClientAdapter | null = null;
  private seen: number;
  private timer: ReturnType<typeof setInterval>;
  private closed = false;

  private constructor(
    private link: Link,
    readonly code: string,
    readonly slot: PlayerSlot,
    private now: Clock,
  ) {
    this.seen = now();
    link.onMessage = (raw) => this.recv(raw as HostMsg);
    link.onClose = () => this.end('lost');
    this.timer = setInterval(() => {
      if (this.now() - this.seen > TIMEOUT_MS) {
        this.link.close();
        this.end('lost');
      } else this.send({ t: 'ping' });
    }, PING_MS);
  }

  /** Conecta, se apresenta e espera o "bem-vindo" do anfitrião. */
  static async join(
    t: Transport,
    code: string,
    lo: PlayerLoadout,
    now: Clock = defaultClock,
  ): Promise<GuestRoom> {
    const link = await t.join(code);
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
          resolve(new GuestRoom(link, code, m.slot, now));
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
      link.send({ t: 'hello', v: NET_VERSION, lo } satisfies GuestMsg);
    });
  }

  me(): RoomPlayer | undefined {
    return this.players.find((p) => p.slot === this.slot);
  }

  send(m: GuestMsg): void {
    if (!this.closed) this.link.send(m);
  }

  pick(char: CharacterId, ready: boolean): void {
    const me = this.me();
    if (me) {
      me.char = char;
      me.ready = ready;
    }
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

  leave(): void {
    if (this.closed) return;
    this.send({ t: 'bye' });
    this.closed = true;
    clearInterval(this.timer);
    this.link.onClose = null;
    this.link.close();
  }

  private end(why: LeaveReason): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    this.onClosed?.(why);
  }

  private recv(m: HostMsg): void {
    if (!m || typeof m !== 'object') return;
    this.seen = this.now();
    switch (m.t) {
      case 'room':
        this.players = m.players;
        this.phase = m.phase;
        this.mapId = m.mapId;
        this.levelIdx = m.levelIdx;
        this.onChange?.();
        break;
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
        this.link.onClose = null;
        this.link.close();
        this.end('host-left');
        break;
      default:
        break;
    }
  }
}

/** Mais de tantos estados atrasados de uma vez: só os efeitos dos mais recentes são mostrados. */
const MAX_EVENT_SNAPS = 8;

/**
 * Quem entrou na sala, durante a partida: manda a própria entrada (quando muda, e pelo menos a cada 100 ms) e
 * mostra o estado recebido. A tela fica ~1 envio atrás e desliza entre o estado anterior e o novo.
 */
export class ClientAdapter implements NetAdapter {
  readonly role = 'client' as const;
  private queue: Snap[] = [];
  private override: InputSource | null = null;
  private lastSent = '';
  private sinceSend = 0;
  private snapAt = -1;
  private interval = 50;

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

  alpha(): number {
    if (this.snapAt < 0) return 1;
    return Math.max(0, Math.min(1, (this.now() - this.snapAt) / this.interval));
  }

  receive(w: World): GameEvent[] {
    if (!this.queue.length) return [];
    const a = this.alpha();
    // o que está na tela agora vira o ponto de partida do deslize
    const shown = new Map<number, [number, number, number]>();
    for (const e of w.entities) {
      const t = e.t;
      shown.set(e.id, [t.px + (t.x - t.px) * a, t.py + (t.y - t.py) * a, t.pz + (t.z - t.pz) * a]);
    }
    const q = this.queue;
    this.queue = [];
    const events: GameEvent[] = [];
    q.forEach((m, i) => {
      applyDelta(w, m.s);
      if (i >= q.length - MAX_EVENT_SNAPS) events.push(...m.ev);
      else for (const ev of m.ev) if (ev.t === 'victory' || ev.t === 'gameOver') events.push(ev);
    });
    for (const e of w.entities) {
      const t = e.t;
      const s = shown.get(e.id);
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
    const now = this.now();
    if (this.snapAt >= 0)
      this.interval = Math.max(30, Math.min(250, this.interval * 0.85 + (now - this.snapAt) * 0.15));
    this.snapAt = now;
    return events;
  }

  dispose(): void {
    this.room.detach(this);
  }
}
