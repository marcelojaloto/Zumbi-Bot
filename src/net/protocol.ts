import type { CharacterId, Difficulty } from '../data/types';
import type { PlayerSlot } from '../sim/Entity';
import type { GameEvent } from '../sim/events';
import { emptyFrame, quantizeAxis, quantizeYaw, type InputFrame } from '../sim/InputFrame';
import type { PlayerLoadout } from '../sim/World';
import { sanitizeSave } from '../save/migrations';
import type { SnapDelta } from './delta';

/**
 * Conversa entre o anfitrião (quem criou a sala e roda a partida) e os outros jogadores.
 * Cada aparelho é um jogador; o anfitrião é sempre o P1.
 */
export const NET_VERSION = 1;

/** Letras do código da sala (sem I e O, que confundem com 1 e 0). */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LENGTH = 4;

export function randomCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return s;
}

/** Normaliza o que a pessoa digitou (minúsculas, espaços, traços); null se não for um código válido. */
export function cleanCode(raw: string): string | null {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return s;
}

/** Jogador na sala (o que todos veem na lista). */
export interface RoomPlayer {
  slot: PlayerSlot;
  name: string;
  char: CharacterId;
  ready: boolean;
  level: number;
}

export type RoomPhase = 'lobby' | 'playing' | 'result';

/** Entrada compacta: [botões, andar X, andar Z, mira (0..1023), modo de mira]. */
export type PackedInput = [number, number, number, number, 0 | 1];

export function packInput(f: InputFrame): PackedInput {
  const step = (Math.PI * 2) / 1024;
  const yaw = ((Math.round(quantizeYaw(f.aimYaw) / step) % 1024) + 1024) % 1024;
  return [
    f.buttons,
    Math.round(quantizeAxis(f.moveX) * 127),
    Math.round(quantizeAxis(f.moveZ) * 127),
    yaw,
    f.aimMode,
  ];
}

export function unpackInput(p: PackedInput, tick = 0): InputFrame {
  const yaw = ((p[3] ?? 0) * Math.PI * 2) / 1024;
  return {
    tick,
    buttons: p[0] | 0,
    moveX: quantizeAxis((p[1] ?? 0) / 127),
    moveZ: quantizeAxis((p[2] ?? 0) / 127),
    aimYaw: yaw > Math.PI ? yaw - Math.PI * 2 : yaw,
    aimMode: p[4] === 1 ? 1 : 0,
  };
}

export interface StartMsg {
  t: 'start';
  seed: number;
  mapId: string;
  levelIdx: number;
  difficulty: Difficulty;
  ngPlus: boolean;
  enemyCap: number;
  loadouts: PlayerLoadout[];
}

/** Mensagens de quem entrou na sala para o anfitrião. */
export type GuestMsg =
  | { t: 'hello'; v: number; lo: PlayerLoadout }
  | { t: 'pick'; char: CharacterId; ready: boolean }
  | { t: 'in'; f: PackedInput }
  /** Terminou de carregar a fase. */
  | { t: 'loaded' }
  /** Ficou para trás (aba em segundo plano, fila cheia): pede um quadro completo. */
  | { t: 'key' }
  | { t: 'ping' }
  | { t: 'bye' };

/** Mensagens do anfitrião para quem entrou. */
export type HostMsg =
  | { t: 'welcome'; slot: PlayerSlot }
  | { t: 'reject'; why: 'full' | 'started' | 'version' }
  | { t: 'room'; players: RoomPlayer[]; phase: RoomPhase; mapId: string; levelIdx: number }
  | StartMsg
  | { t: 'snap'; s: SnapDelta; ev: GameEvent[] }
  | { t: 'ping' }
  | { t: 'bye' };

/**
 * Entrada de um jogador remoto no anfitrião: usa o último quadro recebido, mas um botão apertado e solto entre
 * dois ticks ainda conta (toques rápidos não se perdem). Sem notícias por um tempo, o jogador fica parado.
 */
export class RemoteInputSource {
  private last = emptyFrame();
  private tapped = 0;
  private at = -Infinity;

  constructor(
    readonly slot: PlayerSlot,
    private now: () => number = () => performance.now(),
    private staleMs = 300,
  ) {}

  push(p: PackedInput): void {
    const f = unpackInput(p);
    this.tapped |= f.buttons;
    this.last = f;
    this.at = this.now();
  }

  sample(tick: number): InputFrame {
    if (this.now() - this.at > this.staleMs) {
      this.tapped = 0;
      return emptyFrame(tick);
    }
    const f = { ...this.last, tick, buttons: this.last.buttons | this.tapped };
    this.tapped = 0;
    return f;
  }
}

/** Equipamento de quem entrou, validado como um save (ids desconhecidos somem, números limitados). */
export function sanitizeLoadout(raw: unknown, slot: PlayerSlot): PlayerLoadout {
  const lo = (raw && typeof raw === 'object' ? raw : {}) as Partial<PlayerLoadout>;
  const s = sanitizeSave({
    profile: { name: lo.name, level: lo.level, xp: lo.xp, character: lo.character },
    unlocks: { firearms: lo.guns, staffs: lo.staffs },
    cosmetics: { owned: lo.ownedCosmetics, equipped: lo.cosmetics, pity: lo.pity },
  });
  return {
    slot,
    name: s.profile.name,
    character: s.profile.character,
    level: s.profile.level,
    xp: s.profile.xp,
    guns: s.unlocks.firearms,
    staffs: s.unlocks.staffs,
    cosmetics: s.cosmetics.equipped,
    pity: s.cosmetics.pity,
    ownedCosmetics: s.cosmetics.owned,
  };
}
