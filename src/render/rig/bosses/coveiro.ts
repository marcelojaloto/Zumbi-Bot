import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;

export const coveiroExtra: BossExtra = (_s, d) => [
  // cartola
  { j: J.head, shape: 'cyl', size: [0.16, 0.17, 0.3, 8], at: [0, 0.44, 0], color: 0x151210 },
  { j: J.head, shape: 'cyl', size: [0.26, 0.26, 0.03, 10], at: [0, 0.29, 0], color: 0x151210 },
  { j: J.head, shape: 'cyl', size: [0.165, 0.175, 0.05, 8], at: [0, 0.34, 0], color: 0x6a1a1a },
  // sobretudo
  { j: J.hips, shape: 'box', size: [0.5, 0.55, 0.36], at: [0, -0.25, -0.02], color: d.rig.cloth },
  { j: J.chest, shape: 'box', size: [0.62, 0.42, 0.42], at: [0, 0.04, 0], color: d.rig.cloth },
  { j: J.chest, shape: 'box', size: [0.2, 0.3, 0.02], at: [0.12, 0.02, 0.215], color: 0x4a3a2a },
  // pá na mão direita
  {
    j: J.handR,
    shape: 'box',
    size: [0.05, 1.2, 0.05],
    at: [0, -0.15, 0.1],
    color: 0x5a3a22,
    rot: [H * 0.9, 0, 0],
  },
  {
    j: J.handR,
    shape: 'box',
    size: [0.3, 0.05, 0.42],
    at: [0, -0.2, 0.72],
    color: 0x6a6e76,
    rot: [H * 0.9, 0, 0],
  },
  // lanterna na mão esquerda
  { j: J.handL, shape: 'box', size: [0.14, 0.18, 0.14], at: [0, -0.2, 0], color: 0x2a2420 },
  {
    j: J.handL,
    shape: 'box',
    size: [0.1, 0.12, 0.1],
    at: [0, -0.2, 0],
    color: 0xffb34a,
    glow: true,
    glowI: 3,
  },
];
