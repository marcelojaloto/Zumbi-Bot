import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const PUS = 0xc8ff3a;
const MASK = 0x2a2c26;
const RUBBER = 0x1e201a;

type V3 = [number, number, number];

/** Pústulas brilhantes: [junta, posição, raio]. */
const PUSTULES: [number, V3, number][] = [
  // barriga (frente)
  [J.spine, [0.18, 0.12, 0.58], 0.08],
  [J.spine, [-0.12, 0.2, 0.57], 0.06],
  [J.spine, [-0.25, -0.05, 0.5], 0.09],
  [J.spine, [0.05, -0.2, 0.55], 0.05],
  [J.spine, [0.3, -0.15, 0.42], 0.07],
  [J.spine, [-0.02, 0.02, 0.62], 0.045],
  // peito e corcunda (costas)
  [J.chest, [0.22, 0.14, 0.26], 0.06],
  [J.chest, [-0.26, 0.05, 0.27], 0.05],
  [J.chest, [0.12, 0.3, -0.42], 0.09],
  [J.chest, [-0.18, 0.18, -0.48], 0.07],
  [J.chest, [0.02, 0.0, -0.52], 0.08],
  [J.chest, [0.3, 0.02, -0.4], 0.05],
  [J.chest, [-0.34, 0.26, -0.3], 0.06],
  // braços
  [J.upperArmR, [-0.12, -0.1, 0.06], 0.07],
  [J.upperArmR, [-0.08, -0.22, -0.08], 0.05],
  [J.foreArmR, [-0.12, -0.12, 0.04], 0.06],
  [J.foreArmR, [-0.06, -0.2, -0.1], 0.045],
  [J.upperArmL, [0.12, -0.14, 0.02], 0.06],
  [J.foreArmL, [0.1, -0.1, 0.08], 0.05],
  // cabeça e pernas
  [J.head, [-0.13, 0.18, 0.06], 0.04],
  [J.head, [0.1, 0.24, -0.08], 0.05],
  [J.thighR, [-0.13, -0.2, 0.08], 0.06],
  [J.thighL, [0.13, -0.15, 0.06], 0.05],
  [J.shinR, [-0.1, -0.1, 0.1], 0.04],
];

/** Abominação Tóxica: corpo inchado, barriga enorme, pústulas brilhantes, máscara de gás e tanques. */
export const abominacaoExtra: BossExtra = (_s, d) => {
  const skin = d.rig.skin;
  const light = 0x4c6a22;
  const dark = 0x26340f;
  const parts: PartSpec[] = [
    // barriga gigante e corcunda
    { j: J.spine, shape: 'sphere', size: [0.52, 12, 9], at: [0, 0.0, 0.12], color: light },
    { j: J.spine, shape: 'sphere', size: [0.2, 8, 6], at: [0.12, -0.28, 0.34], color: skin },
    { j: J.hips, shape: 'sphere', size: [0.36, 10, 7], at: [0, -0.02, 0.05], color: skin },
    { j: J.chest, shape: 'sphere', size: [0.4, 10, 8], at: [0, 0.12, -0.26], color: dark },
    { j: J.chest, shape: 'sphere', size: [0.3, 9, 7], at: [0.2, 0.28, -0.12], color: skin },
    { j: J.chest, shape: 'sphere', size: [0.3, 9, 7], at: [-0.2, 0.28, -0.12], color: skin },
    // estrias e cicatrizes na barriga
    {
      j: J.spine,
      shape: 'box',
      size: [0.3, 0.02, 0.02],
      at: [0.05, 0.05, 0.64],
      rot: [0, 0, 0.3],
      color: 0x3a4a1e,
    },
    {
      j: J.spine,
      shape: 'box',
      size: [0.24, 0.02, 0.02],
      at: [-0.1, -0.12, 0.61],
      rot: [0, 0, -0.4],
      color: 0x3a4a1e,
    },
    // restos de roupa protetora
    { j: J.chest, shape: 'box', size: [0.06, 0.36, 0.42], at: [0.4, -0.04, 0.0], color: 0x5a4c16 },
    { j: J.chest, shape: 'box', size: [0.06, 0.36, 0.42], at: [-0.4, -0.04, 0.0], color: 0x5a4c16 },
    { j: J.hips, shape: 'box', size: [0.7, 0.24, 0.5], at: [0, -0.08, -0.04], color: d.rig.cloth2 },
    {
      j: J.chest,
      shape: 'box',
      size: [0.06, 0.52, 0.02],
      at: [0.26, 0.02, 0.36],
      rot: [0.35, 0, 0],
      color: 0x1a1a12,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.06, 0.52, 0.02],
      at: [-0.26, 0.02, 0.36],
      rot: [0.35, 0, 0],
      color: 0x1a1a12,
    },
    // braços inchados (o direito mutado)
    { j: J.upperArmR, shape: 'sphere', size: [0.19, 9, 7], at: [-0.03, -0.1, 0], color: skin },
    { j: J.foreArmR, shape: 'sphere', size: [0.16, 9, 7], at: [-0.02, -0.14, 0.02], color: light },
    { j: J.handR, shape: 'box', size: [0.26, 0.14, 0.26], at: [0, -0.06, 0.02], color: dark },
    { j: J.upperArmL, shape: 'sphere', size: [0.17, 8, 6], at: [0.02, -0.1, 0], color: skin },
    { j: J.foreArmL, shape: 'sphere', size: [0.15, 8, 6], at: [0.02, -0.12, 0], color: skin },
    // coxas grossas
    { j: J.thighL, shape: 'sphere', size: [0.2, 8, 6], at: [0.02, -0.18, 0.02], color: d.rig.cloth2 },
    { j: J.thighR, shape: 'sphere', size: [0.2, 8, 6], at: [-0.02, -0.18, 0.02], color: d.rig.cloth2 },

    // máscara de gás com filtros e visores
    { j: J.head, shape: 'box', size: [0.24, 0.16, 0.1], at: [0, 0.07, 0.16], color: MASK },
    { j: J.head, shape: 'box', size: [0.27, 0.05, 0.28], at: [0, 0.2, 0.0], color: RUBBER },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.055, 0.06, 0.1, 8],
      at: [0.1, 0.05, 0.22],
      rot: [H, 0, -0.5],
      color: 0x3a3c34,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.055, 0.06, 0.1, 8],
      at: [-0.1, 0.05, 0.22],
      rot: [H, 0, 0.5],
      color: 0x3a3c34,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.045, 0.045, 0.02, 8],
      at: [0.125, 0.05, 0.27],
      rot: [H, 0, -0.5],
      color: PUS,
      glow: true,
      glowI: 1.8,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.045, 0.045, 0.02, 8],
      at: [-0.125, 0.05, 0.27],
      rot: [H, 0, 0.5],
      color: PUS,
      glow: true,
      glowI: 1.8,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.045, 0.045, 0.03, 8],
      at: [0.065, 0.16, 0.145],
      rot: [H, 0, 0],
      color: 0x1a1a14,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.045, 0.045, 0.03, 8],
      at: [-0.065, 0.16, 0.145],
      rot: [H, 0, 0],
      color: 0x1a1a14,
    },
    // mangueiras da máscara aos tanques das costas (por cima dos ombros)
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.035, 0.035, 0.34, 6],
      at: [0.12, 0.3, 0.24],
      rot: [0.9, 0, 0.2],
      color: RUBBER,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.035, 0.035, 0.34, 6],
      at: [-0.12, 0.3, 0.24],
      rot: [0.9, 0, -0.2],
      color: RUBBER,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.035, 0.035, 0.7, 6],
      at: [0.2, 0.4, -0.12],
      rot: [H, 0, 0],
      color: RUBBER,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.035, 0.035, 0.7, 6],
      at: [-0.2, 0.4, -0.12],
      rot: [H, 0, 0],
      color: RUBBER,
    },
    // tanques químicos nas costas
    { j: J.chest, shape: 'cyl', size: [0.14, 0.14, 0.6, 10], at: [0.18, 0.1, -0.62], color: 0x6a7a3a },
    { j: J.chest, shape: 'cyl', size: [0.14, 0.14, 0.6, 10], at: [-0.18, 0.1, -0.62], color: 0x6a7a3a },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.145, 0.145, 0.08, 10],
      at: [0.18, 0.16, -0.62],
      color: PUS,
      glow: true,
      glowI: 1.5,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.145, 0.145, 0.08, 10],
      at: [-0.18, 0.16, -0.62],
      color: PUS,
      glow: true,
      glowI: 1.5,
    },
    { j: J.chest, shape: 'box', size: [0.5, 0.06, 0.06], at: [0, 0.3, -0.62], color: 0x3a3c34 },
    {
      j: J.chest,
      shape: 'box',
      size: [0.2, 0.2, 0.02],
      at: [0, -0.05, -0.77],
      rot: [0, 0, Math.PI / 4],
      color: 0xe8c01a,
    },

    // gotas escorrendo (máscara, queixo, barriga, mão)
    {
      j: J.head,
      shape: 'cone',
      size: [0.025, 0.12, 4],
      at: [0.04, -0.03, 0.18],
      rot: [Math.PI, 0, 0],
      color: PUS,
      glow: true,
      glowI: 1.6,
    },
    {
      j: J.head,
      shape: 'cone',
      size: [0.02, 0.09, 4],
      at: [-0.05, -0.02, 0.19],
      rot: [Math.PI, 0, 0],
      color: PUS,
      glow: true,
      glowI: 1.6,
    },
    {
      j: J.spine,
      shape: 'cone',
      size: [0.03, 0.14, 4],
      at: [0.1, -0.5, 0.42],
      rot: [Math.PI, 0, 0],
      color: PUS,
      glow: true,
      glowI: 1.5,
    },
    {
      j: J.handR,
      shape: 'cone',
      size: [0.03, 0.14, 4],
      at: [0, -0.2, 0.05],
      rot: [Math.PI, 0, 0],
      color: PUS,
      glow: true,
      glowI: 1.5,
    },
    {
      j: J.foreArmL,
      shape: 'cone',
      size: [0.025, 0.1, 4],
      at: [0.08, -0.28, 0.05],
      rot: [Math.PI, 0, 0],
      color: PUS,
      glow: true,
      glowI: 1.5,
    },
  ];
  for (const [j, at, r] of PUSTULES) {
    const out = Math.sign(at[2] || 1) * r * 0.45;
    parts.push({ j, shape: 'sphere', size: [r * 1.2, 6, 4], at, color: 0x3a3418 });
    parts.push({
      j,
      shape: 'sphere',
      size: [r * 0.8, 6, 4],
      at: [at[0], at[1], at[2] + out],
      color: PUS,
      glow: true,
      glowI: 1.7,
    });
  }
  return parts;
};
