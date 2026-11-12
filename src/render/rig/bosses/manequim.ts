import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const SEAM = 0x7a7670;
const GOLD = 0xd8b040;
const RED = 0xe8202a;

/**
 * Manequim-Rei: rosto liso rachado (a rachadura brilha), coroa, juntas à mostra, faixa de liquidação no peito,
 * etiqueta de preço no pulso e a haste do suporte ainda presa nas costas.
 */
export const manequimExtra: BossExtra = (_s, d) => {
  const skin = d.rig.skin;
  const bulk = d.rig.bulk ?? 1;
  const cw = 0.42 * bulk;
  const cd = 0.26 * bulk;
  const fz = cd / 2;
  const parts: PartSpec[] = [
    // rosto e cabeça lisos (cobrem olhos, queixo e cabelo do rig base) e o peito limpo
    { j: J.head, shape: 'box', size: [0.26, 0.28, 0.03], at: [0, 0.14, 0.15], color: skin },
    { j: J.head, shape: 'box', size: [0.265, 0.07, 0.275], at: [0, 0.285, -0.005], color: skin },
    { j: J.chest, shape: 'box', size: [cw * 0.98, 0.33, 0.03], at: [0, 0.05, fz + 0.012], color: skin },
    // rachadura acesa no rosto
    {
      j: J.head,
      shape: 'box',
      size: [0.016, 0.2, 0.012],
      at: [0.04, 0.17, 0.168],
      rot: [0, 0, 0.5],
      color: d.rig.eye,
      glow: true,
      glowI: 3.5,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.014, 0.09, 0.012],
      at: [-0.03, 0.2, 0.168],
      rot: [0, 0, -0.7],
      color: d.rig.eye,
      glow: true,
      glowI: 3.5,
    },
    // coroa
    { j: J.head, shape: 'cyl', size: [0.12, 0.13, 0.07, 8], at: [0, 0.35, 0], color: GOLD },
    // juntas
    { j: J.neck, shape: 'cyl', size: [0.075, 0.075, 0.025, 6], at: [0, 0.02, 0.01], color: SEAM },
    { j: J.spine, shape: 'box', size: [cw * 0.74, 0.018, cd * 0.82], at: [0, -0.07, 0.01], color: SEAM },
    // faixa de liquidação e o selo de desconto
    {
      j: J.chest,
      shape: 'box',
      size: [0.1, 0.56, 0.02],
      at: [0, 0.04, fz + 0.035],
      rot: [0, 0, 0.75],
      color: RED,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.1, 0.1, 0.02],
      at: [-0.12, -0.08, fz + 0.05],
      color: 0xffd23a,
      glow: true,
      glowI: 1.6,
    },
    // etiqueta de preço e a haste do suporte
    { j: J.handR, shape: 'box', size: [0.09, 0.13, 0.012], at: [0.07, -0.13, 0.02], color: 0xffd23a },
    { j: J.chest, shape: 'cyl', size: [0.025, 0.025, 0.9, 6], at: [0, -0.15, -fz - 0.08], color: 0x9aa0a8 },
  ];
  for (const j of [J.upperArmL, J.upperArmR])
    parts.push({ j, shape: 'sphere', size: [0.075, 7, 5], at: [0, 0, 0], color: SEAM });
  for (const j of [J.foreArmL, J.foreArmR, J.shinL, J.shinR])
    parts.push({ j, shape: 'sphere', size: [0.065, 7, 5], at: [0, 0, 0], color: SEAM });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push({
      j: J.head,
      shape: 'cone',
      size: [0.03, 0.09, 4],
      at: [Math.cos(a) * 0.115, 0.43, Math.sin(a) * 0.115],
      color: GOLD,
    });
  }
  return parts;
};
