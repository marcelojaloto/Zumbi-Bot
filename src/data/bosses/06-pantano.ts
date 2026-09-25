import { MOVES } from '../melee';
import type { BossDef, BossStep, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

/** Pancada com o braço de lama (golpe frontal). */
const smash: MeleeMoveDef = {
  id: 'pantano_smash',
  pose: 'swing1',
  startup: 22,
  active: 6,
  recovery: 30,
  hitbox: { x0: 0, x1: 1.2, y0: 0, y1: 1.7, zTol: 0.42 },
  hit: {
    damage: 22,
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
MOVES[smash.id] = smash;

/** Pisão em área depois do agarrão de raízes. */
const stomp: MeleeMoveDef = {
  id: 'pantano_stomp',
  pose: 'slamGround',
  startup: 16,
  active: 5,
  recovery: 34,
  hitbox: { aoeR: 0.95, y0: -0.2, y1: 0.8 },
  hit: {
    damage: 26,
    dtype: 'earth',
    knockback: 6,
    launch: 6,
    knockdown: true,
    hitstun: 30,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[stomp.id] = stomp;

/** Onda de lama que varre a profundidade (precisa ser pulada). */
const mudWave: HitSpec = {
  damage: 22,
  dtype: 'water',
  knockback: 4,
  launch: 5,
  knockdown: true,
  hitstun: 28,
  hitstop: 5,
  heavy: true,
  status: { id: 'wet', durationS: 6 },
};

const geyser: ZoneSpec = {
  radius: 1.2,
  durationS: 0.35,
  tickS: 0.5,
  hit: {
    damage: 20,
    dtype: 'water',
    knockback: 2,
    launch: 9,
    knockdown: true,
    hitstun: 30,
    hitstop: 4,
    status: { id: 'wet', durationS: 5 },
  },
  fx: 'water',
};

/** Raízes: prendem sem derrubar (knockback 0 = sem reação). */
const roots: HitSpec = {
  damage: 14,
  dtype: 'earth',
  knockback: 0,
  hitstun: 0,
  hitstop: 3,
  status: { id: 'root', durationS: 1.1 },
};

const mudball: ProjectileSpec = {
  visual: 'mudball',
  speed: 10,
  radius: 0.45,
  lifeS: 2.6,
  y: 1.2,
  hit: {
    damage: 15,
    dtype: 'water',
    knockback: 4,
    launch: 3,
    knockdown: true,
    hitstun: 22,
    hitstop: 4,
    status: { id: 'wet', durationS: 4 },
  },
  onImpact: {
    zone: {
      radius: 1,
      durationS: 2.5,
      tickS: 0.5,
      hit: { damage: 0, dtype: 'water', knockback: 0, hitstun: 0, hitstop: 0 },
      fx: 'mud',
      slow: 0.6,
    },
  },
};

/** Chuva torrencial: gotas pesadas caem do céu com aviso no chão. */
const rainDrop: ProjectileSpec = {
  visual: 'jet_water',
  speed: 12,
  radius: 0.35,
  lifeS: 3,
  hit: { damage: 6, dtype: 'water', knockback: 1, hitstun: 12, hitstop: 2, status: { id: 'wet' } },
  onImpact: {
    // poça que respinga uma vez (raio igual ao aviso do passo 'down')
    zone: {
      radius: 0.9,
      durationS: 0.3,
      tickS: 0.5,
      hit: {
        damage: 14,
        dtype: 'water',
        knockback: 3,
        launch: 3,
        hitstun: 16,
        hitstop: 3,
        status: { id: 'wet', durationS: 6 },
      },
      fx: 'water',
    },
  },
};

const ondaDeLama = (tele: number): BossStep[] => [
  { t: 'face', target: 'player' },
  { t: 'telegraph', s: tele, shape: { k: 'rect', w: 12, d: 1 }, at: 'self', sfx: 'telegraph' },
  { t: 'shockwave', axis: 'z', speed: 5, range: 16, height: 0.7, hit: mudWave },
];

const agarrao = (tele: number, walk: number): BossStep[] => [
  { t: 'telegraph', s: tele, shape: { k: 'lane', width: 1.3 }, at: 'player', sfx: 'telegraph' },
  { t: 'beam', mode: 'playerLane', durationS: 0.18, width: 1.3, hit: roots },
  { t: 'move', to: 'marked', speed: walk, maxS: 1.1 },
  { t: 'telegraph', s: 0.45, shape: { k: 'circle', r: 2.3 }, at: 'self' },
  { t: 'melee', move: stomp },
  { t: 'wait', s: 0.4 },
];

export const pantano = registerBoss({
  id: 'pantano',
  name: 'Colosso do Pântano',
  title: 'Coração da Lama',
  family: 'zombie',
  element: 'water',
  hp: 6000,
  scale: 2.4,
  radius: 1.1,
  height: 4.4,
  speed: 2,
  poise: 360,
  resist: { water: 0.2, earth: 0.6, fire: 0.8, electric: 1.4, ice: 1.3, bullet: 0.85, holy: 1.3 },
  statusDurationMult: 0.5,
  statusImmune: ['wet', 'poison'],
  contact: { damage: 10, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 1000, score: 45000, scrap: 450, unlockStaff: 'water', cosmetics: [] },
  music: 'floresta',
  rig: {
    kind: 'humanoid',
    scale: 2.4,
    skin: 0x4e5a38,
    cloth: 0x3a3020,
    cloth2: 0x2a2418,
    eye: 0x5ad8ff,
    hunch: 0.5,
    bulk: 1.55,
    boss: 'pantano',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.8, 1.6],
      patterns: [
        {
          id: 'pancada',
          name: 'Pancada de Lama',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3, maxS: 2.2 },
            { t: 'melee', move: smash },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'onda_lama',
          name: 'Onda de Lama',
          weight: 3,
          cooldownS: 7,
          steps: [...ondaDeLama(0.9), { t: 'wait', s: 1 }],
        },
        {
          id: 'geiseres',
          name: 'Gêiseres',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.4 },
            { t: 'shake', trauma: 0.3 },
            { t: 'zone', zone: geyser, at: 'player', count: 4, delayS: 1.05 },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'agarrao',
          name: 'Agarrão de Raízes',
          weight: 2,
          cooldownS: 10,
          steps: agarrao(1.0, 3.2),
        },
        {
          id: 'bolas_lama',
          name: 'Bolas de Lama',
          weight: 2,
          cooldownS: 6,
          minRange: 4,
          steps: [
            { t: 'pose', pose: 'windup', s: 0.5 },
            { t: 'projectile', spec: mudball, count: 3, spreadDeg: 16, aim: 'fan' },
            { t: 'wait', s: 0.8 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Dilúvio',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.5, 1.1],
      // "chuva" constante: quem abraça o colosso fica encharcado (status só aplica com dano >= 1)
      aura: {
        radius: 1.9,
        hit: { damage: 1, dtype: 'water', knockback: 0, hitstun: 0, hitstop: 0, status: { id: 'wet' } },
      },
      adds: { enemy: 'runner', count: 2, everyS: 14, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.6 },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'lumberjack', count: 1, from: 'right' },
        { t: 'summon', enemy: 'runner', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'pancada2',
          weight: 3,
          cooldownS: 2,
          steps: [
            { t: 'move', to: 'player', speed: 3.6, maxS: 2 },
            { t: 'melee', move: smash },
            { t: 'melee', move: smash },
          ],
        },
        {
          id: 'onda_dupla',
          name: 'Maré de Lama',
          weight: 3,
          cooldownS: 7,
          steps: [...ondaDeLama(0.75), { t: 'wait', s: 0.9 }, ...ondaDeLama(0.5), { t: 'wait', s: 0.8 }],
        },
        {
          id: 'geiseres2',
          name: 'Gêiseres Furiosos',
          weight: 2,
          cooldownS: 7,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.35 },
            { t: 'shake', trauma: 0.35 },
            { t: 'zone', zone: geyser, at: 'player', count: 6, delayS: 0.9 },
            { t: 'wait', s: 0.6 },
            { t: 'zone', zone: geyser, at: 'random', count: 3, delayS: 0.9 },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'agarrao2',
          name: 'Agarrão de Raízes',
          weight: 2,
          cooldownS: 9,
          steps: agarrao(0.85, 3.6),
        },
        {
          id: 'chuva',
          name: 'Chuva Torrencial',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.6 },
            { t: 'projectile', spec: rainDrop, count: 10, spreadDeg: 0, aim: 'down', intervalS: 0.14 },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'chamado',
          name: 'Chamado da Floresta',
          weight: 1,
          cooldownS: 22,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'summon', enemy: 'lumberjack', count: 1, from: 'sides' },
            { t: 'wait', s: 0.6 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
