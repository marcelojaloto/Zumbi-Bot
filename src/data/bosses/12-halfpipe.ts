import { MOVES } from '../melee';
import type { BossDef, ExplosionSpec, HitSpec, MeleeMoveDef, ProjectileSpec } from '../types';
import { registerBoss } from './index';

// zTol curto: a ponte é estreita e precisa sobrar lado para fugir
const tabua: MeleeMoveDef = {
  id: 'halfpipe_tabua',
  pose: 'slam',
  startup: 22,
  active: 6,
  recovery: 30,
  hitbox: { x0: 0, x1: 1.3, y0: 0, y1: 1.7, zTol: 0.36 },
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
MOVES[tabua.id] = tabua;

const giro: MeleeMoveDef = {
  id: 'halfpipe_giro',
  pose: 'hook',
  startup: 16,
  active: 6,
  recovery: 26,
  hitbox: { x0: -0.3, x1: 1.35, y0: 0, y1: 1.5, zTol: 0.36 },
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
MOVES[giro.id] = giro;

/** Skates soltos: rolam rente ao chão pela ponte toda; só pulando. */
const skateSolto: HitSpec = {
  damage: 15,
  dtype: 'blunt',
  knockback: 5,
  launch: 3,
  knockdown: true,
  hitstun: 20,
  hitstop: 4,
};

const rasante: HitSpec = {
  damage: 24,
  dtype: 'blunt',
  knockback: 9,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

/** Skate arremessado: vai girando e volta. */
const bumerangue: ProjectileSpec = {
  visual: 'blade',
  speed: 9,
  radius: 0.45,
  lifeS: 2.6,
  boomerang: true,
  y: 0.5,
  hit: { damage: 15, dtype: 'blunt', knockback: 4, hitstun: 16, hitstop: 3 },
};

const pouso: ExplosionSpec = {
  radius: 2.6,
  damage: 24,
  minMult: 0.5,
  dtype: 'blunt',
  knockback: 7,
  launch: 6,
  selfMult: 0,
  fx: 'explosion',
};

export const halfpipe = registerBoss({
  id: 'halfpipe',
  name: 'Rei do Half-Pipe',
  title: 'O Dono da Pista',
  family: 'zombie',
  element: 'wind',
  hp: 8600,
  scale: 2.1,
  radius: 1,
  height: 4,
  speed: 2.3,
  poise: 380,
  resist: { fire: 1.25, electric: 1.1, holy: 1.3, blunt: 0.85, bullet: 0.9, wind: 0.6, toxic: 0.7 },
  statusDurationMult: 0.5,
  statusImmune: ['poison'],
  contact: { damage: 9, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 1600, score: 75000, scrap: 750, cosmetics: [] },
  music: 'praca',
  rig: {
    kind: 'humanoid',
    scale: 2.1,
    skin: 0x6c7c5a,
    cloth: 0x7a2a8a,
    cloth2: 0x22242c,
    eye: 0x3affc8,
    hunch: 0.25,
    bulk: 1.35,
    boss: 'halfpipe',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Manobra Radical',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.9, 1.6],
      patterns: [
        {
          id: 'tabua',
          name: 'Tábua na Cabeça',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3.2, maxS: 2.2 },
            { t: 'melee', move: tabua },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'skates_soltos',
          name: 'Skates Soltos',
          weight: 3,
          cooldownS: 7,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'pose', pose: 'windup', s: 0.5 },
            { t: 'sfx', id: 'telegraph' },
            { t: 'shockwave', axis: 'x', speed: 9, range: 20, height: 0.7, hit: skateSolto },
            { t: 'wait', s: 0.7 },
            { t: 'shockwave', axis: 'x', speed: 11, range: 20, height: 0.7, hit: skateSolto },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'bumerangue',
          name: 'Skate Bumerangue',
          weight: 2,
          cooldownS: 7,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.6,
              shape: { k: 'cone', angleDeg: 36, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: bumerangue, count: 2, spreadDeg: 22, aim: 'fan' },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          // erra a manobra, bate na cabeceira da ponte e cai do skate
          id: 'rasante',
          name: 'Rasante',
          weight: 2,
          cooldownS: 10,
          minRange: 4,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 1.5, hit: rasante },
            { t: 'shake', trauma: 0.4 },
            { t: 'vulnerable', s: 2.4, mult: 1.5 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Sem Freio',
      speedMult: 1.25,
      damageMult: 1.15,
      idleBetweenS: [0.6, 1.1],
      adds: { enemy: 'pracaSkater', count: 2, everyS: 15, maxAlive: 3 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.8 },
        // as beiradas da ponte cedem
        { t: 'arena', zBand: [-2.2, 1.2] },
        { t: 'summon', enemy: 'pracaSkater', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'tabua2',
          name: 'Tábua e Giro',
          weight: 3,
          cooldownS: 2.2,
          steps: [
            { t: 'move', to: 'player', speed: 3.6, maxS: 2 },
            { t: 'melee', move: tabua },
            { t: 'melee', move: giro },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'skates_soltos2',
          name: 'Engavetamento',
          weight: 3,
          cooldownS: 7,
          steps: [
            { t: 'pose', pose: 'windup', s: 0.45 },
            { t: 'sfx', id: 'telegraph' },
            { t: 'shockwave', axis: 'x', speed: 10, range: 22, height: 0.7, hit: skateSolto, both: true },
            { t: 'wait', s: 0.6 },
            { t: 'shockwave', axis: 'x', speed: 12, range: 22, height: 0.7, hit: skateSolto, both: true },
            { t: 'wait', s: 0.6 },
            { t: 'shockwave', axis: 'x', speed: 12, range: 22, height: 0.7, hit: skateSolto, both: true },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'bumerangue2',
          name: 'Leque de Skates',
          weight: 2,
          cooldownS: 7,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.5,
              shape: { k: 'cone', angleDeg: 50, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: bumerangue, count: 3, spreadDeg: 20, aim: 'fan' },
            { t: 'wait', s: 0.9 },
            { t: 'projectile', spec: bumerangue, count: 2, spreadDeg: 30, aim: 'fan' },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'ollie',
          name: 'Ollie Gigante',
          weight: 2,
          cooldownS: 8,
          minRange: 3.5,
          steps: [
            { t: 'leap', to: 'player', airS: 1.1, landing: pouso },
            { t: 'shockwave', axis: 'x', speed: 10, range: 20, height: 0.7, hit: skateSolto, both: true },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'rasante2',
          name: 'Rasante de Ida e Volta',
          weight: 2,
          cooldownS: 11,
          minRange: 3.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 12, maxS: 1.4, hit: rasante },
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.6, shape: { k: 'lane', width: 2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 12, maxS: 1.4, hit: rasante },
            { t: 'shake', trauma: 0.4 },
            { t: 'vulnerable', s: 2, mult: 1.5 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
