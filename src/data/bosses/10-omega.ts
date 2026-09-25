import { MOVES } from '../melee';
import type { BossDef, ExplosionSpec, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

/**
 * OMEGA-Z, o ciborgue zumbi colossal do mapa 10. Quatro fases de 3000 de vida:
 * 1. Blindagem: couraça que resiste a balas e lâminas (mas conduz eletricidade), mísseis e laser.
 * 2. Carne Exposta: a couraça cai; o elemento gira a cada poucos segundos e muda todos os ataques.
 * 3. Colosso: cresce 30% e a arena encolhe em profundidade; pisões e varreduras.
 * 4. Núcleo: o núcleo pulsa, invoca zumbis e os absorve para se curar — mate-os antes!
 */

const punch: MeleeMoveDef = {
  id: 'omega_punch',
  pose: 'swing1',
  startup: 20,
  active: 6,
  recovery: 28,
  hitbox: { x0: 0, x1: 1.7, y0: 0, y1: 2, zTol: 0.5 },
  hit: {
    damage: 24,
    dtype: 'blunt',
    knockback: 8,
    launch: 5,
    knockdown: true,
    hitstun: 30,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[punch.id] = punch;

const claw: MeleeMoveDef = {
  id: 'omega_claw',
  pose: 'claw',
  startup: 14,
  active: 6,
  recovery: 22,
  hitbox: { x0: -0.2, x1: 1.6, y0: 0, y1: 1.8, zTol: 0.55 },
  hit: { damage: 18, dtype: 'blade', knockback: 5, launch: 2, hitstun: 22, hitstop: 6, heavy: true },
  superArmor: true,
};
MOVES[claw.id] = claw;

const slam: MeleeMoveDef = {
  id: 'omega_slam',
  pose: 'slamGround',
  startup: 26,
  active: 6,
  recovery: 34,
  hitbox: { x0: -0.6, x1: 2.2, y0: 0, y1: 1.2, zTol: 0.9 },
  hit: {
    damage: 30,
    dtype: 'blunt',
    knockback: 6,
    launch: 7,
    knockdown: true,
    hitstun: 34,
    hitstop: 10,
    heavy: true,
  },
  superArmor: true,
};
MOVES[slam.id] = slam;

const missileBlast: ExplosionSpec = {
  radius: 1.5,
  damage: 16,
  minMult: 0.5,
  dtype: 'explosive',
  knockback: 5,
  launch: 3,
  selfMult: 0,
  fx: 'explosion',
};

/** Míssil teleguiado: dá para abatê-lo com tiros. */
const missile: ProjectileSpec = {
  visual: 'missile',
  speed: 8.5,
  radius: 0.35,
  lifeS: 4,
  y: 1.4,
  homing: 1.1,
  hp: 8,
  hit: { damage: 14, dtype: 'explosive', knockback: 4, launch: 2, hitstun: 18, hitstop: 4 },
  onImpact: { explosion: missileBlast },
};

const plasma: ProjectileSpec = {
  visual: 'plasma',
  speed: 15,
  radius: 0.5,
  lifeS: 2.2,
  y: 1.3,
  hit: { damage: 22, dtype: 'cyber', knockback: 6, launch: 2, hitstun: 24, hitstop: 5, heavy: true },
};

/** Orbe elemental da fase 2 (visual, tipo e status seguem o elemento atual). */
const orb: ProjectileSpec = {
  visual: 'orb_fire',
  speed: 10,
  radius: 0.45,
  lifeS: 2.6,
  y: 1.3,
  hit: { damage: 16, dtype: 'fire', knockback: 3, launch: 1, hitstun: 16, hitstop: 3 },
  onImpact: {
    explosion: {
      radius: 1.1,
      damage: 10,
      minMult: 0.5,
      dtype: 'fire',
      knockback: 3,
      selfMult: 0,
      fx: 'explosion',
    },
  },
};

const debris: ProjectileSpec = {
  visual: 'rock',
  speed: 12,
  radius: 0.55,
  lifeS: 3,
  hit: {
    damage: 20,
    dtype: 'earth',
    knockback: 4,
    launch: 3,
    knockdown: true,
    hitstun: 24,
    hitstop: 5,
    heavy: true,
  },
  onImpact: {
    explosion: {
      radius: 1.4,
      damage: 14,
      minMult: 0.5,
      dtype: 'earth',
      knockback: 4,
      launch: 3,
      selfMult: 0,
      fx: 'debris',
    },
  },
};

const coreBolt: ProjectileSpec = {
  visual: 'skull_necro',
  speed: 7,
  radius: 0.4,
  lifeS: 4.5,
  y: 2,
  homing: 1.4,
  hp: 6,
  hit: {
    damage: 14,
    dtype: 'necro',
    knockback: 3,
    hitstun: 16,
    hitstop: 3,
    status: { id: 'slow', chance: 0.6, durationS: 2 },
  },
};

const shock: HitSpec = {
  damage: 24,
  dtype: 'cyber',
  knockback: 5,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 5,
  heavy: true,
};

const laser: HitSpec = {
  damage: 9,
  dtype: 'cyber',
  knockback: 2,
  hitstun: 10,
  hitstop: 2,
  status: { id: 'glitch', chance: 0.5, durationS: 2 },
};

const elemFloor: ZoneSpec = {
  radius: 1.2,
  durationS: 1.4,
  tickS: 0.35,
  fx: 'magma',
  hit: { damage: 10, dtype: 'fire', knockback: 2, launch: 2, hitstun: 12, hitstop: 2 },
};

const stompBlast = (radius: number, damage: number): ExplosionSpec => ({
  radius,
  damage,
  minMult: 0.5,
  dtype: 'blunt',
  knockback: 8,
  launch: 6,
  selfMult: 0,
  fx: 'explosion',
});

export const omega = registerBoss({
  id: 'omega',
  name: 'OMEGA-Z',
  title: 'O Ciborgue Primordial',
  family: 'cyborg',
  element: 'cyber',
  hp: 12000,
  scale: 2.5,
  radius: 1.35,
  height: 4.9,
  speed: 2,
  poise: 700,
  resist: { holy: 1.3, necro: 0.4, cyber: 0.5 },
  statusDurationMult: 0.45,
  statusImmune: ['hacked', 'raised'],
  contact: { damage: 10, dtype: 'blunt', knockback: 7, hitstun: 14, hitstop: 2 },
  rewards: { xp: 3000, score: 100000, scrap: 1500, cosmetics: ['crown_omega'] },
  music: 'arena',
  rig: {
    kind: 'humanoid',
    scale: 2.5,
    skin: 0x6e5a6a,
    cloth: 0x2c2e36,
    cloth2: 0x1a1c22,
    eye: 0xff2a3a,
    hunch: 0.2,
    bulk: 1.55,
    boss: 'omega',
  },
  phases: [
    // ---------------------------------------------------------------- 1. Blindagem
    {
      untilHpFrac: 0.75,
      name: 'Blindagem',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.8, 1.5],
      resist: { bullet: 0.5, blade: 0.55, blunt: 0.75, explosive: 0.8, electric: 1.6, water: 1.2 },
      adds: { enemy: 'soldier', count: 1, everyS: 18, maxAlive: 2 },
      patterns: [
        {
          id: 'soco_pistao',
          name: 'Soco Pistão',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3.4, maxS: 2 },
            { t: 'melee', move: punch },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'barragem',
          name: 'Barragem de Mísseis',
          weight: 3,
          cooldownS: 7,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'sfx', id: 'telegraph' },
            {
              t: 'projectile',
              spec: missile,
              count: 5,
              spreadDeg: 0,
              aim: 'lanes',
              from: 'top',
              intervalS: 0.22,
            },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'laser_olho',
          name: 'Laser Ocular',
          weight: 2,
          cooldownS: 8,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.9, shape: { k: 'lane', width: 1 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 1.3, width: 1, hit: laser },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'pisao',
          name: 'Pisão Hidráulico',
          weight: 2,
          cooldownS: 9,
          minRange: 4,
          steps: [
            { t: 'leap', to: 'player', airS: 1.2, landing: stompBlast(3.2, 26) },
            { t: 'shake', trauma: 0.7 },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'drones',
          name: 'Enxame',
          weight: 1,
          cooldownS: 18,
          steps: [
            { t: 'pose', pose: 'cast', s: 0.6 },
            { t: 'summon', enemy: 'drone', count: 2, from: 'sky' },
            { t: 'wait', s: 0.6 },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 2. Carne Exposta
    {
      untilHpFrac: 0.5,
      name: 'Carne Exposta',
      speedMult: 1.1,
      damageMult: 1.1,
      idleBetweenS: [0.6, 1.2],
      resist: { bullet: 1, blade: 1.25, blunt: 1, holy: 1.5 },
      elementCycle: { elements: ['fire', 'ice', 'electric', 'toxic', 'necro'], everyS: 7 },
      adds: { enemy: 'ghoul', count: 2, everyS: 16, maxAlive: 3 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.9 },
        { t: 'sfx', id: 'bossPhase' },
        { t: 'setElement', element: 'fire' },
        { t: 'vulnerable', s: 2.5, mult: 1.5 },
      ],
      patterns: [
        {
          id: 'garra',
          name: 'Garras de Carne',
          weight: 3,
          cooldownS: 2,
          steps: [
            { t: 'move', to: 'player', speed: 4, maxS: 1.8 },
            { t: 'melee', move: claw },
            { t: 'melee', move: claw },
          ],
        },
        {
          id: 'orbes',
          name: 'Orbes Elementais',
          weight: 3,
          cooldownS: 5,
          steps: [
            { t: 'pose', pose: 'cast', s: 0.4 },
            { t: 'projectile', spec: orb, count: 5, spreadDeg: 13, aim: 'fan', from: 'mouth' },
            { t: 'wait', s: 0.5 },
            { t: 'projectile', spec: orb, count: 4, spreadDeg: 15, aim: 'fan', from: 'mouth' },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'chao_elemental',
          name: 'Chão Elemental',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.5 },
            { t: 'zone', zone: elemFloor, at: 'grid', count: 8, delayS: 1.2 },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'onda',
          name: 'Onda de Choque',
          weight: 2,
          cooldownS: 7,
          steps: [
            { t: 'telegraph', s: 0.7, shape: { k: 'ring', r: 3 }, at: 'self', sfx: 'telegraph' },
            { t: 'shockwave', axis: 'ring', speed: 7, range: 12, height: 0.7, hit: shock },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'investida',
          name: 'Investida',
          weight: 2,
          cooldownS: 8,
          minRange: 4,
          steps: [
            { t: 'telegraph', s: 0.6, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            {
              t: 'charge',
              speed: 12,
              maxS: 1.4,
              hit: {
                damage: 24,
                dtype: 'blunt',
                knockback: 9,
                launch: 5,
                knockdown: true,
                hitstun: 30,
                hitstop: 6,
                heavy: true,
              },
            },
            { t: 'wait', s: 0.8 },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 3. Colosso
    {
      untilHpFrac: 0.25,
      name: 'Colosso',
      speedMult: 1.15,
      damageMult: 1.2,
      idleBetweenS: [0.6, 1.1],
      resist: { bullet: 0.85, blade: 1, blunt: 1, explosive: 1.2 },
      adds: { enemy: 'runner', count: 2, everyS: 14, maxAlive: 3 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.2 },
        { t: 'setElement', element: 'earth' },
        { t: 'scale', mult: 1.3 },
        { t: 'arena', zBand: [-2, 1.2] },
        { t: 'shake', trauma: 1 },
        { t: 'summon', enemy: 'brute', count: 1, from: 'right' },
        { t: 'wait', s: 0.5 },
      ],
      patterns: [
        {
          id: 'martelo',
          name: 'Martelo Colossal',
          weight: 3,
          cooldownS: 3,
          steps: [
            { t: 'move', to: 'player', speed: 3.6, maxS: 1.8 },
            { t: 'melee', move: punch },
            { t: 'melee', move: slam },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'terremoto',
          name: 'Terremoto',
          weight: 3,
          cooldownS: 6,
          steps: [
            { t: 'telegraph', s: 0.7, shape: { k: 'rect', w: 1, d: 3.5 }, at: 'self', sfx: 'telegraph' },
            { t: 'shockwave', axis: 'x', speed: 10, range: 18, height: 0.7, hit: shock, both: true },
            { t: 'wait', s: 0.9 },
            { t: 'shockwave', axis: 'x', speed: 12, range: 18, height: 0.7, hit: shock, both: true },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'destrocos',
          name: 'Chuva de Destroços',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'projectile', spec: debris, count: 6, spreadDeg: 0, aim: 'down', intervalS: 0.22 },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'varredura',
          name: 'Varredura de Plasma',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'pose', pose: 'cast', s: 0.8 },
            { t: 'beam', mode: 'sweepZ', durationS: 1.6, width: 0.9, hit: laser },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'pisao_colossal',
          name: 'Pisão Colossal',
          weight: 2,
          cooldownS: 9,
          minRange: 3.5,
          steps: [
            { t: 'leap', to: 'player', airS: 1.3, landing: stompBlast(4, 30) },
            { t: 'shake', trauma: 0.9 },
            { t: 'wait', s: 0.8 },
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- 4. Núcleo
    {
      untilHpFrac: 0,
      name: 'Núcleo',
      speedMult: 1.2,
      damageMult: 1.25,
      idleBetweenS: [0.5, 1],
      resist: { bullet: 1, blade: 1.1, blunt: 1.1, holy: 1.8 },
      aura: {
        radius: 3,
        hit: {
          damage: 3,
          dtype: 'necro',
          knockback: 0,
          hitstun: 0,
          hitstop: 0,
          status: { id: 'slow', chance: 0.5, durationS: 1 },
        },
      },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.6 },
        { t: 'setElement', element: 'necro' },
        { t: 'shake', trauma: 1 },
        { t: 'summon', enemy: 'walker', count: 3, from: 'ground' },
        { t: 'vulnerable', s: 2, mult: 1.4 },
      ],
      patterns: [
        {
          id: 'absorver',
          name: 'Absorção',
          weight: 3,
          cooldownS: 14,
          steps: [
            { t: 'pose', pose: 'cast', s: 0.6 },
            { t: 'summon', enemy: 'walker', count: 3, from: 'ground' },
            { t: 'wait', s: 2.6 },
            { t: 'telegraph', s: 0.8, shape: { k: 'circle', r: 6 }, at: 'self', sfx: 'telegraph' },
            { t: 'absorb', radius: 6, healFrac: 0.012 },
            { t: 'vulnerable', s: 2.2, mult: 1.6 },
          ],
        },
        {
          id: 'raio_nucleo',
          name: 'Raio do Núcleo',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 1.1 }, at: 'player', sfx: 'telegraph' },
            {
              t: 'beam',
              mode: 'playerLane',
              durationS: 1.6,
              width: 1.1,
              hit: { ...laser, dtype: 'necro', damage: 11 },
            },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'enxame_almas',
          name: 'Enxame de Almas',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'projectile', spec: coreBolt, count: 8, spreadDeg: 0, aim: 'ring', from: 'top' },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'passo_sombrio',
          name: 'Passo Sombrio',
          weight: 2,
          cooldownS: 7,
          steps: [
            { t: 'teleport', to: 'behindPlayer' },
            { t: 'wait', s: 0.3 },
            { t: 'melee', move: claw },
            { t: 'melee', move: slam },
          ],
        },
        {
          id: 'plasma',
          name: 'Canhão de Plasma',
          weight: 2,
          cooldownS: 6,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'pose', pose: 'cast', s: 0.5 },
            {
              t: 'repeat',
              times: 3,
              steps: [
                { t: 'projectile', spec: plasma, count: 1, spreadDeg: 0, aim: 'player', from: 'hand' },
                { t: 'wait', s: 0.35 },
              ],
            },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'onda_final',
          weight: 1,
          cooldownS: 10,
          steps: [
            { t: 'telegraph', s: 0.6, shape: { k: 'ring', r: 3 }, at: 'self', sfx: 'telegraph' },
            {
              t: 'shockwave',
              axis: 'ring',
              speed: 8,
              range: 12,
              height: 0.7,
              hit: { ...shock, dtype: 'necro' },
            },
            { t: 'wait', s: 0.4 },
            {
              t: 'shockwave',
              axis: 'ring',
              speed: 8,
              range: 12,
              height: 0.7,
              hit: { ...shock, dtype: 'necro' },
            },
            { t: 'wait', s: 0.8 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
