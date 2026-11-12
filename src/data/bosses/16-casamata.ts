import { MOVES } from '../melee';
import type { BossDef, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

const pisao: MeleeMoveDef = {
  id: 'casamata_pisao',
  pose: 'stomp',
  startup: 22,
  active: 6,
  recovery: 30,
  hitbox: { aoeR: 2.1, y0: -0.2, y1: 1.3 },
  hit: {
    damage: 24,
    dtype: 'blunt',
    knockback: 7,
    launch: 5,
    knockdown: true,
    hitstun: 28,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[pisao.id] = pisao;

// y baixo: a altura do disparo é multiplicada pela escala do chefe
const bala: ProjectileSpec = {
  visual: 'tracer',
  speed: 24,
  radius: 0.18,
  lifeS: 1.4,
  y: 0.55,
  hit: { damage: 7, dtype: 'bullet', knockback: 1, hitstun: 8, hitstop: 1 },
};

/** Míssil lento que persegue e pode ser abatido. */
const missil: ProjectileSpec = {
  visual: 'missile',
  speed: 6,
  radius: 0.35,
  lifeS: 4,
  homing: 1.6,
  y: 0.6,
  hp: 12,
  hit: { damage: 14, dtype: 'explosive', knockback: 3, hitstun: 16, hitstop: 3 },
  onImpact: {
    explosion: {
      radius: 1.6,
      damage: 14,
      minMult: 0.5,
      dtype: 'explosive',
      knockback: 5,
      launch: 4,
      selfMult: 0,
      fx: 'explosion',
    },
  },
};

const mina: ZoneSpec = {
  radius: 1.15,
  durationS: 0.4,
  tickS: 0.5,
  hit: {
    damage: 24,
    dtype: 'explosive',
    knockback: 5,
    launch: 5,
    knockdown: true,
    hitstun: 26,
    hitstop: 5,
    heavy: true,
  },
  fx: 'explosion',
};

const gas: ZoneSpec = {
  radius: 1.5,
  durationS: 4.5,
  tickS: 0.5,
  hit: {
    damage: 5,
    dtype: 'toxic',
    knockback: 0,
    hitstun: 0,
    hitstop: 0,
    status: { id: 'poison', chance: 0.5 },
  },
  fx: 'poisonCloud',
  slow: 0.3,
};

const investida: HitSpec = {
  damage: 24,
  dtype: 'blunt',
  knockback: 9,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

const onda: HitSpec = {
  damage: 16,
  dtype: 'blunt',
  knockback: 5,
  launch: 3,
  knockdown: true,
  hitstun: 20,
  hitstop: 4,
};

export const casamata = registerBoss({
  id: 'casamata',
  name: 'Comandante Casamata',
  title: 'O Último Posto',
  family: 'robot',
  element: 'cyber',
  hp: 10400,
  scale: 2.1,
  radius: 1.2,
  height: 5,
  speed: 1.7,
  poise: 460,
  resist: { bullet: 0.7, blade: 0.8, explosive: 0.85, toxic: 0.3, electric: 1.4, cyber: 1.3 },
  statusDurationMult: 0.5,
  statusImmune: ['poison'],
  contact: { damage: 9, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 2100, score: 95000, scrap: 950, cosmetics: [] },
  music: 'bunker',
  rig: {
    kind: 'mech',
    scale: 2.1,
    skin: 0x5a6250,
    cloth: 0x23281f,
    cloth2: 0xffc21a,
    eye: 0xff3b30,
    boss: 'casamata',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Posto de Comando',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.8, 1.5],
      patterns: [
        {
          id: 'pisao',
          name: 'Pisão Hidráulico',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 2.8, maxS: 2.2 },
            { t: 'melee', move: pisao },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'rajada',
          name: 'Rajada das Torretas',
          weight: 3,
          cooldownS: 5,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'projectile', spec: bala, count: 8, spreadDeg: 4, aim: 'player', intervalS: 0.09 },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'misseis',
          name: 'Mísseis Teleguiados',
          weight: 2,
          cooldownS: 9,
          minRange: 2,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'sfx', id: 'telegraph' },
            { t: 'pose', pose: 'windup', s: 0.6 },
            { t: 'projectile', spec: missil, count: 2, spreadDeg: 40, aim: 'fan' },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'campo_minado',
          name: 'Campo Minado',
          weight: 2,
          cooldownS: 10,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.5 },
            { t: 'shake', trauma: 0.3 },
            { t: 'zone', zone: mina, at: 'grid', count: 7, delayS: 1.4 },
            { t: 'wait', s: 1.4 },
          ],
        },
        {
          id: 'investida',
          name: 'Investida Blindada',
          weight: 2,
          cooldownS: 8,
          minRange: 4,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 2.4 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 10, maxS: 1.3, hit: investida },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          // rajada longa demais: as torretas superaquecem
          id: 'superaquecimento',
          name: 'Fogo Contínuo',
          weight: 2,
          cooldownS: 15,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'projectile', spec: bala, count: 14, spreadDeg: 6, aim: 'player', intervalS: 0.08 },
            { t: 'vulnerable', s: 2.6, mult: 1.5 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Confinamento',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.5, 1],
      adds: { enemy: 'soldier', count: 1, everyS: 16, maxAlive: 2 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'sfx', id: 'alarm' },
        { t: 'shake', trauma: 0.8 },
        // as portas fecham: a sala fica mais estreita até o fim
        { t: 'arena', zBand: [-2.4, 0.9] },
        { t: 'summon', enemy: 'bunker_gunner', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'pisao2',
          name: 'Pisão e Onda',
          weight: 3,
          cooldownS: 2.4,
          steps: [
            { t: 'move', to: 'player', speed: 3.2, maxS: 2 },
            { t: 'melee', move: pisao },
            { t: 'shockwave', axis: 'ring', speed: 7, range: 9, height: 0.7, hit: onda },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'rajada2',
          name: 'Rajada Cruzada',
          weight: 3,
          cooldownS: 5,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'projectile', spec: bala, count: 8, spreadDeg: 4, aim: 'player', intervalS: 0.08 },
            { t: 'telegraph', s: 0.5, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'projectile', spec: bala, count: 8, spreadDeg: 4, aim: 'player', intervalS: 0.08 },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'salva',
          name: 'Salva de Mísseis e Gás',
          weight: 2,
          cooldownS: 9,
          minRange: 2,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'sfx', id: 'telegraph' },
            { t: 'pose', pose: 'windup', s: 0.5 },
            { t: 'projectile', spec: missil, count: 3, spreadDeg: 35, aim: 'fan' },
            { t: 'wait', s: 0.6 },
            { t: 'zone', zone: gas, at: 'player', count: 2, delayS: 1 },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'bombardeio',
          name: 'Bombardeio',
          weight: 2,
          cooldownS: 10,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.45 },
            { t: 'shake', trauma: 0.35 },
            { t: 'zone', zone: mina, at: 'grid', count: 8, delayS: 1.3 },
            { t: 'wait', s: 0.9 },
            { t: 'zone', zone: mina, at: 'player', count: 3, delayS: 1.1 },
            { t: 'wait', s: 1.1 },
          ],
        },
        {
          id: 'barragem',
          name: 'Barragem Total',
          weight: 2,
          cooldownS: 14,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 2.4 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 1.2, hit: investida },
            { t: 'face', target: 'player' },
            { t: 'projectile', spec: missil, count: 2, spreadDeg: 40, aim: 'fan' },
            { t: 'projectile', spec: bala, count: 12, spreadDeg: 6, aim: 'player', intervalS: 0.08 },
            { t: 'vulnerable', s: 2.8, mult: 1.5 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
