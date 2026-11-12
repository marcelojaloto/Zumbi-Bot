import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const CONCRETE = 0x8a8e84;
const STEEL = 0x6a7078;
const BLACK = 0x14161a;
const HOT = 0xff7a1a;

/**
 * Comandante Casamata: mech com placas de concreto no peito (a seteira acesa no meio), o
 * comandante zumbi de quepe na escotilha, torretas duplas nos ombros, lançador de mísseis nas costas, holofote, antena e
 * respiros em brasa. A câmera vê o lado direito do modelo (-X) e parte da frente (+Z).
 */
export const casamataExtra: BossExtra = (_s, d) => {
  const warn = d.rig.cloth2;
  const eye = d.rig.eye;
  const parts: PartSpec[] = [
    // casamata no peito: placas de concreto, seteira e faixas de perigo
    { j: J.chest, shape: 'box', size: [0.96, 0.34, 0.08], at: [0, 0.2, 0.33], color: CONCRETE, jitter: 0.12 },
    {
      j: J.chest,
      shape: 'box',
      size: [0.96, 0.16, 0.08],
      at: [0, -0.1, 0.33],
      color: CONCRETE,
      jitter: 0.12,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.08, 0.62, 0.64],
      at: [-0.48, 0.12, 0],
      color: CONCRETE,
      jitter: 0.12,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.6, 0.06, 0.03],
      at: [0, 0.03, 0.34],
      color: eye,
      glow: true,
      glowI: 3.2,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.085, 0.06, 0.4],
      at: [-0.485, 0.05, 0.05],
      color: eye,
      glow: true,
      glowI: 3,
    },
    { j: J.chest, shape: 'box', size: [0.98, 0.05, 0.09], at: [0, -0.2, 0.335], color: warn },
    { j: J.chest, shape: 'box', size: [0.09, 0.05, 0.66], at: [-0.485, -0.2, 0], color: warn },
    // estrela do posto
    { j: J.chest, shape: 'oct', size: [0.07, 0], at: [-0.53, 0.3, 0.12], color: warn },
    // escotilha e o comandante
    { j: J.head, shape: 'torus', size: [0.17, 0.03], at: [0, 0.11, 0.04], rot: [H, 0, 0], color: STEEL },
    { j: J.head, shape: 'box', size: [0.14, 0.15, 0.14], at: [0, 0.2, 0.04], color: 0x6f7f5a },
    { j: J.head, shape: 'cyl', size: [0.1, 0.085, 0.05, 8], at: [0, 0.3, 0.04], color: 0x2c3426 },
    { j: J.head, shape: 'box', size: [0.14, 0.015, 0.08], at: [0, 0.285, 0.13], color: BLACK },
    {
      j: J.head,
      shape: 'box',
      size: [0.03, 0.03, 0.02],
      at: [-0.035, 0.215, 0.115],
      color: eye,
      glow: true,
      glowI: 4,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.03, 0.03, 0.02],
      at: [0.035, 0.215, 0.115],
      color: eye,
      glow: true,
      glowI: 4,
    },
    // lançador de mísseis nas costas
    {
      j: J.chest,
      shape: 'box',
      size: [0.62, 0.34, 0.3],
      at: [0, 0.52, -0.42],
      rot: [-0.35, 0, 0],
      color: STEEL,
    },
    // holofote e antena
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.09, 0.07, 0.12, 8],
      at: [0.42, 0.56, 0.3],
      rot: [H, 0, 0],
      color: BLACK,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.075, 0.075, 0.02, 8],
      at: [0.42, 0.56, 0.37],
      rot: [H, 0, 0],
      color: 0xfff4c0,
      glow: true,
      glowI: 3.5,
    },
    { j: J.chest, shape: 'cyl', size: [0.01, 0.01, 0.9, 4], at: [0.3, 0.95, -0.3], color: STEEL },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.03, 5, 4],
      at: [0.3, 1.4, -0.3],
      color: eye,
      glow: true,
      glowI: 4,
    },
    // respiros em brasa (superaquecimento)
    {
      j: J.chest,
      shape: 'box',
      size: [0.3, 0.05, 0.03],
      at: [0, 0.2, -0.53],
      color: HOT,
      glow: true,
      glowI: 2.6,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.3, 0.05, 0.03],
      at: [0, 0.1, -0.53],
      color: HOT,
      glow: true,
      glowI: 2.6,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.3, 0.05, 0.03],
      at: [0, 0, -0.53],
      color: HOT,
      glow: true,
      glowI: 2.6,
    },
    // joelheiras de concreto
    { j: J.shinL, shape: 'box', size: [0.3, 0.16, 0.12], at: [0, 0.02, 0.2], color: CONCRETE },
    { j: J.shinR, shape: 'box', size: [0.3, 0.16, 0.12], at: [0, 0.02, 0.2], color: CONCRETE },
  ];
  // ogivas vermelhas do lançador
  for (let i = 0; i < 6; i++)
    parts.push({
      j: J.chest,
      shape: 'cone',
      size: [0.045, 0.12, 6],
      at: [-0.2 + (i % 3) * 0.2, 0.62 + Math.floor(i / 3) * 0.13, -0.3 - Math.floor(i / 3) * 0.05],
      rot: [H - 0.35, 0, 0],
      color: eye,
    });
  // torretas duplas nos ombros
  for (const sx of [-1, 1])
    for (const dy of [0, 0.1]) {
      parts.push({
        j: J.chest,
        shape: 'cyl',
        size: [0.035, 0.035, 0.5, 7],
        at: [sx * 0.42, 0.4 + dy, 0.5],
        rot: [H, 0, 0],
        color: BLACK,
      });
      parts.push({
        j: J.chest,
        shape: 'cyl',
        size: [0.05, 0.05, 0.06, 7],
        at: [sx * 0.42, 0.4 + dy, 0.74],
        rot: [H, 0, 0],
        color: STEEL,
      });
    }
  return parts;
};
