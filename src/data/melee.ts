import type { Hitbox, MeleeId, MeleeMoveDef, MeleeWeaponDef } from './types';

const PUNCH: Hitbox = { x0: 0.2, x1: 1.15, y0: 0.9, y1: 1.65, zTol: 0.55 };
const KICK: Hitbox = { x0: 0.2, x1: 1.35, y0: 0.3, y1: 1.3, zTol: 0.6 };
const UPPER: Hitbox = { x0: 0.1, x1: 1.05, y0: 0.8, y1: 2.4, zTol: 0.6 };
const AIR: Hitbox = { x0: 0.1, x1: 1.25, y0: -0.3, y1: 1.4, zTol: 0.65 };

function reach(len: number, zTol = 0.7): Hitbox {
  return { x0: 0.2, x1: 0.9 + len, y0: 0.5, y1: 1.9, zTol };
}

/** Golpes do robô (desarmado) e das armas brancas. Frame data em ticks (60 Hz). */
export const MOVES: Record<string, MeleeMoveDef> = {
  // --- desarmado ---
  jab: {
    id: 'jab',
    pose: 'jab',
    startup: 4,
    active: 3,
    recovery: 8,
    hitbox: PUNCH,
    hit: { damage: 6, dtype: 'blunt', knockback: 0.5, hitstun: 14, hitstop: 3 },
    cancelFrom: 7,
    next: { J: 'cross', K: 'kick' },
  },
  cross: {
    id: 'cross',
    pose: 'cross',
    startup: 5,
    active: 3,
    recovery: 9,
    hitbox: PUNCH,
    hit: { damage: 7, dtype: 'blunt', knockback: 0.8, hitstun: 14, hitstop: 3 },
    cancelFrom: 8,
    next: { J: 'hook', K: 'spinKick' },
  },
  hook: {
    id: 'hook',
    pose: 'hook',
    startup: 6,
    active: 3,
    recovery: 11,
    hitbox: PUNCH,
    hit: { damage: 9, dtype: 'blunt', knockback: 1.2, hitstun: 16, hitstop: 4 },
    cancelFrom: 9,
    next: { J: 'uppercut', K: 'spinKick' },
  },
  uppercut: {
    id: 'uppercut',
    pose: 'uppercut',
    startup: 8,
    active: 4,
    recovery: 18,
    hitbox: UPPER,
    hit: {
      damage: 14,
      dtype: 'blunt',
      knockback: 3,
      launch: 6,
      knockdown: true,
      hitstun: 30,
      hitstop: 7,
      heavy: true,
    },
  },
  kick: {
    id: 'kick',
    pose: 'kick',
    startup: 7,
    active: 4,
    recovery: 14,
    hitbox: KICK,
    hit: { damage: 10, dtype: 'blunt', knockback: 2.5, hitstun: 18, hitstop: 4 },
    cancelFrom: 12,
    next: { J: 'jab' },
  },
  spinKick: {
    id: 'spinKick',
    pose: 'spinKick',
    startup: 8,
    active: 5,
    recovery: 16,
    hitbox: { ...KICK, x0: -0.3, x1: 1.45 },
    hit: {
      damage: 16,
      dtype: 'blunt',
      knockback: 5,
      launch: 3,
      knockdown: true,
      hitstun: 30,
      hitstop: 8,
      heavy: true,
    },
  },
  flyKick: {
    id: 'flyKick',
    pose: 'flyKick',
    startup: 5,
    active: 12,
    recovery: 16,
    hitbox: { x0: 0.2, x1: 1.4, y0: 0.4, y1: 1.4, zTol: 0.65 },
    hit: {
      damage: 16,
      dtype: 'blunt',
      knockback: 5,
      launch: 2.5,
      knockdown: true,
      hitstun: 30,
      hitstop: 6,
      heavy: true,
    },
    lunge: 8,
  },
  airPunch: {
    id: 'airPunch',
    pose: 'airPunch',
    startup: 4,
    active: 8,
    recovery: 6,
    hitbox: AIR,
    hit: { damage: 10, dtype: 'blunt', knockback: 1.5, hitstun: 14, hitstop: 4 },
    air: true,
  },
  airKick: {
    id: 'airKick',
    pose: 'airKick',
    startup: 5,
    active: 10,
    recovery: 8,
    hitbox: { ...AIR, x1: 1.35 },
    hit: {
      damage: 14,
      dtype: 'blunt',
      knockback: 4,
      launch: 1.5,
      knockdown: true,
      hitstun: 26,
      hitstop: 5,
      heavy: true,
    },
    air: true,
  },
  giroTurbo: {
    id: 'giroTurbo',
    pose: 'spin',
    startup: 6,
    active: 18,
    recovery: 14,
    hitbox: { aoeR: 2.2, y0: 0, y1: 2.2 },
    hit: {
      damage: 20,
      dtype: 'blunt',
      knockback: 6,
      launch: 4,
      knockdown: true,
      hitstun: 30,
      hitstop: 6,
      heavy: true,
    },
    invulnActive: true,
    manaCost: 25,
    hpCost: 8,
  },

  // --- armas brancas ---
  knife1: blade('knife1', 'slash1', 3, 12, 1.0, 0.8, 'knife2'),
  knife2: blade('knife2', 'slash2', 3, 12, 1.0, 0.8, 'knife3'),
  knife3: blade('knife3', 'stab', 4, 16, 1.1, 1.6),
  machete1: blade('machete1', 'slash1', 6, 18, 1.3, 1.5, 'machete2'),
  machete2: blade('machete2', 'slash2', 6, 18, 1.3, 1.5, 'machete3'),
  machete3: blade('machete3', 'slash3', 7, 24, 1.4, 3, undefined, true),
  katana1: blade('katana1', 'slash1', 7, 24, 1.6, 2, 'katana2'),
  katana2: blade('katana2', 'slash2', 7, 24, 1.6, 2, 'katana3'),
  katana3: {
    ...blade('katana3', 'thrust', 8, 32, 2.6, 3, undefined, true),
    hitbox: { x0: 0.2, x1: 3.2, y0: 0.6, y1: 1.8, zTol: 0.8 },
    lunge: 6,
  },
  bat1: blunt('bat1', 'swing1', 8, 16, 1.4, 3, 'bat2'),
  bat2: blunt('bat2', 'swing2', 8, 16, 1.4, 3, 'bat3'),
  bat3: blunt('bat3', 'swing3', 9, 24, 1.5, 5, undefined, true),
  pipe1: blunt('pipe1', 'swing1', 9, 20, 1.4, 3, 'pipe2'),
  pipe2: blunt('pipe2', 'swing2', 9, 20, 1.4, 3, 'pipe3'),
  pipe3: blunt('pipe3', 'swing3', 10, 28, 1.5, 4, undefined, true),
  sledge1: {
    ...blunt('sledge1', 'swing1', 14, 40, 1.5, 7, 'sledge2', true),
    superArmor: true,
  },
  sledge2: {
    id: 'sledge2',
    pose: 'slam',
    startup: 16,
    active: 5,
    recovery: 24,
    hitbox: { aoeR: 1.8, y0: -0.2, y1: 1.2 },
    hit: {
      damage: 40,
      dtype: 'blunt',
      knockback: 7,
      launch: 5,
      knockdown: true,
      hitstun: 30,
      hitstop: 9,
      heavy: true,
    },
    superArmor: true,
  },
};

function blade(
  id: string,
  pose: string,
  startup: number,
  damage: number,
  len: number,
  kb: number,
  next?: string,
  finisher = false,
): MeleeMoveDef {
  return {
    id,
    pose,
    startup,
    active: 4,
    recovery: finisher ? 16 : 10,
    hitbox: reach(len),
    hit: {
      damage,
      dtype: 'blade',
      knockback: kb,
      hitstun: finisher ? 24 : 16,
      hitstop: finisher ? 6 : 4,
      knockdown: finisher && kb >= 3,
      heavy: finisher,
    },
    cancelFrom: startup + 6,
    next: next ? { J: next } : undefined,
  };
}

function blunt(
  id: string,
  pose: string,
  startup: number,
  damage: number,
  len: number,
  kb: number,
  next?: string,
  finisher = false,
): MeleeMoveDef {
  return {
    id,
    pose,
    startup,
    active: 5,
    recovery: finisher ? 20 : 12,
    hitbox: reach(len),
    hit: {
      damage,
      dtype: 'blunt',
      knockback: kb,
      launch: finisher ? 3 : undefined,
      hitstun: finisher ? 28 : 18,
      hitstop: finisher ? 7 : 5,
      knockdown: finisher,
      heavy: finisher,
    },
    cancelFrom: startup + 7,
    next: next ? { J: next } : undefined,
  };
}

export const MELEE_WEAPONS: Record<MeleeId, MeleeWeaponDef> = {
  knife: {
    id: 'knife',
    name: 'Faca',
    category: 'blade',
    combo: ['knife1', 'knife2', 'knife3'],
    durability: 30,
    mesh: {
      parts: [
        { shape: 'box', size: [0.05, 0.14, 0.05], pos: [0, 0.02, 0], color: 0x3a2a1a },
        { shape: 'box', size: [0.03, 0.3, 0.06], pos: [0, 0.24, 0], color: 0xc8d0d8 },
      ],
    },
  },
  machete: {
    id: 'machete',
    name: 'Facão',
    category: 'blade',
    combo: ['machete1', 'machete2', 'machete3'],
    durability: 25,
    mesh: {
      parts: [
        { shape: 'box', size: [0.05, 0.16, 0.05], pos: [0, 0.02, 0], color: 0x2a1a10 },
        { shape: 'box', size: [0.03, 0.62, 0.1], pos: [0, 0.42, 0.01], color: 0xaab2ba },
      ],
    },
  },
  katana: {
    id: 'katana',
    name: 'Katana',
    category: 'blade',
    combo: ['katana1', 'katana2', 'katana3'],
    durability: 20,
    mesh: {
      parts: [
        { shape: 'box', size: [0.05, 0.26, 0.05], pos: [0, 0.05, 0], color: 0x1a1a24 },
        { shape: 'box', size: [0.14, 0.02, 0.1], pos: [0, 0.19, 0], color: 0xc8a040 },
        { shape: 'box', size: [0.025, 0.95, 0.06], pos: [0, 0.68, 0], color: 0xe0e8f0 },
      ],
    },
  },
  bat: {
    id: 'bat',
    name: 'Taco de Beisebol',
    category: 'blunt',
    combo: ['bat1', 'bat2', 'bat3'],
    durability: 25,
    mesh: {
      parts: [
        { shape: 'cyl', size: [0.035, 0.03, 0.3, 6], pos: [0, 0.05, 0], color: 0x6a4a2a },
        { shape: 'cyl', size: [0.07, 0.04, 0.6, 6], pos: [0, 0.5, 0], color: 0x9a6a3a },
      ],
    },
  },
  pipe: {
    id: 'pipe',
    name: 'Cano de Ferro',
    category: 'blunt',
    combo: ['pipe1', 'pipe2', 'pipe3'],
    durability: 30,
    mesh: {
      parts: [
        { shape: 'cyl', size: [0.04, 0.04, 0.9, 6], pos: [0, 0.35, 0], color: 0x5a6068 },
        { shape: 'cyl', size: [0.06, 0.06, 0.1, 6], pos: [0, 0.78, 0], color: 0x4a5058 },
      ],
    },
  },
  sledge: {
    id: 'sledge',
    name: 'Marreta',
    category: 'blunt',
    combo: ['sledge1', 'sledge2'],
    durability: 15,
    mesh: {
      parts: [
        { shape: 'cyl', size: [0.035, 0.035, 0.9, 6], pos: [0, 0.35, 0], color: 0x7a5a3a },
        { shape: 'box', size: [0.34, 0.18, 0.18], pos: [0, 0.82, 0], color: 0x4a4e56 },
      ],
    },
  },
};

export function getMove(id: string): MeleeMoveDef {
  const m = MOVES[id];
  if (!m) throw new Error(`Golpe desconhecido: ${id}`);
  return m;
}
