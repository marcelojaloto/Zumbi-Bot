import { MOVES } from '../melee';
import type { BossDef, BossStep, HitSpec, MeleeMoveDef, ProjectileSpec } from '../types';
import { registerBoss } from './index';

/** Soco-martelo do braço esquerdo. */
const slam: MeleeMoveDef = {
  id: 'mecha_slam',
  pose: 'slam',
  startup: 22,
  active: 6,
  recovery: 32,
  hitbox: { x0: 0, x1: 1.15, y0: 0, y1: 1.8, zTol: 0.42 },
  hit: {
    damage: 24,
    dtype: 'blunt',
    knockback: 7,
    launch: 5,
    knockdown: true,
    hitstun: 30,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[slam.id] = slam;

/** Varredura lateral (fase 2, emenda depois do soco). */
const sweep: MeleeMoveDef = {
  id: 'mecha_sweep',
  pose: 'swing2',
  startup: 16,
  active: 7,
  recovery: 30,
  hitbox: { x0: -0.3, x1: 1.25, y0: 0, y1: 1.4, zTol: 0.5 },
  hit: {
    damage: 20,
    dtype: 'blunt',
    knockback: 8,
    launch: 4,
    knockdown: true,
    hitstun: 28,
    hitstop: 7,
    heavy: true,
  },
  superArmor: true,
};
MOVES[sweep.id] = sweep;

/** Míssil que cai do céu (o passo 'down' mostra o aviso no chão). */
const missile: ProjectileSpec = {
  visual: 'missile',
  speed: 12,
  radius: 0.35,
  lifeS: 3,
  hit: { damage: 8, dtype: 'explosive', knockback: 2, hitstun: 14, hitstop: 2 },
  onImpact: {
    explosion: {
      radius: 1.5,
      damage: 20,
      minMult: 0.5,
      dtype: 'explosive',
      knockback: 5,
      launch: 4,
      selfMult: 0,
      fx: 'explosion',
    },
  },
};

/** Carro arremessado: cai do alto com aviso largo e explode em chamas. */
const car: ProjectileSpec = {
  visual: 'rock',
  speed: 12,
  radius: 0.9,
  lifeS: 3,
  hit: { damage: 10, dtype: 'blunt', knockback: 3, hitstun: 16, hitstop: 4 },
  onImpact: {
    explosion: {
      radius: 2,
      damage: 28,
      minMult: 0.45,
      dtype: 'explosive',
      knockback: 7,
      launch: 6,
      selfMult: 0,
      status: { id: 'burn', chance: 0.5 },
      fx: 'explosion',
    },
  },
};

const packet: ProjectileSpec = {
  visual: 'packet_cyber',
  speed: 11,
  radius: 0.3,
  lifeS: 2.4,
  y: 1.3,
  hit: { damage: 12, dtype: 'cyber', knockback: 3, hitstun: 16, hitstop: 3 },
};

const pulse: HitSpec = {
  damage: 18,
  dtype: 'cyber',
  knockback: 4,
  hitstun: 24,
  hitstop: 4,
  status: { id: 'glitch', durationS: 2.5 },
};

const plasma: HitSpec = {
  damage: 35,
  dtype: 'cyber',
  knockback: 7,
  launch: 5,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

const ram: HitSpec = {
  damage: 26,
  dtype: 'blunt',
  knockback: 9,
  launch: 6,
  knockdown: true,
  hitstun: 30,
  hitstop: 8,
  heavy: true,
};

const pulsoHacker = (tele: number): BossStep[] => [
  { t: 'telegraph', s: tele, shape: { k: 'ring', r: 2.6 }, at: 'self', sfx: 'telegraph' },
  { t: 'shockwave', axis: 'ring', speed: 7, range: 11, height: 0.7, hit: pulse },
];

/** Feixe de um tique só (beams repetem o dano a cada 12 ticks: 0,18 s = um acerto). */
const canhao = (tele: number): BossStep[] => [
  { t: 'face', target: 'player' },
  { t: 'telegraph', s: tele, shape: { k: 'lane', width: 1.4 }, at: 'player', sfx: 'telegraph' },
  { t: 'beam', mode: 'playerLane', durationS: 0.18, width: 1.4, hit: plasma },
];

export const mecha = registerBoss({
  id: 'mecha',
  name: 'Mecha Dominador',
  title: 'Comandante das Máquinas',
  family: 'robot',
  element: 'cyber',
  hp: 6600,
  scale: 2.1,
  radius: 1.2,
  height: 4.3,
  speed: 2,
  poise: 420,
  resist: {
    cyber: 0.2,
    bullet: 0.75,
    blade: 0.6,
    blunt: 1.1,
    electric: 1.4,
    water: 1.2,
    fire: 0.9,
    toxic: 0.4,
    holy: 0.6,
  },
  statusDurationMult: 0.4,
  statusImmune: ['poison', 'glitch', 'hacked'],
  contact: { damage: 10, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 1100, score: 50000, scrap: 500, unlockStaff: 'cyber', cosmetics: [] },
  music: 'centro',
  rig: {
    kind: 'mech',
    scale: 2.1,
    skin: 0x5a6274,
    cloth: 0x2c303a,
    cloth2: 0x6a2a62,
    eye: 0x3af0ff,
    boss: 'mecha',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.8, 1.5],
      patterns: [
        {
          id: 'esmagar',
          name: 'Punho Hidráulico',
          weight: 3,
          cooldownS: 2.5,
          steps: [
            { t: 'move', to: 'player', speed: 3, maxS: 2.2 },
            { t: 'melee', move: slam },
            { t: 'wait', s: 0.3 },
          ],
        },
        {
          id: 'barragem',
          name: 'Barragem de Mísseis',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'windup', s: 0.5 },
            {
              t: 'projectile',
              spec: missile,
              count: 8,
              spreadDeg: 0,
              aim: 'down',
              intervalS: 0.15,
              from: 'top',
            },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'pulso',
          name: 'Pulso Hacker',
          weight: 2,
          cooldownS: 7,
          steps: [...pulsoHacker(0.85), { t: 'wait', s: 0.8 }],
        },
        {
          id: 'canhao',
          name: 'Canhão de Plasma',
          weight: 2,
          cooldownS: 8,
          steps: [...canhao(1.2), { t: 'wait', s: 0.7 }],
        },
        {
          id: 'rajada',
          name: 'Rajada de Dados',
          weight: 2,
          cooldownS: 6,
          minRange: 3.5,
          steps: [
            { t: 'face', target: 'player' },
            { t: 'pose', pose: 'windup', s: 0.45 },
            { t: 'projectile', spec: packet, count: 5, spreadDeg: 12, aim: 'fan' },
            { t: 'wait', s: 0.7 },
          ],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Protocolo Dominação',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.5, 1.1],
      adds: { enemy: 'drone', count: 1, everyS: 16, maxAlive: 3 },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.8 },
        { t: 'summon', enemy: 'soldier', count: 2, from: 'sides' },
        { t: 'summon', enemy: 'drone', count: 2, from: 'sky' },
      ],
      patterns: [
        {
          id: 'esmagar2',
          name: 'Punho e Varredura',
          weight: 3,
          cooldownS: 2,
          steps: [
            { t: 'move', to: 'player', speed: 3.6, maxS: 2 },
            { t: 'melee', move: slam },
            { t: 'melee', move: sweep },
          ],
        },
        {
          id: 'barragem2',
          name: 'Barragem Total',
          weight: 2,
          cooldownS: 8,
          steps: [
            { t: 'pose', pose: 'windup', s: 0.4 },
            {
              t: 'projectile',
              spec: missile,
              count: 12,
              spreadDeg: 0,
              aim: 'down',
              intervalS: 0.12,
              from: 'top',
            },
            { t: 'wait', s: 0.9 },
          ],
        },
        {
          id: 'pulso2',
          name: 'Pulso Hacker Duplo',
          weight: 2,
          cooldownS: 7,
          steps: [...pulsoHacker(0.7), { t: 'wait', s: 0.75 }, ...pulsoHacker(0.45), { t: 'wait', s: 0.7 }],
        },
        {
          id: 'canhao2',
          name: 'Canhão de Plasma Duplo',
          weight: 2,
          cooldownS: 9,
          steps: [
            ...canhao(1.0),
            { t: 'wait', s: 0.35 },
            ...canhao(0.8),
            // superaquecido: janela para punir
            { t: 'vulnerable', s: 1.3, mult: 1.3 },
          ],
        },
        {
          id: 'carros',
          name: 'Carro Arremessado',
          weight: 2,
          cooldownS: 10,
          steps: [
            { t: 'pose', pose: 'windup', s: 0.5 },
            { t: 'projectile', spec: car, count: 3, spreadDeg: 0, aim: 'down', intervalS: 0.45, from: 'top' },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'investida',
          name: 'Investida Blindada',
          weight: 2,
          cooldownS: 8,
          minRange: 3,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3.5, maxS: 1 },
            { t: 'telegraph', s: 0.8, shape: { k: 'lane', width: 2.6 }, at: 'self', sfx: 'telegraph' },
            { t: 'charge', speed: 13, maxS: 1.6, hit: ram },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'reforcos',
          name: 'Reforços',
          weight: 1,
          cooldownS: 20,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'summon', enemy: 'soldier', count: 2, from: 'sides' },
            { t: 'wait', s: 0.5 },
          ],
        },
      ],
    },
  ],
} satisfies BossDef);
