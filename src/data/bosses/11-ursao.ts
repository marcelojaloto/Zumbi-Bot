import { MOVES } from '../melee';
import type { BossDef, ExplosionSpec, HitSpec, MeleeMoveDef, ZoneSpec } from '../types';
import { registerBoss } from './index';

const abraco: MeleeMoveDef = {
  id: 'ursao_abraco',
  pose: 'slam',
  startup: 22,
  active: 6,
  recovery: 30,
  hitbox: { x0: 0, x1: 1.25, y0: 0, y1: 1.7, zTol: 0.45 },
  hit: {
    damage: 24,
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
MOVES[abraco.id] = abraco;

const patada: MeleeMoveDef = {
  id: 'ursao_patada',
  pose: 'hook',
  startup: 16,
  active: 6,
  recovery: 26,
  hitbox: { x0: -0.2, x1: 1.35, y0: 0, y1: 1.5, zTol: 0.5 },
  hit: {
    damage: 20,
    dtype: 'blunt',
    knockback: 8,
    launch: 3,
    knockdown: true,
    hitstun: 24,
    hitstop: 6,
    heavy: true,
  },
  superArmor: true,
};
MOVES[patada.id] = patada;

const rolo: HitSpec = {
  damage: 24,
  dtype: 'blunt',
  knockback: 9,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

const bloco: ZoneSpec = {
  radius: 1.25,
  durationS: 0.3,
  tickS: 0.5,
  hit: {
    damage: 22,
    dtype: 'blunt',
    knockback: 5,
    launch: 4,
    knockdown: true,
    hitstun: 24,
    hitstop: 5,
    heavy: true,
  },
  fx: 'blocks',
};

const tambor: HitSpec = {
  damage: 16,
  dtype: 'blunt',
  knockback: 5,
  launch: 3,
  knockdown: true,
  hitstun: 20,
  hitstop: 4,
};

const pouso: ExplosionSpec = {
  radius: 2.8,
  damage: 26,
  minMult: 0.5,
  dtype: 'blunt',
  knockback: 7,
  launch: 6,
  selfMult: 0,
  fx: 'explosion',
};

export const ursao = registerBoss({
  id: 'ursao',
  name: 'Ursão de Corda',
  title: 'O Rei da Vitrine',
  family: 'robot',
  element: 'earth',
  hp: 8200,
  scale: 2.2,
  radius: 1.1,
  height: 4.2,
  speed: 2.1,
  poise: 380,
  // pelúcia
  resist: { fire: 1.4, blade: 1.15, electric: 1.1, blunt: 0.85, bullet: 0.9, toxic: 0.5, necro: 0.6 },
  statusDurationMult: 0.5,
  statusImmune: ['poison'],
  contact: { damage: 9, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 1500, score: 70000, scrap: 700, cosmetics: [] },
  music: 'fabrica',
  rig: {
    kind: 'humanoid',
    scale: 2.2,
    skin: 0x9a6a36,
    cloth: 0x9a6a36,
    cloth2: 0x7e5429,
    eye: 0xff2a2a,
    hunch: 0.15,
    bulk: 1.6,
    boss: 'ursao',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Corda Cheia',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.9, 1.6],
      patterns: [
        {
          id: 'abraco',
          name: 'Abraço de Urso',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3, maxS: 2.2 },
            { t: 'melee', move: abraco },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'rolo',
          name: 'Rolo Compressor',
          weight: 2,
          cooldownS: 7,
          minRange: 4,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 2.2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 10, maxS: 1.3, hit: rolo },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'chuva_blocos',
          name: 'Chuva de Blocos',
          weight: 3,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'shake', trauma: 0.3 },
            { t: 'zone', zone: bloco, at: 'player', count: 4, delayS: 1.3 },
            { t: 'wait', s: 1.4 },
          ],
        },
        {
          id: 'tambor',
          name: 'Batida de Tambor',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.5 },
            { t: 'shockwave', axis: 'ring', speed: 7, range: 11, height: 0.7, hit: tambor },
            { t: 'wait', s: 0.9 },
          ],
        },
        {
          // a corda acaba
          id: 'corda_no_fim',
          name: 'Corda no Fim',
          weight: 2,
          cooldownS: 16,
          steps: [
            { t: 'vulnerable', s: 2.6, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.7 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Mola Solta',
      speedMult: 1.25,
      damageMult: 1.15,
      idleBetweenS: [0.6, 1.1],
      adds: { enemy: 'teddy', count: 2, everyS: 14, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'jackBox', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'abraco2',
          name: 'Abraço e Patada',
          weight: 3,
          cooldownS: 2.2,
          steps: [
            { t: 'move', to: 'player', speed: 3.4, maxS: 2 },
            { t: 'melee', move: abraco },
            { t: 'melee', move: patada },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'rolo2',
          name: 'Rolo de Ida e Volta',
          weight: 2,
          cooldownS: 7,
          minRange: 3.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 2.2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 1.2, hit: rolo },
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.6, shape: { k: 'lane', width: 2.2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 1.2, hit: rolo },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'chuva_blocos2',
          name: 'Tempestade de Blocos',
          weight: 3,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.45 },
            { t: 'shake', trauma: 0.35 },
            { t: 'zone', zone: bloco, at: 'grid', count: 7, delayS: 1.6 },
            { t: 'wait', s: 1 },
            { t: 'zone', zone: bloco, at: 'player', count: 3, delayS: 1.1 },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'salto_mola',
          name: 'Salto de Mola',
          weight: 2,
          cooldownS: 8,
          minRange: 3.5,
          steps: [
            { t: 'leap', to: 'player', airS: 1.1, landing: pouso },
            { t: 'shockwave', axis: 'ring', speed: 8, range: 10, height: 0.7, hit: tambor },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'corda_no_fim2',
          name: 'Corda no Fim',
          weight: 2,
          cooldownS: 15,
          steps: [
            { t: 'vulnerable', s: 2.2, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.6 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
