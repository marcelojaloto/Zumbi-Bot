import type {
  DamageType,
  Element,
  ItemId,
  MeleeId,
  PowerId,
  ProjVisual,
  StaffId,
  StatusId,
  TelegraphShape,
  WeaponId,
} from '../data/types';
import type { EntityId } from './Entity';

export interface RunStats {
  mapId: string;
  levelId: string;
  score: number;
  kills: number;
  maxCombo: number;
  timeMs: number;
  livesLost: number;
  damageTaken: number;
  xpGained: number;
  bossKills: number;
  stars: number;
  loot: string[];
  scrap: number;
  unlockedStaff?: StaffId;
  unlockedGuns: WeaponId[];
  victory: boolean;
}

/**
 * Eventos emitidos pela simulação. São a ÚNICA saída do sim: render, áudio e UI apenas consomem.
 * São objetos simples e serializáveis (futuramente replicados no co-op).
 */
export type GameEvent =
  | {
      t: 'hit';
      src: EntityId;
      dst: EntityId;
      amount: number;
      dtype: DamageType;
      crit: boolean;
      x: number;
      y: number;
      z: number;
      heavy: boolean;
      shield: boolean;
      blocked?: boolean;
    }
  | { t: 'heal'; dst: EntityId; amount: number; x: number; y: number; z: number }
  | {
      t: 'death';
      id: EntityId;
      defId: string;
      killer: EntityId;
      x: number;
      y: number;
      z: number;
      family: string;
    }
  | { t: 'spawn'; id: EntityId }
  | { t: 'swing'; id: EntityId; move: string; heavy: boolean }
  | {
      t: 'shot';
      id: EntityId;
      weapon: WeaponId | 'enemy';
      x: number;
      y: number;
      z: number;
      dx: number;
      dz: number;
      visual?: ProjVisual;
    }
  | { t: 'tracer'; x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; color: number }
  | {
      t: 'beam';
      x0: number;
      y0: number;
      z0: number;
      x1: number;
      y1: number;
      z1: number;
      element: Element | 'laser';
    }
  | { t: 'cast'; id: EntityId; staff: StaffId; x: number; y: number; z: number; dir: number }
  | { t: 'explosion'; x: number; y: number; z: number; r: number; element?: Element | 'explosive' }
  | { t: 'impact'; x: number; y: number; z: number; visual: ProjVisual; element?: Element }
  | { t: 'status'; id: EntityId; status: StatusId; on: boolean }
  | { t: 'interaction'; id: EntityId; kind: 'steam' | 'shatter' | 'conduct' | 'spread' | 'ignite' | 'freeze' }
  | { t: 'pickup'; player: EntityId; item: ItemId; x: number; y: number; z: number }
  | { t: 'reload'; id: EntityId; phase: 'start' | 'end' | 'shell'; weapon: WeaponId }
  | { t: 'dryfire'; id: EntityId }
  | { t: 'weaponSwap'; id: EntityId; mode: 'gun' | 'staff'; weapon: string }
  | { t: 'meleeBreak'; id: EntityId; melee: MeleeId }
  | { t: 'levelUp'; player: EntityId; level: number }
  | { t: 'xp'; player: EntityId; amount: number }
  | { t: 'power'; player: EntityId; power: PowerId; on: boolean }
  | { t: 'segment'; phase: 'locked' | 'cleared'; index: number }
  | { t: 'go' }
  | {
      t: 'telegraph';
      owner: EntityId;
      hazard: EntityId;
      shape: TelegraphShape;
      x: number;
      z: number;
      ticks: number;
      color: number;
    }
  | { t: 'bossIntro'; id: EntityId; bossId: string }
  | { t: 'bossPhase'; id: EntityId; phase: number }
  | { t: 'bossDefeated'; id: EntityId; bossId: string }
  | { t: 'bossElement'; id: EntityId; element: Element }
  | { t: 'shake'; trauma: number }
  | { t: 'sfx'; id: string; x: number; vol?: number }
  | { t: 'loot'; player: EntityId; cosmetic?: string; scrap?: number; duplicate?: boolean }
  | { t: 'unlock'; player: EntityId; kind: 'gun' | 'staff'; id: string }
  | { t: 'playerDown'; player: EntityId; livesLeft: number }
  | { t: 'respawn'; player: EntityId }
  | { t: 'jump'; id: EntityId; double: boolean }
  | { t: 'land'; id: EntityId; heavy: boolean }
  | { t: 'footstep'; id: EntityId }
  | { t: 'groan'; id: EntityId }
  | { t: 'combo'; player: EntityId; combo: number }
  | { t: 'control'; id: EntityId; kind: 'hacked' | 'raised'; on: boolean }
  | { t: 'propBreak'; id: EntityId; kind: string; x: number; y: number; z: number }
  | { t: 'hint'; text: string }
  | { t: 'victory'; stats: RunStats }
  | { t: 'gameOver'; stats: RunStats };

export type GameEventType = GameEvent['t'];
