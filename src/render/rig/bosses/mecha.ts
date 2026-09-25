import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const DARK = 0x23262e;
const GUN = 0x2e323c;
const NEON = 0xff3ad7;
const CYAN = 0x3af0ff;
const WARHEAD = 0xff5a3a;

/** Mecha Dominador: casulos de mísseis nos ombros, canhão de plasma no braço direito, antenas e neon magenta. */
export const mechaExtra: BossExtra = (_s, d) => {
  const body = d.rig.skin;
  const parts: PartSpec[] = [
    // neon magenta no peito, laterais e saia blindada
    {
      j: J.chest,
      shape: 'box',
      size: [0.64, 0.035, 0.02],
      at: [0, 0.02, 0.31],
      color: NEON,
      glow: true,
      glowI: 3,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.035, 0.42, 0.02],
      at: [0.3, 0.14, 0.31],
      color: NEON,
      glow: true,
      glowI: 2.6,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.035, 0.42, 0.02],
      at: [-0.3, 0.14, 0.31],
      color: NEON,
      glow: true,
      glowI: 2.6,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.02, 0.4, 0.04],
      at: [0.455, 0.14, 0.18],
      color: NEON,
      glow: true,
      glowI: 2.4,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.02, 0.4, 0.04],
      at: [-0.455, 0.14, 0.18],
      color: NEON,
      glow: true,
      glowI: 2.4,
    },
    // reator
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.1, 0.1, 0.05, 10],
      at: [0, 0.06, 0.31],
      rot: [H, 0, 0],
      color: DARK,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.065, 0.065, 0.06, 10],
      at: [0, 0.06, 0.32],
      rot: [H, 0, 0],
      color: CYAN,
      glow: true,
      glowI: 3.5,
    },
    // saia blindada
    { j: J.hips, shape: 'box', size: [0.7, 0.2, 0.46], at: [0, -0.1, 0], color: body },
    {
      j: J.hips,
      shape: 'box',
      size: [0.5, 0.03, 0.02],
      at: [0, -0.1, 0.235],
      color: NEON,
      glow: true,
      glowI: 2.4,
    },
    // cabeça: aletas sensoras e crista
    { j: J.head, shape: 'box', size: [0.03, 0.16, 0.16], at: [0.17, 0.08, 0.06], color: DARK },
    { j: J.head, shape: 'box', size: [0.03, 0.16, 0.16], at: [-0.17, 0.08, 0.06], color: DARK },
    { j: J.head, shape: 'box', size: [0.06, 0.08, 0.3], at: [0, 0.13, 0.06], color: body },
    // antenas
    { j: J.chest, shape: 'cyl', size: [0.012, 0.02, 0.9, 4], at: [-0.2, 0.86, -0.36], color: DARK },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.04, 6, 4],
      at: [-0.2, 1.32, -0.36],
      color: NEON,
      glow: true,
      glowI: 4,
    },
    { j: J.chest, shape: 'cyl', size: [0.01, 0.016, 0.62, 4], at: [-0.3, 0.72, -0.32], color: DARK },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.03, 6, 4],
      at: [-0.3, 1.04, -0.32],
      color: CYAN,
      glow: true,
      glowI: 4,
    },
    { j: J.chest, shape: 'cyl', size: [0.02, 0.02, 0.3, 4], at: [0.2, 0.55, -0.4], color: DARK },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.16, 0.04, 0.05, 10],
      at: [0.2, 0.72, -0.42],
      rot: [-0.8, 0, 0.2],
      color: 0x5a5e6a,
    },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.025, 5, 4],
      at: [0.2, 0.76, -0.38],
      color: CYAN,
      glow: true,
      glowI: 3,
    },
    // canhão de plasma no antebraço direito
    { j: J.foreArmR, shape: 'cyl', size: [0.2, 0.23, 0.64, 10], at: [0, -0.3, 0], color: GUN },
    { j: J.foreArmR, shape: 'cyl', size: [0.24, 0.24, 0.07, 10], at: [0, -0.1, 0], color: DARK },
    {
      j: J.foreArmR,
      shape: 'cyl',
      size: [0.215, 0.215, 0.035, 10],
      at: [0, -0.26, 0],
      color: CYAN,
      glow: true,
      glowI: 2.6,
    },
    {
      j: J.foreArmR,
      shape: 'cyl',
      size: [0.215, 0.215, 0.035, 10],
      at: [0, -0.42, 0],
      color: CYAN,
      glow: true,
      glowI: 2.6,
    },
    { j: J.foreArmR, shape: 'cyl', size: [0.17, 0.2, 0.08, 10], at: [0, -0.64, 0], color: DARK },
    {
      j: J.foreArmR,
      shape: 'cyl',
      size: [0.13, 0.13, 0.04, 10],
      at: [0, -0.69, 0],
      color: CYAN,
      glow: true,
      glowI: 4.5,
    },
    {
      j: J.foreArmR,
      shape: 'box',
      size: [0.05, 0.44, 0.05],
      at: [-0.2, -0.32, 0],
      color: NEON,
      glow: true,
      glowI: 2,
    },
    // punho esquerdo pesado
    { j: J.handL, shape: 'box', size: [0.34, 0.28, 0.34], at: [0, -0.12, 0.01], color: body },
    {
      j: J.handL,
      shape: 'box',
      size: [0.3, 0.04, 0.02],
      at: [0, -0.06, 0.185],
      color: NEON,
      glow: true,
      glowI: 2.6,
    },
    // neon nas coxas e canelas
    {
      j: J.thighL,
      shape: 'box',
      size: [0.04, 0.34, 0.02],
      at: [0, -0.25, 0.16],
      color: NEON,
      glow: true,
      glowI: 2.4,
    },
    {
      j: J.thighR,
      shape: 'box',
      size: [0.04, 0.34, 0.02],
      at: [0, -0.25, 0.16],
      color: NEON,
      glow: true,
      glowI: 2.4,
    },
    {
      j: J.shinL,
      shape: 'box',
      size: [0.2, 0.03, 0.02],
      at: [0, -0.22, 0.145],
      color: CYAN,
      glow: true,
      glowI: 2.2,
    },
    {
      j: J.shinR,
      shape: 'box',
      size: [0.2, 0.03, 0.02],
      at: [0, -0.22, 0.145],
      color: CYAN,
      glow: true,
      glowI: 2.2,
    },
  ];
  // casulos de mísseis nos ombros
  for (const side of [1, -1] as const) {
    const x = side * 0.54;
    parts.push(
      { j: J.chest, shape: 'box', size: [0.14, 0.14, 0.22], at: [side * 0.44, 0.47, -0.08], color: DARK },
      { j: J.chest, shape: 'box', size: [0.36, 0.3, 0.48], at: [x, 0.62, -0.08], color: body },
      { j: J.chest, shape: 'box', size: [0.37, 0.04, 0.49], at: [x, 0.5, -0.08], color: d.rig.cloth2 },
      { j: J.chest, shape: 'box', size: [0.3, 0.22, 0.02], at: [x, 0.64, 0.165], color: DARK },
    );
    for (const dx of [-0.09, 0, 0.09])
      for (const dy of [-0.055, 0.055])
        parts.push({
          j: J.chest,
          shape: 'box',
          size: [0.055, 0.055, 0.04],
          at: [x + dx, 0.64 + dy, 0.18],
          color: WARHEAD,
          glow: true,
          glowI: 2.6,
        });
  }
  return parts;
};
