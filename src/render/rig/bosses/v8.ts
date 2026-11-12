import type { PartSpec } from '../RigBuilder';
import { J } from '../skeleton';
import type { BossExtra } from './types';

const H = Math.PI / 2;
const CHROME = 0xc8ccd4;
const TIRE = 0x121214;
const GLASS = 0x1a2a3c;
const HOT = 0xff6a1a;

// pneu de lado (a câmera vê o boneco de perfil): borracha e calota
function wheel(j: number, at: [number, number, number], r: number): PartSpec[] {
  const side = Math.sign(at[0]) || 1;
  return [
    { j, shape: 'cyl', size: [r, r, 0.2, 12], at, rot: [0, 0, H], color: TIRE },
    {
      j,
      shape: 'cyl',
      size: [r * 0.45, r * 0.45, 0.04, 8],
      at: [at[0] + side * 0.11, at[1], at[2]],
      rot: [0, 0, H],
      color: CHROME,
    },
  ];
}

// carroceria por cima do mech: capô com blower, grade com dentes, faróis, teto, aerofólio, rodas e escapamentos
export const v8Extra: BossExtra = (_s, d) => {
  const paint = d.rig.skin;
  const stripe = d.rig.cloth2;
  const parts: PartSpec[] = [
    // capô e faixa de corrida
    { j: J.chest, shape: 'box', size: [0.88, 0.3, 0.5], at: [0, 0, 0.52], rot: [0.12, 0, 0], color: paint },
    {
      j: J.chest,
      shape: 'box',
      size: [0.2, 0.31, 0.51],
      at: [0, 0.005, 0.52],
      rot: [0.12, 0, 0],
      color: stripe,
    },
    // blower
    { j: J.chest, shape: 'box', size: [0.3, 0.2, 0.28], at: [0, 0.22, 0.5], color: CHROME },
    { j: J.chest, shape: 'box', size: [0.26, 0.06, 0.24], at: [0, 0.34, 0.5], color: TIRE },
    // grade, dentes, para-choque e placa
    { j: J.chest, shape: 'box', size: [0.62, 0.16, 0.04], at: [0, -0.06, 0.78], color: TIRE },
    { j: J.chest, shape: 'box', size: [0.96, 0.1, 0.14], at: [0, -0.22, 0.76], color: CHROME },
    { j: J.chest, shape: 'box', size: [0.26, 0.09, 0.02], at: [0, -0.22, 0.84], color: 0xf4f0e8 },
    // faróis no lugar dos olhos
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.085, 8, 6],
      at: [0.33, 0.04, 0.77],
      color: d.rig.eye,
      glow: true,
      glowI: 4.5,
    },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.085, 8, 6],
      at: [-0.33, 0.04, 0.77],
      color: d.rig.eye,
      glow: true,
      glowI: 4.5,
    },
    // para-brisa, teto e aerofólio
    {
      j: J.chest,
      shape: 'box',
      size: [0.8, 0.24, 0.04],
      at: [0, 0.5, 0.26],
      rot: [-0.5, 0, 0],
      color: GLASS,
    },
    { j: J.chest, shape: 'box', size: [0.84, 0.08, 0.5], at: [0, 0.6, -0.04], color: paint },
    { j: J.chest, shape: 'box', size: [0.2, 0.085, 0.51], at: [0, 0.602, -0.04], color: stripe },
    { j: J.chest, shape: 'box', size: [1.04, 0.05, 0.2], at: [0, 0.74, -0.56], color: paint },
    { j: J.chest, shape: 'box', size: [0.05, 0.2, 0.06], at: [0.36, 0.64, -0.56], color: TIRE },
    { j: J.chest, shape: 'box', size: [0.05, 0.2, 0.06], at: [-0.36, 0.64, -0.56], color: TIRE },
    // escapamentos em brasa
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.06, 0.06, 0.5, 7],
      at: [0.2, 0.3, -0.66],
      rot: [0.9, 0, 0],
      color: CHROME,
    },
    {
      j: J.chest,
      shape: 'cyl',
      size: [0.06, 0.06, 0.5, 7],
      at: [-0.2, 0.3, -0.66],
      rot: [0.9, 0, 0],
      color: CHROME,
    },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.05, 6, 4],
      at: [0.2, 0.47, -0.86],
      color: HOT,
      glow: true,
      glowI: 3,
    },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.05, 6, 4],
      at: [-0.2, 0.47, -0.86],
      color: HOT,
      glow: true,
      glowI: 3,
    },
    // portas nos antebraços
    { j: J.foreArmL, shape: 'box', size: [0.05, 0.42, 0.36], at: [0.16, -0.16, 0], color: paint },
    { j: J.foreArmR, shape: 'box', size: [0.05, 0.42, 0.36], at: [-0.16, -0.16, 0], color: paint },
    // rodas: dianteiras nos ombros, traseiras nas coxas
    ...wheel(J.upperArmL, [0.2, 0, 0], 0.27),
    ...wheel(J.upperArmR, [-0.2, 0, 0], 0.27),
    ...wheel(J.thighL, [0.2, -0.12, 0], 0.25),
    ...wheel(J.thighR, [-0.2, -0.12, 0], 0.25),
  ];
  for (let i = 0; i < 5; i++)
    parts.push({
      j: J.chest,
      shape: 'cone',
      size: [0.04, 0.1, 4],
      at: [-0.24 + i * 0.12, -0.13, 0.81],
      rot: [Math.PI, 0, 0],
      color: 0xf4f0e8,
    });
  return parts;
};
