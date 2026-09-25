import { MOVES } from '../melee';
import type { BossDef, BossStep, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

/**
 * Foice Sombria: giro rasteiro da foice que cobre os dois lados e boa parte da profundidade.
 * Mundo (escala 2,25): x −3,4…3,6 m, z ±2,0 m, até 1,35 m de altura. O aviso retangular centrado
 * no chefe (8,8 × 4,6 m) contém a área inteira; escapa-se mudando de plano, recuando ou com pulo duplo.
 */
const foice: MeleeMoveDef = {
  id: 'conde_foice',
  pose: 'spin',
  startup: 14,
  active: 12,
  recovery: 36,
  hitbox: { x0: -1.5, x1: 1.6, y0: 0, y1: 0.6, zTol: 0.8 },
  hit: {
    damage: 24,
    dtype: 'blade',
    knockback: 8,
    launch: 4,
    knockdown: true,
    hitstun: 30,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[foice.id] = foice;

/** Golpe rápido depois do Passo Sombrio (mundo: x −1,25…3,3 m, z ±1,2 m). */
const ceifa: MeleeMoveDef = {
  id: 'conde_ceifa',
  pose: 'slash1',
  startup: 12,
  active: 6,
  recovery: 28,
  hitbox: { x0: -0.4, x1: 1.3, y0: 0, y1: 1.4, zTol: 0.45 },
  hit: {
    damage: 18,
    dtype: 'necro',
    knockback: 6,
    launch: 3,
    knockdown: true,
    hitstun: 26,
    hitstop: 6,
    heavy: true,
    status: { id: 'slow', chance: 0.5, durationS: 2 },
  },
  superArmor: true,
};
MOVES[ceifa.id] = ceifa;

/** Crânio uivante: lento e teleguiado — dá para correr dele ou desviar mudando de plano cedo. */
const cranio: ProjectileSpec = {
  visual: 'skull_necro',
  speed: 6.5,
  radius: 0.38,
  lifeS: 3.2,
  homing: 1.3,
  y: 1.25,
  hit: {
    damage: 14,
    dtype: 'necro',
    knockback: 3,
    launch: 2,
    hitstun: 18,
    hitstop: 4,
    status: { id: 'slow', chance: 0.4, durationS: 1.5 },
  },
};

const cranioRapido: ProjectileSpec = { ...cranio, speed: 7.2, homing: 1.45 };

/** Túmulos profanos: mãos esqueléticas que brotam do chão (aviso de 1,1 s). */
const tumulo: ZoneSpec = {
  radius: 1.25,
  durationS: 0.6,
  tickS: 0.6,
  hit: {
    damage: 18,
    dtype: 'necro',
    knockback: 3,
    launch: 6,
    knockdown: true,
    hitstun: 26,
    hitstop: 4,
  },
  fx: 'necro',
};

const TELE_FOICE: BossStep = {
  t: 'telegraph',
  s: 0.8,
  shape: { k: 'rect', w: 8.8, d: 4.6 },
  at: 'self',
  sfx: 'telegraph',
};
const TELE_CEIFA: BossStep = {
  t: 'telegraph',
  s: 0.45,
  shape: { k: 'rect', w: 7.2, d: 2.8 },
  at: 'self',
  sfx: 'telegraph',
};

const contact: HitSpec = { damage: 8, dtype: 'necro', knockback: 6, hitstun: 14, hitstop: 2 };

export const conde = registerBoss({
  id: 'conde',
  name: 'Conde Necrótico',
  title: 'Senhor da Cripta',
  family: 'zombie',
  element: 'necro',
  hp: 4800,
  scale: 2.25,
  radius: 1.0,
  height: 4.2,
  speed: 2.2,
  poise: 320,
  resist: { necro: 0.2, holy: 1.5, fire: 1.2, bullet: 0.85, toxic: 0.8 },
  statusDurationMult: 0.5,
  statusImmune: ['raised'],
  contact,
  rewards: { xp: 800, score: 35000, scrap: 350, unlockStaff: 'necro', cosmetics: [] },
  music: 'castelo',
  rig: {
    kind: 'humanoid',
    scale: 2.25,
    skin: 0xb4b0c4,
    cloth: 0x24122a,
    cloth2: 0x140c18,
    eye: 0xc86aff,
    hunch: 0.1,
    bulk: 1.25,
    boss: 'conde',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'O Anfitrião',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.8, 1.5],
      patterns: [
        {
          id: 'foice_sombria',
          name: 'Foice Sombria',
          weight: 3,
          cooldownS: 4,
          steps: [
            { t: 'move', to: 'player', speed: 3, maxS: 1.8 },
            TELE_FOICE,
            { t: 'melee', move: foice },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'cranios_uivantes',
          name: 'Crânios Uivantes',
          weight: 2,
          cooldownS: 7,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'pose', pose: 'roar', s: 0.7 },
            { t: 'sfx', id: 'roar' },
            { t: 'projectile', spec: cranio, count: 5, spreadDeg: 20, aim: 'fan', intervalS: 0.1 },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'passo_sombrio',
          name: 'Passo Sombrio',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'cast', s: 0.4 },
            { t: 'teleport', to: 'behindPlayer' },
            TELE_CEIFA,
            { t: 'melee', move: ceifa },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'ressurreicao',
          name: 'Ressurreição',
          weight: 1,
          cooldownS: 16,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.8 },
            { t: 'shake', trauma: 0.4 },
            { t: 'summon', enemy: 'ghoul', count: 3, from: 'ground' },
            { t: 'heal', frac: 0.03 },
            { t: 'wait', s: 0.8 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Fome Eterna',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.5, 1.0],
      adds: { enemy: 'ghoul', count: 2, everyS: 16, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.6 },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'ghoul', count: 3, from: 'ground' },
      ],
      patterns: [
        {
          id: 'foice_dupla',
          name: 'Foice Sombria Dupla',
          weight: 3,
          cooldownS: 5,
          steps: [
            { t: 'move', to: 'player', speed: 3.4, maxS: 1.6 },
            TELE_FOICE,
            { t: 'melee', move: foice },
            { t: 'move', to: 'player', speed: 3.4, maxS: 0.8 },
            { ...TELE_FOICE, s: 0.65 },
            { t: 'melee', move: foice },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'cranios_uivantes2',
          name: 'Coro de Crânios',
          weight: 2,
          cooldownS: 7,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'pose', pose: 'roar', s: 0.6 },
            { t: 'sfx', id: 'roar' },
            { t: 'projectile', spec: cranioRapido, count: 7, spreadDeg: 18, aim: 'fan', intervalS: 0.08 },
            { t: 'wait', s: 1.1 },
          ],
        },
        {
          id: 'passo_sombrio2',
          name: 'Dança das Sombras',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'cast', s: 0.35 },
            { t: 'teleport', to: 'behindPlayer' },
            TELE_CEIFA,
            { t: 'melee', move: ceifa },
            { t: 'wait', s: 0.3 },
            { t: 'teleport', to: 'behindPlayer' },
            TELE_CEIFA,
            { t: 'melee', move: ceifa },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'cemiterio_profano',
          name: 'Cemitério Profano',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.5 },
            { t: 'shake', trauma: 0.4 },
            { t: 'zone', zone: tumulo, at: 'player', count: 3, delayS: 1.1 },
            { t: 'zone', zone: tumulo, at: 'random', count: 2, delayS: 1.1 },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'ressurreicao2',
          name: 'Ressurreição',
          weight: 1,
          cooldownS: 20,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.8 },
            { t: 'summon', enemy: 'ghoul', count: 2, from: 'ground' },
            { t: 'heal', frac: 0.03 },
            { t: 'wait', s: 0.6 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
