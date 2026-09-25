import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const MAGMA = 0xff5a10;
const HOT = 0xffa02a;
const CORE = 0xffd87a;
const ROCK = 0x241c18;

/** Rachadura de magma (caixa fina emissiva) sobre uma junta. */
function crack(j: number, at: [number, number, number], len: number, rz: number, w = 0.028): PartSpec {
  return { j, shape: 'box', size: [w, len, 0.014], at, rot: [0, 0, rz], color: MAGMA, glow: true, glowI: 3 };
}

/** Labareda (cone externo + núcleo). */
function flame(j: number, at: [number, number, number], s: number, lean = 0): PartSpec[] {
  return [
    { j, shape: 'cone', size: [0.09 * s, 0.34 * s, 5], at, rot: [0, 0, lean], color: MAGMA, glow: true, glowI: 2.6 },
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

/**
 * Colosso Incandescente: pele carbonizada com rachaduras de magma no peito, costas, braços e
 * pernas; coroa de chamas na cabeça, labaredas nos ombros, placas de rocha e punhos em brasa.
 */
export const incandescenteExtra: BossExtra = (_s, d) => {
  const bulk = d.rig.bulk ?? 1;
  const cd = 0.26 * bulk;
  const fz = cd / 2 + 0.008;
  const parts: PartSpec[] = [
    // peito: coração de magma e rachaduras
    { j: J.chest, shape: 'box', size: [0.12, 0.11, 0.02], at: [-0.03, 0.1, fz], color: CORE, glow: true, glowI: 3.6 },
    crack(J.chest, [0.1, 0.06, fz], 0.24, 0.45),
    crack(J.chest, [-0.14, 0.02, fz], 0.2, -0.55),
    crack(J.chest, [0.02, -0.06, fz], 0.2, 1.35),
    crack(J.chest, [0.19, -0.04, fz], 0.14, -0.2, 0.022),
    crack(J.spine, [0.05, 0.02, 0.16], 0.16, 0.3),
    // costas
    crack(J.chest, [0.08, 0.05, -fz], 0.26, -0.4),
    crack(J.chest, [-0.1, 0.0, -fz], 0.22, 0.6),
    // placas de rocha nos ombros
    { j: J.upperArmL, shape: 'ico', size: [0.15, 0], at: [0.05, 0.05, 0], color: ROCK, jitter: 0.2 },
    { j: J.upperArmR, shape: 'ico', size: [0.15, 0], at: [-0.05, 0.05, 0], color: ROCK, jitter: 0.2 },
    { j: J.chest, shape: 'ico', size: [0.16, 0], at: [0, 0.2, -0.16], color: ROCK, jitter: 0.2 },
    // espigões de rocha nas costas
    { j: J.chest, shape: 'cone', size: [0.06, 0.26, 4], at: [0.13, 0.24, -0.22], rot: [-0.6, 0, -0.2], color: ROCK },
    { j: J.chest, shape: 'cone', size: [0.06, 0.3, 4], at: [-0.12, 0.2, -0.23], rot: [-0.6, 0, 0.2], color: ROCK },
    { j: J.chest, shape: 'cone', size: [0.05, 0.22, 4], at: [0, 0.05, -0.24], rot: [-0.8, 0, 0], color: ROCK },
    // braços
    crack(J.upperArmL, [0.01, -0.14, 0.085], 0.2, 0.3, 0.022),
    crack(J.upperArmR, [-0.01, -0.12, 0.085], 0.22, -0.35, 0.022),
    crack(J.foreArmL, [0, -0.12, 0.078], 0.2, -0.25, 0.022),
    crack(J.foreArmR, [0, -0.13, 0.078], 0.2, 0.25, 0.022),
    // punhos em brasa
    { j: J.handL, shape: 'box', size: [0.19, 0.15, 0.2], at: [0, -0.06, 0.01], color: ROCK },
    { j: J.handR, shape: 'box', size: [0.19, 0.15, 0.2], at: [0, -0.06, 0.01], color: ROCK },
    { j: J.handL, shape: 'box', size: [0.2, 0.03, 0.21], at: [0, -0.05, 0.01], color: HOT, glow: true, glowI: 3 },
    { j: J.handR, shape: 'box', size: [0.2, 0.03, 0.21], at: [0, -0.05, 0.01], color: HOT, glow: true, glowI: 3 },
    // pernas
    crack(J.thighL, [0.02, -0.2, 0.1], 0.24, 0.35, 0.022),
    crack(J.thighR, [-0.02, -0.18, 0.1], 0.22, -0.3, 0.022),
    crack(J.shinL, [0, -0.2, 0.095], 0.18, -0.2, 0.02),
    crack(J.shinR, [0, -0.22, 0.095], 0.18, 0.25, 0.02),
    // olhos e boca em brasa
    { j: J.head, shape: 'box', size: [0.065, 0.04, 0.02], at: [0.065, 0.165, 0.145], color: CORE, glow: true, glowI: 4 },
    { j: J.head, shape: 'box', size: [0.065, 0.04, 0.02], at: [-0.065, 0.165, 0.145], color: CORE, glow: true, glowI: 4 },
    { j: J.head, shape: 'box', size: [0.14, 0.035, 0.02], at: [0, 0.07, 0.146], color: MAGMA, glow: true, glowI: 3 },
    crack(J.head, [0.08, 0.22, 0.146], 0.1, 0.5, 0.018),
    // coroa de chamas e labaredas nos ombros e costas
    ...flame(J.head, [0, 0.46, -0.01], 1.3),
    ...flame(J.head, [0.08, 0.4, 0.02], 0.9, -0.3),
    ...flame(J.head, [-0.08, 0.41, 0.0], 1, 0.3),
    ...flame(J.head, [0.02, 0.38, -0.1], 0.8, 0),
    ...flame(J.upperArmL, [0.05, 0.28, 0], 1, -0.25),
    ...flame(J.upperArmR, [-0.05, 0.28, 0], 1, 0.25),
    ...flame(J.chest, [0.12, 0.42, -0.2], 0.9, -0.2),
    ...flame(J.chest, [-0.1, 0.4, -0.2], 1.1, 0.2),
  ];
  return parts;
};
