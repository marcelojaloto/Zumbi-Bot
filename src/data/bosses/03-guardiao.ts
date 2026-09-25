import { MOVES } from '../melee';
import type { BossDef, HitSpec, MeleeMoveDef, ProjectileSpec, ZoneSpec } from '../types';
import { registerBoss } from './index';

/** Cassetete de choque: golpe lateral pesado que pode atordoar. */
const cassetete: MeleeMoveDef = {
  id: 'guardiao_cassetete',
  pose: 'swing1',
  startup: 20,
  active: 6,
  recovery: 26,
  hitbox: { x0: 0, x1: 1.25, y0: 0, y1: 1.6, zTol: 0.45 },
  hit: {
    damage: 18,
    dtype: 'electric',
    knockback: 6,
    launch: 3,
    knockdown: true,
    hitstun: 26,
    hitstop: 8,
    heavy: true,
    status: { id: 'stun', chance: 0.3, durationS: 0.5 },
  },
  superArmor: true,
};
MOVES[cassetete.id] = cassetete;

const pisoHit: HitSpec = {
  damage: 15,
  dtype: 'electric',
  knockback: 2,
  launch: 2,
  hitstun: 16,
  hitstop: 4,
  status: { id: 'stun', durationS: 0.6 },
};

/** Casas do piso energizado (um acerto por casa). */
const casa: ZoneSpec = { radius: 1.25, durationS: 0.45, tickS: 0.5, hit: pisoHit, fx: 'electric' };
/** Segunda grade (5 colunas) com vãos em outros lugares. */
const casaB: ZoneSpec = { radius: 1.1, durationS: 0.45, tickS: 0.5, hit: pisoHit, fx: 'electric' };
/** Descarga em volta do chefe no fim do combo. */
const descarga: ZoneSpec = {
  radius: 1.0,
  durationS: 0.45,
  tickS: 0.5,
  hit: { ...pisoHit, damage: 14, knockback: 5, launch: 4 },
  fx: 'electric',
};

const laser: HitSpec = {
  damage: 5,
  dtype: 'electric',
  knockback: 3,
  hitstun: 8,
  hitstop: 2,
};

/** Dardos do taser: lentos, perseguem e podem ser abatidos. */
const taser: ProjectileSpec = {
  visual: 'spark',
  speed: 5,
  radius: 0.35,
  lifeS: 3.5,
  homing: 1.5,
  y: 0.55,
  hp: 15,
  hit: {
    damage: 14,
    dtype: 'electric',
    knockback: 3,
    hitstun: 20,
    hitstop: 4,
    status: { id: 'stun', durationS: 0.5 },
  },
};

const investida: HitSpec = {
  damage: 22,
  dtype: 'blunt',
  knockback: 9,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

export const guardiao = registerBoss({
  id: 'guardiao',
  name: 'Guardião do Cofre',
  title: 'Sistema de Segurança Máxima',
  family: 'robot',
  element: 'electric',
  hp: 4200,
  scale: 2.1,
  radius: 1.1,
  height: 5.0,
  speed: 1.9,
  poise: 420,
  resist: { electric: 0.2, bullet: 0.75, blade: 0.85, water: 1.3, cyber: 1.3 },
  statusDurationMult: 0.5,
  statusImmune: ['poison'],
  contact: { damage: 8, dtype: 'electric', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 700, score: 30000, scrap: 300, unlockStaff: 'electric', cosmetics: [] },
  music: 'banco',
  rig: {
    kind: 'mech',
    scale: 2.1,
    skin: 0x4a5868,
    cloth: 0x1c2128,
    cloth2: 0xf2b820,
    eye: 0xff3b30,
    boss: 'guardiao',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.8, 1.5],
      patterns: [
        {
          id: 'cassetete',
          name: 'Cassetete de Choque',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 2.8, maxS: 2.2 },
            { t: 'melee', move: cassetete },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'piso_energizado',
          name: 'Piso Energizado',
          weight: 3,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.5 },
            { t: 'shake', trauma: 0.3 },
            { t: 'zone', zone: casa, at: 'grid', count: 8, delayS: 1.2 },
            { t: 'wait', s: 1.3 },
          ],
        },
        {
          id: 'laser_varredura',
          name: 'Laser de Varredura',
          weight: 3,
          cooldownS: 6,
          minRange: 2.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.9, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.6, width: 1.4, hit: laser },
            { t: 'wait', s: 0.5 },
          ],
        },
        {
          id: 'taser_duplo',
          name: 'Taser Duplo',
          weight: 2,
          cooldownS: 8,
          minRange: 2,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'sfx', id: 'telegraph' },
            { t: 'pose', pose: 'windup', s: 0.6 },
            { t: 'projectile', spec: taser, count: 2, spreadDeg: 40, aim: 'fan' },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'investida',
          name: 'Investida Blindada',
          weight: 2,
          cooldownS: 7,
          minRange: 4,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 2.2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 10, maxS: 1.3, hit: investida },
            { t: 'wait', s: 0.8 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Alerta Máximo',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.5, 1],
      adds: { enemy: 'soldier', count: 1, everyS: 15, maxAlive: 2 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'sfx', id: 'alarm' },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'drone', count: 2, from: 'back' },
      ],
      patterns: [
        {
          id: 'cassetete2',
          name: 'Cassetete Duplo',
          weight: 3,
          cooldownS: 2,
          steps: [
            { t: 'move', to: 'player', speed: 3.2, maxS: 2 },
            { t: 'melee', move: cassetete },
            { t: 'melee', move: cassetete },
          ],
        },
        {
          id: 'piso_alternado',
          name: 'Piso Alternado',
          weight: 3,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'slamGround', s: 0.4 },
            { t: 'shake', trauma: 0.3 },
            { t: 'zone', zone: casa, at: 'grid', count: 8, delayS: 1.1 },
            { t: 'wait', s: 0.8 },
            { t: 'zone', zone: casaB, at: 'grid', count: 10, delayS: 1.0 },
            { t: 'wait', s: 1.2 },
          ],
        },
        {
          id: 'laser_duplo',
          name: 'Laser Duplo',
          weight: 3,
          cooldownS: 6,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.75, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.4, hit: laser },
            { t: 'telegraph', s: 0.6, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
            { t: 'beam', mode: 'playerLane', durationS: 0.5, width: 1.4, hit: laser },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'taser_triplo',
          name: 'Taser Triplo',
          weight: 2,
          cooldownS: 8,
          minRange: 2,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'sfx', id: 'telegraph' },
            { t: 'pose', pose: 'windup', s: 0.5 },
            { t: 'projectile', spec: taser, count: 3, spreadDeg: 35, aim: 'fan' },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'contencao',
          name: 'Protocolo de Contenção',
          weight: 2,
          cooldownS: 12,
          minRange: 3,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'telegraph', s: 0.7, shape: { k: 'lane', width: 2.2 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 11, maxS: 1.2, hit: investida },
            { t: 'pose', pose: 'slamGround', s: 0.3 },
            { t: 'zone', zone: descarga, at: 'aroundBoss', count: 6, delayS: 0.8 },
            { t: 'wait', s: 0.7 },
            // sobrecarga: janela de vulnerabilidade que recompensa a agressão
            { t: 'vulnerable', s: 2.5, mult: 1.5 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
