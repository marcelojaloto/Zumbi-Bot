import type { MeshPart } from './types';

/** Uma peça do penteado, em relação à junta da cabeça do Prodígio; `hi` = mecha mais clara. */
interface HairPiece {
  shape: 'box' | 'cone';
  size: number[];
  at: [number, number, number];
  rot?: [number, number, number];
  hi?: boolean;
}

/** Cabelo espetado do Prodígio. O rig dele e a peruca do disfarce usam o mesmo desenho. */
export const PRODIGY_HAIR: HairPiece[] = [
  { shape: 'box', size: [0.25, 0.07, 0.24], at: [0, 0.28, -0.005] },
  { shape: 'box', size: [0.1, 0.07, 0.05], at: [0.045, 0.262, 0.112], rot: [0.35, 0, -0.25], hi: true },
  { shape: 'box', size: [0.09, 0.06, 0.05], at: [-0.06, 0.255, 0.108], rot: [0.3, 0, 0.3] },
  { shape: 'box', size: [0.03, 0.12, 0.18], at: [0.125, 0.2, -0.01] },
  { shape: 'box', size: [0.03, 0.12, 0.18], at: [-0.125, 0.2, -0.01] },
  { shape: 'box', size: [0.24, 0.16, 0.05], at: [0, 0.19, -0.115] },
  { shape: 'cone', size: [0.05, 0.11, 5], at: [0.03, 0.335, -0.02], rot: [0, 0, -0.45], hi: true },
  { shape: 'cone', size: [0.045, 0.09, 5], at: [-0.05, 0.325, -0.04], rot: [0.2, 0, 0.5] },
];

/** Encaixe `head_top` do Prodígio: altura acima da junta da cabeça e escala dos cosméticos. */
const HEAD_TOP = 0.27;
const HEAD_SCALE = 0.78;
/** Centro da cabeça (em relação à junta), de onde a peruca se afasta um pouco para cobrir o cabelo. */
const HEAD_CY = 0.13;
const HEAD_CZ = 0.01;

/**
 * Peruca com o mesmo formato do cabelo do Prodígio, um pouco maior para cobrir o loiro, já nas medidas do
 * encaixe da cabeça (serve nos outros personagens como qualquer chapéu).
 */
export function hairWig(color: number, hi: number): MeshPart[] {
  const grow = 1.15;
  const spread = 1.03;
  return PRODIGY_HAIR.map((h) => ({
    shape: h.shape,
    // o último número do cone é a quantidade de lados, não uma medida
    size: h.size.map((v, i) => (h.shape === 'cone' && i === 2 ? v : (v * grow) / HEAD_SCALE)),
    pos: [
      (h.at[0] * spread) / HEAD_SCALE,
      (HEAD_CY + (h.at[1] - HEAD_CY) * spread - HEAD_TOP) / HEAD_SCALE,
      (HEAD_CZ + (h.at[2] - HEAD_CZ) * spread) / HEAD_SCALE,
    ],
    ...(h.rot ? { rot: h.rot } : {}),
    color: h.hi ? hi : color,
  }));
}
