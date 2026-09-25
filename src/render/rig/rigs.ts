import type { RigParams } from '../../data/types';
import type { PartSpec, RigSpec, SocketSpec } from './RigBuilder';
import { HUMAN, J, humanoidJoints, type Proportions } from './skeleton';

const H = Math.PI / 2;

/** Encaixes padrão do humanoide (armas, chapéus, óculos, máscaras, capas). */
function humanSockets(headH: number, headD: number, chestD: number): Record<string, SocketSpec> {
  return {
    head_top: { j: J.head, at: [0, headH + 0.02, 0] },
    face: { j: J.head, at: [0, headH * 0.55, headD / 2 + 0.005] },
    mouth: { j: J.head, at: [0, headH * 0.2, headD / 2] },
    back: { j: J.chest, at: [0, 0.16, -chestD / 2 - 0.02] },
    torso: { j: J.chest, at: [0, 0, 0] },
    hips: { j: J.hips, at: [0, 0, 0] },
    handR: { j: J.handR, at: [0, -0.06, 0.02], rot: [H, 0, 0] },
    handL: { j: J.handL, at: [0, -0.06, 0.02], rot: [H, 0, 0] },
    staffR: { j: J.handR, at: [0, -0.05, 0.02] },
    muzzle: { j: J.handR, at: [0, -0.35, 0.05] },
  };
}

function limbs(p: {
  upper: number;
  fore: number;
  hand: number;
  thigh: number;
  shin: number;
  foot: number;
  armW: number;
  legW: number;
  props: Proportions;
  skipL?: boolean;
}): PartSpec[] {
  const { props: pr } = p;
  const parts: PartSpec[] = [];
  for (const side of ['L', 'R'] as const) {
    const ua = side === 'L' ? J.upperArmL : J.upperArmR;
    const fa = side === 'L' ? J.foreArmL : J.foreArmR;
    const hd = side === 'L' ? J.handL : J.handR;
    const th = side === 'L' ? J.thighL : J.thighR;
    const sh = side === 'L' ? J.shinL : J.shinR;
    const ft = side === 'L' ? J.footL : J.footR;
    parts.push({
      j: ua,
      shape: 'box',
      size: [p.armW, pr.upperArm * 0.9, p.armW],
      at: [0, -pr.upperArm * 0.47, 0],
      color: p.upper,
    });
    if (!(side === 'L' && p.skipL)) {
      parts.push({
        j: fa,
        shape: 'box',
        size: [p.armW * 0.92, pr.foreArm * 0.92, p.armW * 0.92],
        at: [0, -pr.foreArm * 0.46, 0],
        color: p.fore,
      });
      parts.push({
        j: hd,
        shape: 'box',
        size: [p.armW * 0.9, 0.1, p.armW],
        at: [0, -0.04, 0.01],
        color: p.hand,
      });
    }
    parts.push({
      j: th,
      shape: 'box',
      size: [p.legW, pr.thigh * 0.88, p.legW],
      at: [0, -pr.thigh * 0.48, 0],
      color: p.thigh,
    });
    parts.push({
      j: sh,
      shape: 'box',
      size: [p.legW * 0.92, pr.shin * 0.86, p.legW * 0.95],
      at: [0, -pr.shin * 0.5, 0],
      color: p.shin,
    });
    parts.push({
      j: ft,
      shape: 'box',
      size: [p.legW, 0.08, p.legW * 1.8],
      at: [0, 0.02, 0.05],
      color: p.foot,
    });
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Robô do jogador
// ---------------------------------------------------------------------------
export function robotPlayerRig(): RigSpec {
  const steel = 0x7a8aa0;
  const dark = 0x2e3440;
  const accent = 0xff8c1a;
  const cyan = 0x39e6ff;
  const pr = HUMAN;
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.36, 0.18, 0.24], at: [0, 0, 0], color: dark },
    { j: J.spine, shape: 'box', size: [0.28, 0.16, 0.2], at: [0, 0.02, 0], color: 0x4a5566 },
    { j: J.chest, shape: 'box', size: [0.52, 0.36, 0.3], at: [0, 0.06, 0], color: steel },
    { j: J.chest, shape: 'box', size: [0.4, 0.2, 0.05], at: [0, 0.08, 0.16], color: accent },
    {
      j: J.chest,
      shape: 'box',
      size: [0.1, 0.1, 0.03],
      at: [0, 0.1, 0.19],
      color: cyan,
      glow: true,
      glowI: 3,
    },
    { j: J.chest, shape: 'box', size: [0.34, 0.3, 0.14], at: [0, 0.06, -0.2], color: dark },
    { j: J.chest, shape: 'cyl', size: [0.04, 0.04, 0.1, 6], at: [0.1, 0.24, -0.22], color: 0x5a6070 },
    { j: J.chest, shape: 'cyl', size: [0.04, 0.04, 0.1, 6], at: [-0.1, 0.24, -0.22], color: 0x5a6070 },
    { j: J.upperArmL, shape: 'box', size: [0.2, 0.14, 0.24], at: [0.03, 0.01, 0], color: accent },
    { j: J.upperArmR, shape: 'box', size: [0.2, 0.14, 0.24], at: [-0.03, 0.01, 0], color: accent },
    { j: J.neck, shape: 'cyl', size: [0.06, 0.07, 0.12, 6], at: [0, 0, 0], color: dark },
    { j: J.head, shape: 'box', size: [0.34, 0.3, 0.3], at: [0, 0.15, 0], color: steel },
    {
      j: J.head,
      shape: 'box',
      size: [0.29, 0.085, 0.03],
      at: [0, 0.17, 0.155],
      color: cyan,
      glow: true,
      glowI: 3.2,
    },
    { j: J.head, shape: 'box', size: [0.26, 0.05, 0.26], at: [0, 0.31, 0], color: accent },
    { j: J.head, shape: 'box', size: [0.05, 0.13, 0.13], at: [0.19, 0.15, 0], color: dark },
    { j: J.head, shape: 'box', size: [0.05, 0.13, 0.13], at: [-0.19, 0.15, 0], color: dark },
    { j: J.head, shape: 'box', size: [0.2, 0.05, 0.03], at: [0, 0.06, 0.155], color: dark },
    { j: J.head, shape: 'cyl', size: [0.012, 0.012, 0.18, 4], at: [0.1, 0.42, 0], color: dark },
    {
      j: J.head,
      shape: 'sphere',
      size: [0.03, 5, 4],
      at: [0.1, 0.52, 0],
      color: accent,
      glow: true,
      glowI: 3,
    },
    { j: J.shinL, shape: 'box', size: [0.15, 0.09, 0.18], at: [0, 0.01, 0.03], color: accent },
    { j: J.shinR, shape: 'box', size: [0.15, 0.09, 0.18], at: [0, 0.01, 0.03], color: accent },
    ...limbs({
      upper: steel,
      fore: 0x6a7a90,
      hand: dark,
      thigh: steel,
      shin: 0x6a7a90,
      foot: dark,
      armW: 0.13,
      legW: 0.16,
      props: pr,
    }),
  ];
  return {
    key: 'robot-player',
    joints: humanoidJoints(pr),
    parts,
    sockets: humanSockets(0.31, 0.3, 0.3),
    height: 1.9,
    metal: 0.55,
    rough: 0.45,
  };
}

// ---------------------------------------------------------------------------
// Zumbis
// ---------------------------------------------------------------------------
function shade(c: number, k: number): number {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * k));
  const b = Math.min(255, Math.round((c & 255) * k));
  return (r << 16) | (g << 8) | b;
}

function vary(c: number, v: number, amt: number): number {
  const k = 1 + (((v * 7919) % 11) / 11 - 0.5) * amt;
  return shade(c, k);
}

export function zombieRig(key: string, rp: RigParams, variant: number): RigSpec {
  const bulk = rp.bulk ?? 1;
  const pr: Proportions = {
    ...HUMAN,
    hipH: 0.9,
    shoulderW: 0.24 * bulk,
    hipW: 0.11 * Math.max(1, bulk * 0.9),
  };
  const skin = vary(rp.skin, variant, 0.25);
  const shirt = vary(rp.cloth, variant + 3, 0.5);
  const pants = vary(rp.cloth2, variant + 5, 0.4);
  const dark = shade(skin, 0.6);
  const blood = 0x4a0a0a;
  const tornArm = variant % 4 === 3;
  const tornLeg = variant % 3 === 2;
  const cw = 0.42 * bulk;
  const cd = 0.26 * bulk;
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.3 * bulk, 0.18, 0.2 * bulk], at: [0, 0, 0], color: pants },
    { j: J.spine, shape: 'box', size: [0.3 * bulk, 0.2, 0.2 * bulk], at: [0, 0.02, 0.01], color: shirt },
    { j: J.chest, shape: 'box', size: [cw, 0.34, cd], at: [0, 0.05, 0], color: shirt },
    {
      j: J.chest,
      shape: 'box',
      size: [cw * 0.4, 0.14, 0.02],
      at: [0.06, 0.02, cd / 2 + 0.005],
      color: blood,
    },
    { j: J.neck, shape: 'cyl', size: [0.055, 0.065, 0.12, 5], at: [0, 0, 0.01], color: skin },
    { j: J.head, shape: 'box', size: [0.25, 0.27, 0.26], at: [0, 0.14, 0.01], color: skin },
    { j: J.head, shape: 'box', size: [0.2, 0.07, 0.2], at: [0, 0.01, 0.04], color: dark },
    {
      j: J.head,
      shape: 'box',
      size: [0.05, 0.04, 0.02],
      at: [0.06, 0.16, 0.14],
      color: rp.eye,
      glow: true,
      glowI: 3.5,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.05, 0.04, 0.02],
      at: [-0.06, 0.16, 0.14],
      color: rp.eye,
      glow: true,
      glowI: 3.5,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.26, 0.06, 0.27],
      at: [0, 0.28, -0.005],
      color: vary(0x2a2018, variant, 0.6),
    },
    ...limbs({
      upper: variant % 2 ? shirt : skin,
      fore: skin,
      hand: dark,
      thigh: pants,
      shin: tornLeg ? skin : pants,
      foot: 0x2a2420,
      armW: 0.11 * Math.max(1, bulk * 0.95),
      legW: 0.14 * Math.max(1, bulk * 0.9),
      props: pr,
      skipL: tornArm,
    }),
  ];
  if (tornArm)
    parts.push({ j: J.foreArmL, shape: 'box', size: [0.09, 0.06, 0.09], at: [0, -0.02, 0], color: blood });
  if (variant % 5 === 1) {
    // costelas expostas
    parts.push({
      j: J.chest,
      shape: 'box',
      size: [cw * 0.5, 0.16, 0.02],
      at: [-0.05, 0.06, cd / 2 + 0.006],
      color: 0xd8d0b8,
    });
  }
  switch (rp.accessory) {
    case 'helmet':
      parts.push({ j: J.head, shape: 'sphere', size: [0.17, 7, 4], at: [0, 0.24, 0], color: 0x4a5a3a });
      break;
    case 'tie':
      parts.push({
        j: J.chest,
        shape: 'box',
        size: [0.14, 0.3, 0.02],
        at: [0, 0.04, cd / 2 + 0.006],
        color: 0xe8e8e8,
      });
      parts.push({
        j: J.chest,
        shape: 'box',
        size: [0.05, 0.26, 0.02],
        at: [0, 0.03, cd / 2 + 0.012],
        color: 0x8a1a1a,
      });
      break;
    case 'gasmask':
      parts.push({ j: J.head, shape: 'box', size: [0.2, 0.14, 0.06], at: [0, 0.08, 0.15], color: 0x2a2a2a });
      parts.push({
        j: J.head,
        shape: 'cyl',
        size: [0.05, 0.05, 0.08, 6],
        at: [0, 0.03, 0.2],
        rot: [H, 0, 0],
        color: 0x3a3a3a,
      });
      break;
    case 'barrel':
      parts.push({
        j: J.chest,
        shape: 'cyl',
        size: [0.2, 0.2, 0.42, 8],
        at: [0, 0.02, 0.2],
        color: 0xb02a10,
      });
      parts.push({
        j: J.chest,
        shape: 'box',
        size: [0.1, 0.06, 0.02],
        at: [0, 0.08, 0.41],
        color: 0xff5a10,
        glow: true,
        glowI: 3,
      });
      break;
    case 'flames':
      for (const [x, y, z] of [
        [0.1, 0.25, 0.05],
        [-0.12, 0.1, 0.08],
        [0.02, 0.4, -0.05],
      ] as [number, number, number][]) {
        parts.push({
          j: J.chest,
          shape: 'cone',
          size: [0.08, 0.26, 4],
          at: [x, y, z],
          color: 0xff6a10,
          glow: true,
          glowI: 2.5,
        });
      }
      parts.push({
        j: J.head,
        shape: 'cone',
        size: [0.1, 0.3, 4],
        at: [0, 0.4, 0],
        color: 0xff8a1a,
        glow: true,
        glowI: 2.5,
      });
      break;
    case 'axe':
      parts.push({ j: J.handR, shape: 'box', size: [0.05, 0.7, 0.05], at: [0, -0.2, 0.08], color: 0x6a4a2a });
      parts.push({ j: J.handR, shape: 'box', size: [0.04, 0.2, 0.28], at: [0, -0.5, 0.18], color: 0x8a8e96 });
      break;
    case 'hood':
      parts.push({ j: J.head, shape: 'cone', size: [0.2, 0.36, 5], at: [0, 0.3, -0.02], color: shirt });
      break;
    case 'cap':
      parts.push({ j: J.head, shape: 'box', size: [0.27, 0.07, 0.28], at: [0, 0.3, 0], color: 0x8a2a2a });
      parts.push({ j: J.head, shape: 'box', size: [0.24, 0.02, 0.14], at: [0, 0.28, 0.18], color: 0x8a2a2a });
      break;
    default:
      break;
  }
  return {
    key,
    joints: humanoidJoints(pr),
    parts,
    sockets: humanSockets(0.28, 0.26, cd),
    height: 1.8,
    metal: 0,
    rough: 0.9,
  };
}

// ---------------------------------------------------------------------------
// Robôs inimigos
// ---------------------------------------------------------------------------
export function soldierRig(key: string, rp: RigParams): RigSpec {
  const pr: Proportions = { ...HUMAN, shoulderW: 0.28, hipH: 0.95 };
  const body = rp.skin;
  const dark = rp.cloth;
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.36, 0.2, 0.26], at: [0, 0, 0], color: dark },
    { j: J.spine, shape: 'box', size: [0.26, 0.16, 0.2], at: [0, 0.02, 0], color: 0x2a2e36 },
    { j: J.chest, shape: 'box', size: [0.56, 0.38, 0.34], at: [0, 0.06, 0], color: body },
    { j: J.chest, shape: 'box', size: [0.2, 0.2, 0.04], at: [0.12, 0.06, 0.18], color: rp.cloth2 },
    {
      j: J.chest,
      shape: 'box',
      size: [0.08, 0.08, 0.02],
      at: [-0.12, 0.12, 0.18],
      color: rp.eye,
      glow: true,
      glowI: 2.5,
    },
    { j: J.upperArmL, shape: 'box', size: [0.22, 0.16, 0.26], at: [0.04, 0.02, 0], color: dark },
    { j: J.upperArmR, shape: 'box', size: [0.22, 0.16, 0.26], at: [-0.04, 0.02, 0], color: dark },
    { j: J.neck, shape: 'cyl', size: [0.07, 0.08, 0.1, 6], at: [0, 0, 0], color: 0x2a2e36 },
    { j: J.head, shape: 'box', size: [0.3, 0.26, 0.3], at: [0, 0.14, 0], color: body },
    {
      j: J.head,
      shape: 'box',
      size: [0.26, 0.06, 0.03],
      at: [0, 0.16, 0.155],
      color: rp.eye,
      glow: true,
      glowI: 3.5,
    },
    { j: J.head, shape: 'box', size: [0.34, 0.08, 0.34], at: [0, 0.29, 0], color: dark },
    ...limbs({
      upper: body,
      fore: dark,
      hand: 0x22262e,
      thigh: body,
      shin: dark,
      foot: 0x22262e,
      armW: 0.14,
      legW: 0.17,
      props: pr,
    }),
  ];
  return {
    key,
    joints: humanoidJoints(pr),
    parts,
    sockets: humanSockets(0.27, 0.3, 0.34),
    height: 1.9,
    metal: 0.6,
    rough: 0.4,
  };
}

export function mechRig(key: string, rp: RigParams): RigSpec {
  const pr: Proportions = {
    ...HUMAN,
    hipH: 1.05,
    thigh: 0.5,
    shin: 0.52,
    hipW: 0.24,
    shoulderW: 0.5,
    chest: 0.3,
    upperArm: 0.34,
    foreArm: 0.34,
  };
  const body = rp.skin;
  const dark = rp.cloth;
  const stripe = rp.cloth2;
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.6, 0.26, 0.4], at: [0, 0, 0], color: dark },
    { j: J.spine, shape: 'cyl', size: [0.22, 0.26, 0.2, 8], at: [0, 0.02, 0], color: 0x2a2e36 },
    { j: J.chest, shape: 'box', size: [0.9, 0.6, 0.6], at: [0, 0.12, 0], color: body },
    { j: J.chest, shape: 'box', size: [0.92, 0.08, 0.62], at: [0, -0.06, 0], color: stripe },
    {
      j: J.chest,
      shape: 'box',
      size: [0.4, 0.16, 0.04],
      at: [0, 0.24, 0.31],
      color: rp.eye,
      glow: true,
      glowI: 3,
    },
    { j: J.chest, shape: 'box', size: [0.5, 0.5, 0.24], at: [0, 0.14, -0.4], color: dark },
    { j: J.head, shape: 'box', size: [0.3, 0.16, 0.28], at: [0, 0.02, 0.1], color: dark },
    {
      j: J.head,
      shape: 'box',
      size: [0.2, 0.05, 0.02],
      at: [0, 0.04, 0.25],
      color: rp.eye,
      glow: true,
      glowI: 3.5,
    },
    { j: J.upperArmL, shape: 'box', size: [0.3, 0.3, 0.36], at: [0.06, 0, 0], color: stripe },
    { j: J.upperArmR, shape: 'box', size: [0.3, 0.3, 0.36], at: [-0.06, 0, 0], color: stripe },
    { j: J.upperArmL, shape: 'box', size: [0.2, 0.3, 0.2], at: [0.02, -0.18, 0], color: body },
    { j: J.upperArmR, shape: 'box', size: [0.2, 0.3, 0.2], at: [-0.02, -0.18, 0], color: body },
    { j: J.foreArmL, shape: 'box', size: [0.26, 0.34, 0.26], at: [0, -0.16, 0], color: dark },
    { j: J.foreArmR, shape: 'cyl', size: [0.1, 0.1, 0.5, 8], at: [0, -0.26, 0], color: 0x3a3e46 },
    { j: J.foreArmR, shape: 'cyl', size: [0.14, 0.14, 0.18, 8], at: [0, -0.08, 0], color: dark },
    { j: J.chest, shape: 'box', size: [0.18, 0.18, 0.5], at: [0.42, 0.42, 0.06], color: dark },
    { j: J.chest, shape: 'box', size: [0.18, 0.18, 0.5], at: [-0.42, 0.42, 0.06], color: dark },
    { j: J.thighL, shape: 'box', size: [0.26, 0.46, 0.3], at: [0, -0.25, 0], color: body },
    { j: J.thighR, shape: 'box', size: [0.26, 0.46, 0.3], at: [0, -0.25, 0], color: body },
    { j: J.shinL, shape: 'box', size: [0.28, 0.5, 0.32], at: [0, -0.26, -0.02], color: dark },
    { j: J.shinR, shape: 'box', size: [0.28, 0.5, 0.32], at: [0, -0.26, -0.02], color: dark },
    { j: J.shinL, shape: 'box', size: [0.26, 0.12, 0.2], at: [0, 0.02, 0.1], color: stripe },
    { j: J.shinR, shape: 'box', size: [0.26, 0.12, 0.2], at: [0, 0.02, 0.1], color: stripe },
    { j: J.footL, shape: 'box', size: [0.34, 0.12, 0.5], at: [0, 0.04, 0.06], color: 0x22262e },
    { j: J.footR, shape: 'box', size: [0.34, 0.12, 0.5], at: [0, 0.04, 0.06], color: 0x22262e },
  ];
  const sockets = humanSockets(0.16, 0.28, 0.6);
  sockets.muzzle = { j: J.foreArmR, at: [0, -0.52, 0] };
  sockets.flame = { j: J.foreArmL, at: [0, -0.36, 0.1] };
  return { key, joints: humanoidJoints(pr), parts, sockets, height: 2.4, metal: 0.6, rough: 0.45 };
}

// ---------------------------------------------------------------------------
// Drone (esqueleto próprio)
// ---------------------------------------------------------------------------
export const DJ = { root: 0, body: 1, rotorL: 2, rotorR: 3, eye: 4 } as const;

export function droneRig(key: string, rp: RigParams): RigSpec {
  const joints = [
    { name: 'root' as const, parent: -1, offset: [0, 0, 0] as [number, number, number] },
    { name: 'hips' as const, parent: 0, offset: [0, 0.3, 0] as [number, number, number] },
    { name: 'spine' as const, parent: 1, offset: [0.42, 0.12, 0] as [number, number, number] },
    { name: 'chest' as const, parent: 1, offset: [-0.42, 0.12, 0] as [number, number, number] },
    { name: 'neck' as const, parent: 1, offset: [0, -0.02, 0.22] as [number, number, number] },
  ];
  const parts: PartSpec[] = [
    { j: DJ.body, shape: 'ico', size: [0.24, 0], at: [0, 0, 0], color: rp.skin },
    { j: DJ.body, shape: 'box', size: [0.84, 0.05, 0.1], at: [0, 0.1, 0], color: rp.cloth },
    { j: DJ.body, shape: 'box', size: [0.06, 0.18, 0.06], at: [0, -0.24, 0], color: rp.cloth },
    { j: DJ.rotorL, shape: 'box', size: [0.5, 0.015, 0.06], at: [0, 0, 0], color: 0x1a1a1a },
    { j: DJ.rotorR, shape: 'box', size: [0.5, 0.015, 0.06], at: [0, 0, 0], color: 0x1a1a1a },
    { j: DJ.rotorL, shape: 'cyl', size: [0.04, 0.04, 0.06, 6], at: [0, -0.03, 0], color: rp.cloth },
    { j: DJ.rotorR, shape: 'cyl', size: [0.04, 0.04, 0.06, 6], at: [0, -0.03, 0], color: rp.cloth },
    { j: DJ.eye, shape: 'sphere', size: [0.075, 6, 4], at: [0, 0, 0], color: rp.eye, glow: true, glowI: 4 },
    {
      j: DJ.body,
      shape: 'box',
      size: [0.06, 0.03, 0.03],
      at: [0.2, 0.12, 0],
      color: rp.cloth2,
      glow: true,
      glowI: 3,
    },
  ];
  return {
    key,
    joints: joints as never,
    parts,
    sockets: { muzzle: { j: DJ.eye, at: [0, 0, 0.08] }, head_top: { j: DJ.body, at: [0, 0.14, 0] } },
    height: 0.6,
    metal: 0.6,
    rough: 0.4,
  };
}

/** Escolhe o rig de uma definição de inimigo (com variante). */
export function enemyRig(defId: string, rp: RigParams, variant: number): RigSpec {
  const v = rp.variants ? variant % rp.variants : 0;
  const key = `${defId}:${v}`;
  switch (rp.kind) {
    case 'humanoid':
      return zombieRig(key, rp, v);
    case 'robot':
      return soldierRig(key, rp);
    case 'mech':
      return mechRig(key, rp);
    case 'drone':
      return droneRig(key, rp);
  }
}
