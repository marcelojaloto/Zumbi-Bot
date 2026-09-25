import { MOVES } from '../melee';
import type { BossDef, ExplosionSpec, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

/** Martelo de bronze: soco pesado de cima para baixo. */
const martelo: MeleeMoveDef = {
  id: 'sentinela_martelo',
  pose: 'slam',
  startup: 22,
  active: 6,
  recovery: 28,
  hitbox: { x0: 0, x1: 1.2, y0: 0, y1: 1.6, zTol: 0.45 },
  hit: {
    damage: 20,
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
MOVES[martelo.id] = martelo;

/** Hélice bumerangue: vai até o fim da trajetória e volta ao rotor. */
const helice: ProjectileSpec = {
  visual: 'blade',
  speed: 9,
  radius: 0.4,
  lifeS: 2.4,
  boomerang: true,
  y: 0.5,
  hit: {
    damage: 14,
    dtype: 'blade',
    knockback: 4,
    launch: 2,
    hitstun: 16,
    hitstop: 4,
  },
};

/** Vento do rotor: dano baixo por tique, empurrão forte. */
const rajada: HitSpec = {
  damage: 7,
  dtype: 'wind',
  knockback: 8,
  launch: 1.5,
  hitstun: 8,
  hitstop: 2,
};

const pouso: ExplosionSpec = {
  radius: 3,
  damage: 30,
  minMult: 0.5,
  dtype: 'blunt',
  knockback: 7,
  launch: 6,
  selfMult: 0,
  fx: 'explosion',
};

const anelVento: HitSpec = {
  damage: 14,
  dtype: 'wind',
  knockback: 6,
  launch: 4,
  knockdown: true,
  hitstun: 24,
  hitstop: 4,
};

/** Redemoinho que persegue o jogador (um acerto por redemoinho). */
const tornado: ZoneSpec = {
  radius: 1.4,
  durationS: 0.4,
  tickS: 0.5,
  hit: {
    damage: 14,
    dtype: 'wind',
    knockback: 5,
    launch: 7,
    knockdown: true,
    hitstun: 24,
    hitstop: 4,
  },
  fx: 'wind',
};

export const sentinela = registerBoss({
  id: 'sentinela',
  name: 'Sentinela dos Ventos',
  title: 'Guardião do Campanário',
  family: 'robot',
  element: 'wind',
  hp: 3600,
  scale: 2.1,
  radius: 1.0,
  height: 4.6,
  speed: 2.2,
  poise: 340,
  resist: { wind: 0.3, electric: 1.3, bullet: 0.85, water: 1.15 },
  statusDurationMult: 0.6,
  statusImmune: ['poison'],
  contact: { damage: 8, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 600, score: 25000, scrap: 250, unlockStaff: 'wind', cosmetics: [] },
  music: 'torre',
  rig: {
    kind: 'mech',
    scale: 2.1,
    skin: 0x6a7a6c,
    cloth: 0x2a2c30,
    cloth2: 0xc8963a,
    eye: 0x8ff0ff,
    boss: 'sentinela',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.8, 1.5],
      patterns: [
        {
          id: 'martelo',
          name: 'Martelo do Sino',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3, maxS: 2.2 },
            { t: 'melee', move: martelo },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'rajada_rotor',
          name: 'Rajada do Rotor',
          weight: 3,
          cooldownS: 6,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.9, shape: { k: 'lane', width: 1.8 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.6, width: 1.8, hit: rajada },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'helices',
          name: 'Hélices',
          weight: 3,
          cooldownS: 7,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'sfx', id: 'telegraph' },
            { t: 'pose', pose: 'windup', s: 0.7 },
            { t: 'projectile', spec: helice, count: 3, spreadDeg: 0, aim: 'lanes' },
            { t: 'wait', s: 1.6 },
          ],
        },
        {
          id: 'pouso',
          name: 'Pouso Esmagador',
          weight: 2,
          cooldownS: 8,
          minRange: 4,
          steps: [
            { t: 'pose', pose: 'windup', s: 0.4 },
            { t: 'leap', to: 'player', airS: 1.1, landing: pouso },
            { t: 'wait', s: 0.8 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Tempestade',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.5, 1.1],
      adds: { enemy: 'drone', count: 2, everyS: 16, maxAlive: 3 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'drone', count: 2, from: 'back' },
      ],
      patterns: [
        {
          id: 'martelo2',
          name: 'Martelo Duplo',
          weight: 3,
          cooldownS: 2,
          steps: [
            { t: 'move', to: 'player', speed: 3.5, maxS: 2 },
            { t: 'melee', move: martelo },
            { t: 'melee', move: martelo },
          ],
        },
        {
          id: 'rajada_dupla',
          name: 'Rajada Dupla',
          weight: 3,
          cooldownS: 6,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.75, shape: { k: 'lane', width: 1.8 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.8, hit: rajada },
            { t: 'telegraph', s: 0.65, shape: { k: 'lane', width: 1.8 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.8, hit: rajada },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'helices2',
          name: 'Hélices Cruzadas',
          weight: 2,
          cooldownS: 7,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'sfx', id: 'telegraph' },
            { t: 'pose', pose: 'windup', s: 0.55 },
            { t: 'projectile', spec: helice, count: 3, spreadDeg: 0, aim: 'lanes' },
            { t: 'wait', s: 0.6 },
            { t: 'pose', pose: 'windup', s: 0.35 },
            { t: 'projectile', spec: helice, count: 2, spreadDeg: 20, aim: 'fan' },
            { t: 'wait', s: 1.3 },
          ],
        },
        {
          id: 'tornado',
          name: 'Tornado',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            {
              t: 'repeat',
              times: 4,
              steps: [
                { t: 'zone', zone: tornado, at: 'player', count: 1, delayS: 0.8 },
                { t: 'wait', s: 0.3 },
              ],
            },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'pouso2',
          name: 'Pouso do Furacão',
          weight: 2,
          cooldownS: 8,
          minRange: 3,
          steps: [
            { t: 'leap', to: 'player', airS: 1, landing: pouso },
            { t: 'telegraph', s: 0.5, shape: { k: 'ring', r: 3 }, at: 'self', sfx: 'telegraph' },
            { t: 'shockwave', axis: 'ring', speed: 7, range: 7, height: 0.7, hit: anelVento },
            { t: 'wait', s: 0.8 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
