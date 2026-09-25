import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const TRACK = 0x1a1c1e;
const TREAD = 0x33363a;
const STEEL = 0x3a4652;
const ICE = 0x9fe8ff;
const ICE_CORE = 0xdff8ff;
const FROST = 0xc8e4ee;
const GOLD = 0xc8a040;
const CAP = 0x2e3a2a;

/** Esteira de tanque na lateral externa da canela (sx = +1 esquerda, -1 direita). */
function track(j: number, sx: number): PartSpec[] {
  const x = sx * 0.2;
  const parts: PartSpec[] = [
    { j, shape: 'box', size: [0.14, 0.66, 0.62], at: [x, -0.24, 0], color: TRACK },
  ];
  for (let i = 0; i < 7; i++)
    parts.push({ j, shape: 'box', size: [0.16, 0.035, 0.64], at: [x, -0.54 + i * 0.1, 0], color: TREAD });
  for (const [y, z] of [
    [-0.48, 0.2],
    [-0.48, -0.2],
    [0.02, 0.2],
    [0.02, -0.2],
  ] as const)
    parts.push({ j, shape: 'cyl', size: [0.11, 0.11, 0.05, 8], at: [x + sx * 0.08, y, z], rot: [0, 0, H], color: 0x4a4e52 });
  return parts;
}

/** Cristal de gelo emissivo. */
function crystal(j: number, at: [number, number, number], r: number, rot: [number, number, number] = [0, 0, 0]): PartSpec {
  return { j, shape: 'oct', size: [r, 0], at, rot, color: 0x7ad0f0, glow: true, glowI: 1.1 };
}

/**
 * General Criotanque: mech pesado com esteiras nas pernas, canhão criogênico no braço direito,
 * metralhadora giratória no esquerdo, respiros de gelo, quepe de oficial com dragonas e medalhas,
 * cristais de gelo brotando da blindagem.
 */
export const criotanqueExtra: BossExtra = () => [
  // esteiras e pés largos
  ...track(J.shinL, 1),
  ...track(J.shinR, -1),
  { j: J.footL, shape: 'box', size: [0.46, 0.16, 0.72], at: [0.04, 0.06, 0.06], color: TRACK },
  { j: J.footR, shape: 'box', size: [0.46, 0.16, 0.72], at: [-0.04, 0.06, 0.06], color: TRACK },
  // canhão criogênico (braço direito)
  { j: J.foreArmR, shape: 'cyl', size: [0.2, 0.23, 0.92, 10], at: [0, -0.44, 0.04], color: STEEL },
  { j: J.foreArmR, shape: 'cyl', size: [0.25, 0.25, 0.06, 10], at: [0, -0.2, 0.04], color: ICE, glow: true, glowI: 1.8 },
  { j: J.foreArmR, shape: 'cyl', size: [0.24, 0.24, 0.06, 10], at: [0, -0.56, 0.04], color: ICE, glow: true, glowI: 1.8 },
  { j: J.foreArmR, shape: 'cyl', size: [0.23, 0.2, 0.1, 10], at: [0, -0.93, 0.04], color: 0x22282e },
  { j: J.foreArmR, shape: 'cyl', size: [0.15, 0.15, 0.04, 10], at: [0, -0.99, 0.04], color: ICE_CORE, glow: true, glowI: 3.5 },
  { j: J.foreArmR, shape: 'box', size: [0.1, 0.5, 0.12], at: [0, -0.4, 0.26], color: 0x2c322c },
  // metralhadora giratória (braço esquerdo)
  { j: J.foreArmL, shape: 'cyl', size: [0.14, 0.14, 0.22, 8], at: [0, -0.34, 0.02], color: 0x2a2e32 },
  { j: J.foreArmL, shape: 'cyl', size: [0.035, 0.035, 0.62, 5], at: [0.06, -0.62, 0.08], color: 0x3a3e44 },
  { j: J.foreArmL, shape: 'cyl', size: [0.035, 0.035, 0.62, 5], at: [-0.06, -0.62, 0.08], color: 0x3a3e44 },
  { j: J.foreArmL, shape: 'cyl', size: [0.035, 0.035, 0.62, 5], at: [0.06, -0.62, -0.04], color: 0x3a3e44 },
  { j: J.foreArmL, shape: 'cyl', size: [0.035, 0.035, 0.62, 5], at: [-0.06, -0.62, -0.04], color: 0x3a3e44 },
  { j: J.foreArmL, shape: 'cyl', size: [0.12, 0.12, 0.04, 8], at: [0, -0.86, 0.02], color: 0x2a2e32 },
  { j: J.foreArmL, shape: 'box', size: [0.2, 0.26, 0.16], at: [0.2, -0.22, 0], color: 0x4a5236 },
  { j: J.foreArmL, shape: 'box', size: [0.06, 0.3, 0.1], at: [0.12, -0.42, 0.04], color: 0xb08a4a },
  // tanques de refrigerante nas costas e respiros de gelo
  { j: J.chest, shape: 'cyl', size: [0.13, 0.13, 0.62, 8], at: [0.17, 0.18, -0.58], color: STEEL },
  { j: J.chest, shape: 'cyl', size: [0.13, 0.13, 0.62, 8], at: [-0.17, 0.18, -0.58], color: STEEL },
  { j: J.chest, shape: 'box', size: [0.05, 0.36, 0.02], at: [0.17, 0.18, -0.715], color: ICE, glow: true, glowI: 2 },
  { j: J.chest, shape: 'box', size: [0.05, 0.36, 0.02], at: [-0.17, 0.18, -0.715], color: ICE, glow: true, glowI: 2 },
  { j: J.chest, shape: 'box', size: [0.04, 0.22, 0.34], at: [0.465, 0.12, 0], color: ICE, glow: true, glowI: 2.2 },
  { j: J.chest, shape: 'box', size: [0.04, 0.22, 0.34], at: [-0.465, 0.12, 0], color: ICE, glow: true, glowI: 2.2 },
  { j: J.chest, shape: 'box', size: [0.3, 0.03, 0.02], at: [0, 0.02, 0.31], color: ICE, glow: true, glowI: 1.6 },
  { j: J.chest, shape: 'box', size: [0.3, 0.03, 0.02], at: [0, -0.05, 0.31], color: ICE, glow: true, glowI: 1.6 },
  // medalhas e insígnia
  { j: J.chest, shape: 'box', size: [0.06, 0.08, 0.02], at: [0.3, 0.1, 0.31], color: GOLD },
  { j: J.chest, shape: 'box', size: [0.06, 0.08, 0.02], at: [0.22, 0.1, 0.31], color: 0xb03a2a },
  { j: J.chest, shape: 'box', size: [0.06, 0.08, 0.02], at: [0.14, 0.1, 0.31], color: 0x3a6ab0 },
  { j: J.chest, shape: 'box', size: [0.24, 0.03, 0.02], at: [0.22, 0.16, 0.31], color: 0x6a1a1a },
  // dragonas douradas
  { j: J.upperArmL, shape: 'box', size: [0.32, 0.05, 0.34], at: [0.06, 0.17, 0], color: GOLD },
  { j: J.upperArmR, shape: 'box', size: [0.32, 0.05, 0.34], at: [-0.06, 0.17, 0], color: GOLD },
  { j: J.upperArmL, shape: 'box', size: [0.04, 0.1, 0.3], at: [0.22, 0.1, 0], color: GOLD },
  { j: J.upperArmR, shape: 'box', size: [0.04, 0.1, 0.3], at: [-0.22, 0.1, 0], color: GOLD },
  // quepe de oficial
  { j: J.head, shape: 'box', size: [0.36, 0.1, 0.34], at: [0, 0.14, 0.1], color: 0x1a1c1a },
  { j: J.head, shape: 'box', size: [0.42, 0.1, 0.4], at: [0, 0.22, 0.1], color: CAP },
  { j: J.head, shape: 'box', size: [0.44, 0.03, 0.42], at: [0, 0.275, 0.1], color: CAP },
  { j: J.head, shape: 'box', size: [0.36, 0.025, 0.16], at: [0, 0.1, 0.32], rot: [0.25, 0, 0], color: 0x0e0e0e },
  { j: J.head, shape: 'box', size: [0.1, 0.07, 0.02], at: [0, 0.21, 0.305], color: GOLD, glow: true, glowI: 1.4 },
  { j: J.head, shape: 'box', size: [0.38, 0.015, 0.02], at: [0, 0.155, 0.28], color: GOLD },
  // geada e cristais de gelo
  { j: J.chest, shape: 'box', size: [0.6, 0.03, 0.4], at: [0, 0.43, 0], color: FROST },
  { j: J.chest, shape: 'box', size: [0.2, 0.03, 0.52], at: [0.42, 0.52, 0.06], color: FROST },
  { j: J.chest, shape: 'box', size: [0.2, 0.03, 0.52], at: [-0.42, 0.52, 0.06], color: FROST },
  crystal(J.chest, [0.44, 0.64, -0.04], 0.14, [0.3, 0.4, 0.2]),
  crystal(J.chest, [0.36, 0.6, 0.12], 0.09, [0.5, 0, -0.4]),
  crystal(J.chest, [-0.44, 0.66, -0.02], 0.16, [0.2, 0.7, -0.2]),
  crystal(J.chest, [0, 0.5, -0.5], 0.18, [0.4, 0.3, 0]),
  crystal(J.chest, [0.14, 0.58, -0.44], 0.11, [0.2, 0, 0.5]),
  crystal(J.chest, [-0.16, 0.56, -0.46], 0.12, [0.6, 0.2, -0.3]),
  crystal(J.hips, [0.3, 0.02, 0.1], 0.09, [0.3, 0.3, 0.6]),
  crystal(J.upperArmR, [-0.18, 0.2, -0.08], 0.1, [0.4, 0, 0.3]),
];
