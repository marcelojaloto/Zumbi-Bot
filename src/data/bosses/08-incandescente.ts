import { MOVES } from '../melee';
import type { BossDef, ExplosionSpec, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

/** Soco incandescente de cima para baixo (queima). */
const punho: MeleeMoveDef = {
  id: 'incandescente_punho',
  pose: 'slam',
  startup: 22,
  active: 6,
  recovery: 30,
  hitbox: { x0: 0, x1: 1.2, y0: 0, y1: 1.7, zTol: 0.42 },
  hit: {
    damage: 22,
    dtype: 'fire',
    knockback: 7,
    launch: 4,
    knockdown: true,
    hitstun: 28,
    hitstop: 8,
    heavy: true,
    status: { id: 'burn', chance: 0.6 },
  },
  superArmor: true,
};
MOVES[punho.id] = punho;

/** Varredura lateral rápida (fase 2), encadeada depois do soco. */
const varrida: MeleeMoveDef = {
  id: 'incandescente_varrida',
  pose: 'hook',
  startup: 16,
  active: 6,
  recovery: 26,
  hitbox: { x0: -0.2, x1: 1.3, y0: 0, y1: 1.5, zTol: 0.5 },
  hit: {
    damage: 18,
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
MOVES[varrida.id] = varrida;

const fireball: ProjectileSpec = {
  visual: 'fireball',
  speed: 10,
  radius: 0.45,
  lifeS: 2.4,
  y: 1.2,
  hit: {
    damage: 18,
    dtype: 'fire',
    knockback: 4,
    launch: 2,
    hitstun: 18,
    hitstop: 4,
    status: { id: 'burn', chance: 0.7 },
  },
  onImpact: {
    explosion: {
      radius: 1.2,
      damage: 12,
      minMult: 0.5,
      dtype: 'fire',
      knockback: 3,
      launch: 2,
      selfMult: 0,
      status: { id: 'burn', chance: 0.4 },
      fx: 'explosion',
    },
  },
};

/** Poças de magma deixadas pelo caminho. */
const magma: ZoneSpec = {
  radius: 0.95,
  durationS: 5,
  tickS: 0.5,
  hit: {
    damage: 12,
    dtype: 'fire',
    knockback: 1,
    hitstun: 8,
    hitstop: 1,
    status: { id: 'burn', chance: 0.6 },
  },
  fx: 'magma',
};

/**
 * Erupção: coluna de lava curta e muito forte. Em grade (6–7 círculos) cobre quase toda a arena,
 * deixando livres as bordas e a faixa da frente à direita.
 */
const erupcao: ZoneSpec = {
  radius: 1.3,
  durationS: 0.7,
  tickS: 0.7,
  hit: {
    damage: 28,
    dtype: 'fire',
    knockback: 4,
    launch: 7,
    knockdown: true,
    hitstun: 30,
    hitstop: 6,
    heavy: true,
    status: { id: 'burn' },
  },
  fx: 'magma',
};

/** Anel de fogo ao redor do chefe (transição e aterrissagem). */
const anel: ZoneSpec = { ...magma, radius: 0.9, durationS: 3 };

const landing: ExplosionSpec = {
  radius: 3,
  damage: 26,
  minMult: 0.5,
  dtype: 'fire',
  knockback: 7,
  launch: 6,
  selfMult: 0,
  status: { id: 'burn', chance: 0.7 },
  fx: 'explosion',
};

/** Calor da fase 2: pouco dano, mas constante para quem fica colado. */
const aura: HitSpec = {
  damage: 3,
  dtype: 'fire',
  knockback: 0,
  hitstun: 0,
  hitstop: 0,
  status: { id: 'burn', chance: 0.2 },
};

export const incandescente = registerBoss({
  id: 'incandescente',
  name: 'Colosso Incandescente',
  title: 'A Fornalha Viva',
  family: 'zombie',
  element: 'fire',
  hp: 7000,
  scale: 2.2,
  radius: 1.05,
  height: 4,
  speed: 2,
  poise: 340,
  resist: { fire: 0.1, water: 1.6, ice: 1.5, bullet: 0.85, explosive: 0.8, holy: 1.2 },
  statusDurationMult: 0.6,
  statusImmune: ['burn'],
  contact: {
    damage: 10,
    dtype: 'fire',
    knockback: 6,
    hitstun: 14,
    hitstop: 2,
    status: { id: 'burn', chance: 0.5 },
  },
  rewards: { xp: 1200, score: 55000, scrap: 550, unlockStaff: 'fire', cosmetics: [] },
  music: 'chamas',
  rig: {
    kind: 'humanoid',
    scale: 2.2,
    skin: 0x3e302a,
    cloth: 0x2c221e,
    cloth2: 0x221a17,
    eye: 0xffa01a,
    hunch: 0.3,
    bulk: 1.5,
    boss: 'incandescente',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Brasa',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.9, 1.6],
      patterns: [
        {
          id: 'punho_ardente',
          name: 'Punho Ardente',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3, maxS: 2.2 },
            { t: 'melee', move: punho },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'rastro_magma',
          name: 'Rastro de Magma',
          weight: 2,
          cooldownS: 7,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.4 },
            {
              t: 'repeat',
              times: 2,
              steps: [
                { t: 'move', to: 'player', speed: 4, maxS: 1.1 },
                { t: 'zone', zone: magma, at: 'trail', count: 3, delayS: 0.5 },
              ],
            },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'bola_fogo',
          name: 'Bola de Fogo Tripla',
          weight: 3,
          cooldownS: 5,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.7,
              shape: { k: 'cone', angleDeg: 40, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: fireball, count: 3, spreadDeg: 18, aim: 'fan', from: 'mouth' },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'erupcao',
          name: 'Erupção',
          weight: 2,
          cooldownS: 11,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.5 },
            { t: 'shake', trauma: 0.35 },
            { t: 'zone', zone: erupcao, at: 'grid', count: 6, delayS: 2 },
            { t: 'pose', pose: 'roar', s: 1.6 },
            { t: 'shake', trauma: 0.6 },
            { t: 'vulnerable', s: 1.2, mult: 1.3 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Fornalha',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.6, 1.2],
      aura: { radius: 2.5, hit: aura },
      adds: { enemy: 'burningWalker', count: 2, everyS: 16, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.6 },
        { t: 'shake', trauma: 0.8 },
        { t: 'zone', zone: anel, at: 'aroundBoss', count: 6, delayS: 1 },
        { t: 'summon', enemy: 'burningWalker', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'punho_ardente2',
          name: 'Punho Ardente',
          weight: 3,
          cooldownS: 2.2,
          steps: [
            { t: 'move', to: 'player', speed: 3.4, maxS: 2 },
            { t: 'melee', move: punho },
            { t: 'melee', move: varrida },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'rastro_magma2',
          name: 'Rastro de Magma',
          weight: 2,
          cooldownS: 6,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.35 },
            {
              t: 'repeat',
              times: 3,
              steps: [
                { t: 'move', to: 'player', speed: 4.2, maxS: 0.9 },
                { t: 'zone', zone: magma, at: 'trail', count: 3, delayS: 0.4 },
              ],
            },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'bola_fogo2',
          name: 'Bola de Fogo Tripla',
          weight: 3,
          cooldownS: 5,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.6,
              shape: { k: 'cone', angleDeg: 50, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: fireball, count: 3, spreadDeg: 18, aim: 'fan', from: 'mouth' },
            { t: 'wait', s: 0.6 },
            { t: 'projectile', spec: fireball, count: 4, spreadDeg: 14, aim: 'fan', from: 'mouth' },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'erupcao2',
          name: 'Erupção',
          weight: 2,
          cooldownS: 10,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.45 },
            { t: 'shake', trauma: 0.35 },
            { t: 'zone', zone: erupcao, at: 'grid', count: 7, delayS: 1.8 },
            { t: 'wait', s: 1.9 },
            { t: 'shake', trauma: 0.5 },
            { t: 'zone', zone: erupcao, at: 'player', count: 3, delayS: 1.3 },
            { t: 'pose', pose: 'roar', s: 1.2 },
            { t: 'shake', trauma: 0.5 },
            { t: 'vulnerable', s: 1, mult: 1.3 },
          ],
        },
        {
          id: 'salto_vulcanico',
          name: 'Salto Vulcânico',
          weight: 2,
          cooldownS: 8,
          minRange: 4,
          steps: [
            { t: 'leap', to: 'player', airS: 1.2, landing },
            { t: 'zone', zone: anel, at: 'aroundBoss', count: 5, delayS: 0.6 },
            { t: 'wait', s: 0.7 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
