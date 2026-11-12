import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { EnemyExtra } from './types';

const H = Math.PI / 2;
const WHITE = 0xf2efe6;
const DARK = 0x16161e;

/** Número de peito, na frente e nas costas. */
function bib(cd: number, w = 0.2): PartSpec[] {
  const out: PartSpec[] = [];
  for (const s of [1, -1]) {
    out.push({
      j: J.chest,
      shape: 'box',
      size: [w, 0.15, 0.02],
      at: [0, 0.08, s * (cd / 2 + 0.014)],
      color: WHITE,
    });
    out.push({
      j: J.chest,
      shape: 'box',
      size: [w * 0.25, 0.1, 0.02],
      at: [0, 0.08, s * (cd / 2 + 0.02)],
      color: DARK,
    });
  }
  return out;
}

export const pistaExtras: Record<string, EnemyExtra> = {
  pista_sprinter: (_rp, cd) => [
    ...bib(cd),
    { j: J.head, shape: 'box', size: [0.27, 0.045, 0.28], at: [0, 0.22, 0.01], color: 0xd8302a },
    { j: J.footL, shape: 'box', size: [0.13, 0.08, 0.26], at: [0, 0.04, 0.05], color: 0xffd23a },
    { j: J.footR, shape: 'box', size: [0.13, 0.08, 0.26], at: [0, 0.04, 0.05], color: 0xffd23a },
  ],
  pista_javelin: (_rp, cd) => [
    ...bib(cd, 0.24),
    // dardo na mão, apontado para a frente
    {
      j: J.handR,
      shape: 'cyl',
      size: [0.016, 0.016, 1.6, 5],
      at: [0, -0.05, 0.3],
      rot: [H, 0, 0],
      color: 0xd8d0c0,
    },
    {
      j: J.handR,
      shape: 'cone',
      size: [0.035, 0.16, 5],
      at: [0, -0.05, 1.18],
      rot: [H, 0, 0],
      color: 0x9aa0a8,
    },
    { j: J.head, shape: 'box', size: [0.27, 0.05, 0.28], at: [0, 0.27, 0.01], color: WHITE },
    { j: J.head, shape: 'box', size: [0.24, 0.02, 0.14], at: [0, 0.25, 0.19], color: WHITE },
  ],
  pista_shot: (_rp, cd) => [
    ...bib(cd, 0.3),
    { j: J.handR, shape: 'sphere', size: [0.14, 7, 5], at: [0, -0.13, 0.04], color: 0x2a2c32 },
    { j: J.foreArmL, shape: 'box', size: [0.17, 0.08, 0.17], at: [0, -0.2, 0], color: WHITE },
    { j: J.foreArmR, shape: 'box', size: [0.17, 0.08, 0.17], at: [0, -0.2, 0], color: WHITE },
    { j: J.hips, shape: 'box', size: [0.5, 0.1, 0.36], at: [0, 0.07, 0], color: 0x3a2a1a },
  ],
  pista_referee: (_rp, cd) => [
    // listras do uniforme, bandeirinha e apito
    { j: J.chest, shape: 'box', size: [0.05, 0.3, 0.02], at: [0.1, 0.05, cd / 2 + 0.012], color: DARK },
    { j: J.chest, shape: 'box', size: [0.05, 0.3, 0.02], at: [-0.1, 0.05, cd / 2 + 0.012], color: DARK },
    {
      j: J.handL,
      shape: 'cyl',
      size: [0.012, 0.012, 0.6, 5],
      at: [0, -0.05, 0.26],
      rot: [H, 0, 0],
      color: 0xd8d0c0,
    },
    { j: J.handL, shape: 'box', size: [0.02, 0.22, 0.26], at: [0, 0.06, 0.42], color: 0xffd23a },
    { j: J.chest, shape: 'box', size: [0.04, 0.03, 0.05], at: [0, 0.12, cd / 2 + 0.03], color: 0xc8ccd4 },
  ],
};
