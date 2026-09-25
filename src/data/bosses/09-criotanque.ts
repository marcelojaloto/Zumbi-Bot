import { MOVES } from '../melee';
import type { BossDef, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

/** Pisão de esteiras (curta distância, área ao redor). */
const pisao: MeleeMoveDef = {
  id: 'criotanque_pisao',
  pose: 'stomp',
  startup: 24,
  active: 5,
  recovery: 32,
  hitbox: { aoeR: 1.25, y0: -0.2, y1: 0.7 },
  hit: {
    damage: 20,
    dtype: 'blunt',
    knockback: 7,
    launch: 5,
    knockdown: true,
    hitstun: 28,
    hitstop: 7,
    heavy: true,
    status: { id: 'chill', chance: 0.6 },
  },
  superArmor: true,
};
MOVES[pisao.id] = pisao;

/** Granada criogênica em arco: impacto gelado deixa uma poça que resfria/congela. */
const cryoShell: ProjectileSpec = {
  visual: 'iceball',
  speed: 9,
  radius: 0.45,
  lifeS: 3,
  lob: true,
  gravity: 14,
  y: 1.3,
  hit: {
    damage: 16,
    dtype: 'ice',
    knockback: 3,
    launch: 2,
    hitstun: 16,
    hitstop: 4,
    status: { id: 'chill', stacks: 1 },
  },
  onImpact: {
    zone: {
      radius: 2,
      durationS: 2.5,
      tickS: 0.6,
      hit: {
        damage: 8,
        dtype: 'ice',
        knockback: 0,
        hitstun: 4,
        hitstop: 0,
        status: { id: 'chill', chance: 0.6 },
      },
      fx: 'frost',
      slow: 0.4,
    },
  },
};

/** Traçantes da metralhadora giratória (disparadas em faixas fixas: há vãos seguros). */
const tracer: ProjectileSpec = {
  visual: 'tracer',
  speed: 20,
  radius: 0.18,
  lifeS: 1.3,
  y: 1.0,
  hit: { damage: 12, dtype: 'bullet', knockback: 1.5, hitstun: 10, hitstop: 1 },
};

/** Míssil de artilharia (fase 2): cai do céu com aviso no chão. */
const missile: ProjectileSpec = {
  visual: 'missile',
  speed: 12,
  radius: 0.5,
  lifeS: 3,
  hit: {
    damage: 20,
    dtype: 'explosive',
    knockback: 6,
    launch: 5,
    knockdown: true,
    hitstun: 24,
    hitstop: 5,
    heavy: true,
  },
  onImpact: {
    explosion: {
      radius: 1.8,
      damage: 22,
      minMult: 0.45,
      dtype: 'explosive',
      knockback: 6,
      launch: 5,
      selfMult: 0,
      fx: 'explosion',
    },
  },
};

/** Minas congelantes: pequenas, duram muito e podem congelar. */
const minaGelo: ZoneSpec = {
  radius: 0.8,
  durationS: 10,
  tickS: 0.5,
  hit: {
    damage: 12,
    dtype: 'ice',
    knockback: 2,
    launch: 2,
    hitstun: 12,
    hitstop: 2,
    status: { id: 'freeze', chance: 0.35, durationS: 1.2 },
  },
  fx: 'ice',
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

export const criotanque = registerBoss({
  id: 'criotanque',
  name: 'General Criotanque',
  title: 'Comandante do Inverno Eterno',
  family: 'robot',
  element: 'ice',
  hp: 7600,
  scale: 1.9,
  radius: 1.2,
  height: 4.4,
  speed: 1.8,
  poise: 420,
  resist: { ice: 0.1, fire: 1.5, electric: 1.3, bullet: 0.75, blade: 0.6, explosive: 0.9, toxic: 0.5 },
  statusDurationMult: 0.5,
  statusImmune: ['chill', 'freeze', 'poison'],
  contact: { damage: 10, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 1300, score: 60000, scrap: 600, unlockStaff: 'ice', cosmetics: [] },
  music: 'guerra',
  rig: {
    kind: 'mech',
    scale: 1.9,
    skin: 0x56604e,
    cloth: 0x2c322c,
    cloth2: 0x7ab8d0,
    eye: 0x9fe8ff,
    boss: 'criotanque',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Ofensiva',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [1, 1.7],
      patterns: [
        {
          id: 'canhao_cryo',
          name: 'Canhão Criogênico',
          weight: 3,
          cooldownS: 6,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'circle', r: 2 }, at: 'player', sfx: 'telegraph' },
            { t: 'projectile', spec: cryoShell, count: 3, spreadDeg: 0, aim: 'player', intervalS: 0.45 },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'metralhadora',
          name: 'Metralhadora Giratória',
          weight: 3,
          cooldownS: 7,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.8,
              shape: { k: 'cone', angleDeg: 50, range: 12 },
              at: 'self',
              sfx: 'telegraph',
            },
            {
              t: 'repeat',
              times: 4,
              steps: [{ t: 'projectile', spec: tracer, count: 3, spreadDeg: 0, aim: 'lanes', intervalS: 0.07 }],
            },
            { t: 'wait', s: 0.35 },
            {
              t: 'repeat',
              times: 4,
              steps: [{ t: 'projectile', spec: tracer, count: 4, spreadDeg: 0, aim: 'lanes', intervalS: 0.06 }],
            },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'minas_gelo',
          name: 'Minas Congelantes',
          weight: 2,
          cooldownS: 12,
          steps: [
            { t: 'pose', pose: 'cast', s: 0.5 },
            { t: 'zone', zone: minaGelo, at: 'random', count: 6, delayS: 1.2 },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'investida',
          name: 'Investida',
          weight: 2,
          cooldownS: 8,
          minRange: 4,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3, maxS: 1 },
            { t: 'telegraph', s: 0.85, shape: { k: 'lane', width: 2.6 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 2, hit: investida },
            { t: 'vulnerable', s: 1.2, mult: 1.3 },
          ],
        },
        {
          id: 'pisao',
          name: 'Pisão de Esteiras',
          weight: 2,
          cooldownS: 4,
          maxRange: 3.5,
          steps: [
            { t: 'melee', move: pisao },
            { t: 'wait', s: 0.4 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Inverno Total',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.7, 1.3],
      adds: { enemy: 'soldier', count: 2, everyS: 18, maxAlive: 3 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.8 },
        { t: 'sfx', id: 'alarm' },
        { t: 'summon', enemy: 'soldier', count: 2, from: 'sides' },
        { t: 'projectile', spec: missile, count: 4, spreadDeg: 0, aim: 'down', intervalS: 0.35 },
        { t: 'wait', s: 1 },
      ],
      patterns: [
        {
          id: 'barragem',
          name: 'Barragem de Artilharia',
          weight: 3,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'cast', s: 0.5 },
            { t: 'sfx', id: 'alarm' },
            { t: 'projectile', spec: missile, count: 6, spreadDeg: 0, aim: 'down', intervalS: 0.3 },
            { t: 'wait', s: 0.5 },
            { t: 'vulnerable', s: 1, mult: 1.25 },
          ],
        },
        {
          id: 'canhao_cryo2',
          name: 'Canhão Criogênico',
          weight: 3,
          cooldownS: 6,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.6, shape: { k: 'circle', r: 2 }, at: 'player', sfx: 'telegraph' },
            { t: 'projectile', spec: cryoShell, count: 5, spreadDeg: 0, aim: 'player', intervalS: 0.35 },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'metralhadora2',
          name: 'Metralhadora Giratória',
          weight: 3,
          cooldownS: 7,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.7,
              shape: { k: 'cone', angleDeg: 50, range: 12 },
              at: 'self',
              sfx: 'telegraph',
            },
            {
              t: 'repeat',
              times: 4,
              steps: [{ t: 'projectile', spec: tracer, count: 3, spreadDeg: 0, aim: 'lanes', intervalS: 0.06 }],
            },
            { t: 'wait', s: 0.3 },
            {
              t: 'repeat',
              times: 4,
              steps: [{ t: 'projectile', spec: tracer, count: 4, spreadDeg: 0, aim: 'lanes', intervalS: 0.06 }],
            },
            { t: 'wait', s: 0.3 },
            {
              t: 'repeat',
              times: 3,
              steps: [{ t: 'projectile', spec: tracer, count: 3, spreadDeg: 0, aim: 'lanes', intervalS: 0.06 }],
            },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'minas_gelo2',
          name: 'Minas Congelantes',
          weight: 2,
          cooldownS: 11,
          steps: [
            { t: 'pose', pose: 'cast', s: 0.45 },
            { t: 'zone', zone: minaGelo, at: 'random', count: 8, delayS: 1.1 },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'investida2',
          name: 'Investida Dupla',
          weight: 2,
          cooldownS: 9,
          minRange: 3,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3.2, maxS: 0.9 },
            { t: 'telegraph', s: 0.75, shape: { k: 'lane', width: 2.6 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 12, maxS: 2, hit: investida },
            { t: 'wait', s: 0.6 },
            { t: 'move', to: 'playerLane', speed: 3.2, maxS: 0.7 },
            { t: 'telegraph', s: 0.65, shape: { k: 'lane', width: 2.6 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 12, maxS: 2, hit: investida },
            { t: 'vulnerable', s: 1.1, mult: 1.3 },
          ],
        },
        {
          id: 'pisao2',
          name: 'Pisão de Esteiras',
          weight: 2,
          cooldownS: 3.5,
          maxRange: 3.5,
          steps: [
            { t: 'melee', move: pisao },
            { t: 'wait', s: 0.3 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
