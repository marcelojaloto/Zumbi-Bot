import { MOVES } from '../melee';
import type { BossDef, BossStep, ExplosionSpec, HitSpec, MeleeMoveDef, ProjectileSpec } from '../types';
import { registerBoss } from './index';

const cotovelada: MeleeMoveDef = {
  id: 'recordista_cotovelada',
  pose: 'hook',
  startup: 16,
  active: 6,
  recovery: 24,
  hitbox: { x0: -0.1, x1: 1.25, y0: 0, y1: 1.6, zTol: 0.45 },
  hit: {
    damage: 20,
    dtype: 'blunt',
    knockback: 7,
    launch: 3,
    knockdown: true,
    hitstun: 24,
    hitstop: 6,
    heavy: true,
  },
  superArmor: true,
};
MOVES[cotovelada.id] = cotovelada;

const pisao: MeleeMoveDef = {
  id: 'recordista_pisao',
  pose: 'slam',
  startup: 18,
  active: 6,
  recovery: 28,
  hitbox: { x0: 0, x1: 1.3, y0: 0, y1: 1.5, zTol: 0.5 },
  hit: {
    damage: 23,
    dtype: 'blunt',
    knockback: 8,
    launch: 4,
    knockdown: true,
    hitstun: 26,
    hitstop: 7,
    heavy: true,
  },
  superArmor: true,
};
MOVES[pisao.id] = pisao;

const tiro: HitSpec = {
  damage: 24,
  dtype: 'blunt',
  knockback: 10,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

const dardo: ProjectileSpec = {
  visual: 'blade',
  speed: 13,
  radius: 0.3,
  lifeS: 2.2,
  y: 1.2,
  hit: { damage: 14, dtype: 'blade', knockback: 3, hitstun: 16, hitstop: 3 },
};

const pouso: ExplosionSpec = {
  radius: 2.6,
  damage: 24,
  minMult: 0.5,
  dtype: 'blunt',
  knockback: 7,
  launch: 5,
  selfMult: 0,
  fx: 'explosion',
};

const poeira: HitSpec = {
  damage: 15,
  dtype: 'blunt',
  knockback: 5,
  launch: 3,
  knockdown: true,
  hitstun: 20,
  hitstop: 4,
};

/** Um tiro pela raia do jogador: troca de raia, avisa e larga. */
const largada = (speed: number, warnS: number): BossStep[] => [
  { t: 'move', to: 'playerLane', speed: 4.5, maxS: 0.8 },
  { t: 'face', target: 'player' },
  { t: 'telegraph', s: warnS, shape: { k: 'lane', width: 2 }, at: 'self', sfx: 'telegraph' },
  { t: 'charge', speed, maxS: 1.25, hit: tiro },
];

/** O Recordista: velocista gigante que corre pelas raias; depois de uma série de tiros fica sem fôlego. */
export const recordista = registerBoss({
  id: 'recordista',
  name: 'O Recordista',
  title: 'O Dono do Pódio',
  family: 'zombie',
  element: 'wind',
  hp: 9400,
  scale: 2.1,
  radius: 1,
  height: 4.1,
  speed: 2.6,
  poise: 360,
  resist: { wind: 0.5, ice: 1.3, fire: 1.15, holy: 1.2, blunt: 0.9, bullet: 0.95, necro: 0.6 },
  statusDurationMult: 0.5,
  statusImmune: [],
  contact: { damage: 9, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 1700, score: 76000, scrap: 760, cosmetics: [] },
  music: 'pista',
  rig: {
    kind: 'humanoid',
    scale: 2.1,
    skin: 0x74845a,
    cloth: 0xd8302a,
    cloth2: 0x1a1c26,
    eye: 0xffe03a,
    hunch: 0.2,
    bulk: 1.25,
    boss: 'recordista',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Aquecimento',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.8, 1.5],
      patterns: [
        {
          id: 'cotovelada',
          name: 'Cotovelada',
          weight: 3,
          cooldownS: 2.4,
          steps: [
            { t: 'move', to: 'player', speed: 3.6, maxS: 2 },
            { t: 'melee', move: cotovelada },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'tiro',
          name: 'Tiro de Cem Metros',
          weight: 3,
          cooldownS: 6,
          minRange: 3.5,
          steps: [...largada(12, 0.8), { t: 'wait', s: 0.8 }],
        },
        {
          id: 'dardos',
          name: 'Dardos nas Raias',
          weight: 2,
          cooldownS: 7,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.7,
              shape: { k: 'cone', angleDeg: 50, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: dardo, count: 3, spreadDeg: 0, aim: 'lanes' },
            { t: 'wait', s: 0.9 },
          ],
        },
        {
          id: 'salto',
          name: 'Salto em Distância',
          weight: 2,
          cooldownS: 9,
          minRange: 4,
          steps: [
            { t: 'leap', to: 'player', airS: 1, landing: pouso },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          // queima a largada: arranca cedo, para logo e fica sem fôlego
          id: 'largada_queimada',
          name: 'Largada Queimada',
          weight: 2,
          cooldownS: 15,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'pose', pose: 'windup', s: 0.4 },
            { t: 'charge', speed: 9, maxS: 0.4, hit: tiro },
            { t: 'vulnerable', s: 2.6, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.6 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Sprint Final',
      speedMult: 1.25,
      damageMult: 1.15,
      idleBetweenS: [0.5, 1],
      adds: { enemy: 'pista_sprinter', count: 2, everyS: 15, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'pista_javelin', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'combo',
          name: 'Cotovelada e Pisão',
          weight: 3,
          cooldownS: 2.2,
          steps: [
            { t: 'move', to: 'player', speed: 4, maxS: 1.8 },
            { t: 'melee', move: cotovelada },
            { t: 'melee', move: pisao },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          // três tiros seguidos e o fôlego acaba
          id: 'volta_olimpica',
          name: 'Volta Olímpica',
          weight: 3,
          cooldownS: 11,
          minRange: 3,
          steps: [
            ...largada(13, 0.7),
            ...largada(13, 0.55),
            ...largada(14, 0.5),
            { t: 'vulnerable', s: 2.4, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.5 },
          ],
        },
        {
          id: 'dardos2',
          name: 'Chuva de Dardos',
          weight: 2,
          cooldownS: 7,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.6,
              shape: { k: 'cone', angleDeg: 55, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: dardo, count: 3, spreadDeg: 0, aim: 'lanes' },
            { t: 'wait', s: 0.5 },
            { t: 'projectile', spec: dardo, count: 4, spreadDeg: 16, aim: 'fan' },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'salto_triplo',
          name: 'Salto Triplo',
          weight: 2,
          cooldownS: 9,
          minRange: 3.5,
          steps: [
            { t: 'leap', to: 'player', airS: 0.8, landing: pouso },
            { t: 'leap', to: 'player', airS: 0.9, landing: pouso },
            { t: 'shockwave', axis: 'ring', speed: 8, range: 10, height: 0.7, hit: poeira },
            { t: 'wait', s: 0.7 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
