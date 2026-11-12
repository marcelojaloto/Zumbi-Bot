import { MOVES } from '../melee';
import type { BossDef, ExplosionSpec, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

const bicuda: MeleeMoveDef = {
  id: 'artilheiro_bicuda',
  pose: 'kick',
  startup: 20,
  active: 6,
  recovery: 28,
  hitbox: { x0: 0, x1: 1.4, y0: 0, y1: 1.5, zTol: 0.45 },
  hit: {
    damage: 24,
    dtype: 'fire',
    knockback: 8,
    launch: 4,
    knockdown: true,
    hitstun: 28,
    hitstop: 8,
    heavy: true,
    status: { id: 'burn', chance: 0.5 },
  },
  superArmor: true,
};
MOVES[bicuda.id] = bicuda;

const voleio: MeleeMoveDef = {
  id: 'artilheiro_voleio',
  pose: 'spinKick',
  startup: 16,
  active: 6,
  recovery: 26,
  hitbox: { x0: -0.3, x1: 1.4, y0: 0, y1: 1.6, zTol: 0.55 },
  hit: {
    damage: 20,
    dtype: 'fire',
    knockback: 8,
    launch: 3,
    knockdown: true,
    hitstun: 24,
    hitstop: 6,
    heavy: true,
    status: { id: 'burn', chance: 0.4 },
  },
  superArmor: true,
};
MOVES[voleio.id] = voleio;

const brasa: ZoneSpec = {
  radius: 1.1,
  durationS: 4,
  tickS: 0.5,
  hit: {
    damage: 6,
    dtype: 'fire',
    knockback: 0,
    hitstun: 0,
    hitstop: 0,
    status: { id: 'burn', chance: 0.5 },
  },
  fx: 'fire',
};

const estouro: ExplosionSpec = {
  radius: 1.5,
  damage: 14,
  minMult: 0.5,
  dtype: 'fire',
  knockback: 4,
  launch: 3,
  selfMult: 0,
  status: { id: 'burn', chance: 0.5 },
  fx: 'explosion',
};

const bolaHit: HitSpec = {
  damage: 18,
  dtype: 'fire',
  knockback: 4,
  launch: 2,
  hitstun: 18,
  hitstop: 4,
  status: { id: 'burn', chance: 0.7 },
};

// chute por cobertura: cai no alvo, explode e deixa brasa
const bolaAlta: ProjectileSpec = {
  visual: 'fireball',
  speed: 9,
  radius: 0.45,
  lifeS: 3.5,
  gravity: 14,
  lob: true,
  y: 0.5,
  hit: bolaHit,
  onImpact: { explosion: estouro, zone: brasa },
};

// chute rasteiro em leque
const bolaReta: ProjectileSpec = {
  visual: 'fireball',
  speed: 11,
  radius: 0.4,
  lifeS: 2.2,
  y: 0.5,
  hit: bolaHit,
  onImpact: { explosion: { ...estouro, radius: 1.1, damage: 10 } },
};

const bolaPenalti: ProjectileSpec = {
  visual: 'fireball',
  speed: 24,
  radius: 0.5,
  lifeS: 1.4,
  y: 0.5,
  hit: {
    damage: 28,
    dtype: 'fire',
    knockback: 9,
    launch: 4,
    knockdown: true,
    hitstun: 30,
    hitstop: 8,
    heavy: true,
    status: { id: 'burn' },
  },
  onImpact: { explosion: { ...estouro, radius: 1.3 } },
};

// chuva de bolas: só explode, sem brasa (o chão continua jogável)
const bolaChuva: ProjectileSpec = {
  visual: 'fireball',
  speed: 12,
  radius: 0.45,
  lifeS: 3,
  hit: bolaHit,
  onImpact: { explosion: { ...estouro, radius: 1.4, damage: 18 } },
};

const carrinho: HitSpec = {
  damage: 24,
  dtype: 'blunt',
  knockback: 9,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

const cabecada: ExplosionSpec = {
  radius: 2.8,
  damage: 26,
  minMult: 0.5,
  dtype: 'fire',
  knockback: 7,
  launch: 6,
  selfMult: 0,
  status: { id: 'burn', chance: 0.6 },
  fx: 'explosion',
};

const anel: ZoneSpec = { ...brasa, radius: 0.9, durationS: 3 };

const calor: HitSpec = {
  damage: 3,
  dtype: 'fire',
  knockback: 0,
  hitstun: 0,
  hitstop: 0,
  status: { id: 'burn', chance: 0.2 },
};

export const artilheiro = registerBoss({
  id: 'artilheiro',
  name: 'Artilheiro Infernal',
  title: 'O Camisa 9 do Além',
  family: 'zombie',
  element: 'fire',
  hp: 11400,
  scale: 2.3,
  radius: 1.05,
  height: 4.3,
  speed: 2.3,
  poise: 420,
  resist: { fire: 0.15, water: 1.5, ice: 1.4, bullet: 0.9, explosive: 0.85, holy: 1.2 },
  statusDurationMult: 0.5,
  statusImmune: ['burn'],
  contact: {
    damage: 10,
    dtype: 'fire',
    knockback: 6,
    hitstun: 14,
    hitstop: 2,
    status: { id: 'burn', chance: 0.4 },
  },
  rewards: { xp: 2100, score: 95000, scrap: 950, cosmetics: [] },
  music: 'campo',
  rig: {
    kind: 'humanoid',
    scale: 2.3,
    skin: 0x5a4a40,
    cloth: 0xa01818,
    cloth2: 0x14161c,
    eye: 0xffa01a,
    hunch: 0.2,
    bulk: 1.3,
    boss: 'artilheiro',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Primeiro Tempo',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.9, 1.5],
      patterns: [
        {
          id: 'bicuda',
          name: 'Bicuda',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3.2, maxS: 2.2 },
            { t: 'melee', move: bicuda },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'cobertura',
          name: 'Chute por Cobertura',
          weight: 3,
          cooldownS: 5,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'pose', pose: 'kick', s: 0.4 },
            { t: 'projectile', spec: bolaAlta, count: 3, spreadDeg: 0, aim: 'random', intervalS: 0.45 },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'leque',
          name: 'Chute em Leque',
          weight: 2,
          cooldownS: 6,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.7,
              shape: { k: 'cone', angleDeg: 44, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: bolaReta, count: 3, spreadDeg: 18, aim: 'fan' },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'penalti',
          name: 'Pênalti',
          weight: 2,
          cooldownS: 8,
          minRange: 4,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3.4, maxS: 1 },
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.9, shape: { k: 'lane', width: 1.4 }, at: 'self', sfx: 'telegraph' },
            { t: 'projectile', spec: bolaPenalti, count: 1, spreadDeg: 0, aim: 'player' },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'carrinho',
          name: 'Carrinho',
          weight: 2,
          cooldownS: 7,
          minRange: 4,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 2.2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 1.3, hit: carrinho },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          // fura o chute e cai sentado
          id: 'furada',
          name: 'Furada',
          weight: 2,
          cooldownS: 16,
          steps: [
            { t: 'move', to: 'player', speed: 3.4, maxS: 1.6 },
            { t: 'pose', pose: 'kick', s: 0.6 },
            { t: 'shake', trauma: 0.3 },
            { t: 'vulnerable', s: 2.6, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.6 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Prorrogação Infernal',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.6, 1.1],
      aura: { radius: 2.4, hit: calor },
      adds: { enemy: 'campo_atacante', count: 2, everyS: 15, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.5 },
        { t: 'shake', trauma: 0.8 },
        { t: 'zone', zone: anel, at: 'aroundBoss', count: 6, delayS: 1 },
        { t: 'summon', enemy: 'campo_torcedor', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'bicuda2',
          name: 'Bicuda e Voleio',
          weight: 3,
          cooldownS: 2.2,
          steps: [
            { t: 'move', to: 'player', speed: 3.6, maxS: 2 },
            { t: 'melee', move: bicuda },
            { t: 'melee', move: voleio },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'chuva',
          name: 'Chuva de Bolas',
          weight: 3,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'shake', trauma: 0.35 },
            {
              t: 'projectile',
              spec: bolaChuva,
              count: 7,
              spreadDeg: 0,
              aim: 'down',
              from: 'sky',
              intervalS: 0.3,
            },
            { t: 'wait', s: 0.9 },
          ],
        },
        {
          id: 'leque2',
          name: 'Leque Duplo',
          weight: 2,
          cooldownS: 6,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.6,
              shape: { k: 'cone', angleDeg: 54, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: bolaReta, count: 3, spreadDeg: 18, aim: 'fan' },
            { t: 'wait', s: 0.5 },
            { t: 'projectile', spec: bolaReta, count: 4, spreadDeg: 14, aim: 'fan' },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'penaltis',
          name: 'Disputa de Pênaltis',
          weight: 2,
          cooldownS: 9,
          minRange: 4,
          steps: [
            {
              t: 'repeat',
              times: 2,
              steps: [
                { t: 'move', to: 'playerLane', speed: 3.8, maxS: 0.8 },
                { t: 'face', target: 'player' },
                { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 1.4 }, at: 'self', sfx: 'telegraph' },
                { t: 'projectile', spec: bolaPenalti, count: 1, spreadDeg: 0, aim: 'player' },
                { t: 'wait', s: 0.4 },
              ],
            },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'carrinho2',
          name: 'Carrinho de Ida e Volta',
          weight: 2,
          cooldownS: 7,
          minRange: 3.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 2.2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 12, maxS: 1.2, hit: carrinho },
            { t: 'zone', zone: brasa, at: 'trail', count: 3, delayS: 0.5 },
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.6, shape: { k: 'lane', width: 2.2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 12, maxS: 1.2, hit: carrinho },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'cabecada',
          name: 'Cabeçada',
          weight: 2,
          cooldownS: 8,
          minRange: 3.5,
          steps: [
            { t: 'leap', to: 'player', airS: 1.1, landing: cabecada },
            { t: 'zone', zone: anel, at: 'aroundBoss', count: 5, delayS: 0.6 },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'furada2',
          name: 'Furada',
          weight: 2,
          cooldownS: 15,
          steps: [
            { t: 'move', to: 'player', speed: 3.8, maxS: 1.4 },
            { t: 'pose', pose: 'kick', s: 0.5 },
            { t: 'shake', trauma: 0.3 },
            { t: 'vulnerable', s: 2.2, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.5 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
