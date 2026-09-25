import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const STEEL_L = 0xc2cad2;
const BRASS = 0xd8b04a;
const BLACK = 0x14161a;
const SPARK = 0x7ae8ff;

/**
 * Guardião do Cofre: mech de segurança com o tronco em forma de porta-cofre (tambor de aço com
 * volante de latão, voltado para a câmera), elmo antimotim com sirene, giroflexes nos ombros,
 * faixas de perigo, escudo no braço esquerdo e cassetete elétrico na mão direita.
 * A câmera vê sempre o lado direito do modelo (-X) e parte da frente (+Z).
 */
export const guardiaoExtra: BossExtra = (_s, d) => {
  const warn = d.rig.eye;
  const stripe = d.rig.cloth2;
  const dark = d.rig.cloth;
  const parts: PartSpec[] = [];

  // --- tronco: tambor do cofre (eixo X) ---
  const cy = 0.06;
  const R = 0.5;
  parts.push(
    { j: J.chest, shape: 'cyl', size: [R, R, 1.0, 18], at: [0, cy, 0], rot: [0, 0, H], color: d.rig.skin },
    { j: J.chest, shape: 'cyl', size: [R - 0.04, R - 0.04, 0.05, 18], at: [-0.52, cy, 0], rot: [0, 0, H], color: STEEL_L },
    { j: J.chest, shape: 'torus', size: [R - 0.08, 0.04, 5, 24], at: [-0.55, cy, 0], rot: [0, H, 0], color: BRASS },
    { j: J.chest, shape: 'torus', size: [R, 0.05, 5, 24], at: [-0.5, cy, 0], rot: [0, H, 0], color: stripe },
    { j: J.chest, shape: 'torus', size: [R, 0.05, 5, 24], at: [0.5, cy, 0], rot: [0, H, 0], color: dark },
    // pescoço até o elmo (o elmo fica acima do tambor)
    { j: J.head, shape: 'cyl', size: [0.1, 0.12, 0.3, 8], at: [0, 0.14, 0.02], color: dark },
    // volante
    { j: J.chest, shape: 'cyl', size: [0.09, 0.09, 0.1, 10], at: [-0.6, cy, 0], rot: [0, 0, H], color: BRASS },
    { j: J.chest, shape: 'torus', size: [0.26, 0.028, 4, 16], at: [-0.63, cy, 0], rot: [0, H, 0], color: BRASS },
  );
  for (let k = 0; k < 3; k++)
    parts.push({
      j: J.chest,
      shape: 'box',
      size: [0.035, 0.56, 0.05],
      at: [-0.62, cy, 0],
      rot: [(k * Math.PI) / 3, 0, 0],
      color: BRASS,
    });
  // parafusos da porta
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    parts.push({
      j: J.chest,
      shape: 'sphere',
      size: [0.035, 5, 4],
      at: [-0.56, cy + Math.cos(a) * 0.34, Math.sin(a) * 0.34],
      color: dark,
    });
  }
  // dobradiças e luz de status
  parts.push(
    { j: J.chest, shape: 'box', size: [0.1, 0.14, 0.1], at: [-0.54, cy + 0.28, 0.42], color: dark },
    { j: J.chest, shape: 'box', size: [0.1, 0.14, 0.1], at: [-0.54, cy - 0.28, 0.42], color: dark },
    {
      j: J.chest,
      shape: 'box',
      size: [0.04, 0.07, 0.12],
      at: [-0.56, cy + 0.38, -0.18],
      color: warn,
      glow: true,
      glowI: 4,
    },
  );

  // --- elmo antimotim com viseira e sirene ---
  parts.push(
    { j: J.head, shape: 'box', size: [0.4, 0.26, 0.4], at: [0, 0.36, 0.08], color: dark },
    { j: J.head, shape: 'box', size: [0.32, 0.07, 0.02], at: [0, 0.36, 0.285], color: warn, glow: true, glowI: 3.5 },
    { j: J.head, shape: 'box', size: [0.02, 0.07, 0.24], at: [-0.205, 0.36, 0.14], color: warn, glow: true, glowI: 3.5 },
    { j: J.head, shape: 'box', size: [0.42, 0.04, 0.42], at: [0, 0.5, 0.08], color: stripe },
    { j: J.head, shape: 'cyl', size: [0.08, 0.1, 0.06, 8], at: [0, 0.55, 0.06], color: dark },
    { j: J.head, shape: 'sphere', size: [0.09, 8, 6], at: [0, 0.61, 0.06], color: warn, glow: true, glowI: 4.5 },
  );

  // --- giroflexes nos ombros e faixas de perigo ---
  for (const side of [-1, 1] as const) {
    const x = side * 0.42;
    parts.push(
      { j: J.chest, shape: 'cyl', size: [0.08, 0.09, 0.05, 8], at: [x, 0.54, 0.06], color: dark },
      {
        j: J.chest,
        shape: 'cyl',
        size: [0.07, 0.07, 0.12, 8],
        at: [x, 0.62, 0.06],
        color: side < 0 ? warn : 0xffa01a,
        glow: true,
        glowI: 4,
      },
    );
  }
  const armR = J.upperArmR;
  parts.push({ j: armR, shape: 'box', size: [0.05, 0.32, 0.38], at: [-0.23, 0, 0], color: stripe });
  for (const y of [-0.1, 0.02, 0.14])
    parts.push({ j: armR, shape: 'box', size: [0.055, 0.05, 0.42], at: [-0.235, y, 0], rot: [0.7, 0, 0], color: BLACK });
  for (const [j, x] of [
    [J.shinR, -0.15],
    [J.shinL, 0.15],
  ] as const) {
    parts.push({ j, shape: 'box', size: [0.02, 0.34, 0.3], at: [x, -0.26, 0], color: stripe });
    for (const y of [-0.16, -0.3])
      parts.push({ j, shape: 'box', size: [0.025, 0.05, 0.36], at: [x * 1.04, y, 0], rot: [0.7, 0, 0], color: BLACK });
  }
  parts.push({ j: J.hips, shape: 'box', size: [0.64, 0.1, 0.44], at: [0, 0.12, 0], color: stripe });

  // --- escudo antimotim no antebraço esquerdo ---
  parts.push(
    { j: J.foreArmL, shape: 'box', size: [0.06, 1.0, 0.72], at: [0.2, -0.2, 0.12], color: 0x2a3848 },
    { j: J.foreArmL, shape: 'box', size: [0.065, 0.14, 0.5], at: [0.2, 0.05, 0.12], color: 0x9fd8ff, glow: true, glowI: 1.4 },
    { j: J.foreArmL, shape: 'box', size: [0.065, 0.06, 0.72], at: [0.2, -0.45, 0.12], color: stripe },
  );

  // --- cassetete elétrico na mão direita ---
  parts.push(
    { j: J.handR, shape: 'box', size: [0.28, 0.24, 0.28], at: [0, -0.1, 0.02], color: dark },
    { j: J.handR, shape: 'box', size: [0.08, 0.95, 0.08], at: [0, -0.12, 0.36], rot: [H * 0.9, 0, 0], color: BLACK },
    {
      j: J.handR,
      shape: 'box',
      size: [0.11, 0.36, 0.11],
      at: [0, -0.18, 0.78],
      rot: [H * 0.9, 0, 0],
      color: SPARK,
      glow: true,
      glowI: 3.5,
    },
    { j: J.handL, shape: 'box', size: [0.28, 0.24, 0.28], at: [0, -0.1, 0.02], color: dark },
  );

  // --- antenas nas costas ---
  for (const x of [-0.16, 0.16]) {
    parts.push(
      { j: J.chest, shape: 'cyl', size: [0.015, 0.02, 0.8, 4], at: [x, 0.75, -0.42], color: dark },
      { j: J.chest, shape: 'sphere', size: [0.04, 5, 4], at: [x, 1.16, -0.42], color: warn, glow: true, glowI: 4 },
    );
  }
  return parts;
};
