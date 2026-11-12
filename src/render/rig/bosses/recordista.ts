import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const WHITE = 0xf2efe6;
const DARK = 0x16161e;
const GOLD = 0xffd23a;
const LAUREL = 0x3f8a3a;

/** O Recordista: número 1 no peito, medalha de ouro, coroa de louros, faixas nos pulsos e sapatilhas amarelas. */
export const recordistaExtra: BossExtra = (_s, d) => {
  const cd = 0.26 * (d.rig.bulk ?? 1);
  const fz = cd / 2 + 0.014;
  const parts: PartSpec[] = [
    // número de peito, na frente e nas costas
    { j: J.chest, shape: 'box', size: [0.3, 0.2, 0.02], at: [0, 0.12, fz], color: WHITE },
    { j: J.chest, shape: 'box', size: [0.05, 0.14, 0.02], at: [0, 0.12, fz + 0.008], color: DARK },
    { j: J.chest, shape: 'box', size: [0.3, 0.2, 0.02], at: [0, 0.1, -fz], color: WHITE },
    { j: J.chest, shape: 'box', size: [0.05, 0.14, 0.02], at: [0, 0.1, -fz - 0.008], color: DARK },
    // medalha: fita em V e o disco
    {
      j: J.chest,
      shape: 'box',
      size: [0.03, 0.26, 0.015],
      at: [0.06, 0.02, fz + 0.016],
      rot: [0, 0, 0.42],
      color: 0x2a6ad8,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.03, 0.26, 0.015],
      at: [-0.06, 0.02, fz + 0.016],
      rot: [0, 0, -0.42],
      color: 0x2a6ad8,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.07, 0.07, 0.02, 10],
      at: [0, -0.11, fz + 0.02],
      rot: [H, 0, 0],
      color: GOLD,
      glow: true,
      glowI: 1.4,
    },
    // coroa de louros
    { j: J.head, shape: 'torus', size: [0.16, 0.028], at: [0, 0.27, 0], rot: [H, 0, 0], color: LAUREL },
    // faixas nos pulsos
    { j: J.foreArmL, shape: 'box', size: [0.13, 0.07, 0.13], at: [0, -0.2, 0], color: WHITE },
    { j: J.foreArmR, shape: 'box', size: [0.13, 0.07, 0.13], at: [0, -0.2, 0], color: WHITE },
    // sapatilhas de velocista
    { j: J.footL, shape: 'box', size: [0.16, 0.1, 0.32], at: [0, 0.04, 0.06], color: GOLD },
    { j: J.footR, shape: 'box', size: [0.16, 0.1, 0.32], at: [0, 0.04, 0.06], color: GOLD },
    { j: J.footL, shape: 'box', size: [0.165, 0.03, 0.2], at: [0, 0.05, 0.06], color: 0xd8302a },
    { j: J.footR, shape: 'box', size: [0.165, 0.03, 0.2], at: [0, 0.05, 0.06], color: 0xd8302a },
  ];
  // folhas da coroa
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    parts.push({
      j: J.head,
      shape: 'cone',
      size: [0.03, 0.09, 4],
      at: [Math.cos(a) * 0.16, 0.31, Math.sin(a) * 0.16],
      color: LAUREL,
    });
  }
  return parts;
};
