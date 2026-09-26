import type {
  AmmoType,
  BossStep,
  CharacterId,
  DamageType,
  HitSource,
  Element,
  ExplosionSpec,
  HazardKind,
  HitSpec,
  MeleeId,
  PowerId,
  ProjVisual,
  PropKind,
  StaffId,
  StatusId,
  TelegraphShape,
  WeaponId,
  ZoneSpec,
} from '../data/types';

export type EntityId = number;
export type PlayerSlot = 0 | 1 | 2 | 3;
export type EntityKind = 'player' | 'enemy' | 'boss' | 'projectile' | 'pickup' | 'prop' | 'hazard';
/** 'neutral' atinge todos (barris, perigos do cenário). */
export type Team = 'players' | 'enemies' | 'neutral';

export interface Transform {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Posição no tick anterior (interpolação de render). */
  px: number;
  py: number;
  pz: number;
  facing: 1 | -1;
}

export interface Body {
  radius: number;
  height: number;
  mass: number;
  grounded: boolean;
  gravityScale: number;
  /** Altura de voo alvo (drones). */
  fly?: number;
  /** Deitado / fora do alcance de projéteis. */
  low?: boolean;
  /** Não é empurrado por separação. */
  anchored?: boolean;
}

export interface Health {
  hp: number;
  max: number;
  shield: number;
  invuln: number;
  poise: number;
  poiseMax: number;
  poiseTimer: number;
  lastHitBy: EntityId;
  lastHitType: DamageType | null;
  /** Ticks desde o último dano recebido. */
  sinceHit: number;
}

export type FighterState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'attack'
  | 'cast'
  | 'hurt'
  | 'knockdown'
  | 'down'
  | 'getup'
  | 'dead'
  | 'frozen'
  | 'stunned'
  | 'spawn'
  | 'windup'
  | 'recover'
  | 'stagger'
  | 'grab';

export interface Fighter {
  state: FighterState;
  /** Ticks no estado atual. */
  st: number;
  moveId: string | null;
  hitSet: EntityId[];
  hitstun: number;
  hitstop: number;
  juggle: number;
  /** Botão armazenado no buffer ('J' | 'K') e ticks restantes. */
  buffer: 'J' | 'K' | null;
  bufferTicks: number;
  superArmor: boolean;
  /** Já usou o ataque aéreo neste pulo. */
  airUsed: boolean;
}

export interface StatusInstance {
  id: StatusId;
  ticks: number;
  stacks: number;
  src: EntityId;
  acc: number;
}

export interface WeaponAmmo {
  mag: number;
}

export interface FirearmState {
  /** Tempo (s) até o próximo tiro. */
  cd: number;
  reload: number;
  reloadTotal: number;
  /** Recarga por cartucho em andamento. */
  shellReload: boolean;
  bloom: number;
  recoil: number;
  spin: number;
  triggerWasDown: boolean;
  /** Pump/bolt: precisa soltar e engatilhar. */
  needsRelease: boolean;
}

export interface PlayerComp {
  slot: PlayerSlot;
  name: string;
  character: CharacterId;
  level: number;
  xp: number;
  mana: number;
  manaMax: number;
  manaDelay: number;
  lives: number;
  score: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  kills: number;
  bossKills: number;
  damageTaken: number;
  livesLost: number;
  /** Botões atuais e do tick anterior (bordas calculadas na simulação). */
  buttons: number;
  prevButtons: number;
  moveX: number;
  moveZ: number;
  prevMoveX: number;
  aimYaw: number;
  aimMode: 0 | 1;
  jumpsUsed: number;
  coyote: number;
  jumpBuffer: number;
  running: boolean;
  /** Corrida travada por toque duplo. */
  tapRun: boolean;
  tapDir: number;
  tapTick: number;
  mode: 'gun' | 'staff';
  guns: WeaponId[];
  gunIdx: number;
  ammoMag: Partial<Record<WeaponId, number>>;
  ammo: Record<AmmoType, number>;
  fire: FirearmState;
  staffs: StaffId[];
  staffIdx: number;
  staffCd: Partial<Record<StaffId, number>>;
  castStaff: StaffId | null;
  /** O efeito da conjuração atual já foi liberado. */
  castFired: boolean;
  melee: { id: MeleeId; durability: number } | null;
  powers: Record<PowerId, number>;
  aiming: boolean;
  respawn: number;
  /** Tempo de mira para crítico (ticks mirando parado). */
  aimTicks: number;
  scrap: number;
  loot: string[];
  pity: number;
  /** Mash para sair do congelamento. */
  mash: number;
  god: boolean;
  lastFireTick: number;
}

export type AiMode = 'approach' | 'wait' | 'windup' | 'attack' | 'recover' | 'retreat' | 'spawn' | 'idle';

export interface AiComp {
  mode: AiMode;
  mt: number;
  target: EntityId;
  token: 'melee' | 'ranged' | null;
  tokenTicks: number;
  slot: number;
  slotX: number;
  slotZ: number;
  attackId: string | null;
  cooldowns: Record<string, number>;
  replan: number;
  /** Dados livres do cérebro (fuse, strafe, etc.). */
  a: number;
  b: number;
  c: number;
  shotsLeft: number;
  aggro: boolean;
  /** Já entrou na área visível (passa a respeitar os limites da câmera). */
  entered: boolean;
  fromSpawn: string;
}

export interface BossComp {
  phase: number;
  transitioning: boolean;
  patternId: string | null;
  steps: BossStep[];
  pc: number;
  stepTick: number;
  stepData: Record<string, number>;
  cooldowns: Record<string, number>;
  idle: number;
  element: Element;
  vulnMult: number;
  vulnTicks: number;
  staggered: number;
  addsTimer: number;
  cycleTimer: number;
  cycleIdx: number;
  scaleMult: number;
  intro: number;
  defeated: boolean;
  lastPattern: string | null;
  /** Pose de animação atual do chefe e sua duração (ticks). */
  pose: string | null;
  poseTicks: number;
  poseStart: number;
  /** Posição marcada por um aviso (usada pelo passo seguinte). */
  markX: number;
  markZ: number;
  /** Alvos já atingidos na investida atual. */
  chargeHits: number[];
}

export interface ProjectileComp {
  owner: EntityId;
  visual: ProjVisual;
  hit: HitSpec;
  radius: number;
  gravity: number;
  pierce: number;
  hitSet: EntityId[];
  homing: number;
  homingTarget: EntityId;
  onImpact?: { explosion?: ExplosionSpec; zone?: ZoneSpec };
  /** Origem X/Z para queda de dano por distância. */
  ox: number;
  oz: number;
  falloff?: { start: number; end: number; minMult: number };
  crit: number;
  element?: Element;
  fuse: number;
  bounce: boolean;
  special?: 'charmRobot' | 'charmZombie';
  hp: number;
  boomerang: boolean;
  turnAt: number;
  age: number;
  staff?: StaffId;
  weapon?: WeaponId;
}

export type HazardShape =
  | { k: 'circle'; r: number }
  | { k: 'rect'; w: number; d: number }
  | { k: 'lane'; width: number; x0: number; x1: number }
  | { k: 'cone'; angle: number; range: number; dir: number }
  | { k: 'ring'; r: number; width: number };

export interface HazardComp {
  owner: EntityId;
  shape: HazardShape;
  hit: HitSpec;
  /** Ticks de aviso antes de ficar ativo. */
  delay: number;
  active: number;
  /** Intervalo entre acertos (0 = acerto único por alvo). */
  tickEvery: number;
  tickAcc: number;
  hitSet: EntityId[];
  /** Crescimento do raio por tick (anel/onda). */
  grow: number;
  /** Altura máxima atingida (pular por cima de ondas de choque). */
  height: number;
  hitsAll: boolean;
  fx: string;
  slow: number;
  /** Tipo ambiental (para comportamento cíclico). */
  env?: HazardKind;
  period: number;
  phase: number;
  /** Deslocamento do ciclo (ticks). */
  offset: number;
  telegraph?: TelegraphShape;
  element?: Element;
  pushX: number;
  pushZ: number;
  /** Origem do dano quando o dono é um jogador. */
  source?: HitSource;
}

export interface PickupComp {
  item: string;
  auto: boolean;
  despawn: number;
  /** Ticks até poder ser coletado. */
  grace: number;
}

export interface PropComp {
  kind: PropKind;
  drop?: string;
}

export interface ControlComp {
  ticks: number;
  by: EntityId;
  kind: 'hacked' | 'raised';
}

export interface Entity {
  id: EntityId;
  kind: EntityKind;
  team: Team;
  defId: string;
  alive: boolean;
  /** Ticks desde o spawn. */
  age: number;
  t: Transform;
  body?: Body;
  health?: Health;
  fighter?: Fighter;
  statuses?: StatusInstance[];
  player?: PlayerComp;
  ai?: AiComp;
  boss?: BossComp;
  projectile?: ProjectileComp;
  pickup?: PickupComp;
  prop?: PropComp;
  hazard?: HazardComp;
  control?: ControlComp;
  /** Ticks até remover automaticamente. */
  lifetime?: number;
  /** Tempo em que ficou morto (para remoção do corpo). */
  deadTicks?: number;
  /** Escala visual extra. */
  scale?: number;
  /** Multiplicadores de mapa/dificuldade. */
  dmgMult?: number;
}

export function makeTransform(x: number, y: number, z: number, facing: 1 | -1 = 1): Transform {
  return { x, y, z, vx: 0, vy: 0, vz: 0, px: x, py: y, pz: z, facing };
}

export function makeHealth(max: number, poise = 0): Health {
  return {
    hp: max,
    max,
    shield: 0,
    invuln: 0,
    poise,
    poiseMax: poise,
    poiseTimer: 0,
    lastHitBy: 0,
    lastHitType: null,
    sinceHit: 9999,
  };
}

export function makeFighter(state: FighterState = 'idle'): Fighter {
  return {
    state,
    st: 0,
    moveId: null,
    hitSet: [],
    hitstun: 0,
    hitstop: 0,
    juggle: 0,
    buffer: null,
    bufferTicks: 0,
    superArmor: false,
    airUsed: false,
  };
}

export function hasStatus(e: Entity, id: StatusId): boolean {
  return !!e.statuses?.some((s) => s.id === id);
}

export function statusStacks(e: Entity, id: StatusId): number {
  return e.statuses?.find((s) => s.id === id)?.stacks ?? 0;
}

export function isHostile(a: Team, b: Team): boolean {
  if (a === 'neutral' || b === 'neutral') return true;
  return a !== b;
}

export function isCharacter(e: Entity): boolean {
  return e.kind === 'player' || e.kind === 'enemy' || e.kind === 'boss';
}
