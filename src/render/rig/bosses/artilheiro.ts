import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const MAGMA = 0xff5a10;
const CORE = 0xffd87a;
const WHITE = 0xf2f2ea;
const BLACK = 0x14161c;
const HORN = 0x3a0c0c;

function flame(j: number, at: [number, number, number], s: number, lean = 0): PartSpec[] {
  return [
    {
      j,
      shape: 'cone',
      size: [0.09 * s, 0.34 * s, 5],
      at,
      rot: [0, 0, lean],
      color: MAGMA,
      glow: true,
      glowI: 2.6,
    },
    {
      j,
      shape: 'cone',
      size: [0.05 * s, 0.22 * s, 5],
      at: [at[0], at[1] - 0.04 * s, at[2] + 0.02],
      rot: [0, 0, lean],
      color: CORE,
      glow: true,
      glowI: 3.6,
    },
  ];
}

/** Camisa listrada com o 9 nas costas, braçadeira de capitão, chifres, moicano de fogo e a chuteira em chamas. */
export const artilheiroExtra: BossExtra = (_s, d) => {
  const bulk = d.rig.bulk ?? 1;
  const cw = 0.42 * bulk;
  const cd = 0.26 * bulk;
  const fz = cd / 2 + 0.008;
  const bz = -cd / 2 - 0.008;
  const num = (at: [number, number, number], size: [number, number, number]): PartSpec => ({
    j: J.chest,
    shape: 'box',
    size,
    at,
    color: WHITE,
  });
  const parts: PartSpec[] = [
    // listras e gola
    { j: J.chest, shape: 'box', size: [0.07, 0.34, 0.014], at: [-0.18, 0.05, fz], color: BLACK },
    { j: J.chest, shape: 'box', size: [0.07, 0.34, 0.014], at: [0, 0.05, fz], color: BLACK },
    { j: J.chest, shape: 'box', size: [0.07, 0.34, 0.014], at: [0.18, 0.05, fz], color: BLACK },
    { j: J.chest, shape: 'box', size: [cw * 0.5, 0.04, cd + 0.02], at: [0, 0.215, 0], color: WHITE },
    // o 9 (visto de trás)
    num([0, 0.17, bz], [0.14, 0.03, 0.012]),
    num([0, 0.06, bz], [0.14, 0.03, 0.012]),
    num([0, -0.05, bz], [0.14, 0.03, 0.012]),
    num([0.055, 0.06, bz], [0.03, 0.25, 0.012]),
    num([-0.055, 0.115, bz], [0.03, 0.14, 0.012]),
    // braçadeira de capitão
    {
      j: J.upperArmL,
      shape: 'box',
      size: [0.16, 0.05, 0.16],
      at: [0, -0.12, 0],
      color: 0xffd23a,
      glow: true,
      glowI: 1.4,
    },
    // meiões e caneleiras
    { j: J.shinL, shape: 'box', size: [0.2, 0.26, 0.2], at: [0, -0.27, 0], color: WHITE },
    { j: J.shinR, shape: 'box', size: [0.2, 0.26, 0.2], at: [0, -0.27, 0], color: WHITE },
    { j: J.shinL, shape: 'box', size: [0.21, 0.04, 0.21], at: [0, -0.17, 0], color: BLACK },
    { j: J.shinR, shape: 'box', size: [0.21, 0.04, 0.21], at: [0, -0.17, 0], color: BLACK },
    // chuteira direita em brasa
    {
      j: J.footR,
      shape: 'box',
      size: [0.2, 0.12, 0.32],
      at: [0, 0.03, 0.07],
      color: MAGMA,
      glow: true,
      glowI: 2.6,
    },
    ...flame(J.shinR, [0.09, -0.3, 0.06], 0.8, -0.3),
    ...flame(J.shinR, [-0.09, -0.32, 0.04], 0.7, 0.3),
    ...flame(J.shinR, [0, -0.28, -0.1], 0.7),
    // rachaduras de brasa no peito
    {
      j: J.chest,
      shape: 'box',
      size: [0.026, 0.2, 0.012],
      at: [0.09, 0.02, fz + 0.008],
      rot: [0, 0, 0.5],
      color: MAGMA,
      glow: true,
      glowI: 3,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.026, 0.16, 0.012],
      at: [-0.1, -0.02, fz + 0.008],
      rot: [0, 0, -0.6],
      color: MAGMA,
      glow: true,
      glowI: 3,
    },
    // chifres
    {
      j: J.head,
      shape: 'cone',
      size: [0.045, 0.2, 5],
      at: [0.12, 0.34, 0.02],
      rot: [0, 0, -0.5],
      color: HORN,
    },
    {
      j: J.head,
      shape: 'cone',
      size: [0.045, 0.2, 5],
      at: [-0.12, 0.34, 0.02],
      rot: [0, 0, 0.5],
      color: HORN,
    },
    // boca em brasa
    {
      j: J.head,
      shape: 'box',
      size: [0.14, 0.035, 0.02],
      at: [0, 0.07, 0.146],
      color: MAGMA,
      glow: true,
      glowI: 3,
    },
    // moicano de fogo e ombros
    ...flame(J.head, [0, 0.46, 0.08], 1),
    ...flame(J.head, [0, 0.48, -0.01], 1.3),
    ...flame(J.head, [0, 0.44, -0.1], 1),
    ...flame(J.upperArmL, [0.05, 0.26, 0], 0.9, -0.25),
    ...flame(J.upperArmR, [-0.05, 0.26, 0], 0.9, 0.25),
  ];
  return parts;
};
