import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { EnemyExtra } from './types';

const H = Math.PI / 2;
const OLIVE = 0x4a5638;
const DARK = 0x1e221a;
const STEEL = 0x7a8088;

// a câmera vê o lado direito do modelo (-X) e um pouco da frente (+Z)
export const bunkerExtras: Record<string, EnemyExtra> = {
  /** Colete tático com bolsos e óculos de visão noturna. */
  bunker_vest: (_rp, cd) => {
    const f = cd / 2 + 0.02;
    return [
      { j: J.chest, shape: 'box', size: [0.44, 0.3, 0.05], at: [0, 0.04, f], color: OLIVE },
      { j: J.chest, shape: 'box', size: [0.44, 0.3, 0.05], at: [0, 0.04, -f], color: OLIVE },
      { j: J.chest, shape: 'box', size: [0.12, 0.1, 0.05], at: [-0.12, -0.03, f + 0.04], color: DARK },
      { j: J.chest, shape: 'box', size: [0.12, 0.1, 0.05], at: [0.1, -0.03, f + 0.04], color: DARK },
      { j: J.head, shape: 'box', size: [0.22, 0.06, 0.05], at: [0, 0.17, 0.15], color: DARK },
      {
        j: J.head,
        shape: 'box',
        size: [0.07, 0.04, 0.02],
        at: [-0.06, 0.17, 0.18],
        color: 0x5aff7a,
        glow: true,
        glowI: 3,
      },
      {
        j: J.head,
        shape: 'box',
        size: [0.07, 0.04, 0.02],
        at: [0.06, 0.17, 0.18],
        color: 0x5aff7a,
        glow: true,
        glowI: 3,
      },
    ];
  },
  /** Cilindro de gás nas costas, com a mangueira até a máscara. */
  bunker_tank: (_rp, cd) => {
    const b = -cd / 2;
    return [
      { j: J.chest, shape: 'cyl', size: [0.09, 0.09, 0.38, 8], at: [0, 0.04, b - 0.1], color: 0x6a8a2a },
      { j: J.chest, shape: 'sphere', size: [0.09, 7, 5], at: [0, 0.23, b - 0.1], color: 0x6a8a2a },
      { j: J.chest, shape: 'box', size: [0.2, 0.05, 0.04], at: [0, 0.06, b - 0.02], color: DARK },
      {
        j: J.chest,
        shape: 'cyl',
        size: [0.02, 0.02, 0.4, 5],
        at: [-0.12, 0.26, b + 0.1],
        rot: [0.9, 0, 0],
        color: DARK,
      },
      {
        j: J.chest,
        shape: 'box',
        size: [0.05, 0.05, 0.02],
        at: [-0.06, 0.1, b - 0.2],
        color: 0xd8ff3a,
        glow: true,
        glowI: 2.5,
      },
    ];
  },
  /** Canhão de ombro e antena do robô artilheiro. */
  bunker_turret: () => [
    { j: J.chest, shape: 'box', size: [0.16, 0.14, 0.22], at: [-0.26, 0.32, 0], color: DARK },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.04, 0.04, 0.44, 7],
      at: [-0.26, 0.33, 0.3],
      rot: [H, 0, 0],
      color: STEEL,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.05, 0.05, 0.02],
      at: [-0.26, 0.4, 0.12],
      color: 0xff3a3a,
      glow: true,
      glowI: 3,
    },
    { j: J.head, shape: 'cyl', size: [0.008, 0.008, 0.4, 4], at: [0.12, 0.5, -0.1], color: STEEL },
    // faixa de perigo no peito
    { j: J.chest, shape: 'box', size: [0.57, 0.05, 0.35], at: [0, -0.1, 0], color: 0xffc21a },
  ],
  /** Escudo antimotim no braço direito e capacete com viseira. */
  bunker_shield: (rp) => {
    const s = rp.bulk ?? 1;
    const parts: PartSpec[] = [
      {
        j: J.foreArmR,
        shape: 'box',
        size: [0.07, 0.95, 0.62],
        at: [-0.14, -0.1, 0.18],
        rot: [0, -0.35, 0],
        color: 0x2e343c,
      },
      {
        j: J.foreArmR,
        shape: 'box',
        size: [0.075, 0.14, 0.4],
        at: [-0.145, 0.16, 0.18],
        rot: [0, -0.35, 0],
        color: 0x9ad8e8,
        glow: true,
        glowI: 0.8,
      },
      {
        j: J.foreArmR,
        shape: 'box',
        size: [0.078, 0.06, 0.62],
        at: [-0.145, -0.5, 0.18],
        rot: [0, -0.35, 0],
        color: 0xffc21a,
      },
      { j: J.head, shape: 'sphere', size: [0.19, 8, 5], at: [0, 0.2, 0], color: 0x2e343c },
      { j: J.head, shape: 'box', size: [0.25, 0.1, 0.04], at: [0, 0.16, 0.16], color: 0x14181c },
      // ombreiras
      { j: J.upperArmL, shape: 'box', size: [0.2 * s, 0.1, 0.24 * s], at: [0.03, 0.04, 0], color: 0x2e343c },
      { j: J.upperArmR, shape: 'box', size: [0.2 * s, 0.1, 0.24 * s], at: [-0.03, 0.04, 0], color: 0x2e343c },
    ];
    return parts;
  },
};
