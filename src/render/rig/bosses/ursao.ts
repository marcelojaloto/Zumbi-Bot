import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const BELLY = 0xe8c898;
const GOLD = 0xd8b040;
const RED = 0xd8302a;
const DARK = 0x14100c;
const STUFFING = 0xf4f0e8;

export const ursaoExtra: BossExtra = (_s, d) => {
  const fur = d.rig.skin;
  const bulk = d.rig.bulk ?? 1;
  const cd = 0.26 * bulk;
  const back = -cd / 2;
  const parts: PartSpec[] = [
    // cabeça
    { j: J.head, shape: 'sphere', size: [0.26, 10, 8], at: [0, 0.15, 0], color: fur },
    { j: J.head, shape: 'sphere', size: [0.11, 8, 6], at: [0.2, 0.37, 0], color: fur },
    { j: J.head, shape: 'sphere', size: [0.11, 8, 6], at: [-0.2, 0.37, 0], color: fur },
    { j: J.head, shape: 'sphere', size: [0.065, 7, 5], at: [0.2, 0.37, 0.07], color: BELLY },
    { j: J.head, shape: 'sphere', size: [0.065, 7, 5], at: [-0.2, 0.37, 0.07], color: BELLY },
    { j: J.head, shape: 'sphere', size: [0.12, 8, 6], at: [0, 0.09, 0.21], color: BELLY },
    { j: J.head, shape: 'box', size: [0.08, 0.055, 0.04], at: [0, 0.13, 0.325], color: DARK },
    { j: J.head, shape: 'box', size: [0.02, 0.07, 0.02], at: [0, 0.065, 0.325], color: DARK },
    // olho direito aceso
    {
      j: J.head,
      shape: 'sphere',
      size: [0.042, 7, 5],
      at: [-0.1, 0.2, 0.235],
      color: d.rig.eye,
      glow: true,
      glowI: 4,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.052, 0.052, 0.02, 8],
      at: [0.1, 0.2, 0.238],
      rot: [H, 0, 0],
      color: DARK,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.075, 0.012, 0.01],
      at: [0.1, 0.2, 0.252],
      rot: [0, 0, 0.78],
      color: STUFFING,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.075, 0.012, 0.01],
      at: [0.1, 0.2, 0.252],
      rot: [0, 0, -0.78],
      color: STUFFING,
    },
    // coroa de lata do Rei da Vitrine
    { j: J.head, shape: 'cyl', size: [0.11, 0.12, 0.07, 8], at: [0, 0.43, 0], color: GOLD },
    // barriga clara e o remendo azul
    { j: J.chest, shape: 'sphere', size: [0.33, 10, 8], at: [0, -0.08, cd / 2 - 0.1], color: BELLY },
    { j: J.chest, shape: 'box', size: [0.15, 0.15, 0.02], at: [0.1, -0.14, cd / 2 + 0.215], color: 0x3a7ad8 },
    // gravata-borboleta
    { j: J.chest, shape: 'cone', size: [0.09, 0.2, 4], at: [0.12, 0.21, 0.25], rot: [0, 0, H], color: RED },
    { j: J.chest, shape: 'cone', size: [0.09, 0.2, 4], at: [-0.12, 0.21, 0.25], rot: [0, 0, -H], color: RED },
    { j: J.chest, shape: 'box', size: [0.07, 0.08, 0.07], at: [0, 0.21, 0.25], color: 0xa0201c },
    // costura aberta no ombro, com o enchimento escapando
    { j: J.upperArmL, shape: 'ico', size: [0.075, 0], at: [0.05, 0.03, 0.07], color: STUFFING, jitter: 0.3 },
    { j: J.upperArmL, shape: 'ico', size: [0.05, 0], at: [0.1, -0.03, 0.09], color: STUFFING, jitter: 0.3 },
    // luvas de pelúcia com almofadinha
    { j: J.handL, shape: 'box', size: [0.2, 0.17, 0.21], at: [0, -0.07, 0.01], color: fur },
    { j: J.handR, shape: 'box', size: [0.2, 0.17, 0.21], at: [0, -0.07, 0.01], color: fur },
    { j: J.handL, shape: 'box', size: [0.13, 0.02, 0.13], at: [0, -0.16, 0.01], color: BELLY },
    { j: J.handR, shape: 'box', size: [0.13, 0.02, 0.13], at: [0, -0.16, 0.01], color: BELLY },
    // remendo verde na coxa e o rabo
    { j: J.thighR, shape: 'box', size: [0.12, 0.14, 0.02], at: [0, -0.2, 0.1], color: 0x3ac85a },
    { j: J.hips, shape: 'sphere', size: [0.09, 7, 5], at: [0, 0.02, back - 0.06], color: BELLY },
    // chave de corda gigante nas costas
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.035, 0.035, 0.34, 6],
      at: [0, 0.1, back - 0.17],
      rot: [H, 0, 0],
      color: GOLD,
    },
    {
      j: J.chest,
      shape: 'torus',
      size: [0.12, 0.035],
      at: [0, 0.225, back - 0.36],
      rot: [0, H, 0],
      color: GOLD,
    },
    {
      j: J.chest,
      shape: 'torus',
      size: [0.12, 0.035],
      at: [0, -0.025, back - 0.36],
      rot: [0, H, 0],
      color: GOLD,
    },
  ];
  // pontas da coroa
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push({
      j: J.head,
      shape: 'cone',
      size: [0.03, 0.08, 4],
      at: [Math.cos(a) * 0.105, 0.5, Math.sin(a) * 0.105],
      color: GOLD,
    });
  }
  return parts;
};
