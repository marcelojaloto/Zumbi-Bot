import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const MUD = 0x3a2e1e;
const MUD2 = 0x4a3a24;
const MOSS = 0x3e5e2a;
const MOSS2 = 0x2c4a20;
const BARK = 0x4a3420;
const BARK2 = 0x5e442a;
const VINE = 0x2e5a26;
const LEAF = 0x1f4a2a;
const LEAF2 = 0x2c5e34;
const GLOW = 0x5ad8ff;
const SHROOM = 0x7affd8;

/** Colosso do Pântano: lama, musgo, raízes penduradas, placas de casca e uma arvorezinha nas costas. */
export const pantanoExtra: BossExtra = () => {
  const parts: PartSpec[] = [
    // tronco de lama
    { j: J.chest, shape: 'box', size: [0.74, 0.5, 0.46], at: [0, 0.06, -0.02], color: MUD },
    { j: J.chest, shape: 'box', size: [0.5, 0.26, 0.2], at: [0, -0.12, 0.2], color: MUD2, rot: [0.2, 0, 0] },
    { j: J.spine, shape: 'box', size: [0.56, 0.24, 0.4], at: [0, 0.02, 0], color: MUD2 },
    { j: J.hips, shape: 'box', size: [0.52, 0.3, 0.4], at: [0, -0.1, 0], color: MUD },
    // musgo
    { j: J.chest, shape: 'box', size: [0.26, 0.12, 0.05], at: [0.16, 0.2, 0.245], color: MOSS },
    { j: J.chest, shape: 'box', size: [0.2, 0.1, 0.05], at: [-0.17, -0.02, 0.245], color: MOSS2 },
    { j: J.chest, shape: 'box', size: [0.56, 0.22, 0.08], at: [0, 0.22, -0.27], color: MOSS },
    { j: J.hips, shape: 'box', size: [0.2, 0.12, 0.05], at: [0.14, -0.08, 0.21], color: MOSS2 },
    // coração de lama brilhante
    {
      j: J.chest,
      shape: 'box',
      size: [0.12, 0.16, 0.03],
      at: [-0.04, 0.06, 0.25],
      color: GLOW,
      glow: true,
      glowI: 2.8,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.03, 0.2, 0.02],
      at: [0.04, 0.02, 0.255],
      color: GLOW,
      glow: true,
      glowI: 1.8,
    },
    // raízes/cipós pendurados
    { j: J.chest, shape: 'box', size: [0.03, 0.55, 0.03], at: [0.24, -0.3, 0.24], color: VINE },
    { j: J.chest, shape: 'box', size: [0.025, 0.4, 0.025], at: [-0.1, -0.26, 0.25], color: VINE },
    { j: J.chest, shape: 'box', size: [0.03, 0.62, 0.03], at: [0.3, -0.26, -0.22], color: VINE },
    { j: J.chest, shape: 'box', size: [0.03, 0.5, 0.03], at: [-0.28, -0.3, -0.22], color: BARK },
    { j: J.hips, shape: 'box', size: [0.03, 0.45, 0.03], at: [-0.2, -0.3, 0.2], color: VINE },
    { j: J.hips, shape: 'box', size: [0.03, 0.38, 0.03], at: [0.22, -0.28, -0.18], color: MOSS2 },
    // arvorezinha nas costas
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.035, 0.065, 0.75, 5],
      at: [0.12, 0.5, -0.3],
      color: BARK,
      rot: [-0.25, 0, -0.15],
    },
    { j: J.chest, shape: 'cone', size: [0.26, 0.42, 6], at: [0.2, 0.86, -0.4], color: LEAF },
    { j: J.chest, shape: 'cone', size: [0.19, 0.34, 6], at: [0.22, 1.06, -0.43], color: LEAF2 },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.02, 0.035, 0.42, 4],
      at: [-0.18, 0.42, -0.28],
      color: BARK2,
      rot: [-0.3, 0, 0.3],
    },
    { j: J.chest, shape: 'cone', size: [0.14, 0.28, 5], at: [-0.25, 0.64, -0.35], color: LEAF },
    // cogumelos luminosos
    { j: J.chest, shape: 'cyl', size: [0.02, 0.025, 0.08, 4], at: [-0.3, 0.3, -0.24], color: 0xc8d8c0 },
    {
      j: J.chest,
      shape: 'cone',
      size: [0.07, 0.05, 6],
      at: [-0.3, 0.35, -0.24],
      color: SHROOM,
      glow: true,
      glowI: 2.4,
    },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.035, 5, 4],
      at: [-0.36, 0.26, -0.16],
      color: SHROOM,
      glow: true,
      glowI: 2.4,
    },
    {
      j: J.upperArmR,
      shape: 'sphere',
      size: [0.04, 5, 4],
      at: [-0.1, 0.2, -0.12],
      color: SHROOM,
      glow: true,
      glowI: 2.2,
    },
    // cabeça: capuz de lama, sobrancelha de casca, olhos azuis, chifres de raiz
    { j: J.head, shape: 'box', size: [0.34, 0.2, 0.33], at: [0, 0.3, -0.02], color: MUD },
    { j: J.head, shape: 'box', size: [0.32, 0.07, 0.08], at: [0, 0.21, 0.13], color: BARK },
    {
      j: J.head,
      shape: 'box',
      size: [0.08, 0.05, 0.02],
      at: [0.065, 0.16, 0.15],
      color: GLOW,
      glow: true,
      glowI: 4.5,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.08, 0.05, 0.02],
      at: [-0.065, 0.16, 0.15],
      color: GLOW,
      glow: true,
      glowI: 4.5,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.03, 0.26, 0.03],
      at: [0.14, 0.44, 0],
      color: BARK2,
      rot: [0, 0, -0.45],
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.03, 0.26, 0.03],
      at: [-0.14, 0.44, 0],
      color: BARK2,
      rot: [0, 0, 0.45],
    },
    { j: J.head, shape: 'box', size: [0.025, 0.22, 0.025], at: [0.05, -0.06, 0.12], color: VINE },
    { j: J.head, shape: 'box', size: [0.025, 0.28, 0.025], at: [-0.04, -0.09, 0.12], color: MOSS2 },
    // pés e pernas de lama
    { j: J.shinL, shape: 'box', size: [0.26, 0.3, 0.28], at: [0, -0.3, 0.01], color: MUD },
    { j: J.shinR, shape: 'box', size: [0.26, 0.3, 0.28], at: [0, -0.3, 0.01], color: MUD },
    { j: J.thighL, shape: 'box', size: [0.22, 0.12, 0.2], at: [0.02, -0.12, 0.06], color: MOSS2 },
    { j: J.thighR, shape: 'box', size: [0.2, 0.1, 0.2], at: [-0.02, -0.26, 0.05], color: MOSS },
  ];
  for (const side of [1, -1] as const) {
    const ua = side > 0 ? J.upperArmL : J.upperArmR;
    const fa = side > 0 ? J.foreArmL : J.foreArmR;
    const hd = side > 0 ? J.handL : J.handR;
    parts.push(
      // ombreiras de casca de árvore
      {
        j: ua,
        shape: 'box',
        size: [0.36, 0.12, 0.4],
        at: [side * 0.06, 0.1, 0],
        color: BARK,
        rot: [0, 0, -side * 0.35],
      },
      {
        j: ua,
        shape: 'box',
        size: [0.26, 0.1, 0.32],
        at: [side * 0.13, 0.0, 0.02],
        color: BARK2,
        rot: [0, 0, -side * 0.7],
      },
      { j: ua, shape: 'box', size: [0.2, 0.06, 0.22], at: [side * 0.03, 0.18, 0], color: MOSS },
      { j: ua, shape: 'box', size: [0.2, 0.3, 0.2], at: [0, -0.15, 0], color: MUD },
      // antebraço e punho de lama com garras de raiz
      { j: fa, shape: 'box', size: [0.22, 0.24, 0.22], at: [0, -0.14, 0], color: MUD2 },
      { j: fa, shape: 'box', size: [0.025, 0.45, 0.025], at: [side * 0.09, -0.32, 0.06], color: VINE },
      { j: hd, shape: 'box', size: [0.25, 0.2, 0.25], at: [0, -0.08, 0.01], color: MUD },
      { j: hd, shape: 'box', size: [0.035, 0.16, 0.035], at: [0.07, -0.21, 0.08], color: BARK },
      { j: hd, shape: 'box', size: [0.035, 0.16, 0.035], at: [-0.07, -0.21, 0.08], color: BARK },
      { j: hd, shape: 'box', size: [0.035, 0.14, 0.035], at: [0, -0.2, -0.08], color: BARK2 },
    );
  }
  return parts;
};
