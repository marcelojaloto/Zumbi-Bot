import { MOVES } from '../melee';
import type { BossDef, ExplosionSpec, HitSpec, MeleeMoveDef, ZoneSpec } from '../types';
import { registerBoss } from './index';

const parachoque: MeleeMoveDef = {
  id: 'v8_parachoque',
  pose: 'slam',
  startup: 22,
  active: 6,
  recovery: 30,
  hitbox: { x0: 0, x1: 1.3, y0: 0, y1: 1.8, zTol: 0.45 },
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
MOVES[parachoque.id] = parachoque;

// fase 2, emendada no para-choque
const portada: MeleeMoveDef = {
  id: 'v8_portada',
  pose: 'hook',
  startup: 16,
  active: 6,
  recovery: 26,
  hitbox: { x0: -0.2, x1: 1.4, y0: 0, y1: 1.6, zTol: 0.5 },
  hit: {
    damage: 21,
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
MOVES[portada.id] = portada;

const arrancada: HitSpec = {
  damage: 26,
  dtype: 'blunt',
  knockback: 10,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

const burnout: ZoneSpec = {
  radius: 0.95,
  durationS: 4.5,
  tickS: 0.5,
  hit: {
    damage: 11,
    dtype: 'fire',
    knockback: 1,
    hitstun: 8,
    hitstop: 1,
    status: { id: 'burn', chance: 0.6 },
  },
  fx: 'fire',
};

// não machuca: só deixa lento, bem na hora da investida
const oleo: ZoneSpec = {
  radius: 1.5,
  durationS: 6,
  tickS: 0.5,
  hit: { damage: 0, dtype: 'toxic', knockback: 0, hitstun: 0, hitstop: 0 },
  fx: 'mud',
  slow: 0.6,
};

const farol: HitSpec = {
  damage: 7,
  dtype: 'electric',
  knockback: 2,
  hitstun: 8,
  hitstop: 2,
  status: { id: 'stun', chance: 0.25, durationS: 0.4 },
};

// rente ao chão: dá para pular
const pneu: HitSpec = {
  damage: 17,
  dtype: 'blunt',
  knockback: 6,
  launch: 3,
  knockdown: true,
  hitstun: 20,
  hitstop: 4,
};

const pouso: ExplosionSpec = {
  radius: 2.8,
  damage: 27,
  minMult: 0.5,
  dtype: 'blunt',
  knockback: 7,
  launch: 6,
  selfMult: 0,
  fx: 'explosion',
};

export const v8 = registerBoss({
  id: 'v8',
  name: 'Monstro V8',
  title: 'A Oferta Imperdível',
  family: 'robot',
  element: 'fire',
  hp: 10800,
  scale: 2,
  radius: 1.25,
  height: 4.4,
  speed: 2.1,
  poise: 440,
  resist: { electric: 1.3, cyber: 1.3, water: 1.2, bullet: 0.75, blade: 0.8, fire: 0.6, toxic: 0.5 },
  statusDurationMult: 0.5,
  statusImmune: ['poison'],
  contact: { damage: 10, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 1900, score: 90000, scrap: 900, cosmetics: [] },
  music: 'loja',
  rig: {
    kind: 'mech',
    scale: 2,
    skin: 0xb01c1c,
    cloth: 0x16181c,
    cloth2: 0xf4f0e8,
    eye: 0xfff4c0,
    boss: 'v8',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Motor Quente',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.9, 1.5],
      patterns: [
        {
          id: 'parachoque',
          name: 'Para-choque',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3, maxS: 2.2 },
            { t: 'melee', move: parachoque },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'arrancada',
          name: 'Arrancada',
          weight: 3,
          cooldownS: 6,
          minRange: 3.5,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3.4, maxS: 1 },
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 2.4 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 12, maxS: 1.5, hit: arrancada },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'burnout',
          name: 'Burnout',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.4 },
            {
              t: 'repeat',
              times: 2,
              steps: [
                { t: 'move', to: 'player', speed: 4.2, maxS: 1 },
                { t: 'zone', zone: burnout, at: 'trail', count: 3, delayS: 0.5 },
              ],
            },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'farol_alto',
          name: 'Farol Alto',
          weight: 2,
          cooldownS: 7,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.9, shape: { k: 'lane', width: 1.5 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.7, width: 1.5, hit: farol },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'pneus',
          name: 'Pneus Soltos',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'pose', pose: 'windup', s: 0.5 },
            { t: 'shockwave', axis: 'x', speed: 9, range: 18, height: 0.7, hit: pneu },
            { t: 'wait', s: 0.9 },
          ],
        },
        {
          id: 'afogou',
          name: 'Motor Afogado',
          weight: 2,
          cooldownS: 16,
          steps: [
            { t: 'sfx', id: 'steam' },
            { t: 'vulnerable', s: 2.6, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.7 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Giro no Vermelho',
      speedMult: 1.25,
      damageMult: 1.15,
      idleBetweenS: [0.6, 1.1],
      adds: { enemy: 'lojaDummy', count: 2, everyS: 15, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.8 },
        { t: 'zone', zone: burnout, at: 'aroundBoss', count: 6, delayS: 0.9 },
        { t: 'summon', enemy: 'lojaTow', count: 2, from: 'back' },
      ],
      patterns: [
        {
          id: 'parachoque2',
          name: 'Para-choque e Portada',
          weight: 3,
          cooldownS: 2.2,
          steps: [
            { t: 'move', to: 'player', speed: 3.4, maxS: 2 },
            { t: 'melee', move: parachoque },
            { t: 'melee', move: portada },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'racha',
          name: 'Racha',
          weight: 3,
          cooldownS: 7,
          minRange: 3,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3.6, maxS: 0.9 },
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 2.4 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 13, maxS: 1.4, hit: arrancada },
            { t: 'zone', zone: burnout, at: 'trail', count: 4, delayS: 0.4 },
            { t: 'move', to: 'playerLane', speed: 3.6, maxS: 0.7 },
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.6, shape: { k: 'lane', width: 2.4 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 13, maxS: 1.4, hit: arrancada },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'vazamento',
          name: 'Vazamento de Óleo',
          weight: 2,
          cooldownS: 11,
          minRange: 3,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.4 },
            { t: 'zone', zone: oleo, at: 'player', count: 3, delayS: 0.7 },
            { t: 'wait', s: 0.8 },
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 2.4 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 12, maxS: 1.4, hit: arrancada },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'farol_duplo',
          name: 'Pisca-alerta',
          weight: 2,
          cooldownS: 7,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.75, shape: { k: 'lane', width: 1.5 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.5, hit: farol },
            { t: 'telegraph', s: 0.6, shape: { k: 'lane', width: 1.5 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.5, hit: farol },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'pneus2',
          name: 'Borracharia',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'windup', s: 0.45 },
            { t: 'shockwave', axis: 'x', speed: 9, range: 18, height: 0.7, hit: pneu, both: true },
            { t: 'wait', s: 0.7 },
            { t: 'shockwave', axis: 'x', speed: 12, range: 18, height: 0.7, hit: pneu, both: true },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'suspensao',
          name: 'Salto de Suspensão',
          weight: 2,
          cooldownS: 9,
          minRange: 3.5,
          steps: [
            { t: 'leap', to: 'player', airS: 1.1, landing: pouso },
            { t: 'shockwave', axis: 'ring', speed: 8, range: 10, height: 0.7, hit: pneu },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'afogou2',
          name: 'Motor Afogado',
          weight: 2,
          cooldownS: 15,
          steps: [
            { t: 'sfx', id: 'steam' },
            { t: 'vulnerable', s: 2.2, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.6 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
