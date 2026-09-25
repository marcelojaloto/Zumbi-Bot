import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const METAL = 0x3a3e48;
const DARK = 0x1c1e24;
const STEEL = 0x6a707c;
const CORE = 0x40e0ff;
const RED = 0xff2a3a;
const FLESH = 0x8a3a4a;
const BONE = 0xd8d0b8;

/** Espigão metálico. */
function spike(j: number, at: [number, number, number], rot: [number, number, number], s = 1): PartSpec {
  return { j, shape: 'cone', size: [0.045 * s, 0.24 * s, 4], at, rot, color: STEEL };
}

/** Cabo/tubo fino entre dois pontos aproximados (cilindro inclinado). */
function cable(
  j: number,
  at: [number, number, number],
  len: number,
  rot: [number, number, number],
): PartSpec {
  return { j, shape: 'cyl', size: [0.022, 0.022, len, 5], at, rot, color: DARK };
}

/**
 * OMEGA-Z: zumbi colossal fundido a uma carcaça de guerra. Meia caveira de metal com olho
 * vermelho, cérebro exposto com antena, reator azul no peito, ombreiras com espigões, braço
 * direito-canhão com punho de pistão, garras de osso na esquerda, chaminés nas costas e
 * pernas reforçadas por pistões.
 */
export const omegaExtra: BossExtra = (_s, d) => {
  const bulk = d.rig.bulk ?? 1;
  const cw = 0.42 * bulk;
  const cd = 0.26 * bulk;
  const fz = cd / 2;
  return [
    // --- cabeça: meia caveira cibernética, cérebro exposto, mandíbula de aço
    { j: J.head, shape: 'box', size: [0.14, 0.29, 0.285], at: [0.075, 0.145, 0.005], color: METAL },
    { j: J.head, shape: 'sphere', size: [0.055], at: [0.08, 0.165, 0.15], color: RED, glow: true, glowI: 6 },
    { j: J.head, shape: 'torus', size: [0.06, 0.014], at: [0.08, 0.165, 0.148], color: STEEL },
    { j: J.head, shape: 'ico', size: [0.11, 1], at: [-0.045, 0.3, -0.01], color: 0xb45a74, jitter: 0.25 },
    { j: J.head, shape: 'box', size: [0.2, 0.06, 0.1], at: [0, 0.005, 0.11], color: STEEL },
    {
      j: J.head,
      shape: 'box',
      size: [0.16, 0.02, 0.02],
      at: [0, 0.04, 0.165],
      color: RED,
      glow: true,
      glowI: 3,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.012, 0.016, 0.34, 4],
      at: [0.1, 0.46, -0.06],
      rot: [-0.25, 0, -0.2],
      color: STEEL,
    },
    { j: J.head, shape: 'sphere', size: [0.03], at: [0.135, 0.63, -0.1], color: RED, glow: true, glowI: 5 },
    spike(J.head, [0.12, 0.28, -0.08], [-0.6, 0, -0.5], 0.8),
    // --- peito: couraça, reator e costelas expostas
    { j: J.chest, shape: 'box', size: [cw * 1.04, 0.2, 0.05], at: [0, 0.12, fz + 0.02], color: METAL },
    { j: J.chest, shape: 'box', size: [cw * 0.5, 0.1, 0.05], at: [0.06, -0.06, fz + 0.02], color: DARK },
    { j: J.chest, shape: 'torus', size: [0.1, 0.028], at: [0, 0.03, fz + 0.05], color: STEEL },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.08],
      at: [0, 0.03, fz + 0.05],
      color: CORE,
      glow: true,
      glowI: 6,
    },
    { j: J.chest, shape: 'box', size: [0.05, 0.14, 0.03], at: [-cw * 0.42, -0.06, fz + 0.01], color: FLESH },
    { j: J.chest, shape: 'box', size: [0.1, 0.018, 0.03], at: [-cw * 0.36, -0.03, fz + 0.03], color: BONE },
    { j: J.chest, shape: 'box', size: [0.1, 0.018, 0.03], at: [-cw * 0.36, -0.08, fz + 0.03], color: BONE },
    { j: J.chest, shape: 'box', size: [0.1, 0.018, 0.03], at: [-cw * 0.36, -0.13, fz + 0.03], color: BONE },
    // --- costas: chaminés com brasa, espinha de espigões, cabos até a cabeça
    { j: J.chest, shape: 'cyl', size: [0.05, 0.065, 0.42, 6], at: [0.12, 0.3, -fz - 0.06], color: METAL },
    { j: J.chest, shape: 'cyl', size: [0.05, 0.065, 0.36, 6], at: [-0.12, 0.26, -fz - 0.06], color: METAL },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.04, 0.04, 0.03, 6],
      at: [0.12, 0.52, -fz - 0.06],
      color: RED,
      glow: true,
      glowI: 4,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.04, 0.04, 0.03, 6],
      at: [-0.12, 0.45, -fz - 0.06],
      color: RED,
      glow: true,
      glowI: 4,
    },
    spike(J.chest, [0, 0.1, -fz - 0.04], [-1.1, 0, 0], 1.1),
    spike(J.spine, [0, 0.02, -0.14], [-1.2, 0, 0]),
    spike(J.hips, [0, 0.02, -0.14], [-1.3, 0, 0], 0.8),
    cable(J.chest, [0.06, 0.26, -fz + 0.02], 0.3, [0.5, 0, 0.2]),
    cable(J.chest, [-0.07, 0.26, -fz + 0.02], 0.3, [0.5, 0, -0.2]),
    // --- ombreiras com espigões
    { j: J.upperArmL, shape: 'box', size: [0.22, 0.13, 0.26], at: [0.04, 0.05, 0], color: METAL },
    { j: J.upperArmR, shape: 'box', size: [0.22, 0.13, 0.26], at: [-0.04, 0.05, 0], color: METAL },
    spike(J.upperArmL, [0.08, 0.16, 0.04], [0, 0, -0.5]),
    spike(J.upperArmL, [0.08, 0.16, -0.07], [0, 0, -0.6]),
    spike(J.upperArmR, [-0.08, 0.16, 0.04], [0, 0, 0.5]),
    spike(J.upperArmR, [-0.08, 0.16, -0.07], [0, 0, 0.6]),
    // --- braço direito: canhão de plasma e punho de pistão
    { j: J.foreArmR, shape: 'cyl', size: [0.1, 0.12, 0.34, 8], at: [0, -0.13, 0], color: METAL },
    {
      j: J.foreArmR,
      shape: 'torus',
      size: [0.11, 0.02],
      at: [0, -0.06, 0],
      rot: [Math.PI / 2, 0, 0],
      color: STEEL,
    },
    {
      j: J.foreArmR,
      shape: 'torus',
      size: [0.11, 0.02],
      at: [0, -0.2, 0],
      rot: [Math.PI / 2, 0, 0],
      color: STEEL,
    },
    {
      j: J.foreArmR,
      shape: 'box',
      size: [0.05, 0.2, 0.04],
      at: [0, -0.13, 0.12],
      color: CORE,
      glow: true,
      glowI: 3,
    },
    { j: J.handR, shape: 'box', size: [0.2, 0.18, 0.22], at: [0, -0.07, 0.01], color: STEEL },
    { j: J.handR, shape: 'box', size: [0.21, 0.03, 0.23], at: [0, -0.02, 0.01], color: DARK },
    // --- braço esquerdo: carne exposta e garras de osso
    {
      j: J.foreArmL,
      shape: 'box',
      size: [0.12, 0.22, 0.12],
      at: [0, -0.12, 0.02],
      color: FLESH,
      jitter: 0.2,
    },
    {
      j: J.handL,
      shape: 'cone',
      size: [0.03, 0.24, 4],
      at: [0.05, -0.2, 0.05],
      rot: [Math.PI - 0.2, 0, 0],
      color: BONE,
    },
    {
      j: J.handL,
      shape: 'cone',
      size: [0.03, 0.26, 4],
      at: [0, -0.21, 0.06],
      rot: [Math.PI - 0.2, 0, 0],
      color: BONE,
    },
    {
      j: J.handL,
      shape: 'cone',
      size: [0.03, 0.24, 4],
      at: [-0.05, -0.2, 0.05],
      rot: [Math.PI - 0.2, 0, 0],
      color: BONE,
    },
    // --- quadril e pernas: cinturão, joelheiras e pistões
    { j: J.hips, shape: 'box', size: [0.34 * bulk, 0.07, 0.24 * bulk], at: [0, 0.07, 0], color: DARK },
    {
      j: J.hips,
      shape: 'box',
      size: [0.1, 0.06, 0.03],
      at: [0, 0.07, 0.13 * bulk],
      color: RED,
      glow: true,
      glowI: 2.5,
    },
    { j: J.shinL, shape: 'box', size: [0.16, 0.14, 0.08], at: [0, -0.02, 0.07], color: METAL },
    { j: J.shinR, shape: 'box', size: [0.16, 0.14, 0.08], at: [0, -0.02, 0.07], color: METAL },
    { j: J.thighL, shape: 'cyl', size: [0.03, 0.03, 0.34, 5], at: [0.09, -0.2, -0.03], color: STEEL },
    { j: J.thighR, shape: 'cyl', size: [0.03, 0.03, 0.34, 5], at: [-0.09, -0.2, -0.03], color: STEEL },
    { j: J.footL, shape: 'box', size: [0.16, 0.08, 0.3], at: [0, 0.0, 0.05], color: DARK },
    { j: J.footR, shape: 'box', size: [0.16, 0.08, 0.3], at: [0, 0.0, 0.05], color: DARK },
  ];
};
