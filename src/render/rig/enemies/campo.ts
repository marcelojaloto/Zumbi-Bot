import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { EnemyExtra } from './types';

const H = Math.PI / 2;
const WHITE = 0xf2f2ea;
const BLACK = 0x14161c;

function socks(color: number): PartSpec[] {
  return [
    { j: J.shinL, shape: 'box', size: [0.16, 0.22, 0.16], at: [0, -0.3, 0], color },
    { j: J.shinR, shape: 'box', size: [0.16, 0.22, 0.16], at: [0, -0.3, 0], color },
  ];
}

export const campoExtras: Record<string, EnemyExtra> = {
  // jogador: número nas costas, faixa no peito e meiões
  campo_player: (rp, cd) => [
    { j: J.chest, shape: 'box', size: [0.13, 0.16, 0.012], at: [0, 0.07, -cd / 2 - 0.007], color: WHITE },
    {
      j: J.chest,
      shape: 'box',
      size: [0.42 * (rp.bulk ?? 1) + 0.012, 0.05, cd + 0.012],
      at: [0, 0.12, 0],
      color: WHITE,
    },
    ...socks(WHITE),
  ],
  // goleiro: luvas grandes, boné e meiões
  campo_keeper: (_rp, cd) => [
    { j: J.handL, shape: 'box', size: [0.2, 0.22, 0.2], at: [0, -0.08, 0.01], color: 0x3ac85a },
    { j: J.handR, shape: 'box', size: [0.2, 0.22, 0.2], at: [0, -0.08, 0.01], color: 0x3ac85a },
    { j: J.handL, shape: 'box', size: [0.21, 0.05, 0.21], at: [0, 0.01, 0.01], color: WHITE },
    { j: J.handR, shape: 'box', size: [0.21, 0.05, 0.21], at: [0, 0.01, 0.01], color: WHITE },
    { j: J.head, shape: 'box', size: [0.27, 0.07, 0.28], at: [0, 0.3, 0], color: BLACK },
    { j: J.head, shape: 'box', size: [0.24, 0.02, 0.14], at: [0, 0.28, 0.18], color: BLACK },
    { j: J.chest, shape: 'box', size: [0.1, 0.16, 0.012], at: [0, 0.07, -cd / 2 - 0.007], color: BLACK },
    ...socks(BLACK),
  ],
  // juiz: gola branca, apito e o cartão vermelho na mão
  campo_ref: (_rp, cd) => [
    { j: J.chest, shape: 'box', size: [0.2, 0.04, cd + 0.012], at: [0, 0.2, 0], color: WHITE },
    { j: J.chest, shape: 'box', size: [0.08, 0.08, 0.012], at: [0.1, 0.1, cd / 2 + 0.007], color: 0xffd23a },
    { j: J.head, shape: 'sphere', size: [0.035, 6, 4], at: [0, 0.05, 0.17], color: 0xc8ccd0 },
    {
      j: J.handR,
      shape: 'box',
      size: [0.02, 0.13, 0.09],
      at: [0, -0.1, 0.07],
      color: 0xff2a2a,
      glow: true,
      glowI: 1.8,
    },
    ...socks(BLACK),
  ],
  // torcedor: cachecol do time e o sinalizador aceso
  campo_flare: (rp) => [
    { j: J.neck, shape: 'torus', size: [0.12, 0.04], at: [0, 0.02, 0], rot: [H, 0, 0], color: WHITE },
    { j: J.chest, shape: 'box', size: [0.08, 0.3, 0.03], at: [0.09, 0.02, 0.15], color: WHITE },
    { j: J.chest, shape: 'box', size: [0.08, 0.06, 0.032], at: [0.09, -0.02, 0.15], color: rp.cloth },
    { j: J.handR, shape: 'cyl', size: [0.025, 0.025, 0.28, 6], at: [0, 0, 0.07], color: 0x8a1414 },
    {
      j: J.handR,
      shape: 'cone',
      size: [0.07, 0.24, 5],
      at: [0, 0.24, 0.07],
      color: 0xff3a2a,
      glow: true,
      glowI: 3.2,
    },
    {
      j: J.handR,
      shape: 'sphere',
      size: [0.05, 6, 4],
      at: [0, 0.14, 0.07],
      color: 0xffd0a0,
      glow: true,
      glowI: 4,
    },
  ],
};
