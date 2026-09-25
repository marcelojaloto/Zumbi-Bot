/**
 * Tipos das definições data-driven do jogo. Nada aqui depende de three.js ou do DOM:
 * cores são números hexadecimais e malhas são "receitas" de primitivas.
 */

// ---------------------------------------------------------------------------
// Identificadores
// ---------------------------------------------------------------------------
export type MapId = string;
export type LevelId = string;
export type EnemyId = string;
export type BossId = string;
export type ItemId = string;
export type CosmeticId = string;
export type LootTableId = string;
export type MusicId = string;
export type SfxId = string;
export type FxId = string;

export type WeaponId = 'pistol' | 'shotgun' | 'smg' | 'rifle' | 'sniper' | 'mg' | 'gl';
export type MeleeId = 'knife' | 'machete' | 'katana' | 'bat' | 'pipe' | 'sledge';
export type Element =
  'heal' | 'fire' | 'water' | 'ice' | 'electric' | 'toxic' | 'cyber' | 'wind' | 'earth' | 'necro';
export type StaffId = Element;
export type AmmoType = 'light' | 'shell' | 'rifle' | 'sniper' | 'grenade';

export type DamageType =
  | 'blunt'
  | 'blade'
  | 'bullet'
  | 'explosive'
  | 'fire'
  | 'water'
  | 'ice'
  | 'electric'
  | 'toxic'
  | 'cyber'
  | 'wind'
  | 'earth'
  | 'necro'
  | 'holy';

export type StatusId =
  | 'burn'
  | 'wet'
  | 'chill'
  | 'freeze'
  | 'stun'
  | 'poison'
  | 'root'
  | 'hacked'
  | 'raised'
  | 'regen'
  | 'slow'
  | 'glitch';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Resist = Partial<Record<DamageType, number>>;

export type UnlockCond =
  | { kind: 'start' }
  | { kind: 'pickup'; mapId: MapId }
  | { kind: 'boss'; bossId: BossId }
  | { kind: 'level'; playerLevel: number };

// ---------------------------------------------------------------------------
// Combate
// ---------------------------------------------------------------------------
export interface StatusApply {
  id: StatusId;
  /** Probabilidade [0,1]; padrão 1. */
  chance?: number;
  durationS?: number;
  stacks?: number;
}

export interface HitSpec {
  damage: number;
  dtype: DamageType;
  /** Impulso horizontal (m/s) na direção do golpe. */
  knockback: number;
  /** Impulso vertical (m/s). */
  launch?: number;
  knockdown?: boolean;
  /** Ticks de hitstun no alvo. */
  hitstun: number;
  /** Ticks de congelamento de impacto (atacante e alvo). */
  hitstop: number;
  /** Dano de poise; padrão = damage. */
  poise?: number;
  status?: StatusApply;
  /** Golpe pesado: mais tremor/efeitos. */
  heavy?: boolean;
}

/** Caixa de acerto relativa ao atacante (x para frente, espelhada pela direção). */
export interface Hitbox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  zTol: number;
}

export interface AoeBox {
  aoeR: number;
  y0?: number;
  y1?: number;
}

export interface MeleeMoveDef {
  id: string;
  /** Chave da pose de animação. */
  pose: string;
  startup: number;
  active: number;
  recovery: number;
  hitbox: Hitbox | AoeBox;
  hit: HitSpec;
  /** A partir deste tick do golpe, o próximo comando do combo pode cancelar. */
  cancelFrom?: number;
  next?: { J?: string; K?: string };
  /** Velocidade para frente durante startup+active (m/s). */
  lunge?: number;
  manaCost?: number;
  hpCost?: number;
  invulnActive?: boolean;
  superArmor?: boolean;
  /** Golpe aéreo (termina ao tocar o chão). */
  air?: boolean;
  /** Múltiplos acertos: re-arma o hitSet a cada N ticks ativos. */
  rehitEvery?: number;
}

export interface ExplosionSpec {
  radius: number;
  damage: number;
  /** Multiplicador de dano na borda do raio. */
  minMult: number;
  dtype: DamageType;
  knockback: number;
  launch?: number;
  /** Multiplicador de dano no próprio atirador (0 = imune). */
  selfMult: number;
  status?: StatusApply;
  fx?: FxId;
}

export interface ZoneSpec {
  radius: number;
  durationS: number;
  tickS: number;
  hit: HitSpec;
  fx: FxId;
  /** Zona também afeta o time que a criou (ex.: poça tóxica ambiental). */
  hitsAll?: boolean;
  /** Modificador de movimento dentro da zona. */
  slow?: number;
}

export type ProjVisual =
  | 'bullet'
  | 'pellet'
  | 'tracer'
  | 'grenade'
  | 'orb_fire'
  | 'jet_water'
  | 'shard_ice'
  | 'glob_toxic'
  | 'packet_cyber'
  | 'skull_necro'
  | 'acid'
  | 'laser'
  | 'rock'
  | 'fireball'
  | 'missile'
  | 'blade'
  | 'tombstone'
  | 'plasma'
  | 'iceball'
  | 'mudball'
  | 'spark';

export interface ProjectileSpec {
  visual: ProjVisual;
  speed: number;
  radius: number;
  lifeS: number;
  hit: HitSpec;
  gravity?: number;
  pierce?: number;
  /** Velocidade angular de perseguição (rad/s). */
  homing?: number;
  /** Lança em arco para cair no alvo. */
  lob?: boolean;
  /** Altura de disparo (m). */
  y?: number;
  onImpact?: { explosion?: ExplosionSpec; zone?: ZoneSpec };
  /** Projétil destrutível (pode ser abatido). */
  hp?: number;
  /** Volta ao dono depois de metade da vida (bumerangue). */
  boomerang?: boolean;
}

// ---------------------------------------------------------------------------
// Armas
// ---------------------------------------------------------------------------
export interface MeshPart {
  shape: 'box' | 'cyl' | 'cone' | 'sphere' | 'ico' | 'torus' | 'capsule' | 'oct' | 'tet';
  /** box: [w,h,d]; cyl: [rTop,rBottom,h,seg?]; cone: [r,h,seg?]; sphere/ico/oct/tet: [r,detail?]; torus: [r,tube]; capsule: [r,len] */
  size: number[];
  pos?: [number, number, number];
  rot?: [number, number, number];
  color: number;
  /** Parte emissiva (brilha com o bloom). */
  glow?: boolean;
  glowIntensity?: number;
}

export interface MeshRecipe {
  parts: MeshPart[];
}

export interface MeleeWeaponDef {
  id: MeleeId;
  name: string;
  category: 'blade' | 'blunt';
  /** Golpes do combo (ids de MeleeMoveDef). */
  combo: string[];
  durability: number;
  mesh: MeshRecipe;
}

export type ReloadSpec = { kind: 'mag'; s: number } | { kind: 'perShell'; startS: number; perShellS: number };

export type FirearmDelivery =
  | { kind: 'bullet'; speed: number; pierce: number; visual: ProjVisual }
  | { kind: 'hitscan'; pierce: number }
  | { kind: 'grenade'; speed: number; gravity: number; fuseS: number; explosion: ExplosionSpec };

export interface FirearmDef {
  id: WeaponId;
  name: string;
  short: string;
  ammo: AmmoType;
  mode: 'semi' | 'auto' | 'pump' | 'bolt';
  rpm: number;
  mag: number;
  /** 'infinite' = reserva infinita (pistola). */
  reserveMax: number | 'infinite';
  reload: ReloadSpec;
  damage: number;
  pellets: number;
  dtype: DamageType;
  /** Multiplicador de crítico quando mirando. */
  aimedCrit: number;
  spreadDeg: number;
  aimedSpreadMult: number;
  bloomPerShot: number;
  bloomMax: number;
  /** Recuperação do bloom (graus/s). */
  bloomRecover: number;
  recoilDeg: number;
  recoilRecover: number;
  /** Empurrão no atirador (m/s). */
  pushback: number;
  spinUpS?: number;
  moveMultFiring: number;
  range: { falloffStart: number; falloffEnd: number; minMult: number; max: number };
  delivery: FirearmDelivery;
  knockback: number;
  hitstun: number;
  sfx: SfxId;
  mesh: MeshRecipe;
  unlock: UnlockCond;
  desc: string;
}

export type StaffDelivery =
  | {
      kind: 'projectile';
      speed: number;
      radius: number;
      lifeS: number;
      pierce: number;
      visual: ProjVisual;
      count?: number;
      spreadDeg?: number;
      gravity?: number;
      homing?: number;
    }
  | { kind: 'hitscan'; range: number; chain?: { jumps: number; radius: number; falloff: number } }
  | { kind: 'cone'; range: number; angleDeg: number }
  | { kind: 'groundWave'; speed: number; range: number; width: number }
  | { kind: 'aura'; radius: number };

export interface StaffDef {
  id: StaffId;
  name: string;
  element: Element;
  color: number;
  manaCost: number;
  cooldownS: number;
  castTicks: number;
  delivery: StaffDelivery;
  hit: HitSpec;
  onImpact?: { explosion?: ExplosionSpec; zone?: ZoneSpec };
  special?: 'heal' | 'charmRobot' | 'charmZombie';
  healAmount?: number;
  sfx: SfxId;
  unlock: UnlockCond;
  desc: string;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
export interface StatusEffectDef {
  id: StatusId;
  name: string;
  color: number;
  icon: string;
  durationS: number;
  stacking: 'refresh' | 'extend' | 'stack' | 'ignore';
  maxStacks: number;
  tick?: { everyS: number; damage: number; dtype: DamageType; perStack: boolean };
  mods?: {
    moveMult?: number;
    perStackMoveMult?: number;
    canMove?: boolean;
    canAct?: boolean;
    regenBlocked?: boolean;
    invertMove?: boolean;
  };
  teamSwitch?: boolean;
  /** Multiplicador de duração em bosses (0 = imune). */
  bossDurationMult: number;
  bossFallback?: StatusId;
  onMaxStacks?: StatusId;
  /** Cor de tinta aplicada ao personagem. */
  tint?: number;
  heal?: number;
}

// ---------------------------------------------------------------------------
// Inimigos
// ---------------------------------------------------------------------------
export type Archetype = 'walker' | 'runner' | 'brute' | 'spitter' | 'exploder' | 'drone' | 'soldier' | 'mech';

export type RigKind = 'humanoid' | 'robot' | 'drone' | 'mech';

export interface RigParams {
  kind: RigKind;
  scale: number;
  skin: number;
  cloth: number;
  cloth2: number;
  eye: number;
  /** Curvatura/postura zumbi 0..1. */
  hunch?: number;
  /** Membros faltando / rasgos (variações). */
  variants?: number;
  bulk?: number;
  accessory?: 'none' | 'helmet' | 'tie' | 'axe' | 'barrel' | 'gasmask' | 'flames' | 'bank' | 'hood' | 'cap';
}

export type EnemyAttackKind =
  'melee' | 'lunge' | 'charge' | 'slam' | 'ranged' | 'burst' | 'beam' | 'explode' | 'flame' | 'minigun';

export interface EnemyAttackDef {
  id: string;
  kind: EnemyAttackKind;
  move?: MeleeMoveDef;
  projectile?: ProjectileSpec;
  hit?: HitSpec;
  /** Distância (m) para usar o ataque. */
  range: [number, number];
  windup: number;
  cooldownS: number;
  weight: number;
  token: 'melee' | 'ranged';
  count?: number;
  interval?: number;
  speed?: number;
  durationS?: number;
  radius?: number;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  family: 'zombie' | 'robot';
  archetype: Archetype;
  hp: number;
  speed: number;
  poise: number;
  mass: number;
  radius: number;
  height: number;
  /** Altura de voo (drones). */
  fly?: number;
  attacks: EnemyAttackDef[];
  resist: Resist;
  statusImmune?: StatusId[];
  keepDistance?: [number, number];
  dodgeChance?: number;
  aura?: { status: StatusId; radius: number; hit?: HitSpec };
  onDeath?: { explosion?: ExplosionSpec; zone?: ZoneSpec };
  superArmor?: boolean;
  rewards: { xp: number; score: number; scrap: [number, number]; drops: LootTableId; cosmeticChance: number };
  rig: RigParams;
  groan?: boolean;
}

// ---------------------------------------------------------------------------
// Bosses
// ---------------------------------------------------------------------------
export type TelegraphShape =
  | { k: 'circle'; r: number }
  | { k: 'rect'; w: number; d: number }
  | { k: 'lane'; width: number }
  | { k: 'cone'; angleDeg: number; range: number }
  | { k: 'ring'; r: number };

export type BossTarget = 'player' | 'center' | 'edgeNear' | 'edgeFar' | 'random' | 'self' | 'marked';

export type BossStep =
  | { t: 'wait'; s: number }
  | { t: 'face'; target: 'player' | 'center' }
  | { t: 'pose'; pose: string; s: number }
  | { t: 'move'; to: BossTarget | 'playerLane'; speed: number; maxS: number }
  | { t: 'telegraph'; s: number; shape: TelegraphShape; at: BossTarget; count?: number; sfx?: SfxId }
  | { t: 'melee'; move: MeleeMoveDef }
  | {
      t: 'projectile';
      spec: ProjectileSpec;
      count: number;
      spreadDeg: number;
      aim: 'player' | 'fan' | 'lanes' | 'random' | 'down' | 'ring';
      intervalS?: number;
      from?: 'hand' | 'mouth' | 'top' | 'sky';
    }
  | {
      t: 'shockwave';
      axis: 'x' | 'z' | 'ring';
      speed: number;
      range: number;
      height: number;
      hit: HitSpec;
      both?: boolean;
    }
  | {
      t: 'beam';
      mode: 'playerLane' | 'sweepZ' | 'sweepX' | 'facing';
      durationS: number;
      width: number;
      hit: HitSpec;
    }
  | {
      t: 'zone';
      zone: ZoneSpec;
      at: 'player' | 'random' | 'aroundBoss' | 'trail' | 'grid';
      count: number;
      delayS?: number;
    }
  | { t: 'summon'; enemy: EnemyId; count: number; from: SpawnFrom }
  | { t: 'leap'; to: 'player' | 'center'; airS: number; landing: ExplosionSpec }
  | { t: 'teleport'; to: 'behindPlayer' | 'random' | 'center' }
  | { t: 'charge'; speed: number; maxS: number; hit: HitSpec }
  | { t: 'setElement'; element: Element }
  | { t: 'vulnerable'; s: number; mult: number }
  | { t: 'heal'; frac: number }
  | { t: 'absorb'; radius: number; healFrac: number }
  | { t: 'shake'; trauma: number }
  | { t: 'sfx'; id: SfxId }
  | { t: 'arena'; zBand?: [number, number]; env?: string }
  | { t: 'scale'; mult: number }
  | { t: 'repeat'; times: number; steps: BossStep[] };

export interface BossPattern {
  id: string;
  name?: string;
  weight: number;
  cooldownS: number;
  minRange?: number;
  maxRange?: number;
  steps: BossStep[];
}

export interface BossPhaseDef {
  /** Fase vale até o HP cair abaixo desta fração. */
  untilHpFrac: number;
  name?: string;
  speedMult: number;
  damageMult: number;
  resist?: Resist;
  transition?: BossStep[];
  patterns: BossPattern[];
  idleBetweenS: [number, number];
  adds?: { enemy: EnemyId; count: number; everyS: number; maxAlive: number };
  /** Rotação de elemento (OMEGA-Z fase 2). */
  elementCycle?: { elements: Element[]; everyS: number };
  /** Aura de contato. */
  aura?: { radius: number; hit: HitSpec };
}

export interface BossDef {
  id: BossId;
  name: string;
  title: string;
  family: 'zombie' | 'robot' | 'cyborg';
  element: Element;
  hp: number;
  scale: number;
  radius: number;
  height: number;
  speed: number;
  poise: number;
  resist: Resist;
  statusDurationMult: number;
  statusImmune: StatusId[];
  phases: BossPhaseDef[];
  contact: HitSpec;
  rewards: { xp: number; score: number; scrap: number; unlockStaff?: StaffId; cosmetics: CosmeticId[] };
  rig: RigParams & { boss: string };
  music: MusicId;
}

// ---------------------------------------------------------------------------
// Mapas e níveis
// ---------------------------------------------------------------------------
export type ThemeId =
  | 'sandbox'
  | 'vila'
  | 'torre'
  | 'banco'
  | 'castelo'
  | 'toxica'
  | 'floresta'
  | 'centro'
  | 'chamas'
  | 'guerra'
  | 'arena';

export type EnvParticles =
  'ash' | 'embers' | 'spores' | 'rain' | 'fireflies' | 'dust' | 'sparks' | 'snow' | 'none';

export interface EnvironmentDef {
  theme: ThemeId;
  fog: { color: number; density: number };
  sky: { top: number; bottom: number; moon?: boolean; stars?: number; moonColor?: number };
  hemi: { sky: number; ground: number; intensity: number };
  sun: { color: number; intensity: number; dir: [number, number, number] };
  accent: { color: number; flicker: number };
  grade: {
    lift: [number, number, number];
    gamma: [number, number, number];
    gain: [number, number, number];
    saturation: number;
    contrast: number;
  };
  bloom: { intensity: number; threshold: number };
  vignette: number;
  grain: number;
  particles: EnvParticles;
  particleDensity: number;
  ground: { color: number; color2: number; pattern: GroundPattern };
  /** Interior (teto/paredes) em vez de exterior. */
  indoor?: boolean;
  reverb: 'room' | 'hall' | 'outdoor' | 'cave';
}

export type GroundPattern =
  'dirt' | 'stone' | 'planks' | 'marble' | 'tiles' | 'grass' | 'asphalt' | 'metal' | 'sand' | 'ash';

export type SpawnFrom = 'left' | 'right' | 'back' | 'front' | 'ground' | 'sky' | 'sides';

export interface WaveSpawn {
  enemy: EnemyId;
  count: number;
  from: SpawnFrom;
  intervalS: number;
}

export type WaveStart =
  | { k: 'segmentStart' }
  | { k: 'afterCleared'; delayS: number }
  | { k: 'aliveAtMost'; n: number }
  | { k: 'timeS'; s: number };

export interface WaveDef {
  start: WaveStart;
  spawns: WaveSpawn[];
  maxAlive?: number;
}

export type PropKind =
  'crate' | 'barrel' | 'explosiveBarrel' | 'bin' | 'tombstone' | 'atm' | 'car' | 'weaponCrate';

export interface PropPlacement {
  kind: PropKind;
  x: number;
  z: number;
  drop?: ItemId;
}

export interface PickupPlacement {
  item: ItemId;
  x: number;
  z: number;
}

export type HazardKind =
  | 'toxicPool'
  | 'gasVent'
  | 'fireJet'
  | 'electricTile'
  | 'laserTrip'
  | 'pendulum'
  | 'swamp'
  | 'gust'
  | 'artillery'
  | 'mine'
  | 'debris'
  | 'fire';

export interface HazardPlacement {
  kind: HazardKind;
  x: number;
  z: number;
  w?: number;
  d?: number;
  periodS?: number;
  offsetS?: number;
}

export interface SegmentDef {
  id: string;
  /** Ativado quando o jogador passa deste X. */
  triggerX: number;
  /** Trava a câmera até limpar as ondas (null = sem trava). */
  lock: { minX: number; maxX: number } | null;
  zBand?: [number, number];
  waves: WaveDef[];
  hazards?: HazardPlacement[];
}

export interface LevelDef {
  id: LevelId;
  name: string;
  length: number;
  zBand: [number, number];
  parTimeS: number;
  playerStart: { x: number; z: number };
  segments: SegmentDef[];
  props: PropPlacement[];
  pickups: PickupPlacement[];
  hazards?: HazardPlacement[];
  hints?: { x: number; text: string }[];
  boss?: { id: BossId; triggerX: number; lock: [number, number]; zBand?: [number, number] };
}

export interface MapDef {
  id: MapId;
  index: number;
  name: string;
  subtitle: string;
  env: EnvironmentDef;
  music: MusicId;
  levels: LevelDef[];
  scaling: { hp: number; dmg: number };
  /** Distribuição de peças de loot (0..1 = chance de ser do conjunto mago). */
  wizardBias: number;
  /** Cor de destaque do card do mapa. */
  color: number;
}

// ---------------------------------------------------------------------------
// Itens, cosméticos e loot
// ---------------------------------------------------------------------------
export type PowerId = 'doubleDamage' | 'turbo' | 'invulnerable';

export type ItemEffect =
  | { k: 'heal'; amount: number }
  | { k: 'mana'; amount: number }
  | { k: 'shield'; amount: number }
  | { k: 'ammo'; ammo: AmmoType | 'current'; amount: number }
  | { k: 'power'; power: PowerId; s: number }
  | { k: 'firearm'; id: WeaponId }
  | { k: 'melee'; id: MeleeId }
  | { k: 'scrap'; amount: number }
  | { k: 'cosmetic'; rarity: Rarity };

export interface ItemDef {
  id: ItemId;
  name: string;
  effect: ItemEffect;
  /** Coletado automaticamente ao encostar; senão exige J. */
  auto: boolean;
  despawnS?: number;
  color: number;
  shape:
    'medkit' | 'bigMedkit' | 'battery' | 'crystal' | 'ammo' | 'power' | 'gun' | 'melee' | 'scrap' | 'bag';
}

export type CosmeticSlot = 'head' | 'eyes' | 'mask' | 'body' | 'back';

export interface CosmeticDef {
  id: CosmeticId;
  name: string;
  slot: CosmeticSlot;
  set: 'wizard' | 'zombie' | 'boss';
  rarity: Rarity;
  /** null = só por drop. */
  price: number | null;
  mesh: MeshRecipe;
  hides?: CosmeticSlot[];
  /** Capa: número de segmentos com física de mola. */
  cape?: { segments: number; width: number; length: number; color: number; color2?: number };
  desc?: string;
}

export interface LootEntry {
  weight: number;
  item?: ItemId;
}

export interface LootTableDef {
  id: LootTableId;
  entries: LootEntry[];
}

// ---------------------------------------------------------------------------
// Música
// ---------------------------------------------------------------------------
export interface MusicDef {
  id: MusicId;
  bpm: number;
  /** Nota raiz MIDI. */
  root: number;
  scale: number[];
  progression: number[];
  bass: number[];
  lead: { wave: OscillatorKind; density: number; octave: number; seed: number };
  pad: { wave: OscillatorKind; detune: number };
  drums: { kick: number[]; snare: number[]; hat: number[] };
  bossBpm?: number;
}

export type OscillatorKind = 'sine' | 'square' | 'sawtooth' | 'triangle';
