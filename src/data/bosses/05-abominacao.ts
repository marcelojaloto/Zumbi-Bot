import { MOVES } from '../melee';
import type {
  BossDef,
  BossStep,
  ExplosionSpec,
  HitSpec,
  MeleeMoveDef,
  ProjectileSpec,
  ZoneSpec,
} from '../types';
import { registerBoss } from './index';

/**
 * Vômito Ácido: jato em cone à frente, vários acertos com veneno.
 * Mundo (escala 2,35): x 0,7…5,3 m à frente, z ±1,16 m. O cone de aviso (120°, 6 m) contém a área;
 * foge-se mudando de plano ou saindo da frente do chefe.
 */
const vomito: MeleeMoveDef = {
  id: 'abominacao_vomito',
  pose: 'claw',
  startup: 8,
  active: 36,
  recovery: 30,
  hitbox: { x0: 0.45, x1: 2.1, y0: 0, y1: 1.1, zTol: 0.42 },
  hit: {
    damage: 7,
    dtype: 'toxic',
    knockback: 2.5,
    hitstun: 14,
    hitstop: 2,
    status: { id: 'poison', chance: 0.7, durationS: 4 },
  },
  rehitEvery: 12,
  superArmor: true,
};
MOVES[vomito.id] = vomito;

/** Pancada da barriga ao redor do corpo (mundo: raio 3,0 m + alvo, até 2,35 m de altura). */
const barrigada: MeleeMoveDef = {
  id: 'abominacao_barrigada',
  pose: 'slamGround',
  startup: 10,
  active: 6,
  recovery: 36,
  hitbox: { aoeR: 1.28, y0: -0.1, y1: 1.0 },
  hit: {
    damage: 22,
    dtype: 'blunt',
    knockback: 8,
    launch: 5,
    knockdown: true,
    hitstun: 30,
    hitstop: 8,
    heavy: true,
  },
  superArmor: true,
};
MOVES[barrigada.id] = barrigada;

/** Poça corrosiva persistente: dano contínuo, veneno e lentidão. */
const poca: ZoneSpec = {
  radius: 1.25,
  durationS: 5.5,
  tickS: 0.6,
  hit: {
    damage: 3,
    dtype: 'toxic',
    knockback: 0,
    hitstun: 0,
    hitstop: 0,
    status: { id: 'poison', chance: 0.4 },
  },
  fx: 'acidPool',
  slow: 0.3,
};

/** Rastro deixado pelo Rolo Pútrido. */
const rastro: ZoneSpec = { ...poca, radius: 1.0, durationS: 3.5 };

/** Chuva de gosma: cai do céu com aviso circular e deixa uma pocinha. */
const gosma: ProjectileSpec = {
  visual: 'glob_toxic',
  speed: 10,
  radius: 0.5,
  lifeS: 2,
  hit: {
    damage: 14,
    dtype: 'toxic',
    knockback: 3,
    launch: 2,
    hitstun: 18,
    hitstop: 3,
    status: { id: 'poison', chance: 0.8 },
  },
  onImpact: { zone: { ...poca, radius: 0.9, durationS: 3.5 } },
};

/** Pústulas que estouram ao redor (anel com vãos de ~2 m a 4 m do chefe). */
const pustula: ProjectileSpec = {
  visual: 'acid',
  speed: 6,
  radius: 0.3,
  lifeS: 2.4,
  y: 0.9,
  hit: {
    damage: 12,
    dtype: 'toxic',
    knockback: 2,
    hitstun: 14,
    hitstop: 2,
    status: { id: 'poison', chance: 0.7 },
  },
};

const rolo: HitSpec = {
  damage: 30,
  dtype: 'blunt',
  knockback: 9,
  launch: 5,
  knockdown: true,
  hitstun: 34,
  hitstop: 8,
  heavy: true,
};

const aterrissagem: ExplosionSpec = {
  radius: 3,
  damage: 26,
  minMult: 0.5,
  dtype: 'toxic',
  knockback: 7,
  launch: 6,
  selfMult: 0,
  status: { id: 'poison', chance: 0.8 },
  fx: 'explosion',
};

const TELE_VOMITO: BossStep = {
  t: 'telegraph',
  s: 0.85,
  shape: { k: 'cone', angleDeg: 120, range: 6 },
  at: 'self',
  sfx: 'telegraph',
};
/** Faixa do Rolo Pútrido: acerta até |dz| < 1,48 m do chefe. */
const TELE_ROLO: BossStep = {
  t: 'telegraph',
  s: 0.9,
  shape: { k: 'lane', width: 3.4 },
  at: 'self',
  sfx: 'telegraph',
};
const TELE_BARRIGADA: BossStep = {
  t: 'telegraph',
  s: 0.75,
  shape: { k: 'circle', r: 3.7 },
  at: 'self',
  sfx: 'telegraph',
};

export const abominacao = registerBoss({
  id: 'abominacao',
  name: 'Abominação Tóxica',
  title: 'O Aterro Vivo',
  family: 'zombie',
  element: 'toxic',
  hp: 5400,
  scale: 2.35,
  radius: 1.35,
  height: 4.1,
  speed: 1.8,
  poise: 380,
  resist: { toxic: 0, fire: 1.3, ice: 1.15, blade: 1.1, bullet: 0.9, necro: 0.8 },
  statusDurationMult: 0.6,
  statusImmune: ['poison'],
  contact: { damage: 9, dtype: 'toxic', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 900, score: 40000, scrap: 400, unlockStaff: 'toxic', cosmetics: [] },
  music: 'toxica',
  rig: {
    kind: 'humanoid',
    scale: 2.35,
    skin: 0x3e5a1e,
    cloth: 0x8a7a24,
    cloth2: 0x3e4020,
    eye: 0xd8ff3a,
    hunch: 0.6,
    bulk: 2.0,
    boss: 'abominacao',
  },
  phases: [
    {
      untilHpFrac: 0.5,
      name: 'Borbulhando',
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [0.9, 1.6],
      patterns: [
        {
          id: 'vomito_acido',
          name: 'Vômito Ácido',
          weight: 3,
          cooldownS: 5,
          maxRange: 7,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3, maxS: 1 },
            TELE_VOMITO,
            { t: 'melee', move: vomito },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'pocas_corrosivas',
          name: 'Poças Corrosivas',
          weight: 2,
          cooldownS: 10,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.6 },
            { t: 'zone', zone: poca, at: 'player', count: 2, delayS: 1.1 },
            { t: 'zone', zone: poca, at: 'random', count: 3, delayS: 1.1 },
            { t: 'wait', s: 1 },
          ],
        },
        {
          id: 'rolo_putrido',
          name: 'Rolo Pútrido',
          weight: 2,
          cooldownS: 8,
          minRange: 3,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3, maxS: 0.8 },
            TELE_ROLO,
            { t: 'charge', speed: 11, maxS: 1.8, hit: rolo },
            { t: 'zone', zone: rastro, at: 'trail', count: 4, delayS: 0.6 },
            { t: 'wait', s: 0.9 },
          ],
        },
        {
          id: 'barrigada',
          name: 'Barrigada',
          weight: 2,
          cooldownS: 6,
          maxRange: 4,
          steps: [TELE_BARRIGADA, { t: 'melee', move: barrigada }, { t: 'wait', s: 0.5 }],
        },
      ],
    },
    {
      untilHpFrac: 0,
      name: 'Pústulas Rompidas',
      speedMult: 1.2,
      damageMult: 1.15,
      idleBetweenS: [0.6, 1.1],
      adds: { enemy: 'spitter', count: 1, everyS: 16, maxAlive: 2 },
      aura: {
        radius: 2.6,
        hit: {
          damage: 2,
          dtype: 'toxic',
          knockback: 0,
          hitstun: 0,
          hitstop: 0,
          status: { id: 'poison', chance: 0.35 },
        },
      },
      transition: [
        { t: 'pose', pose: 'roar', s: 1.4 },
        { t: 'shake', trauma: 0.9 },
        { t: 'projectile', spec: pustula, count: 12, spreadDeg: 0, aim: 'ring' },
        { t: 'summon', enemy: 'spitter', count: 2, from: 'sides' },
        { t: 'summon', enemy: 'exploder', count: 2, from: 'sides' },
      ],
      patterns: [
        {
          id: 'vomito_duplo',
          name: 'Vômito Ácido Duplo',
          weight: 3,
          cooldownS: 5,
          maxRange: 7,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3.2, maxS: 1 },
            TELE_VOMITO,
            { t: 'melee', move: vomito },
            { t: 'move', to: 'playerLane', speed: 3.2, maxS: 0.8 },
            { ...TELE_VOMITO, s: 0.7 },
            { t: 'melee', move: vomito },
            { t: 'wait', s: 0.4 },
          ],
        },
        {
          id: 'pocas_corrosivas2',
          name: 'Dilúvio Corrosivo',
          weight: 2,
          cooldownS: 9,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.5 },
            { t: 'zone', zone: poca, at: 'player', count: 3, delayS: 1.0 },
            { t: 'zone', zone: poca, at: 'random', count: 3, delayS: 1.0 },
            { t: 'projectile', spec: gosma, count: 3, spreadDeg: 0, aim: 'down', intervalS: 0.3 },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'rolo_putrido2',
          name: 'Rolo Pútrido Duplo',
          weight: 2,
          cooldownS: 8,
          minRange: 3,
          steps: [
            { t: 'move', to: 'playerLane', speed: 3.2, maxS: 0.8 },
            TELE_ROLO,
            { t: 'charge', speed: 12, maxS: 1.8, hit: rolo },
            { t: 'zone', zone: rastro, at: 'trail', count: 4, delayS: 0.6 },
            { t: 'wait', s: 0.6 },
            { t: 'move', to: 'playerLane', speed: 3.2, maxS: 0.6 },
            { ...TELE_ROLO, s: 0.8 },
            { t: 'charge', speed: 12, maxS: 1.8, hit: rolo },
            { t: 'wait', s: 0.8 },
          ],
        },
        {
          id: 'salto_pestilento',
          name: 'Salto Pestilento',
          weight: 2,
          cooldownS: 9,
          minRange: 3.5,
          steps: [
            { t: 'leap', to: 'player', airS: 1.2, landing: aterrissagem },
            { t: 'zone', zone: rastro, at: 'aroundBoss', count: 4, delayS: 0.7 },
            { t: 'wait', s: 0.7 },
          ],
        },
        {
          id: 'pustulas',
          name: 'Explosão de Pústulas',
          weight: 1,
          cooldownS: 14,
          steps: [
            { t: 'pose', pose: 'roar', s: 0.8 },
            { t: 'projectile', spec: pustula, count: 12, spreadDeg: 0, aim: 'ring' },
            { t: 'summon', enemy: 'exploder', count: 2, from: 'sides' },
            { t: 'wait', s: 0.6 },
          ],
        },
        {
          id: 'barrigada2',
          name: 'Barrigada',
          weight: 2,
          cooldownS: 6,
          maxRange: 4,
          steps: [TELE_BARRIGADA, { t: 'melee', move: barrigada }, { t: 'wait', s: 0.4 }],
        },
      ],
    },
  ],
} satisfies BossDef);
