import { MOVES } from '../melee';
import type { BossDef, MeleeMoveDef, ProjectileSpec } from '../types';
import { registerBoss } from './index';

const swing: MeleeMoveDef = {
  id: 'coveiro_swing',
  pose: 'swing1',
  startup: 20,
  active: 6,
  recovery: 30,
  hitbox: { x0: 0, x1: 1.25, y0: 0, y1: 1.6, zTol: 0.45 },
  hit: {
    damage: 20,
    dtype: 'blunt',
    knockback: 7,
    launch: 5,
    knockdown: true,
    hitstun: 30,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[swing.id] = swing;

const tombstone: ProjectileSpec = {
  visual: 'tombstone',
  speed: 12,
  radius: 0.5,
  lifeS: 3,
  hit: {
    damage: 18,
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
      radius: 1.3,
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

const shock = {
  damage: 25,
  dtype: 'earth' as const,
  knockback: 5,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 5,
  heavy: true,
};
const spikes = {
  radius: 1.1,
  durationS: 0.5,
  tickS: 0.5,
  hit: {
    damage: 18,
    dtype: 'earth' as const,
    knockback: 3,
    launch: 5,
    knockdown: true,
    hitstun: 24,
    hitstop: 4,
    status: { id: 'root' as const },
  },
  fx: 'spikes',
};

export const coveiro = registerBoss({
  id: 'coveiro',
  name: 'Coveiro Colossal',
  title: 'O Senhor das Covas',
  family: 'zombie',
  element: 'earth',
  hp: 3000,
  scale: 2.3,
  radius: 1.05,
  height: 4.2,
  speed: 2.2,
  poise: 320,
  resist: { bullet: 0.8, fire: 1.2, holy: 1.4, earth: 0.3 },
  statusDurationMult: 0.6,
  statusImmune: [],
  contact: { damage: 8, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 500, score: 20000, scrap: 200, unlockStaff: 'earth', cosmetics: ['crown_coveiro'] },
  music: 'vila',
  rig: {
    kind: 'humanoid',
    scale: 2.3,
    skin: 0x6a7a58,
    cloth: 0x2e2620,
    cloth2: 0x1e1a18,
    eye: 0xb8ff4a,
    hunch: 0.35,
    bulk: 1.35,
    boss: 'coveiro',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.8, 1.6],
      patterns: [
        {
          id: 'pazada',
          name: 'Pazada',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3.2, maxS: 2.2 },
            { t: 'melee', move: swing },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'pa_sismica',
          name: 'Pá Sísmica',
          weight: 3,
          cooldownS: 6,
          minRange: 2,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'rect', w: 1, d: 6 }, at: 'self', sfx: 'telegraph' },
            { t: 'shockwave', axis: 'x', speed: 9, range: 18, height: 0.7, hit: shock },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'chuva_lapides',
          name: 'Chuva de Lápides',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.6 },
            { t: 'projectile', spec: tombstone, count: 3, spreadDeg: 0, aim: 'down', intervalS: 0.35 },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'cova_aberta',
          name: 'Cova Aberta',
          weight: 2,
          cooldownS: 14,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.5 },
            { t: 'shake', trauma: 0.5 },
            { t: 'summon', enemy: 'walker', count: 3, from: 'ground' },
            { t: 'zone', zone: spikes, at: 'player', count: 3, delayS: 1.0 },
            { t: 'wait', s: 1 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      speedMult: 1.25,
      damageMult: 1.15,
      idleBetweenS: [0.5, 1.1],
      adds: { enemy: 'walker', count: 2, everyS: 15, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.6 },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'runner', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'pazada2',
          weight: 3,
          cooldownS: 2,
          steps: [
            { t: 'move', to: 'player', speed: 3.8, maxS: 2 },
            { t: 'melee', move: swing },
            { t: 'melee', move: swing },
          ],
        },
        {
          id: 'pa_dupla',
          name: 'Pá Sísmica Dupla',
          weight: 3,
          cooldownS: 6,
          steps: [
            { t: 'telegraph', s: 0.7, shape: { k: 'rect', w: 1, d: 6 }, at: 'self', sfx: 'telegraph' },
            { t: 'shockwave', axis: 'x', speed: 9, range: 18, height: 0.7, hit: shock, both: true },
            { t: 'wait', s: 0.9 },
            { t: 'shockwave', axis: 'x', speed: 11, range: 18, height: 0.7, hit: shock, both: true },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'chuva_lapides2',
          weight: 2,
          cooldownS: 7,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'projectile', spec: tombstone, count: 5, spreadDeg: 0, aim: 'down', intervalS: 0.25 },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'salto',
          name: 'Salto do Coveiro',
          weight: 2,
          cooldownS: 8,
          minRange: 4,
          steps: [
            {
              t: 'leap',
              to: 'player',
              airS: 1.1,
              landing: {
                radius: 3,
                damage: 25,
                minMult: 0.5,
                dtype: 'earth',
                knockback: 7,
                launch: 6,
                selfMult: 0,
                fx: 'explosion',
              },
            },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'cova_aberta2',
          weight: 1,
          cooldownS: 12,
          steps: [
            { t: 'summon', enemy: 'walker', count: 2, from: 'ground' },
            { t: 'zone', zone: spikes, at: 'player', count: 4, delayS: 0.9 },
            { t: 'wait', s: 0.8 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
