import { Rng } from '../core/rng';
import { DIFFICULTY, NG_PLUS, VIEW_HALF_WIDTH } from '../data/balance';
import type {
  CosmeticId,
  CosmeticSlot,
  Difficulty,
  LevelDef,
  MapDef,
  StaffId,
  WeaponId,
} from '../data/types';
import type { Entity, EntityId, EntityKind, PlayerSlot } from './Entity';
import type { GameEvent } from './events';
import type { InputFrame } from './InputFrame';
import { runSystems } from './systems';
import { createLevelState, type LevelState } from './level/LevelRunner';
import { createDirector, type DirectorState } from './ai/director';
import { spawnPlayer } from './spawn';

export interface PlayerLoadout {
  slot: PlayerSlot;
  name: string;
  level: number;
  xp: number;
  guns: WeaponId[];
  staffs: StaffId[];
  cosmetics: Partial<Record<CosmeticSlot, CosmeticId>>;
  pity: number;
  ownedCosmetics: CosmeticId[];
}

export interface WorldOptions {
  seed: number;
  map: MapDef;
  levelIdx: number;
  loadouts: PlayerLoadout[];
  difficulty: Difficulty;
  /** Limite de inimigos vivos simultâneos (depende da qualidade gráfica). */
  enemyCap: number;
  /** Sem ondas/boss (sandbox / testes). */
  noLevel?: boolean;
  /** Novo Jogo+ (desbloqueado ao derrotar o OMEGA-Z). */
  ngPlus?: boolean;
}

export interface Bounds {
  minX: number;
  maxX: number;
  zMin: number;
  zMax: number;
}

/**
 * Estado completo da simulação. Não conhece three.js nem o DOM. Avança em ticks fixos
 * e comunica tudo para fora via `events`.
 */
export class World {
  tick = 0;
  readonly rng: Rng;
  readonly map: MapDef;
  readonly level: LevelDef;
  readonly levelIdx: number;
  readonly difficulty: Difficulty;
  readonly diff: (typeof DIFFICULTY)[Difficulty];
  readonly enemyCap: number;
  readonly loadouts: PlayerLoadout[];
  readonly noLevel: boolean;
  readonly ngPlus: boolean;

  entities: Entity[] = [];
  byId = new Map<EntityId, Entity>();
  players: EntityId[] = [];
  events: GameEvent[] = [];

  /** Âncora da câmera no eixo X (nunca volta para trás; travada por segmentos). */
  camX: number;
  bounds: Bounds;
  lock: { minX: number; maxX: number } | null = null;
  /** Limite de avanço até concluir o próximo segmento/chefe. */
  limitX = Infinity;
  zBand: [number, number];

  levelState: LevelState;
  director: DirectorState;
  /** Congelamento global (freeze frame de finalização). */
  freeze = 0;
  finished: 'victory' | 'gameOver' | null = null;
  finishedTick = 0;
  /** Escala de tempo solicitada pelo sim (slow-mo); aplicada pelo loop. */
  slowmo = 0;

  private nextId = 5;

  constructor(readonly opts: WorldOptions) {
    this.rng = new Rng(opts.seed);
    this.map = opts.map;
    this.levelIdx = opts.levelIdx;
    this.level = opts.map.levels[opts.levelIdx]!;
    this.difficulty = opts.difficulty;
    this.ngPlus = !!opts.ngPlus;
    const d = DIFFICULTY[opts.difficulty];
    this.diff = this.ngPlus
      ? {
          ...d,
          enemyHp: d.enemyHp * NG_PLUS.enemyHp,
          bossHp: d.bossHp * NG_PLUS.enemyHp,
          enemyDmg: d.enemyDmg * NG_PLUS.enemyDmg,
        }
      : d;
    this.enemyCap = opts.enemyCap;
    this.loadouts = opts.loadouts;
    this.noLevel = !!opts.noLevel;
    this.zBand = [...this.level.zBand];
    this.camX = this.level.playerStart.x + VIEW_HALF_WIDTH - 3;
    this.bounds = { minX: 0, maxX: this.level.length, zMin: this.zBand[0], zMax: this.zBand[1] };
    this.levelState = createLevelState(this);
    this.director = createDirector();
    for (const lo of opts.loadouts) spawnPlayer(this, lo);
  }

  get playerCount(): number {
    return this.players.length;
  }

  get(id: EntityId): Entity | undefined {
    return this.byId.get(id);
  }

  /** Adiciona uma entidade (ids 1..4 são reservados aos slots de jogador). */
  add(e: Omit<Entity, 'id'> & { id?: EntityId }): Entity {
    const id = e.id ?? this.nextId++;
    const ent = e as Entity;
    ent.id = id;
    this.entities.push(ent);
    if (this.entities.length > 1 && this.entities[this.entities.length - 2]!.id > id) {
      this.entities.sort((a, b) => a.id - b.id);
    }
    this.byId.set(id, ent);
    if (ent.kind === 'player') this.players.push(id);
    this.emit({ t: 'spawn', id });
    return ent;
  }

  remove(id: EntityId): void {
    const e = this.byId.get(id);
    if (!e) return;
    e.alive = false;
    this.byId.delete(id);
    const i = this.entities.indexOf(e);
    if (i >= 0) this.entities.splice(i, 1);
    this.players = this.players.filter((p) => p !== id);
  }

  emit(ev: GameEvent): void {
    this.events.push(ev);
  }

  drainEvents(): GameEvent[] {
    const ev = this.events;
    this.events = [];
    return ev;
  }

  ofKind(kind: EntityKind): Entity[] {
    return this.entities.filter((e) => e.kind === kind && e.alive);
  }

  playerEntities(): Entity[] {
    const out: Entity[] = [];
    for (const id of this.players) {
      const e = this.byId.get(id);
      if (e) out.push(e);
    }
    return out;
  }

  /** Jogadores vivos e ativos (não em respawn). */
  activePlayers(): Entity[] {
    return this.playerEntities().filter((p) => p.fighter!.state !== 'dead' && p.player!.respawn <= 0);
  }

  enemiesAlive(): number {
    let n = 0;
    for (const e of this.entities)
      if (e.kind === 'enemy' && e.alive && e.fighter!.state !== 'dead' && e.team === 'enemies') n++;
    return n;
  }

  /** Avança um tick de simulação. */
  step(inputs: ReadonlyMap<PlayerSlot, InputFrame>): void {
    for (const e of this.entities) {
      e.t.px = e.t.x;
      e.t.py = e.t.y;
      e.t.pz = e.t.z;
    }
    runSystems(this, inputs);
    this.tick++;
  }

  updateBounds(): void {
    const half = VIEW_HALF_WIDTH;
    let minX = this.camX - half;
    let maxX = this.camX + half;
    if (minX < 0) {
      minX = 0;
      maxX = half * 2;
    }
    if (maxX > this.level.length) {
      maxX = this.level.length;
      minX = Math.max(0, maxX - half * 2);
    }
    this.bounds.minX = minX;
    this.bounds.maxX = maxX;
    this.bounds.zMin = this.zBand[0];
    this.bounds.zMax = this.zBand[1];
  }
}
