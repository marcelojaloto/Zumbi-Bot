import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import { skateboard } from '../enemies/praca';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const GOLD = 0xd8b040;
const PAD = 0x16161c;
const NEON = 0xff3ad7;

/** Rei do Half-Pipe: skate sob os pés, capacete com coroa, bandana, proteções, grafite no peito e um skate na mão. */
export const halfpipeExtra: BossExtra = (_s, d) => {
  const bulk = d.rig.bulk ?? 1;
  const fz = (0.26 * bulk) / 2 + 0.008;
  const parts: PartSpec[] = [
    ...skateboard(1.15, 0.36, 0x1c1c22, d.rig.eye),
    // capacete e coroa
    { j: J.head, shape: 'sphere', size: [0.185, 9, 6], at: [0, 0.23, 0], color: PAD },
    {
      j: J.head,
      shape: 'box',
      size: [0.28, 0.035, 0.29],
      at: [0, 0.2, 0.01],
      color: d.rig.eye,
      glow: true,
      glowI: 1.4,
    },
    { j: J.head, shape: 'cyl', size: [0.15, 0.17, 0.06, 8], at: [0, 0.36, 0], color: GOLD },
    // bandana
    { j: J.head, shape: 'box', size: [0.265, 0.1, 0.03], at: [0, 0.06, 0.145], color: d.rig.cloth },
    {
      j: J.head,
      shape: 'cone',
      size: [0.07, 0.16, 4],
      at: [0, 0.0, 0.14],
      rot: [Math.PI, 0, 0],
      color: d.rig.cloth,
    },
    // grafite aceso no moletom
    {
      j: J.chest,
      shape: 'box',
      size: [0.03, 0.26, 0.014],
      at: [0.1, 0.05, fz],
      rot: [0, 0, 0.5],
      color: NEON,
      glow: true,
      glowI: 2.4,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.03, 0.22, 0.014],
      at: [-0.02, 0.03, fz],
      rot: [0, 0, -0.45],
      color: NEON,
      glow: true,
      glowI: 2.4,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.03, 0.18, 0.014],
      at: [-0.14, 0.06, fz],
      rot: [0, 0, 0.4],
      color: d.rig.eye,
      glow: true,
      glowI: 2.4,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.26, 0.03, 0.014],
      at: [0, -0.1, fz],
      color: d.rig.eye,
      glow: true,
      glowI: 2,
    },
    // cotoveleiras e joelheiras
    { j: J.foreArmL, shape: 'box', size: [0.17, 0.11, 0.17], at: [0, -0.02, 0], color: PAD },
    { j: J.foreArmR, shape: 'box', size: [0.17, 0.11, 0.17], at: [0, -0.02, 0], color: PAD },
    { j: J.shinL, shape: 'box', size: [0.2, 0.13, 0.09], at: [0, -0.03, 0.09], color: PAD },
    { j: J.shinR, shape: 'box', size: [0.2, 0.13, 0.09], at: [0, -0.03, 0.09], color: PAD },
    {
      j: J.shinL,
      shape: 'box',
      size: [0.1, 0.03, 0.02],
      at: [0, -0.03, 0.14],
      color: NEON,
      glow: true,
      glowI: 2,
    },
    {
      j: J.shinR,
      shape: 'box',
      size: [0.1, 0.03, 0.02],
      at: [0, -0.03, 0.14],
      color: NEON,
      glow: true,
      glowI: 2,
    },
    // skate na mão direita, usado como tábua
    { j: J.handR, shape: 'box', size: [0.24, 0.95, 0.045], at: [0, -0.4, 0.1], color: 0x6a4a2a },
    {
      j: J.handR,
      shape: 'box',
      size: [0.08, 0.7, 0.012],
      at: [0, -0.4, 0.128],
      color: NEON,
      glow: true,
      glowI: 1.6,
    },
  ];
  // rodinhas do skate da mão
  for (const sy of [-0.72, -0.1])
    for (const sx of [-0.1, 0.1])
      parts.push({
        j: J.handR,
        shape: 'cyl',
        size: [0.04, 0.04, 0.04, 8],
        at: [sx, sy, 0.05],
        rot: [0, 0, H],
        color: 0xe8e0d0,
      });
  // pontas da coroa
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push({
      j: J.head,
      shape: 'cone',
      size: [0.03, 0.09, 4],
      at: [Math.cos(a) * 0.14, 0.43, Math.sin(a) * 0.14],
      color: GOLD,
    });
  }
  return parts;
};
