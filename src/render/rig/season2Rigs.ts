import type { PartSpec, RigSpec, SocketSpec } from './RigBuilder';
import { humanSockets, limbs } from './rigs';
import { HUMAN, J, humanoidJoints, type Proportions } from './skeleton';

/** Personagens da 2ª temporada: Ninja, Elfa e Faísca. */

function fitSockets(s: Record<string, SocketSpec>, head: number, body: number): Record<string, SocketSpec> {
  for (const k of ['head_top', 'face', 'mouth'] as const) s[k] = { ...s[k]!, scale: head };
  for (const k of ['torso', 'back'] as const) s[k] = { ...s[k]!, scale: body };
  return s;
}

const glow = (
  j: number,
  size: [number, number, number],
  at: [number, number, number],
  color: number,
  glowI = 3,
): PartSpec => ({ j, shape: 'box', size, at, color, glow: true, glowI });

// Ninja: traje preto com placas, máscara, visor e linhas de energia: gelo no lado esquerdo, fogo no direito
export function ninjaRig(): RigSpec {
  const suit = 0x14161c;
  const plate = 0x2a2e38;
  const ice = 0x5ad8ff;
  const fire = 0xff7a1a;
  const pr: Proportions = { ...HUMAN, hipH: 0.9, hipW: 0.11, shoulderW: 0.24, chest: 0.23, neck: 0.26 };
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.3, 0.18, 0.21], at: [0, 0, 0], color: suit },
    { j: J.hips, shape: 'box', size: [0.33, 0.06, 0.23], at: [0, 0.07, 0], color: plate },
    { j: J.spine, shape: 'box', size: [0.26, 0.16, 0.19], at: [0, 0.02, 0], color: suit },
    { j: J.chest, shape: 'box', size: [0.4, 0.32, 0.25], at: [0, 0.05, 0], color: suit },
    { j: J.chest, shape: 'box', size: [0.34, 0.2, 0.03], at: [0, 0.09, 0.13], color: plate },
    glow(J.chest, [0.07, 0.07, 0.02], [0.08, 0.1, 0.148], ice),
    glow(J.chest, [0.07, 0.07, 0.02], [-0.08, 0.1, 0.148], fire),
    glow(J.chest, [0.02, 0.2, 0.02], [0.17, 0.04, 0.128], ice, 2.4),
    glow(J.chest, [0.02, 0.2, 0.02], [-0.17, 0.04, 0.128], fire, 2.4),
    // ombreiras
    { j: J.upperArmL, shape: 'box', size: [0.17, 0.08, 0.2], at: [0.03, 0.04, 0], color: plate },
    { j: J.upperArmR, shape: 'box', size: [0.17, 0.08, 0.2], at: [-0.03, 0.04, 0], color: plate },
    { j: J.neck, shape: 'cyl', size: [0.06, 0.07, 0.12, 6], at: [0, 0, 0], color: suit },
    // capuz, máscara e visor
    { j: J.head, shape: 'box', size: [0.26, 0.28, 0.26], at: [0, 0.14, 0.005], color: suit },
    { j: J.head, shape: 'box', size: [0.25, 0.1, 0.03], at: [0, 0.07, 0.135], color: plate },
    glow(J.head, [0.08, 0.03, 0.02], [0.06, 0.17, 0.137], ice, 4),
    glow(J.head, [0.08, 0.03, 0.02], [-0.06, 0.17, 0.137], fire, 4),
    // pontas da faixa da testa
    { j: J.head, shape: 'box', size: [0.27, 0.04, 0.27], at: [0, 0.22, 0.005], color: 0x8a1420 },
    {
      j: J.head,
      shape: 'box',
      size: [0.05, 0.03, 0.26],
      at: [0.05, 0.2, -0.24],
      rot: [0.3, 0.2, 0],
      color: 0x8a1420,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.05, 0.03, 0.2],
      at: [-0.04, 0.17, -0.22],
      rot: [0.5, -0.2, 0],
      color: 0x8a1420,
    },
    // braçadeiras e caneleiras com a linha de energia
    { j: J.foreArmL, shape: 'box', size: [0.13, 0.16, 0.13], at: [0, -0.14, 0], color: plate },
    { j: J.foreArmR, shape: 'box', size: [0.13, 0.16, 0.13], at: [0, -0.14, 0], color: plate },
    glow(J.foreArmL, [0.02, 0.14, 0.02], [0.066, -0.14, 0], ice, 2.6),
    glow(J.foreArmR, [0.02, 0.14, 0.02], [-0.066, -0.14, 0], fire, 2.6),
    { j: J.shinL, shape: 'box', size: [0.15, 0.2, 0.16], at: [0, -0.18, 0.01], color: plate },
    { j: J.shinR, shape: 'box', size: [0.15, 0.2, 0.16], at: [0, -0.18, 0.01], color: plate },
    // bainha atravessada nas costas
    {
      j: J.chest,
      shape: 'box',
      size: [0.05, 0.62, 0.04],
      at: [0, 0.06, -0.16],
      rot: [0, 0, 0.6],
      color: plate,
    },
    ...limbs({
      upper: suit,
      fore: suit,
      hand: plate,
      thigh: suit,
      shin: suit,
      foot: 0x0c0d10,
      armW: 0.11,
      legW: 0.14,
      props: pr,
    }),
  ];
  return {
    key: 'char-ninja',
    joints: humanoidJoints(pr),
    parts,
    sockets: fitSockets(humanSockets(0.28, 0.26, 0.25), 0.85, 0.9),
    height: 1.85,
    metal: 0.35,
    rough: 0.55,
  };
}

// Elfa: esguia, túnica verde com prata, cabelo claro comprido, orelhas pontudas, tiara e duas espadas nas costas
export function elfRig(): RigSpec {
  const tunic = 0x2e6a4a;
  const tunicDark = 0x1e4632;
  const silver = 0xc8d0d8;
  const skin = 0xf0cfae;
  const hair = 0xece4c2;
  const leaf = 0x7aff9a;
  const pr: Proportions = {
    ...HUMAN,
    hipH: 0.92,
    hipW: 0.11,
    shoulderW: 0.22,
    chest: 0.22,
    neck: 0.26,
    upperArm: 0.28,
    foreArm: 0.26,
  };
  const sword = (x: number, rz: number): PartSpec[] => [
    {
      j: J.chest,
      shape: 'box',
      size: [0.035, 0.56, 0.02],
      at: [x, 0.02, -0.16],
      rot: [0, 0, rz],
      color: silver,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.04, 0.16, 0.035],
      at: [x - Math.sin(rz) * 0.36, 0.02 + Math.cos(rz) * 0.36, -0.16],
      rot: [0, 0, rz],
      color: 0x5a3a1a,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.13, 0.03, 0.04],
      at: [x - Math.sin(rz) * 0.28, 0.02 + Math.cos(rz) * 0.28, -0.16],
      rot: [0, 0, rz],
      color: 0xe0b040,
    },
  ];
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.29, 0.18, 0.21], at: [0, 0, 0], color: tunicDark },
    // saia curta da túnica
    { j: J.hips, shape: 'cyl', size: [0.19, 0.27, 0.3, 8], at: [0, -0.14, 0], color: tunic },
    { j: J.hips, shape: 'cyl', size: [0.275, 0.28, 0.04, 8], at: [0, -0.28, 0], color: silver },
    { j: J.spine, shape: 'box', size: [0.24, 0.16, 0.18], at: [0, 0.02, 0], color: tunic },
    { j: J.spine, shape: 'box', size: [0.27, 0.05, 0.2], at: [0, -0.05, 0], color: 0x5a3a1a },
    { j: J.chest, shape: 'box', size: [0.36, 0.32, 0.24], at: [0, 0.05, 0], color: tunic },
    { j: J.chest, shape: 'box', size: [0.42, 0.07, 0.27], at: [0, 0.19, 0], color: silver },
    { j: J.chest, shape: 'oct', size: [0.05], at: [0, 0.12, 0.14], color: leaf, glow: true, glowI: 3 },
    { j: J.neck, shape: 'cyl', size: [0.05, 0.055, 0.12, 6], at: [0, 0, 0], color: skin },
    { j: J.head, shape: 'box', size: [0.24, 0.26, 0.24], at: [0, 0.14, 0.01], color: skin },
    glow(J.head, [0.05, 0.03, 0.01], [0.06, 0.16, 0.13], leaf, 2.5),
    glow(J.head, [0.05, 0.03, 0.01], [-0.06, 0.16, 0.13], leaf, 2.5),
    { j: J.head, shape: 'box', size: [0.07, 0.02, 0.01], at: [0, 0.07, 0.13], color: 0xa04a4a },
    // orelhas pontudas, para fora e para cima
    { j: J.head, shape: 'cone', size: [0.04, 0.2, 4], at: [0.18, 0.2, 0], rot: [0, 0, -1.05], color: skin },
    { j: J.head, shape: 'cone', size: [0.04, 0.2, 4], at: [-0.18, 0.2, 0], rot: [0, 0, 1.05], color: skin },
    // cabelo comprido e a tiara com a gema
    { j: J.head, shape: 'box', size: [0.27, 0.07, 0.27], at: [0, 0.29, 0], color: hair },
    { j: J.head, shape: 'box', size: [0.04, 0.12, 0.2], at: [0.135, 0.25, -0.01], color: hair },
    { j: J.head, shape: 'box', size: [0.04, 0.12, 0.2], at: [-0.135, 0.25, -0.01], color: hair },
    { j: J.head, shape: 'box', size: [0.27, 0.56, 0.08], at: [0, 0, -0.13], color: hair },
    { j: J.head, shape: 'box', size: [0.26, 0.025, 0.26], at: [0, 0.235, 0.005], color: silver },
    { j: J.head, shape: 'oct', size: [0.03], at: [0, 0.24, 0.14], color: leaf, glow: true, glowI: 3 },
    // braçadeiras de prata
    { j: J.foreArmL, shape: 'box', size: [0.12, 0.12, 0.12], at: [0, -0.14, 0], color: silver },
    { j: J.foreArmR, shape: 'box', size: [0.12, 0.12, 0.12], at: [0, -0.14, 0], color: silver },
    ...sword(0.06, 0.55),
    ...sword(-0.06, -0.55),
    ...limbs({
      upper: tunic,
      fore: skin,
      hand: skin,
      thigh: tunicDark,
      shin: 0x5a3a1a,
      foot: 0x4a2e14,
      armW: 0.1,
      legW: 0.13,
      props: pr,
    }),
  ];
  return {
    key: 'char-elf',
    joints: humanoidJoints(pr),
    parts,
    sockets: fitSockets(humanSockets(0.27, 0.24, 0.24), 0.8, 0.85),
    height: 1.85,
    metal: 0.08,
    rough: 0.75,
  };
}

// Faísca: bichinho azul de cabeça grande, antenas com ponta acesa, barriga clara, rabo com lanterna e cinto de cápsulas
export function sparkRig(): RigSpec {
  const fur = 0x2ab8c8;
  const furDark = 0x1a8a9a;
  const belly = 0xe8f8f4;
  const volt = 0xfff15a;
  const pr: Proportions = {
    hipH: 0.48,
    hipW: 0.1,
    thigh: 0.22,
    shin: 0.22,
    spine: 0.08,
    chest: 0.18,
    neck: 0.17,
    shoulderW: 0.19,
    shoulderH: 0.1,
    upperArm: 0.17,
    foreArm: 0.15,
  };
  const antenna = (s: number): PartSpec[] => [
    {
      j: J.head,
      shape: 'cone',
      size: [0.05, 0.34, 5],
      at: [s * 0.15, 0.5, -0.02],
      rot: [0, 0, -s * 0.45],
      color: fur,
    },
    {
      j: J.head,
      shape: 'oct',
      size: [0.05],
      at: [s * 0.235, 0.69, -0.02],
      color: volt,
      glow: true,
      glowI: 3.5,
    },
  ];
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'sphere', size: [0.2, 8, 6], at: [0, 0.03, 0], color: fur },
    { j: J.chest, shape: 'sphere', size: [0.21, 8, 6], at: [0, -0.02, 0], color: fur },
    { j: J.chest, shape: 'sphere', size: [0.16, 8, 6], at: [0, -0.08, 0.09], color: belly },
    // cinto com três cápsulas de energia
    { j: J.hips, shape: 'cyl', size: [0.205, 0.205, 0.05, 10], at: [0, 0.08, 0], color: 0x3a3e48 },
    {
      j: J.hips,
      shape: 'oct',
      size: [0.045],
      at: [0.1, 0.08, 0.18],
      color: 0x39e6ff,
      glow: true,
      glowI: 2.5,
    },
    { j: J.hips, shape: 'oct', size: [0.045], at: [0, 0.08, 0.21], color: 0x39e6ff, glow: true, glowI: 2.5 },
    {
      j: J.hips,
      shape: 'oct',
      size: [0.045],
      at: [-0.1, 0.08, 0.18],
      color: 0x39e6ff,
      glow: true,
      glowI: 2.5,
    },
    // cabeça grande, olhos acesos e focinho curto
    { j: J.head, shape: 'sphere', size: [0.25, 10, 8], at: [0, 0.2, 0], color: fur },
    { j: J.head, shape: 'sphere', size: [0.1, 7, 5], at: [0, 0.12, 0.19], color: belly },
    { j: J.head, shape: 'box', size: [0.04, 0.03, 0.03], at: [0, 0.15, 0.285], color: 0x10202a },
    {
      j: J.head,
      shape: 'sphere',
      size: [0.055, 7, 5],
      at: [0.1, 0.25, 0.2],
      color: volt,
      glow: true,
      glowI: 3,
    },
    {
      j: J.head,
      shape: 'sphere',
      size: [0.055, 7, 5],
      at: [-0.1, 0.25, 0.2],
      color: volt,
      glow: true,
      glowI: 3,
    },
    { j: J.head, shape: 'box', size: [0.02, 0.05, 0.02], at: [0.1, 0.25, 0.25], color: 0x10202a },
    { j: J.head, shape: 'box', size: [0.02, 0.05, 0.02], at: [-0.1, 0.25, 0.25], color: 0x10202a },
    ...antenna(1),
    ...antenna(-1),
    // topete
    {
      j: J.head,
      shape: 'cone',
      size: [0.07, 0.16, 5],
      at: [0, 0.48, 0.04],
      rot: [0.4, 0, 0],
      color: furDark,
    },
    // rabo: três gomos e a lanterna na ponta
    { j: J.hips, shape: 'sphere', size: [0.08, 6, 4], at: [0, 0.02, -0.24], color: furDark },
    { j: J.hips, shape: 'sphere', size: [0.065, 6, 4], at: [0, 0.12, -0.36], color: fur },
    { j: J.hips, shape: 'sphere', size: [0.05, 6, 4], at: [0, 0.25, -0.44], color: furDark },
    {
      j: J.hips,
      shape: 'sphere',
      size: [0.07, 7, 5],
      at: [0, 0.4, -0.47],
      color: volt,
      glow: true,
      glowI: 3.5,
    },
    // patas claras
    { j: J.handL, shape: 'sphere', size: [0.07, 6, 4], at: [0, -0.04, 0], color: belly },
    { j: J.handR, shape: 'sphere', size: [0.07, 6, 4], at: [0, -0.04, 0], color: belly },
    { j: J.footL, shape: 'box', size: [0.13, 0.07, 0.2], at: [0, 0.03, 0.05], color: belly },
    { j: J.footR, shape: 'box', size: [0.13, 0.07, 0.2], at: [0, 0.03, 0.05], color: belly },
    ...limbs({
      upper: fur,
      fore: fur,
      hand: belly,
      thigh: furDark,
      shin: fur,
      foot: belly,
      armW: 0.09,
      legW: 0.11,
      props: pr,
    }),
  ];
  return {
    key: 'char-spark',
    joints: humanoidJoints(pr),
    parts,
    sockets: fitSockets(humanSockets(0.44, 0.4, 0.34), 1.1, 0.8),
    height: 1.25,
    metal: 0,
    rough: 0.9,
  };
}
