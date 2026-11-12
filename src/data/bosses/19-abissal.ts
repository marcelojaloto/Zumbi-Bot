import { MOVES } from '../melee';
import type { BossDef, ExplosionSpec, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

const tentaculo: MeleeMoveDef = {
  id: 'abissal_tentaculo',
  pose: 'slam',
  startup: 20,
  active: 6,
  recovery: 28,
  hitbox: { x0: 0, x1: 1.6, y0: 0, y1: 1.9, zTol: 0.5 },
  hit: {
    damage: 26,
    dtype: 'blunt',
    knockback: 7,
    launch: 4,
    knockdown: true,
    hitstun: 28,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[tentaculo.id] = tentaculo;

const varrida: MeleeMoveDef = {
  id: 'abissal_varrida',
  pose: 'hook',
  startup: 14,
  active: 7,
  recovery: 24,
  hitbox: { x0: -0.4, x1: 1.8, y0: 0, y1: 1.6, zTol: 0.6 },
  hit: {
    damage: 22,
    dtype: 'blunt',
    knockback: 9,
    launch: 3,
    knockdown: true,
    hitstun: 24,
    hitstop: 6,
    heavy: true,
  },
  superArmor: true,
};
MOVES[varrida.id] = varrida;

// lento, persegue e dá para abater
const torpedo: ProjectileSpec = {
  visual: 'missile',
  speed: 6,
  radius: 0.4,
  lifeS: 4,
  homing: 1.6,
  y: 1.1,
  hp: 16,
  hit: { damage: 18, dtype: 'explosive', knockback: 5, launch: 3, knockdown: true, hitstun: 22, hitstop: 4 },
  onImpact: {
    explosion: {
      radius: 1.8,
      damage: 16,
      minMult: 0.5,
      dtype: 'explosive',
      knockback: 5,
      launch: 3,
      selfMult: 0,
      fx: 'explosion',
    },
  },
};

const sonar: HitSpec = {
  damage: 16,
  dtype: 'water',
  knockback: 5,
  launch: 3,
  knockdown: true,
  hitstun: 20,
  hitstop: 4,
};

const jato: HitSpec = {
  damage: 8,
  dtype: 'water',
  knockback: 4,
  hitstun: 10,
  hitstop: 2,
  status: { id: 'wet' },
};

// redemoinho: prende no lugar e machuca aos poucos
const redemoinho: ZoneSpec = {
  radius: 1.5,
  durationS: 3.5,
  tickS: 0.5,
  hit: { damage: 7, dtype: 'water', knockback: 0, hitstun: 0, hitstop: 0, status: { id: 'wet' } },
  fx: 'water',
  slow: 0.7,
};

const carga: ZoneSpec = {
  radius: 1.3,
  durationS: 0.4,
  tickS: 0.5,
  hit: {
    damage: 24,
    dtype: 'explosive',
    knockback: 6,
    launch: 5,
    knockdown: true,
    hitstun: 26,
    hitstop: 5,
    heavy: true,
  },
  fx: 'explosion',
};

const investida: HitSpec = {
  damage: 26,
  dtype: 'blunt',
  knockback: 10,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

const pouso: ExplosionSpec = {
  radius: 3,
  damage: 28,
  minMult: 0.5,
  dtype: 'water',
  knockback: 8,
  launch: 6,
  selfMult: 0,
  fx: 'explosion',
};

const nucleo: HitSpec = { damage: 4, dtype: 'electric', knockback: 0, hitstun: 0, hitstop: 0 };

/** Chefe final da 2ª temporada: a cópia do OMEGA-Z, fundida ao laboratório submarino. Três fases. */
export const abissal = registerBoss({
  id: 'abissal',
  name: 'OMEGA-Z Abissal',
  title: 'A Cópia do Fundo do Mar',
  family: 'cyborg',
  element: 'water',
  hp: 14000,
  scale: 2.5,
  radius: 1.35,
  height: 4.9,
  speed: 2,
  poise: 720,
  resist: { water: 0.3, electric: 1.4, ice: 1.2, necro: 0.4, cyber: 0.6, bullet: 0.85 },
  statusDurationMult: 0.45,
  statusImmune: ['hacked', 'raised', 'wet', 'poison'],
  contact: { damage: 10, dtype: 'blunt', knockback: 7, hitstun: 14, hitstop: 2 },
  rewards: { xp: 3500, score: 120000, scrap: 1800, cosmetics: [] },
  music: 'mar',
  rig: {
    kind: 'humanoid',
    scale: 2.5,
    skin: 0x4a6a72,
    cloth: 0x1c2a34,
    cloth2: 0x121c24,
    eye: 0xff2a3a,
    hunch: 0.2,
    bulk: 1.55,
    boss: 'abissal',
  },
  phases: [
    {
      untilHpFrac: 0.66,
      name: 'Pressão',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.9, 1.5],
      patterns: [
        {
          id: 'tentaculo',
          name: 'Tentáculo',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3.2, maxS: 2.2 },
            { t: 'melee', move: tentaculo },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'torpedos',
          name: 'Torpedos',
          weight: 3,
          cooldownS: 8,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'sfx', id: 'telegraph' },
            { t: 'pose', pose: 'windup', s: 0.6 },
            { t: 'projectile', spec: torpedo, count: 2, spreadDeg: 40, aim: 'fan' },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'sonar',
          name: 'Sonar',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.5 },
            { t: 'shockwave', axis: 'ring', speed: 7, range: 12, height: 0.7, hit: sonar },
            { t: 'wait', s: 0.7 },
            { t: 'shockwave', axis: 'ring', speed: 8, range: 12, height: 0.7, hit: sonar },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'jato',
          name: 'Jato de Pressão',
          weight: 3,
          cooldownS: 6,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.9, shape: { k: 'lane', width: 1.5 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.7, width: 1.5, hit: jato },
            { t: 'wait', s: 0.5 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0.33,
      name: 'Maré Vermelha',
      speedMult: 1.15,
      damageMult: 1.1,
      idleBetweenS: [0.7, 1.2],
      adds: { enemy: 'mar_piranha', count: 2, everyS: 16, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.5 },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'mar_piranha', count: 4, from: 'back' },
      ],
      patterns: [
        {
          id: 'tentaculo2',
          name: 'Tentáculos',
          weight: 3,
          cooldownS: 2.2,
          steps: [
            { t: 'move', to: 'player', speed: 3.6, maxS: 2 },
            { t: 'melee', move: tentaculo },
            { t: 'melee', move: varrida },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'redemoinho',
          name: 'Redemoinho',
          weight: 3,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'zone', zone: redemoinho, at: 'player', count: 3, delayS: 1 },
            { t: 'wait', s: 0.8 },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 2.2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 1.3, hit: investida },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'cargas',
          name: 'Cargas de Profundidade',
          weight: 3,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.5 },
            { t: 'shake', trauma: 0.35 },
            { t: 'zone', zone: carga, at: 'grid', count: 8, delayS: 1.5 },
            { t: 'wait', s: 1.6 },
          ],
        },
        {
          id: 'torpedos2',
          name: 'Salva de Torpedos',
          weight: 2,
          cooldownS: 8,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'sfx', id: 'telegraph' },
            { t: 'pose', pose: 'windup', s: 0.5 },
            { t: 'projectile', spec: torpedo, count: 3, spreadDeg: 35, aim: 'fan' },
            { t: 'wait', s: 0.9 },
          ],
        },
        {
          id: 'superaquece',
          name: 'Núcleo Superaquecido',
          weight: 2,
          cooldownS: 16,
          steps: [
            { t: 'beam', mode: 'sweepZ', durationS: 1.4, width: 1.4, hit: jato },
            { t: 'vulnerable', s: 2.6, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.6 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Núcleo Exposto',
      speedMult: 1.3,
      damageMult: 1.2,
      idleBetweenS: [0.5, 0.9],
      aura: { radius: 2.4, hit: nucleo },
      adds: { enemy: 'mar_piranha', count: 2, everyS: 18, maxAlive: 3 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.6 },
        { t: 'shake', trauma: 0.9 },
        // a cúpula racha e a arena aperta
        { t: 'arena', zBand: [-2.4, 1.2] },
        { t: 'summon', enemy: 'mar_swimmer', count: 3, from: 'sides' },
      ],
      patterns: [
        {
          id: 'tentaculo3',
          name: 'Fúria dos Tentáculos',
          weight: 3,
          cooldownS: 2,
          steps: [
            { t: 'move', to: 'player', speed: 4, maxS: 1.8 },
            { t: 'melee', move: tentaculo },
            { t: 'melee', move: varrida },
            { t: 'melee', move: tentaculo },
          ],
        },
        {
          id: 'mergulho',
          name: 'Mergulho',
          weight: 2,
          cooldownS: 8,
          minRange: 3.5,
          steps: [
            { t: 'leap', to: 'player', airS: 1.1, landing: pouso },
            { t: 'shockwave', axis: 'ring', speed: 8, range: 12, height: 0.7, hit: sonar },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'tempestade',
          name: 'Tempestade Abissal',
          weight: 3,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.45 },
            { t: 'zone', zone: carga, at: 'grid', count: 8, delayS: 1.4 },
            { t: 'wait', s: 0.8 },
            { t: 'zone', zone: carga, at: 'player', count: 3, delayS: 1.1 },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'jato_duplo',
          name: 'Jato Duplo',
          weight: 3,
          cooldownS: 6,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 1.5 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.5, hit: jato },
            { t: 'telegraph', s: 0.55, shape: { k: 'lane', width: 1.5 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.5, hit: jato },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'devora',
          name: 'Cardume Devorado',
          weight: 1,
          cooldownS: 30,
          steps: [
            { t: 'summon', enemy: 'mar_piranha', count: 3, from: 'back' },
            { t: 'wait', s: 2.5 },
            { t: 'absorb', radius: 6, healFrac: 0.005 },
          ],
        },
        {
          id: 'superaquece2',
          name: 'Núcleo Superaquecido',
          weight: 2,
          cooldownS: 14,
          steps: [
            { t: 'projectile', spec: torpedo, count: 3, spreadDeg: 35, aim: 'fan' },
            { t: 'charge', speed: 12, maxS: 1.2, hit: investida },
            { t: 'vulnerable', s: 2.4, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.5 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
