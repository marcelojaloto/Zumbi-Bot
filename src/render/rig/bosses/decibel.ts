import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const BLACK = 0x101014;
const GOLD = 0xd8b040;
const PINK = 0xff3ad8;
const EQ = [0x3aff7a, 0x3aff7a, 0xffd23a, 0xffd23a, 0xff3a3a];

/** DJ Decibel: fones, visor aceso, moicano neon, corrente, equalizador no peito, caixa de som nas costas e o vinil. */
export const decibelExtra: BossExtra = (_s, d) => {
  const bulk = d.rig.bulk ?? 1;
  const cd = 0.26 * bulk;
  const front = cd / 2;
  const back = -cd / 2;
  const parts: PartSpec[] = [
    // fones
    {
      j: J.head,
      shape: 'cyl',
      size: [0.095, 0.095, 0.07, 10],
      at: [0.16, 0.16, 0],
      rot: [0, 0, H],
      color: BLACK,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.095, 0.095, 0.07, 10],
      at: [-0.16, 0.16, 0],
      rot: [0, 0, H],
      color: BLACK,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.05, 0.05, 0.075, 8],
      at: [0.165, 0.16, 0],
      rot: [0, 0, H],
      color: PINK,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.05, 0.05, 0.075, 8],
      at: [-0.165, 0.16, 0],
      rot: [0, 0, H],
      color: PINK,
    },
    { j: J.head, shape: 'torus', size: [0.16, 0.028], at: [0, 0.17, 0], color: BLACK },
    // visor
    {
      j: J.head,
      shape: 'box',
      size: [0.27, 0.07, 0.03],
      at: [0, 0.165, 0.15],
      color: d.rig.eye,
      glow: true,
      glowI: 3.5,
    },
    // corrente e medalhão
    {
      j: J.chest,
      shape: 'torus',
      size: [0.12, 0.018],
      at: [0, 0.13, front + 0.01],
      rot: [0.3, 0, 0],
      color: GOLD,
    },
    { j: J.chest, shape: 'box', size: [0.08, 0.08, 0.02], at: [0, 0, front + 0.03], color: GOLD },
    // caixa de som nas costas
    { j: J.chest, shape: 'box', size: [0.52, 0.52, 0.24], at: [0, 0.05, back - 0.13], color: 0x1a1a20 },
    { j: J.chest, shape: 'box', size: [0.54, 0.05, 0.26], at: [0, 0.3, back - 0.13], color: 0x9aa0a8 },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.11, 0.11, 0.02, 10],
      at: [0.12, 0.1, back - 0.255],
      rot: [H, 0, 0],
      color: 0x3a3a44,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.11, 0.11, 0.02, 10],
      at: [-0.12, 0.1, back - 0.255],
      rot: [H, 0, 0],
      color: 0x3a3a44,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.3, 0.03, 0.02],
      at: [0, -0.12, back - 0.255],
      color: d.rig.eye,
      glow: true,
      glowI: 3,
    },
    // vinil na mão direita
    {
      j: J.handR,
      shape: 'cyl',
      size: [0.2, 0.2, 0.015, 14],
      at: [0, -0.12, 0.08],
      rot: [0, 0, H],
      color: BLACK,
    },
    {
      j: J.handR,
      shape: 'cyl',
      size: [0.07, 0.07, 0.02, 10],
      at: [0, -0.12, 0.08],
      rot: [0, 0, H],
      color: 0xc8202a,
    },
    // pulseiras de luz
    {
      j: J.foreArmL,
      shape: 'box',
      size: [0.14, 0.03, 0.14],
      at: [0, -0.2, 0],
      color: PINK,
      glow: true,
      glowI: 2.5,
    },
    {
      j: J.foreArmR,
      shape: 'box',
      size: [0.14, 0.03, 0.14],
      at: [0, -0.2, 0],
      color: PINK,
      glow: true,
      glowI: 2.5,
    },
  ];
  // moicano neon
  for (let i = 0; i < 5; i++)
    parts.push({
      j: J.head,
      shape: 'cone',
      size: [0.035, 0.13 + (i === 2 ? 0.05 : 0), 4],
      at: [0, 0.37, -0.1 + i * 0.05],
      color: PINK,
      glow: true,
      glowI: 2,
    });
  // equalizador na barriga
  EQ.forEach((c, i) => {
    const h = [0.05, 0.09, 0.12, 0.07, 0.1][i]!;
    parts.push({
      j: J.spine,
      shape: 'box',
      size: [0.035, h, 0.015],
      at: [-0.1 + i * 0.05, -0.05 + h / 2, (0.2 * bulk) / 2 + 0.022],
      color: c,
      glow: true,
      glowI: 2.6,
    });
  });
  return parts;
};
