import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const BRASS = 0xc8963a;
const BRASS_DARK = 0x8a6428;

/**
 * Sentinela dos Ventos: mech de bronze com rotor gigante nas costas (anel de vento aceso),
 * elmo em forma de sino, cata-vento na cabeça e turbinas nos ombros.
 * A câmera vê sempre o lado direito do modelo (-X) e parte da frente (+Z).
 */
export const sentinelaExtra: BossExtra = (_s, d) => {
  const glow = d.rig.eye;
  const dark = d.rig.cloth;
  const parts: PartSpec[] = [];

  // --- rotor nas costas (plano YZ, visto de frente pela câmera) ---
  const rc: [number, number, number] = [0, 0.3, -1.0];
  parts.push(
    { j: J.chest, shape: 'cyl', size: [0.07, 0.07, 0.55, 6], at: [0, 0.3, -0.72], rot: [H, 0, 0], color: dark },
    { j: J.chest, shape: 'cyl', size: [0.17, 0.17, 0.16, 10], at: rc, rot: [0, 0, H], color: BRASS_DARK },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.08, 0.08, 0.2, 8],
      at: [rc[0] - 0.02, rc[1], rc[2]],
      rot: [0, 0, H],
      color: glow,
      glow: true,
      glowI: 3,
    },
    { j: J.chest, shape: 'torus', size: [0.82, 0.07, 6, 28], at: [0.03, rc[1], rc[2]], rot: [0, H, 0], color: dark },
    {
      j: J.chest,
      shape: 'torus',
      size: [0.82, 0.035, 5, 28],
      at: [-0.05, rc[1], rc[2]],
      rot: [0, H, 0],
      color: glow,
      glow: true,
      glowI: 1.3,
    },
  );
  for (let k = 0; k < 3; k++) {
    parts.push({
      j: J.chest,
      shape: 'box',
      size: [0.04, 1.5, 0.17],
      at: rc,
      rot: [(k * Math.PI) / 3 + 0.2, 0, 0],
      color: BRASS,
    });
  }

  // --- elmo-sino, cata-vento e antena ---
  parts.push(
    { j: J.head, shape: 'cyl', size: [0.25, 0.25, 0.035, 12], at: [0, 0.1, 0.08], color: BRASS_DARK },
    { j: J.head, shape: 'cyl', size: [0.12, 0.23, 0.22, 12], at: [0, 0.21, 0.08], color: BRASS },
    { j: J.head, shape: 'sphere', size: [0.12, 8, 6], at: [0, 0.32, 0.08], color: BRASS },
    { j: J.head, shape: 'cyl', size: [0.015, 0.015, 0.55, 5], at: [-0.06, 0.6, 0.06], color: dark },
    { j: J.head, shape: 'box', size: [0.02, 0.035, 0.36], at: [-0.06, 0.74, 0.08], color: BRASS },
    { j: J.head, shape: 'box', size: [0.02, 0.14, 0.09], at: [-0.06, 0.74, -0.1], color: BRASS },
    { j: J.head, shape: 'cone', size: [0.04, 0.08, 4], at: [-0.06, 0.74, 0.3], rot: [H, 0, 0], color: BRASS },
    {
      j: J.head,
      shape: 'sphere',
      size: [0.045, 6, 4],
      at: [-0.06, 0.89, 0.06],
      color: glow,
      glow: true,
      glowI: 4,
    },
  );

  // --- turbinas nos ombros (eixo X, de frente para a câmera) ---
  for (const side of [-1, 1] as const) {
    const j = side < 0 ? J.upperArmR : J.upperArmL;
    const x = side * 0.2;
    parts.push(
      { j, shape: 'cyl', size: [0.25, 0.25, 0.22, 12], at: [x, 0.06, 0], rot: [0, 0, H], color: dark },
      {
        j,
        shape: 'cyl',
        size: [0.18, 0.18, 0.23, 12],
        at: [x, 0.06, 0],
        rot: [0, 0, H],
        color: glow,
        glow: true,
        glowI: 1.2,
      },
      { j, shape: 'box', size: [0.25, 0.04, 0.4], at: [x, 0.06, 0], rot: [Math.PI / 4, 0, 0], color: BRASS_DARK },
      { j, shape: 'box', size: [0.25, 0.04, 0.4], at: [x, 0.06, 0], rot: [-Math.PI / 4, 0, 0], color: BRASS_DARK },
    );
  }

  // --- engrenagem de latão na lateral do peito ---
  parts.push({
    j: J.chest,
    shape: 'torus',
    size: [0.16, 0.045, 5, 14],
    at: [-0.47, 0.1, 0.02],
    rot: [0, H, 0],
    color: BRASS,
  });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    parts.push({
      j: J.chest,
      shape: 'box',
      size: [0.05, 0.07, 0.07],
      at: [-0.47, 0.1 + Math.cos(a) * 0.22, 0.02 + Math.sin(a) * 0.22],
      rot: [a, 0, 0],
      color: BRASS,
    });
  }
  parts.push({
    j: J.chest,
    shape: 'cyl',
    size: [0.06, 0.06, 0.06, 8],
    at: [-0.48, 0.1, 0.02],
    rot: [0, 0, H],
    color: glow,
    glow: true,
    glowI: 3,
  });

  // --- punhos pesados e aberturas de ventilação nas canelas ---
  for (const j of [J.handL, J.handR]) {
    parts.push({ j, shape: 'box', size: [0.3, 0.26, 0.3], at: [0, -0.12, 0.02], color: dark });
    parts.push({ j, shape: 'box', size: [0.32, 0.06, 0.32], at: [0, 0.02, 0.02], color: BRASS_DARK });
  }
  for (const [j, x] of [
    [J.shinR, -0.15],
    [J.shinL, 0.15],
  ] as const) {
    for (const y of [-0.12, -0.24, -0.36]) {
      parts.push({ j, shape: 'box', size: [0.02, 0.035, 0.14], at: [x, y, 0], color: 0x2e8a96, glow: true, glowI: 1 });
    }
  }
  return parts;
};
