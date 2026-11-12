import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { EnemyExtra } from './types';

const H = Math.PI / 2;
const BRASS = 0xb08a3a;
// juntas do drone (rigs.ts DJ)
const BODY = 1;

export const marExtras: Record<string, EnemyExtra> = {
  // máscara de mergulho, snorkel e pés de pato
  mar_swimmer: () => [
    { j: J.head, shape: 'box', size: [0.24, 0.1, 0.05], at: [0, 0.17, 0.14], color: 0x10202a },
    {
      j: J.head,
      shape: 'box',
      size: [0.2, 0.07, 0.02],
      at: [0, 0.17, 0.17],
      color: 0x7affea,
      glow: true,
      glowI: 1.6,
    },
    { j: J.head, shape: 'cyl', size: [0.02, 0.02, 0.3, 5], at: [0.15, 0.3, 0], color: 0xff7a2a },
    { j: J.footL, shape: 'box', size: [0.16, 0.03, 0.4], at: [0, 0.01, 0.2], color: 0xffc21a },
    { j: J.footR, shape: 'box', size: [0.16, 0.03, 0.4], at: [0, 0.01, 0.2], color: 0xffc21a },
  ],
  // escafandro de latão e âncora no punho
  mar_diver: () => [
    { j: J.head, shape: 'sphere', size: [0.23, 8, 6], at: [0, 0.15, 0], color: BRASS },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.1, 0.1, 0.05, 8],
      at: [0, 0.16, 0.2],
      rot: [H, 0, 0],
      color: 0xffd24a,
      glow: true,
      glowI: 2.4,
    },
    { j: J.head, shape: 'cyl', size: [0.24, 0.26, 0.07, 8], at: [0, -0.01, 0], color: BRASS },
    { j: J.handR, shape: 'box', size: [0.05, 0.5, 0.05], at: [0, -0.2, 0.06], color: 0x3a4248 },
    { j: J.handR, shape: 'torus', size: [0.14, 0.035], at: [0, -0.46, 0.06], color: 0x3a4248 },
  ],
  // espinhos pelo corpo inchado
  mar_puffer: (rp, cd) => {
    const out: PartSpec[] = [
      { j: J.chest, shape: 'sphere', size: [0.34, 8, 6], at: [0, 0, 0], color: rp.skin },
    ];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      out.push({
        j: J.chest,
        shape: 'cone',
        size: [0.035, 0.16, 4],
        at: [Math.cos(a) * 0.36, Math.sin(a) * 0.36, i % 2 ? cd * 0.2 : -cd * 0.2],
        rot: [0, 0, a - H],
        color: 0xf4f0d8,
      });
    }
    out.push({
      j: J.chest,
      shape: 'box',
      size: [0.1, 0.06, 0.02],
      at: [0, 0.1, 0.34],
      color: 0xff5a10,
      glow: true,
      glowI: 3,
    });
    return out;
  },
  // arpão no braço e tanque de ar
  mar_harpoon: (_rp, cd) => [
    { j: J.foreArmR, shape: 'cyl', size: [0.02, 0.02, 0.7, 5], at: [0, -0.3, 0.06], color: 0xc8d0d8 },
    {
      j: J.foreArmR,
      shape: 'cone',
      size: [0.05, 0.14, 4],
      at: [0, -0.7, 0.06],
      rot: [Math.PI, 0, 0],
      color: 0xc8d0d8,
    },
    { j: J.chest, shape: 'cyl', size: [0.09, 0.09, 0.4, 8], at: [0, 0.04, -cd / 2 - 0.09], color: 0xffb02a },
  ],
  // drone em forma de peixe: mandíbula com dentes, barbatana e cauda
  mar_piranha: (rp) => [
    { j: BODY, shape: 'box', size: [0.22, 0.2, 0.34], at: [0, -0.02, 0.06], color: rp.skin },
    { j: BODY, shape: 'box', size: [0.2, 0.05, 0.16], at: [0, -0.12, 0.22], color: 0x4a1a1a },
    {
      j: BODY,
      shape: 'cone',
      size: [0.025, 0.07, 4],
      at: [0.06, -0.07, 0.28],
      rot: [Math.PI, 0, 0],
      color: 0xf4f0e0,
    },
    {
      j: BODY,
      shape: 'cone',
      size: [0.025, 0.07, 4],
      at: [-0.06, -0.07, 0.28],
      rot: [Math.PI, 0, 0],
      color: 0xf4f0e0,
    },
    { j: BODY, shape: 'cone', size: [0.025, 0.07, 4], at: [0, -0.1, 0.3], color: 0xf4f0e0 },
    {
      j: BODY,
      shape: 'box',
      size: [0.02, 0.16, 0.2],
      at: [0, 0.16, -0.02],
      rot: [0.5, 0, 0],
      color: rp.cloth,
    },
    { j: BODY, shape: 'box', size: [0.02, 0.26, 0.2], at: [0, 0, -0.3], color: rp.cloth },
  ],
};
