import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const GOLD = 0xc8a04a;
const CAPE = 0x1a0a1e;
const LINING = 0x7a0e1a;
const PURPLE = 0xc86aff;
const STEEL = 0xb8bcc8;

/** Conde Necrótico: nobre colossal com capa, gola alta, coroa, presas e foice gigante. */
export const condeExtra: BossExtra = (_s, d) => {
  const cloth = d.rig.cloth;
  const parts: PartSpec[] = [
    // gibão sobre o peito, faixa e botões dourados
    { j: J.chest, shape: 'box', size: [0.56, 0.4, 0.35], at: [0, 0.04, 0], color: cloth },
    { j: J.chest, shape: 'box', size: [0.05, 0.36, 0.02], at: [0, 0.04, 0.18], color: GOLD },
    {
      j: J.chest,
      shape: 'box',
      size: [0.07, 0.52, 0.02],
      at: [0.02, 0.03, 0.184],
      rot: [0, 0, 0.6],
      color: LINING,
    },
    { j: J.chest, shape: 'oct', size: [0.055, 0], at: [0, 0.15, 0.2], color: PURPLE, glow: true, glowI: 3 },
    { j: J.spine, shape: 'box', size: [0.46, 0.2, 0.3], at: [0, 0.02, 0.01], color: cloth },
    // abas do casaco
    { j: J.hips, shape: 'box', size: [0.5, 0.55, 0.34], at: [0, -0.26, -0.02], color: cloth },
    { j: J.hips, shape: 'box', size: [0.52, 0.06, 0.36], at: [0, 0.0, 0], color: GOLD },
    // dragonas
    { j: J.upperArmL, shape: 'box', size: [0.2, 0.06, 0.22], at: [0.03, 0.02, 0], color: GOLD },
    { j: J.upperArmR, shape: 'box', size: [0.2, 0.06, 0.22], at: [-0.03, 0.02, 0], color: GOLD },
    // punhos de renda
    { j: J.foreArmL, shape: 'box', size: [0.14, 0.05, 0.14], at: [0, -0.25, 0], color: 0x8a8294 },
    { j: J.foreArmR, shape: 'box', size: [0.14, 0.05, 0.14], at: [0, -0.25, 0], color: 0x8a8294 },
    // botas de cano alto
    { j: J.shinL, shape: 'box', size: [0.2, 0.12, 0.21], at: [0, -0.06, 0], color: 0x100a0e },
    { j: J.shinR, shape: 'box', size: [0.2, 0.12, 0.21], at: [0, -0.06, 0], color: 0x100a0e },

    // gola alta atrás da cabeça
    {
      j: J.chest,
      shape: 'box',
      size: [0.52, 0.4, 0.05],
      at: [0, 0.4, -0.2],
      rot: [-0.35, 0, 0],
      color: CAPE,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.46, 0.34, 0.02],
      at: [0, 0.39, -0.17],
      rot: [-0.35, 0, 0],
      color: LINING,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.05, 0.3, 0.24],
      at: [0.27, 0.36, -0.08],
      rot: [-0.2, 0, -0.3],
      color: CAPE,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.05, 0.3, 0.24],
      at: [-0.27, 0.36, -0.08],
      rot: [-0.2, 0, 0.3],
      color: CAPE,
    },

    // capa longa descendo pelas costas (abre para trás)
    {
      j: J.chest,
      shape: 'box',
      size: [0.68, 0.5, 0.06],
      at: [0, 0.06, -0.21],
      rot: [0.12, 0, 0],
      color: CAPE,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.62, 0.48, 0.02],
      at: [0, 0.06, -0.175],
      rot: [0.12, 0, 0],
      color: LINING,
    },
    {
      j: J.spine,
      shape: 'box',
      size: [0.76, 0.46, 0.06],
      at: [0, -0.16, -0.27],
      rot: [0.2, 0, 0],
      color: CAPE,
    },
    {
      j: J.spine,
      shape: 'box',
      size: [0.7, 0.44, 0.02],
      at: [0, -0.16, -0.235],
      rot: [0.2, 0, 0],
      color: LINING,
    },
    {
      j: J.hips,
      shape: 'box',
      size: [0.84, 0.5, 0.06],
      at: [0, -0.42, -0.36],
      rot: [0.27, 0, 0],
      color: CAPE,
    },
    {
      j: J.hips,
      shape: 'box',
      size: [0.78, 0.48, 0.02],
      at: [0, -0.42, -0.325],
      rot: [0.27, 0, 0],
      color: LINING,
    },
    {
      j: J.hips,
      shape: 'box',
      size: [0.9, 0.34, 0.06],
      at: [0, -0.78, -0.47],
      rot: [0.32, 0, 0],
      color: CAPE,
    },
    {
      j: J.hips,
      shape: 'box',
      size: [0.84, 0.32, 0.02],
      at: [0, -0.78, -0.435],
      rot: [0.32, 0, 0],
      color: LINING,
    },
    // pontas rasgadas da capa
    {
      j: J.hips,
      shape: 'cone',
      size: [0.1, 0.18, 3],
      at: [0.3, -0.98, -0.53],
      rot: [Math.PI, 0, 0],
      color: CAPE,
    },
    {
      j: J.hips,
      shape: 'cone',
      size: [0.1, 0.22, 3],
      at: [0, -1.0, -0.54],
      rot: [Math.PI, 0, 0],
      color: CAPE,
    },
    {
      j: J.hips,
      shape: 'cone',
      size: [0.1, 0.16, 3],
      at: [-0.3, -0.97, -0.53],
      rot: [Math.PI, 0, 0],
      color: CAPE,
    },

    // cabelo penteado para trás e presas
    { j: J.head, shape: 'box', size: [0.27, 0.12, 0.16], at: [0, 0.25, -0.07], color: 0x0e0a10 },
    {
      j: J.head,
      shape: 'box',
      size: [0.08, 0.06, 0.06],
      at: [0, 0.27, 0.11],
      rot: [0, 0, Math.PI / 4],
      color: 0x0e0a10,
    },
    {
      j: J.head,
      shape: 'cone',
      size: [0.018, 0.06, 3],
      at: [0.035, 0.045, 0.14],
      rot: [Math.PI, 0, 0],
      color: 0xf0ece0,
    },
    {
      j: J.head,
      shape: 'cone',
      size: [0.018, 0.06, 3],
      at: [-0.035, 0.045, 0.14],
      rot: [Math.PI, 0, 0],
      color: 0xf0ece0,
    },
    { j: J.head, shape: 'box', size: [0.2, 0.05, 0.02], at: [0, 0.2, 0.135], color: 0x3a2a44 },

    // coroa
    { j: J.head, shape: 'cyl', size: [0.15, 0.155, 0.07, 10], at: [0, 0.33, 0.0], color: GOLD },
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push({
      j: J.head,
      shape: 'cone',
      size: [0.035, 0.13, 4],
      at: [Math.sin(a) * 0.13, 0.42, Math.cos(a) * 0.13],
      color: GOLD,
    });
  }
  parts.push(
    {
      j: J.head,
      shape: 'oct',
      size: [0.035, 0],
      at: [0, 0.33, 0.155],
      color: PURPLE,
      glow: true,
      glowI: 3.5,
    },
    {
      j: J.head,
      shape: 'oct',
      size: [0.025, 0],
      at: [0.1, 0.33, 0.11],
      color: 0xff3a5a,
      glow: true,
      glowI: 3,
    },
    {
      j: J.head,
      shape: 'oct',
      size: [0.025, 0],
      at: [-0.1, 0.33, 0.11],
      color: 0xff3a5a,
      glow: true,
      glowI: 3,
    },
  );

  // foice gigante na mão direita (cabo inclinado para a frente, lâmina curva no alto)
  const a = 0.3;
  const dy = Math.cos(a);
  const dz = Math.sin(a);
  const along = (t: number, off: [number, number, number] = [0, 0, 0]): [number, number, number] => [
    off[0],
    t * dy + off[1],
    0.05 + t * dz + off[2],
  ];
  parts.push(
    { j: J.handR, shape: 'box', size: [0.05, 2.1, 0.05], at: along(0.35), rot: [a, 0, 0], color: 0x2a1a14 },
    { j: J.handR, shape: 'box', size: [0.07, 0.08, 0.07], at: along(-0.66), rot: [a, 0, 0], color: GOLD },
    {
      j: J.handR,
      shape: 'box',
      size: [0.065, 0.12, 0.065],
      at: along(0.02),
      rot: [a, 0, 0],
      color: 0x4a2a2a,
    },
    { j: J.handR, shape: 'sphere', size: [0.075, 7, 5], at: along(1.44), color: 0xd8d0bc },
    {
      j: J.handR,
      shape: 'box',
      size: [0.06, 0.12, 0.14],
      at: along(1.34, [0, 0, 0.05]),
      rot: [a, 0, 0],
      color: 0x2a2a30,
    },
    // lâmina
    {
      j: J.handR,
      shape: 'box',
      size: [0.03, 0.17, 0.95],
      at: along(1.34, [0, -0.08, 0.55]),
      rot: [0.28, 0, 0],
      color: STEEL,
    },
    {
      j: J.handR,
      shape: 'box',
      size: [0.03, 0.11, 0.4],
      at: along(1.34, [0, -0.3, 1.1]),
      rot: [0.8, 0, 0],
      color: STEEL,
    },
    {
      j: J.handR,
      shape: 'box',
      size: [0.036, 0.035, 0.95],
      at: along(1.34, [0, -0.16, 0.56]),
      rot: [0.28, 0, 0],
      color: PURPLE,
      glow: true,
      glowI: 2.6,
    },
    {
      j: J.handR,
      shape: 'box',
      size: [0.036, 0.03, 0.38],
      at: along(1.34, [0, -0.36, 1.08]),
      rot: [0.8, 0, 0],
      color: PURPLE,
      glow: true,
      glowI: 2.6,
    },
  );
  return parts;
};
