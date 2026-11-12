import { MOVES } from '../melee';
import type { BossDef, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

const tapa: MeleeMoveDef = {
  id: 'manequim_tapa',
  pose: 'swing1',
  startup: 20,
  active: 6,
  recovery: 28,
  hitbox: { x0: 0, x1: 1.3, y0: 0, y1: 1.7, zTol: 0.45 },
  hit: {
    damage: 22,
    dtype: 'blunt',
    knockback: 7,
    launch: 3,
    knockdown: true,
    hitstun: 26,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[tapa.id] = tapa;

/** Giro de braços abertos (fase 2), emendado no tapa. */
const giro: MeleeMoveDef = {
  id: 'manequim_giro',
  pose: 'spin',
  startup: 14,
  active: 10,
  recovery: 26,
  hitbox: { aoeR: 1.9, y0: 0, y1: 1.6 },
  hit: {
    damage: 18,
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

/** Braço solto: vai girando e volta para o dono. */
const braco: ProjectileSpec = {
  visual: 'blade',
  speed: 9,
  radius: 0.45,
  lifeS: 2.6,
  boomerang: true,
  y: 0.5,
  hit: { damage: 15, dtype: 'blunt', knockback: 4, hitstun: 16, hitstop: 3 },
};

const passarela: HitSpec = {
  damage: 22,
  dtype: 'blunt',
  knockback: 9,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

/** Letreiros de neon em curto: o círculo vermelho avisa onde a faísca cai. */
const curto: ZoneSpec = {
  radius: 1.2,
  durationS: 0.45,
  tickS: 0.5,
  hit: {
    damage: 15,
    dtype: 'electric',
    knockback: 2,
    launch: 2,
    hitstun: 16,
    hitstop: 4,
    status: { id: 'stun', durationS: 0.5 },
  },
  fx: 'electric',
};

/** Manequim-Rei: troca de vitrine, solta os braços e, quando faz pose, fica parado e leva mais dano. */
export const manequim = registerBoss({
  id: 'manequim',
  name: 'Manequim-Rei',
  title: 'O Dono da Liquidação',
  family: 'robot',
  element: 'cyber',
  hp: 9800,
  scale: 2.3,
  radius: 1,
  height: 4.4,
  speed: 2.2,
  poise: 400,
  // plástico: derrete no fogo e racha na pancada
  resist: { fire: 1.4, blunt: 1.15, blade: 0.85, bullet: 0.9, toxic: 0.3, necro: 0.5 },
  statusDurationMult: 0.5,
  statusImmune: ['poison'],
  contact: { damage: 9, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 1800, score: 82000, scrap: 820, cosmetics: [] },
  music: 'shopping',
  rig: {
    kind: 'humanoid',
    scale: 2.3,
    skin: 0xeeeae4,
    cloth: 0xeeeae4,
    cloth2: 0xe6e2dc,
    eye: 0xff3ad8,
    hunch: 0,
    bulk: 1.1,
    boss: 'manequim',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Vitrine Viva',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.9, 1.5],
      patterns: [
        {
          id: 'tapa',
          name: 'Tapa de Plástico',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3.1, maxS: 2.2 },
            { t: 'melee', move: tapa },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'bracos',
          name: 'Braços Bumerangue',
          weight: 3,
          cooldownS: 6,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.7,
              shape: { k: 'cone', angleDeg: 36, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: braco, count: 2, spreadDeg: 24, aim: 'fan' },
            { t: 'wait', s: 1.5 },
          ],
        },
        {
          id: 'troca_vitrine',
          name: 'Troca de Vitrine',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'windup', s: 0.4 },
            { t: 'teleport', to: 'behindPlayer' },
            { t: 'melee', move: tapa },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'passarela',
          name: 'Passarela',
          weight: 2,
          cooldownS: 7,
          minRange: 4,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 10, maxS: 1.3, hit: passarela },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'desfile',
          name: 'Desfile',
          weight: 1,
          cooldownS: 18,
          steps: [{ t: 'summon', enemy: 'shopping_mannequin', count: 2, from: 'sides' }],
        },
        {
          id: 'pose',
          name: 'Pose de Vitrine',
          weight: 2,
          cooldownS: 16,
          steps: [
            { t: 'vulnerable', s: 2.6, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.6 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Liquidação Total',
      speedMult: 1.25,
      damageMult: 1.15,
      idleBetweenS: [0.6, 1.1],
      adds: { enemy: 'shopping_mannequin', count: 2, everyS: 15, maxAlive: 4 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'sfx', id: 'alarm' },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'shopping_shopper', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'tapa2',
          name: 'Tapa e Giro',
          weight: 3,
          cooldownS: 2.2,
          steps: [
            { t: 'move', to: 'player', speed: 3.5, maxS: 2 },
            { t: 'melee', move: tapa },
            { t: 'melee', move: giro },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'bracos2',
          name: 'Braços em Leque',
          weight: 3,
          cooldownS: 6,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            {
              t: 'telegraph',
              s: 0.6,
              shape: { k: 'cone', angleDeg: 50, range: 9 },
              at: 'self',
              sfx: 'telegraph',
            },
            { t: 'projectile', spec: braco, count: 3, spreadDeg: 22, aim: 'fan' },
            { t: 'wait', s: 0.7 },
            { t: 'projectile', spec: braco, count: 3, spreadDeg: 0, aim: 'lanes' },
            { t: 'wait', s: 1.4 },
          ],
        },
        {
          id: 'troca_dupla',
          name: 'Troca Dupla',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'teleport', to: 'random' },
            { t: 'projectile', spec: braco, count: 1, spreadDeg: 0, aim: 'player' },
            { t: 'wait', s: 0.5 },
            { t: 'teleport', to: 'behindPlayer' },
            { t: 'melee', move: giro },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'passarela2',
          name: 'Passarela de Ida e Volta',
          weight: 2,
          cooldownS: 7,
          minRange: 3.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 1.2, hit: passarela },
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.55, shape: { k: 'lane', width: 2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 1.2, hit: passarela },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'curto',
          name: 'Neon em Curto',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.45 },
            { t: 'shake', trauma: 0.3 },
            { t: 'zone', zone: curto, at: 'grid', count: 7, delayS: 1.4 },
            { t: 'wait', s: 1 },
            { t: 'zone', zone: curto, at: 'player', count: 3, delayS: 1.1 },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'pose2',
          name: 'Pose de Vitrine',
          weight: 2,
          cooldownS: 15,
          steps: [
            { t: 'vulnerable', s: 2.2, mult: 1.5 },
            { t: 'pose', pose: 'roar', s: 0.5 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
