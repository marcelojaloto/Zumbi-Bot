import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { EnemyExtra } from './types';

const SEAM = 0x8a8680;
const STEEL = 0x9aa0a8;

export const shoppingExtras: Record<string, EnemyExtra> = {
  // rosto liso por cima dos olhos, cabeça sem cabelo, peito limpo, juntas e etiqueta de preço
  shopping_mannequin: (rp, cd) => {
    const cw = (cd * 0.42) / 0.26;
    const parts: PartSpec[] = [
      { j: J.head, shape: 'box', size: [0.255, 0.275, 0.03], at: [0, 0.14, 0.15], color: rp.skin },
      { j: J.head, shape: 'box', size: [0.265, 0.07, 0.275], at: [0, 0.285, -0.005], color: rp.skin },
      {
        j: J.chest,
        shape: 'box',
        size: [cw * 0.62, 0.2, 0.03],
        at: [0.04, 0.03, cd / 2 + 0.008],
        color: rp.skin,
      },
      { j: J.neck, shape: 'cyl', size: [0.07, 0.07, 0.02, 6], at: [0, 0.02, 0.01], color: SEAM },
      { j: J.spine, shape: 'box', size: [cw * 0.74, 0.015, cd * 0.8], at: [0, -0.07, 0.01], color: SEAM },
      { j: J.handR, shape: 'box', size: [0.07, 0.1, 0.01], at: [0.06, -0.12, 0.02], color: 0xffd23a },
    ];
    for (const j of [J.upperArmL, J.upperArmR])
      parts.push({ j, shape: 'sphere', size: [0.05, 6, 4], at: [0, 0, 0], color: SEAM });
    return parts;
  },
  // uma sacola em cada mão
  shopping_bags: () => [
    { j: J.handL, shape: 'box', size: [0.2, 0.24, 0.1], at: [0, -0.26, 0.02], color: 0xff5ac8 },
    { j: J.handL, shape: 'box', size: [0.1, 0.1, 0.015], at: [0, -0.1, 0.02], color: 0xf4f0e8 },
    { j: J.handR, shape: 'box', size: [0.22, 0.2, 0.1], at: [0, -0.24, 0.02], color: 0x3ad8e8 },
    { j: J.handR, shape: 'box', size: [0.1, 0.1, 0.015], at: [0, -0.1, 0.02], color: 0xf4f0e8 },
  ],
  // quepe com pala e emblema, e a luz do rádio no ombro
  shopping_guard: (rp) => [
    { j: J.head, shape: 'box', size: [0.35, 0.07, 0.35], at: [0, 0.35, 0], color: rp.cloth },
    { j: J.head, shape: 'box', size: [0.3, 0.02, 0.14], at: [0, 0.32, 0.22], color: rp.cloth },
    { j: J.head, shape: 'box', size: [0.07, 0.06, 0.02], at: [0, 0.36, 0.18], color: rp.cloth2 },
    {
      j: J.chest,
      shape: 'box',
      size: [0.06, 0.05, 0.06],
      at: [0.2, 0.3, 0],
      color: 0xff2a2a,
      glow: true,
      glowI: 3,
    },
  ],
  // carrinho de compras empurrado na frente do peito
  shopping_cart: (_rp, cd) => {
    const z = cd / 2 + 0.42;
    const parts: PartSpec[] = [
      { j: J.chest, shape: 'box', size: [0.5, 0.3, 0.5], at: [0, -0.4, z], color: STEEL },
      { j: J.chest, shape: 'box', size: [0.44, 0.04, 0.44], at: [0, -0.26, z], color: 0x3a3e46 },
      { j: J.chest, shape: 'box', size: [0.5, 0.035, 0.035], at: [0, -0.2, cd / 2 + 0.14], color: 0xe8202a },
      { j: J.chest, shape: 'box', size: [0.2, 0.18, 0.2], at: [-0.08, -0.2, z + 0.05], color: 0xffd23a },
      { j: J.chest, shape: 'box', size: [0.16, 0.14, 0.18], at: [0.12, -0.21, z - 0.08], color: 0x3ad8e8 },
    ];
    for (const sx of [0.22, -0.22])
      for (const dz of [-0.2, 0.2]) {
        parts.push({
          j: J.chest,
          shape: 'box',
          size: [0.03, 0.6, 0.03],
          at: [sx, -0.85, z + dz],
          color: STEEL,
        });
        parts.push({
          j: J.chest,
          shape: 'cyl',
          size: [0.05, 0.05, 0.04, 6],
          at: [sx, -1.17, z + dz],
          rot: [0, 0, Math.PI / 2],
          color: 0x14161c,
        });
      }
    return parts;
  },
};
