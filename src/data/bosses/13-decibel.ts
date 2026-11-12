import { MOVES } from '../melee';
import type { BossDef, BossStep, ExplosionSpec, HitSpec, MeleeMoveDef, ZoneSpec } from '../types';
import { registerBoss } from './index';

/** Disco de vinil usado como lâmina. */
const disco: MeleeMoveDef = {
  id: 'decibel_disco',
  pose: 'swing1',
  startup: 20,
  active: 6,
  recovery: 28,
  hitbox: { x0: 0, x1: 1.3, y0: 0, y1: 1.7, zTol: 0.45 },
  hit: {
    damage: 22,
    dtype: 'blade',
    knockback: 6,
    launch: 3,
    knockdown: true,
    hitstun: 26,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[disco.id] = disco;

/** Scratch: o segundo corte, de volta (fase 2). */
const scratch: MeleeMoveDef = {
  id: 'decibel_scratch',
  pose: 'hook',
  startup: 14,
  active: 6,
  recovery: 26,
  hitbox: { x0: -0.2, x1: 1.35, y0: 0, y1: 1.5, zTol: 0.5 },
  hit: {
    damage: 18,
    dtype: 'blade',
    knockback: 8,
    launch: 3,
    knockdown: true,
    hitstun: 24,
    hitstop: 6,
    heavy: true,
  },
  superArmor: true,
};
MOVES[scratch.id] = scratch;

/** Onda de som: rente ao chão, dá para pular. */
const onda: HitSpec = {
  damage: 14,
  dtype: 'wind',
  knockback: 5,
  launch: 3,
  knockdown: true,
  hitstun: 18,
  hitstop: 4,
};

const laser: HitSpec = { damage: 8, dtype: 'electric', knockback: 3, hitstun: 8, hitstop: 2 };

/** Grave que despenca das caixas do teto. */
const grave: ZoneSpec = {
  radius: 1.25,
  durationS: 0.35,
  tickS: 0.5,
  hit: {
    damage: 20,
    dtype: 'wind',
    knockback: 5,
    launch: 4,
    knockdown: true,
    hitstun: 22,
    hitstop: 5,
    heavy: true,
    status: { id: 'stun', chance: 0.35, durationS: 0.5 },
  },
  fx: 'shock',
};

/** Mergulho do palco (fase 2). */
const mergulho: ExplosionSpec = {
  radius: 2.8,
  damage: 26,
  minMult: 0.5,
  dtype: 'blunt',
  knockback: 7,
  launch: 6,
  selfMult: 0,
  fx: 'explosion',
};

/** `n` ondas em anel, uma a cada batida. */
const batida = (n: number, gapS: number, speed: number): BossStep => ({
  t: 'repeat',
  times: n,
  steps: [
    { t: 'shockwave', axis: 'ring', speed, range: 11, height: 0.7, hit: onda },
    { t: 'wait', s: gapS },
  ],
});

export const decibel = registerBoss({
  id: 'decibel',
  name: 'DJ Decibel',
  title: 'O Dono do Volume',
  family: 'zombie',
  element: 'wind',
  hp: 9000,
  scale: 2.1,
  radius: 1,
  height: 4,
  speed: 2.2,
  poise: 360,
  // o equipamento nas costas não gosta de água nem de choque
  resist: { wind: 0.3, electric: 1.3, water: 1.3, bullet: 0.9, fire: 1.1, holy: 1.2 },
  statusDurationMult: 0.5,
  statusImmune: ['poison'],
  contact: { damage: 9, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 1650, score: 78000, scrap: 780, cosmetics: [] },
  music: 'estudio',
  rig: {
    kind: 'humanoid',
    scale: 2.1,
    skin: 0x6a7a66,
    cloth: 0x5a2a8a,
    cloth2: 0x16161c,
    eye: 0x3ad8ff,
    hunch: 0.2,
    bulk: 1.25,
    boss: 'decibel',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Aquecimento',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.9, 1.5],
      patterns: [
        {
          id: 'disco',
          name: 'Disco Voador',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3, maxS: 2.2 },
            { t: 'melee', move: disco },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'batida',
          name: 'Batida 4x4',
          weight: 3,
          cooldownS: 7,
          steps: [{ t: 'pose', pose: 'slamGround', s: 0.4 }, batida(3, 0.55, 7), { t: 'wait', s: 0.5 }],
        },
        {
          id: 'laser',
          name: 'Feixe de Laser',
          weight: 2,
          cooldownS: 7,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.6, width: 1.4, hit: laser },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'grave',
          name: 'Grave Pesado',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'shake', trauma: 0.3 },
            { t: 'zone', zone: grave, at: 'player', count: 4, delayS: 1.2 },
            { t: 'wait', s: 1.3 },
          ],
        },
        {
          // o solo termina em microfonia: ele trava e leva mais dano
          id: 'solo',
          name: 'Solo',
          weight: 2,
          cooldownS: 15,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.4 },
            batida(4, 0.5, 7.5),
            { t: 'sfx', id: 'alarm' },
            { t: 'vulnerable', s: 2.6, mult: 1.5 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Volume Máximo',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.55, 1],
      adds: { enemy: 'estudioFan', count: 2, everyS: 14, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'estudioFan', count: 3, from: 'sides' },
      ],
      patterns: [
        {
          id: 'disco2',
          name: 'Disco e Scratch',
          weight: 3,
          cooldownS: 2.2,
          steps: [
            { t: 'move', to: 'player', speed: 3.4, maxS: 2 },
            { t: 'melee', move: disco },
            { t: 'melee', move: scratch },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'batida2',
          name: 'Batida Dobrada',
          weight: 3,
          cooldownS: 7,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.35 },
            batida(4, 0.42, 7.5),
            { t: 'shockwave', axis: 'x', speed: 10, range: 18, height: 0.7, hit: onda, both: true },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'show_laser',
          name: 'Show de Laser',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'sfx', id: 'telegraph' },
            { t: 'pose', pose: 'windup', s: 0.6 },
            { t: 'beam', mode: 'sweepZ', durationS: 1.6, width: 1.2, hit: laser },
            { t: 'telegraph', s: 0.6, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.4, hit: laser },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'grave2',
          name: 'Parede de Graves',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.45 },
            { t: 'shake', trauma: 0.35 },
            { t: 'zone', zone: grave, at: 'grid', count: 7, delayS: 1.5 },
            { t: 'wait', s: 0.9 },
            { t: 'zone', zone: grave, at: 'player', count: 3, delayS: 1 },
            { t: 'wait', s: 1.1 },
          ],
        },
        {
          id: 'mergulho',
          name: 'Mergulho do Palco',
          weight: 2,
          cooldownS: 8,
          minRange: 3.5,
          steps: [
            { t: 'leap', to: 'player', airS: 1.1, landing: mergulho },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'solo2',
          name: 'Solo Final',
          weight: 2,
          cooldownS: 14,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.35 },
            batida(5, 0.4, 8),
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.6, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.4, hit: laser },
            { t: 'sfx', id: 'alarm' },
            { t: 'vulnerable', s: 2.2, mult: 1.5 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
