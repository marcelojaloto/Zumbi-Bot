import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const HULL = 0x2a3a44;
const BRASS = 0xb08a3a;
const CORE = 0xff2a3a;
const CYAN = 0x39e6ff;
const BARNACLE = 0x9aa890;

/** Tentáculo de cabos: gomos que afinam, saindo das costas. */
function tentacle(x: number, y: number, lean: number): PartSpec[] {
  const out: PartSpec[] = [];
  for (let i = 0; i < 5; i++)
    out.push({
      j: J.chest,
      shape: 'sphere',
      size: [0.09 - i * 0.012, 6, 4],
      at: [x + lean * i * 0.11, y + i * 0.02 - i * i * 0.012, -0.3 - i * 0.12],
      color: i % 2 ? HULL : 0x1a2a32,
    });
  out.push({
    j: J.chest,
    shape: 'sphere',
    size: [0.035, 5, 4],
    at: [x + lean * 0.55, y - 0.22, -0.9],
    color: CYAN,
    glow: true,
    glowI: 3,
  });
  return out;
}

/**
 * OMEGA-Z Abissal: escafandro de latão com a viseira vermelha, núcleo aceso no peito atrás de uma grade,
 * placas de casco com cracas, luvas de pinça e quatro tentáculos de cabos nas costas.
 */
export const abissalExtra: BossExtra = (_s, d) => {
  const bulk = d.rig.bulk ?? 1;
  const cd = 0.26 * bulk;
  const fz = cd / 2 + 0.01;
  const parts: PartSpec[] = [
    // escafandro
    { j: J.head, shape: 'sphere', size: [0.24, 10, 8], at: [0, 0.15, 0], color: BRASS },
    { j: J.head, shape: 'cyl', size: [0.25, 0.27, 0.08, 10], at: [0, -0.02, 0], color: BRASS },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.13, 0.13, 0.06, 10],
      at: [0, 0.16, 0.2],
      rot: [H, 0, 0],
      color: HULL,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.1, 0.1, 0.07, 10],
      at: [0, 0.16, 0.21],
      rot: [H, 0, 0],
      color: CORE,
      glow: true,
      glowI: 4,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.06, 0.06, 0.05, 8],
      at: [0.2, 0.17, 0.06],
      rot: [0, 0, H],
      color: CYAN,
      glow: true,
      glowI: 2.5,
    },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.06, 0.06, 0.05, 8],
      at: [-0.2, 0.17, 0.06],
      rot: [0, 0, H],
      color: CYAN,
      glow: true,
      glowI: 2.5,
    },
    // núcleo e grade
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.13, 8, 6],
      at: [0, 0.08, fz - 0.04],
      color: CORE,
      glow: true,
      glowI: 3.6,
    },
    { j: J.chest, shape: 'box', size: [0.02, 0.3, 0.02], at: [0.06, 0.08, fz + 0.08], color: HULL },
    { j: J.chest, shape: 'box', size: [0.02, 0.3, 0.02], at: [-0.06, 0.08, fz + 0.08], color: HULL },
    { j: J.chest, shape: 'box', size: [0.3, 0.02, 0.02], at: [0, 0.08, fz + 0.08], color: HULL },
    // placas de casco e cracas
    { j: J.chest, shape: 'box', size: [0.5, 0.16, 0.05], at: [0, -0.12, fz], color: HULL },
    { j: J.upperArmL, shape: 'sphere', size: [0.17, 7, 5], at: [0.05, 0.04, 0], color: HULL },
    { j: J.upperArmR, shape: 'sphere', size: [0.17, 7, 5], at: [-0.05, 0.04, 0], color: HULL },
    { j: J.upperArmL, shape: 'ico', size: [0.05, 0], at: [0.12, 0.14, 0.05], color: BARNACLE, jitter: 0.2 },
    { j: J.upperArmR, shape: 'ico', size: [0.06, 0], at: [-0.1, 0.15, -0.04], color: BARNACLE, jitter: 0.2 },
    { j: J.chest, shape: 'ico', size: [0.05, 0], at: [0.2, 0.2, fz - 0.02], color: BARNACLE, jitter: 0.2 },
    { j: J.thighL, shape: 'ico', size: [0.05, 0], at: [0.06, -0.15, 0.1], color: BARNACLE, jitter: 0.2 },
    // pinças
    { j: J.handL, shape: 'box', size: [0.07, 0.24, 0.1], at: [0.07, -0.16, 0.02], color: BRASS },
    { j: J.handL, shape: 'box', size: [0.07, 0.24, 0.1], at: [-0.07, -0.16, 0.02], color: BRASS },
    { j: J.handR, shape: 'box', size: [0.07, 0.24, 0.1], at: [0.07, -0.16, 0.02], color: BRASS },
    { j: J.handR, shape: 'box', size: [0.07, 0.24, 0.1], at: [-0.07, -0.16, 0.02], color: BRASS },
    // tanque nas costas
    { j: J.chest, shape: 'cyl', size: [0.13, 0.13, 0.42, 8], at: [0, 0.06, -cd / 2 - 0.12], color: BRASS },
    ...tentacle(0.16, 0.22, 1),
    ...tentacle(-0.16, 0.22, -1),
    ...tentacle(0.2, 0, 1.3),
    ...tentacle(-0.2, 0, -1.3),
  ];
  return parts;
};
