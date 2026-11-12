import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { EnemyExtra } from './types';

const H = Math.PI / 2;
// corpo do drone (esqueleto próprio)
const DRONE_BODY = 1;

export const estudioExtras: Record<string, EnemyExtra> = {
  // guitarra pendurada na mão e moicano
  estudio_guitar: () => [
    { j: J.handR, shape: 'box', size: [0.04, 0.5, 0.05], at: [0, -0.15, 0.08], color: 0x3a2a1c },
    { j: J.handR, shape: 'box', size: [0.05, 0.26, 0.22], at: [0, -0.5, 0.1], color: 0xc8202a },
    { j: J.handR, shape: 'box', size: [0.055, 0.08, 0.06], at: [0, -0.5, 0.1], color: 0xe8e0d8 },
    { j: J.head, shape: 'box', size: [0.04, 0.13, 0.24], at: [0, 0.36, 0], color: 0xff3ad8 },
  ],
  // bastão de luz e faixa na cabeça
  estudio_fan: (rp) => [
    {
      j: J.handL,
      shape: 'box',
      size: [0.03, 0.3, 0.03],
      at: [0, -0.2, 0.05],
      color: rp.eye,
      glow: true,
      glowI: 3,
    },
    { j: J.head, shape: 'box', size: [0.265, 0.04, 0.275], at: [0, 0.22, 0.005], color: 0xffd23a },
  ],
  // fone com microfone e a caixa de equipamento nas costas
  estudio_roadie: (_rp, cd): PartSpec[] => [
    {
      j: J.head,
      shape: 'cyl',
      size: [0.07, 0.07, 0.05, 8],
      at: [0.15, 0.16, 0],
      rot: [0, 0, H],
      color: 0x101014,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.07, 0.07, 0.05, 8],
      at: [-0.15, 0.16, 0],
      rot: [0, 0, H],
      color: 0x101014,
    },
    { j: J.head, shape: 'torus', size: [0.15, 0.02], at: [0, 0.17, 0], color: 0x101014 },
    { j: J.head, shape: 'box', size: [0.02, 0.02, 0.16], at: [0.14, 0.08, 0.09], color: 0x101014 },
    { j: J.chest, shape: 'box', size: [0.44, 0.46, 0.22], at: [0, 0.02, -cd / 2 - 0.12], color: 0x1a1a20 },
    { j: J.chest, shape: 'box', size: [0.46, 0.05, 0.24], at: [0, 0.22, -cd / 2 - 0.12], color: 0x9aa0a8 },
    { j: J.chest, shape: 'box', size: [0.46, 0.05, 0.24], at: [0, -0.18, -cd / 2 - 0.12], color: 0x9aa0a8 },
  ],
  // lente da câmera e a luz de gravando
  estudio_cam: (rp) => [
    {
      j: DRONE_BODY,
      shape: 'cyl',
      size: [0.09, 0.11, 0.16, 10],
      at: [0, -0.04, 0.24],
      rot: [H, 0, 0],
      color: 0x0c0c10,
    },
    {
      j: DRONE_BODY,
      shape: 'sphere',
      size: [0.035, 6, 4],
      at: [0.13, 0.13, 0.12],
      color: rp.cloth2,
      glow: true,
      glowI: 4,
    },
  ],
};
