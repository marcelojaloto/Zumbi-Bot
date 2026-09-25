import { MOVES } from './melee';
import type { EnemyDef, EnemyId, MeleeMoveDef, ProjectileSpec } from './types';

function move(m: MeleeMoveDef): MeleeMoveDef {
  MOVES[m.id] = m;
  return m;
}

const ZOMBIE_RESIST = { fire: 1.3, blade: 1.1, toxic: 0.8, holy: 1.5, necro: 0.5 } as const;
const ROBOT_RESIST = {
  electric: 1.5,
  blunt: 1.2,
  blade: 0.6,
  fire: 0.8,
  toxic: 1.2,
  cyber: 1.5,
  holy: 0.5,
} as const;

const claw = move({
  id: 'z_claw',
  pose: 'claw',
  startup: 4,
  active: 6,
  recovery: 22,
  hitbox: { x0: 0.2, x1: 1.05, y0: 0.6, y1: 1.7, zTol: 0.5 },
  hit: { damage: 8, dtype: 'blade', knockback: 1.2, hitstun: 16, hitstop: 3 },
});

const lunge = move({
  id: 'z_lunge',
  pose: 'lunge',
  startup: 2,
  active: 16,
  recovery: 30,
  hitbox: { x0: 0, x1: 1.0, y0: 0.4, y1: 1.6, zTol: 0.55 },
  hit: { damage: 7, dtype: 'blade', knockback: 2.5, hitstun: 18, hitstop: 4 },
  lunge: 8,
});

const slam = move({
  id: 'z_slam',
  pose: 'slamGround',
  startup: 6,
  active: 5,
  recovery: 34,
  hitbox: { aoeR: 1.9, y0: -0.2, y1: 1.4 },
  hit: {
    damage: 22,
    dtype: 'blunt',
    knockback: 6,
    launch: 4,
    knockdown: true,
    hitstun: 30,
    hitstop: 7,
    heavy: true,
  },
  superArmor: true,
});

const charge = move({
  id: 'z_charge',
  pose: 'charge',
  startup: 2,
  active: 72,
  recovery: 40,
  hitbox: { x0: 0, x1: 1.3, y0: 0.2, y1: 2.2, zTol: 0.65 },
  hit: {
    damage: 18,
    dtype: 'blunt',
    knockback: 8,
    launch: 5,
    knockdown: true,
    hitstun: 30,
    hitstop: 6,
    heavy: true,
  },
  lunge: 6,
  superArmor: true,
});

const axe = move({
  id: 'z_axe',
  pose: 'slam',
  startup: 6,
  active: 5,
  recovery: 30,
  hitbox: { x0: 0.2, x1: 1.8, y0: 0, y1: 2.2, zTol: 0.65 },
  hit: {
    damage: 24,
    dtype: 'blade',
    knockback: 5,
    launch: 3,
    knockdown: true,
    hitstun: 30,
    hitstop: 7,
    heavy: true,
  },
  superArmor: true,
});

const stomp = move({
  id: 'm_stomp',
  pose: 'stomp',
  startup: 6,
  active: 5,
  recovery: 30,
  hitbox: { aoeR: 2.0, y0: -0.2, y1: 1.2 },
  hit: {
    damage: 20,
    dtype: 'blunt',
    knockback: 6,
    launch: 4,
    knockdown: true,
    hitstun: 30,
    hitstop: 7,
    heavy: true,
  },
  superArmor: true,
});

const acidGlob: ProjectileSpec = {
  visual: 'acid',
  speed: 9,
  radius: 0.25,
  lifeS: 3,
  gravity: 14,
  lob: true,
  y: 1.5,
  hit: {
    damage: 6,
    dtype: 'toxic',
    knockback: 0.8,
    hitstun: 12,
    hitstop: 2,
    status: { id: 'poison', chance: 0.7 },
  },
  onImpact: {
    zone: {
      radius: 0.9,
      durationS: 2.5,
      tickS: 0.5,
      hit: {
        damage: 2,
        dtype: 'toxic',
        knockback: 0,
        hitstun: 0,
        hitstop: 0,
        status: { id: 'poison', chance: 0.3 },
      },
      fx: 'acidPool',
    },
  },
};

const laserShot: ProjectileSpec = {
  visual: 'laser',
  speed: 26,
  radius: 0.18,
  lifeS: 1.2,
  y: 1.9,
  hit: { damage: 5, dtype: 'electric', knockback: 0.6, hitstun: 10, hitstop: 2 },
};

const botBullet: ProjectileSpec = {
  visual: 'tracer',
  speed: 30,
  radius: 0.15,
  lifeS: 1,
  y: 1.3,
  hit: { damage: 6, dtype: 'bullet', knockback: 0.8, hitstun: 10, hitstop: 2 },
};

const mechBullet: ProjectileSpec = {
  ...botBullet,
  y: 1.6,
  hit: { damage: 7, dtype: 'bullet', knockback: 0.8, hitstun: 8, hitstop: 1 },
};

const walker: EnemyDef = {
  id: 'walker',
  name: 'Zumbi Andarilho',
  family: 'zombie',
  archetype: 'walker',
  hp: 40,
  speed: 1.2,
  poise: 0,
  mass: 1,
  radius: 0.35,
  height: 1.75,
  attacks: [
    {
      id: 'claw',
      kind: 'melee',
      move: claw,
      range: [0, 1.0],
      windup: 26,
      cooldownS: 1.6,
      weight: 1,
      token: 'melee',
    },
  ],
  resist: ZOMBIE_RESIST,
  rewards: { xp: 10, score: 100, scrap: [1, 3], drops: 'kill', cosmeticChance: 0.01 },
  rig: {
    kind: 'humanoid',
    scale: 1,
    skin: 0x6f7f5a,
    cloth: 0x4a4038,
    cloth2: 0x2e3a4a,
    eye: 0x9cff4a,
    hunch: 0.6,
    variants: 4,
  },
  groan: true,
};

const runner: EnemyDef = {
  ...walker,
  id: 'runner',
  name: 'Zumbi Corredor',
  archetype: 'runner',
  hp: 25,
  speed: 4.2,
  mass: 0.8,
  attacks: [
    {
      id: 'lunge',
      kind: 'lunge',
      move: lunge,
      range: [1.5, 3.2],
      windup: 14,
      cooldownS: 1.4,
      weight: 1,
      token: 'melee',
    },
  ],
  rewards: { xp: 12, score: 150, scrap: [1, 3], drops: 'kill', cosmeticChance: 0.015 },
  rig: {
    kind: 'humanoid',
    scale: 0.95,
    skin: 0x7a8a60,
    cloth: 0x5a2a2a,
    cloth2: 0x2a2a2a,
    eye: 0xff5a3a,
    hunch: 0.8,
    variants: 4,
    bulk: 0.85,
  },
};

const brute: EnemyDef = {
  id: 'brute',
  name: 'Zumbi Brutamontes',
  family: 'zombie',
  archetype: 'brute',
  hp: 220,
  speed: 1.0,
  poise: 60,
  mass: 3,
  radius: 0.6,
  height: 2.6,
  attacks: [
    {
      id: 'slam',
      kind: 'slam',
      move: slam,
      range: [0, 1.8],
      windup: 44,
      cooldownS: 2.6,
      weight: 2,
      token: 'melee',
    },
    {
      id: 'charge',
      kind: 'charge',
      move: charge,
      range: [3.5, 9],
      windup: 40,
      cooldownS: 4,
      weight: 1,
      token: 'melee',
    },
  ],
  resist: { ...ZOMBIE_RESIST, bullet: 0.8, explosive: 1.2 },
  superArmor: true,
  rewards: { xp: 45, score: 500, scrap: [8, 15], drops: 'elite', cosmeticChance: 0.05 },
  rig: {
    kind: 'humanoid',
    scale: 1.45,
    skin: 0x5f6f4a,
    cloth: 0x3a3028,
    cloth2: 0x2a2a30,
    eye: 0xffd24a,
    hunch: 0.5,
    variants: 2,
    bulk: 1.5,
  },
  groan: true,
};

const spitter: EnemyDef = {
  ...walker,
  id: 'spitter',
  name: 'Zumbi Cuspidor',
  archetype: 'spitter',
  hp: 35,
  speed: 1.4,
  mass: 0.9,
  keepDistance: [5.5, 9],
  statusImmune: ['poison'],
  resist: { ...ZOMBIE_RESIST, toxic: 0 },
  attacks: [
    {
      id: 'spit',
      kind: 'ranged',
      projectile: acidGlob,
      range: [3, 10],
      windup: 34,
      cooldownS: 2.5,
      weight: 1,
      token: 'ranged',
    },
  ],
  rewards: { xp: 18, score: 200, scrap: [2, 4], drops: 'kill', cosmeticChance: 0.02 },
  rig: {
    kind: 'humanoid',
    scale: 1,
    skin: 0x7a9a4a,
    cloth: 0x3a4a2a,
    cloth2: 0x2a3a1a,
    eye: 0xc8ff3a,
    hunch: 0.4,
    variants: 2,
    bulk: 1.15,
    accessory: 'none',
  },
};

const exploder: EnemyDef = {
  ...walker,
  id: 'exploder',
  name: 'Zumbi Bomba',
  archetype: 'exploder',
  hp: 30,
  speed: 2.2,
  attacks: [
    { id: 'explode', kind: 'explode', range: [0, 1.6], windup: 45, cooldownS: 99, weight: 1, token: 'melee' },
  ],
  onDeath: {
    explosion: {
      radius: 2.5,
      damage: 25,
      minMult: 0.4,
      dtype: 'explosive',
      knockback: 7,
      launch: 5,
      selfMult: 1,
      fx: 'explosion',
    },
  },
  rewards: { xp: 15, score: 150, scrap: [1, 3], drops: 'kill', cosmeticChance: 0.015 },
  rig: {
    kind: 'humanoid',
    scale: 1.05,
    skin: 0x8a7a5a,
    cloth: 0x6a3a1a,
    cloth2: 0x3a2a1a,
    eye: 0xff3a1a,
    hunch: 0.3,
    variants: 1,
    bulk: 1.3,
    accessory: 'barrel',
  },
};

const drone: EnemyDef = {
  id: 'drone',
  name: 'Drone Sentinela',
  family: 'robot',
  archetype: 'drone',
  hp: 30,
  speed: 3,
  poise: 0,
  mass: 0.5,
  radius: 0.4,
  height: 0.6,
  fly: 1.8,
  keepDistance: [4.5, 8],
  attacks: [
    {
      id: 'laser',
      kind: 'ranged',
      projectile: laserShot,
      range: [2, 10],
      windup: 24,
      cooldownS: 1.5,
      weight: 1,
      token: 'ranged',
    },
  ],
  resist: { electric: 1.5, blunt: 1.3, blade: 0.6, cyber: 1.5, holy: 0.5 },
  statusImmune: ['poison', 'root'],
  rewards: { xp: 15, score: 250, scrap: [3, 6], drops: 'robot', cosmeticChance: 0.02 },
  rig: { kind: 'drone', scale: 1, skin: 0x4a5260, cloth: 0x2a2e36, cloth2: 0xff3a3a, eye: 0xff2a2a },
};

const soldier: EnemyDef = {
  id: 'soldier',
  name: 'Robô Soldado',
  family: 'robot',
  archetype: 'soldier',
  hp: 80,
  speed: 2.2,
  poise: 25,
  mass: 1.5,
  radius: 0.4,
  height: 1.9,
  keepDistance: [5.5, 9],
  dodgeChance: 0.2,
  attacks: [
    {
      id: 'burst',
      kind: 'burst',
      projectile: botBullet,
      range: [2.5, 11],
      windup: 30,
      cooldownS: 2.2,
      weight: 3,
      token: 'ranged',
      count: 3,
      interval: 6,
    },
    {
      id: 'butt',
      kind: 'melee',
      move: move({
        id: 'r_butt',
        pose: 'jab',
        startup: 5,
        active: 4,
        recovery: 20,
        hitbox: { x0: 0.2, x1: 1.1, y0: 0.8, y1: 1.7, zTol: 0.55 },
        hit: { damage: 9, dtype: 'blunt', knockback: 3, hitstun: 18, hitstop: 4 },
      }),
      range: [0, 1.1],
      windup: 16,
      cooldownS: 2,
      weight: 1,
      token: 'melee',
    },
  ],
  resist: ROBOT_RESIST,
  statusImmune: ['poison'],
  rewards: { xp: 25, score: 300, scrap: [5, 10], drops: 'robot', cosmeticChance: 0.03 },
  rig: { kind: 'robot', scale: 1, skin: 0x5a6270, cloth: 0x3a4250, cloth2: 0xff5a2a, eye: 0xff3a3a },
};

const mech: EnemyDef = {
  id: 'mech',
  name: 'Mech Pesado',
  family: 'robot',
  archetype: 'mech',
  hp: 320,
  speed: 1.1,
  poise: 100,
  mass: 5,
  radius: 0.8,
  height: 2.8,
  keepDistance: [3, 8],
  superArmor: true,
  attacks: [
    {
      id: 'minigun',
      kind: 'minigun',
      projectile: mechBullet,
      range: [2.5, 12],
      windup: 40,
      cooldownS: 3.5,
      weight: 2,
      token: 'ranged',
      count: 14,
      interval: 4,
    },
    {
      id: 'flame',
      kind: 'flame',
      hit: {
        damage: 5,
        dtype: 'fire',
        knockback: 1,
        hitstun: 6,
        hitstop: 0,
        status: { id: 'burn', chance: 0.5 },
      },
      range: [0, 3.2],
      windup: 30,
      cooldownS: 3,
      weight: 2,
      token: 'melee',
      durationS: 1.4,
    },
    {
      id: 'stomp',
      kind: 'slam',
      move: stomp,
      range: [0, 2],
      windup: 45,
      cooldownS: 3.5,
      weight: 1,
      token: 'melee',
    },
  ],
  resist: { ...ROBOT_RESIST, bullet: 0.7, blade: 0.5 },
  statusImmune: ['poison', 'freeze'],
  rewards: { xp: 70, score: 800, scrap: [15, 25], drops: 'elite', cosmeticChance: 0.06 },
  rig: { kind: 'mech', scale: 1.3, skin: 0x5a5e66, cloth: 0x3a3e46, cloth2: 0xffb02a, eye: 0xff3a1a },
};

/** Variante temática: mescla sobre uma definição base. */
function variant(base: EnemyDef, over: Partial<EnemyDef> & Pick<EnemyDef, 'id' | 'name'>): EnemyDef {
  return {
    ...base,
    ...over,
    rig: { ...base.rig, ...(over.rig ?? {}) },
    rewards: { ...base.rewards, ...(over.rewards ?? {}) },
    resist: { ...base.resist, ...(over.resist ?? {}) },
  };
}

const ghoul = variant(runner, {
  id: 'ghoul',
  name: 'Carniçal',
  hp: 30,
  rig: { ...runner.rig, skin: 0x8a8a9a, cloth: 0x2a1a2a, eye: 0xb05aff, hunch: 0.9 },
});

const toxicWalker = variant(walker, {
  id: 'toxicWalker',
  name: 'Zumbi Tóxico',
  hp: 45,
  statusImmune: ['poison'],
  resist: { toxic: 0 },
  onDeath: {
    zone: {
      radius: 2,
      durationS: 4,
      tickS: 0.5,
      hit: {
        damage: 3,
        dtype: 'toxic',
        knockback: 0,
        hitstun: 0,
        hitstop: 0,
        status: { id: 'poison', chance: 0.4 },
      },
      fx: 'poisonCloud',
      hitsAll: false,
    },
  },
  rig: { ...walker.rig, skin: 0x8aba3a, cloth: 0x4a5a1a, eye: 0xd8ff3a, accessory: 'gasmask' },
});

const burningWalker = variant(walker, {
  id: 'burningWalker',
  name: 'Zumbi em Chamas',
  hp: 50,
  statusImmune: ['burn'],
  resist: { fire: 0, water: 1.5, ice: 1.3 },
  aura: {
    status: 'burn',
    radius: 1,
    hit: {
      damage: 3,
      dtype: 'fire',
      knockback: 0,
      hitstun: 0,
      hitstop: 0,
      status: { id: 'burn', chance: 0.25 },
    },
  },
  rig: { ...walker.rig, skin: 0x4a3020, cloth: 0x2a1a10, eye: 0xffa01a, accessory: 'flames' },
});

const soldierZombie = variant(walker, {
  id: 'soldierZombie',
  name: 'Zumbi Soldado',
  hp: 70,
  resist: { bullet: 0.8 },
  rewards: { xp: 16, score: 180, scrap: [2, 5], drops: 'kill', cosmeticChance: 0.015 },
  rig: { ...walker.rig, cloth: 0x4a5a3a, cloth2: 0x3a4a2a, accessory: 'helmet' },
});

const bankWalker = variant(walker, {
  id: 'bankWalker',
  name: 'Zumbi Bancário',
  rig: { ...walker.rig, cloth: 0x22262e, cloth2: 0x1a1c22, skin: 0x7a8a6a, accessory: 'tie' },
});

const lumberjack = variant(brute, {
  id: 'lumberjack',
  name: 'Lenhador',
  attacks: [
    {
      id: 'axe',
      kind: 'slam',
      move: axe,
      range: [0, 2],
      windup: 40,
      cooldownS: 2.4,
      weight: 2,
      token: 'melee',
    },
    {
      id: 'charge',
      kind: 'charge',
      move: charge,
      range: [3.5, 9],
      windup: 40,
      cooldownS: 4,
      weight: 1,
      token: 'melee',
    },
  ],
  rig: { ...brute.rig, cloth: 0x8a2a2a, cloth2: 0x3a2a1a, accessory: 'axe' },
});

export const ENEMIES: Record<EnemyId, EnemyDef> = Object.fromEntries(
  [
    walker,
    runner,
    brute,
    spitter,
    exploder,
    drone,
    soldier,
    mech,
    ghoul,
    toxicWalker,
    burningWalker,
    soldierZombie,
    bankWalker,
    lumberjack,
  ].map((e) => [e.id, e]),
);

export function getEnemy(id: EnemyId): EnemyDef {
  const e = ENEMIES[id];
  if (!e) throw new Error(`Inimigo desconhecido: ${id}`);
  return e;
}
