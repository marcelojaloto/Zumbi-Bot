import { J } from '../skeleton';
import type { EnemyExtra } from './types';

const H = Math.PI / 2;
const BLACK = 0x16181c;
const STEEL = 0xa8aeb8;

export const lojaExtras: Record<string, EnemyExtra> = {
  // crachá e prancheta de vendedor
  loja_salesman: (_rp, cd) => [
    { j: J.chest, shape: 'box', size: [0.08, 0.06, 0.02], at: [-0.13, 0.1, cd / 2 + 0.012], color: 0xffd23a },
    { j: J.handL, shape: 'box', size: [0.2, 0.28, 0.02], at: [0, -0.1, 0.06], color: 0x7a5a32 },
    { j: J.handL, shape: 'box', size: [0.16, 0.22, 0.01], at: [0, -0.1, 0.075], color: 0xf4f0e8 },
  ],
  // boneco de teste: alvos de colisão, juntas pretas e faixa de aviso
  loja_dummy: (_rp, cd) => [
    {
      j: J.head,
      shape: 'cyl',
      size: [0.07, 0.07, 0.02, 10],
      at: [0.126, 0.16, 0],
      rot: [0, 0, H],
      color: BLACK,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.07, 0.07, 0.02, 10],
      at: [-0.126, 0.16, 0],
      rot: [0, 0, H],
      color: BLACK,
    },
    { j: J.head, shape: 'box', size: [0.255, 0.05, 0.265], at: [0, 0.05, 0.01], color: BLACK },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.09, 0.09, 0.02, 10],
      at: [0, 0.06, cd / 2 + 0.012],
      rot: [H, 0, 0],
      color: BLACK,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.04, 0.04, 0.02, 8],
      at: [0, 0.06, cd / 2 + 0.022],
      rot: [H, 0, 0],
      color: 0xf2c21a,
    },
    { j: J.foreArmL, shape: 'box', size: [0.13, 0.06, 0.13], at: [0, 0, 0], color: BLACK },
    { j: J.foreArmR, shape: 'box', size: [0.13, 0.06, 0.13], at: [0, 0, 0], color: BLACK },
    { j: J.shinL, shape: 'box', size: [0.16, 0.07, 0.16], at: [0, 0, 0], color: BLACK },
    { j: J.shinR, shape: 'box', size: [0.16, 0.07, 0.16], at: [0, 0, 0], color: BLACK },
  ],
  // mecânico: boné, alças do macacão e a chave inglesa
  loja_mechanic: (_rp, cd) => [
    { j: J.head, shape: 'box', size: [0.27, 0.07, 0.28], at: [0, 0.3, 0], color: 0xd8302a },
    { j: J.head, shape: 'box', size: [0.24, 0.02, 0.14], at: [0, 0.28, 0.18], color: 0xd8302a },
    { j: J.chest, shape: 'box', size: [0.07, 0.34, 0.02], at: [0.14, 0.05, cd / 2 + 0.012], color: 0x223a60 },
    {
      j: J.chest,
      shape: 'box',
      size: [0.07, 0.34, 0.02],
      at: [-0.14, 0.05, cd / 2 + 0.012],
      color: 0x223a60,
    },
    { j: J.handR, shape: 'box', size: [0.05, 0.6, 0.05], at: [0, -0.22, 0.08], color: STEEL },
    { j: J.handR, shape: 'box', size: [0.05, 0.14, 0.2], at: [0, -0.52, 0.12], color: STEEL },
    { j: J.handR, shape: 'box', size: [0.052, 0.08, 0.08], at: [0, -0.55, 0.12], color: BLACK },
  ],
  // drone guincho: cabo e gancho pendurados (junta 1 = corpo do drone)
  loja_tow: () => [
    { j: 1, shape: 'box', size: [0.02, 0.3, 0.02], at: [0, -0.46, 0], color: BLACK },
    { j: 1, shape: 'torus', size: [0.07, 0.02], at: [0, -0.66, 0], rot: [0, H, 0], color: STEEL },
    { j: 1, shape: 'box', size: [0.3, 0.05, 0.06], at: [0, 0.16, 0], color: 0xffc21a },
  ],
};
