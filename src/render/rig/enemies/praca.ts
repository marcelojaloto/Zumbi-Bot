import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { EnemyExtra } from './types';

const H = Math.PI / 2;
const WHEEL = 0xe8e0d0;

/** Skate preso à raiz do boneco (fica no chão, embaixo dos pés). */
export function skateboard(len: number, w: number, deck: number, stripe: number): PartSpec[] {
  const parts: PartSpec[] = [
    { j: J.root, shape: 'box', size: [w, 0.035, len], at: [0, 0.085, 0], color: deck },
    { j: J.root, shape: 'box', size: [w * 0.35, 0.012, len * 0.8], at: [0, 0.105, 0], color: stripe },
  ];
  for (const sz of [-1, 1])
    for (const sx of [-1, 1])
      parts.push({
        j: J.root,
        shape: 'cyl',
        size: [0.04, 0.04, 0.04, 8],
        at: [sx * w * 0.42, 0.04, sz * len * 0.33],
        rot: [0, 0, H],
        color: WHEEL,
      });
  return parts;
}

export const pracaExtras: Record<string, EnemyExtra> = {
  praca_skater: (rp) => [
    ...skateboard(0.82, 0.22, 0x2a2a30, rp.eye),
    // capacete e joelheiras
    { j: J.head, shape: 'sphere', size: [0.17, 8, 5], at: [0, 0.23, 0], color: rp.cloth },
    { j: J.head, shape: 'box', size: [0.27, 0.03, 0.28], at: [0, 0.2, 0.01], color: 0x16161c },
    { j: J.shinL, shape: 'box', size: [0.16, 0.1, 0.07], at: [0, -0.03, 0.08], color: 0x16161c },
    { j: J.shinR, shape: 'box', size: [0.16, 0.1, 0.07], at: [0, -0.03, 0.08], color: 0x16161c },
  ],
  praca_punk: (rp, cd) => {
    const parts: PartSpec[] = [];
    // moicano aceso e rebites nos ombros
    for (let i = 0; i < 5; i++)
      parts.push({
        j: J.head,
        shape: 'cone',
        size: [0.035, 0.2 - Math.abs(i - 2) * 0.03, 4],
        at: [0, 0.4 - Math.abs(i - 2) * 0.015, -0.1 + i * 0.05],
        color: rp.eye,
        glow: true,
        glowI: 1.6,
      });
    for (const [j, sx] of [
      [J.upperArmL, 1],
      [J.upperArmR, -1],
    ] as const)
      for (const dz of [-0.05, 0.05])
        parts.push({
          j,
          shape: 'cone',
          size: [0.025, 0.09, 4],
          at: [sx * 0.03, 0.07, dz],
          color: 0xc8ccd4,
        });
    parts.push({
      j: J.hips,
      shape: 'box',
      size: [0.34, 0.04, cd + 0.02],
      at: [0, 0.07, 0],
      color: 0xc8ccd4,
    });
    return parts;
  },
  praca_tagger: (rp) => [
    // capuz, máscara de pintor e a lata de spray
    { j: J.head, shape: 'cone', size: [0.2, 0.34, 5], at: [0, 0.31, -0.02], color: rp.cloth },
    { j: J.head, shape: 'box', size: [0.2, 0.12, 0.06], at: [0, 0.07, 0.15], color: 0x2a2a2e },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.04, 0.04, 0.06, 6],
      at: [0.07, 0.05, 0.19],
      rot: [H, 0, 0],
      color: 0x4a4a52,
    },
    { j: J.handR, shape: 'cyl', size: [0.04, 0.04, 0.17, 7], at: [0, -0.12, 0.05], color: 0xd8d8e0 },
    {
      j: J.handR,
      shape: 'cyl',
      size: [0.042, 0.042, 0.05, 7],
      at: [0, -0.12, 0.05],
      color: rp.eye,
      glow: true,
      glowI: 1.8,
    },
  ],
};
