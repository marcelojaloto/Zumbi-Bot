import type { CharacterId } from '../../data/types';
import type { PartSpec, RigSpec, SocketSpec } from './RigBuilder';
import { humanSockets, limbs, robotPlayerRig } from './rigs';
import { HUMAN, J, humanoidJoints, type Proportions } from './skeleton';

/**
 * Personagens jogáveis além do robô. Mesma linguagem visual (peças low-poly presas às juntas) com proporções,
 * cores e silhuetas próprias. Os encaixes de cabeça/corpo ganham escala para os cosméticos do guarda-roupa
 * (feitos para o robô) servirem em cabeças e troncos de tamanhos diferentes.
 */

type Sockets = Record<string, SocketSpec>;

function fitSockets(s: Sockets, head: number, body: number): Sockets {
  for (const k of ['head_top', 'face', 'mouth'] as const) s[k] = { ...s[k]!, scale: head };
  for (const k of ['torso', 'back'] as const) s[k] = { ...s[k]!, scale: body };
  return s;
}

// ---------------------------------------------------------------------------
// Maga: esguia, manto roxo com dourado, cabelo ruivo comprido, mãos e gema brilhando
// ---------------------------------------------------------------------------
export function mageRig(): RigSpec {
  const robe = 0x5a2d91;
  const robeDark = 0x3a1d5e;
  const gold = 0xe0b040;
  const skin = 0xe8b894;
  const hair = 0xc84a2a;
  const magic = 0xc07aff;
  const pr: Proportions = {
    ...HUMAN,
    hipH: 0.9,
    hipW: 0.11,
    shoulderW: 0.22,
    chest: 0.22,
    neck: 0.26,
    upperArm: 0.28,
    foreArm: 0.26,
    thigh: 0.43,
    shin: 0.43,
  };
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.3, 0.18, 0.22], at: [0, 0, 0], color: robeDark },
    // saia do manto até o joelho
    { j: J.hips, shape: 'cyl', size: [0.2, 0.33, 0.5, 8], at: [0, -0.24, 0], color: robe },
    { j: J.hips, shape: 'cyl', size: [0.335, 0.34, 0.05, 8], at: [0, -0.47, 0], color: gold },
    { j: J.spine, shape: 'box', size: [0.24, 0.16, 0.18], at: [0, 0.02, 0], color: robe },
    { j: J.spine, shape: 'box', size: [0.27, 0.05, 0.2], at: [0, -0.05, 0], color: gold },
    { j: J.chest, shape: 'box', size: [0.36, 0.32, 0.24], at: [0, 0.05, 0], color: robe },
    { j: J.chest, shape: 'box', size: [0.44, 0.08, 0.28], at: [0, 0.19, 0], color: robeDark },
    { j: J.chest, shape: 'box', size: [0.05, 0.3, 0.02], at: [0, 0.04, 0.125], color: gold },
    { j: J.chest, shape: 'oct', size: [0.055], at: [0, 0.12, 0.14], color: magic, glow: true, glowI: 3 },
    { j: J.neck, shape: 'cyl', size: [0.05, 0.055, 0.12, 6], at: [0, 0, 0], color: skin },
    { j: J.head, shape: 'box', size: [0.24, 0.26, 0.24], at: [0, 0.14, 0.01], color: skin },
    {
      j: J.head,
      shape: 'box',
      size: [0.05, 0.03, 0.01],
      at: [0.06, 0.16, 0.13],
      color: magic,
      glow: true,
      glowI: 2.5,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.05, 0.03, 0.01],
      at: [-0.06, 0.16, 0.13],
      color: magic,
      glow: true,
      glowI: 2.5,
    },
    { j: J.head, shape: 'box', size: [0.08, 0.02, 0.01], at: [0, 0.07, 0.13], color: 0xa04a4a },
    // cabelo: topo, franja lateral e mechas longas nas costas
    { j: J.head, shape: 'box', size: [0.27, 0.07, 0.27], at: [0, 0.29, 0], color: hair },
    { j: J.head, shape: 'box', size: [0.04, 0.2, 0.22], at: [0.135, 0.17, 0.01], color: hair },
    { j: J.head, shape: 'box', size: [0.04, 0.2, 0.22], at: [-0.135, 0.17, 0.01], color: hair },
    { j: J.head, shape: 'box', size: [0.27, 0.42, 0.08], at: [0, 0.06, -0.13], color: hair },
    { j: J.head, shape: 'box', size: [0.2, 0.06, 0.06], at: [0, 0.26, 0.12], color: hair },
    // punhos dourados e mãos brilhando
    { j: J.foreArmL, shape: 'box', size: [0.13, 0.05, 0.13], at: [0, -0.2, 0], color: gold },
    { j: J.foreArmR, shape: 'box', size: [0.13, 0.05, 0.13], at: [0, -0.2, 0], color: gold },
    {
      j: J.handL,
      shape: 'sphere',
      size: [0.045, 6, 4],
      at: [0, -0.1, 0.02],
      color: magic,
      glow: true,
      glowI: 2.5,
    },
    {
      j: J.handR,
      shape: 'sphere',
      size: [0.045, 6, 4],
      at: [0, -0.1, 0.02],
      color: magic,
      glow: true,
      glowI: 2.5,
    },
    ...limbs({
      upper: robe,
      fore: robe,
      hand: skin,
      thigh: robeDark,
      shin: robeDark,
      foot: 0x5a3a1a,
      armW: 0.1,
      legW: 0.13,
      props: pr,
    }),
  ];
  return {
    key: 'char-mage',
    joints: humanoidJoints(pr),
    parts,
    sockets: fitSockets(humanSockets(0.27, 0.24, 0.24), 0.8, 0.85),
    height: 1.85,
    metal: 0.05,
    rough: 0.8,
  };
}

// ---------------------------------------------------------------------------
// Militar: largo e musculoso, colete com bolsos, camuflagem verde-oliva, boina e óculos escuros
// ---------------------------------------------------------------------------
export function militaryRig(): RigSpec {
  const olive = 0x4b5a2a;
  const oliveDark = 0x323d1c;
  const khaki = 0x8a7a50;
  const skin = 0xc68a5a;
  const black = 0x1e1e1e;
  const pr: Proportions = {
    ...HUMAN,
    hipH: 0.93,
    hipW: 0.14,
    shoulderW: 0.33,
    chest: 0.26,
    neck: 0.3,
    upperArm: 0.31,
    foreArm: 0.29,
    thigh: 0.45,
    shin: 0.45,
  };
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.42, 0.2, 0.28], at: [0, 0, 0], color: oliveDark },
    { j: J.hips, shape: 'box', size: [0.44, 0.06, 0.3], at: [0, 0.08, 0], color: black },
    { j: J.hips, shape: 'box', size: [0.08, 0.05, 0.02], at: [0, 0.08, 0.155], color: 0xb0a070 },
    { j: J.spine, shape: 'box', size: [0.4, 0.2, 0.26], at: [0, 0.02, 0], color: olive },
    { j: J.chest, shape: 'box', size: [0.64, 0.4, 0.34], at: [0, 0.06, 0], color: olive },
    // colete tático e bolsos
    { j: J.chest, shape: 'box', size: [0.58, 0.3, 0.06], at: [0, 0.02, 0.18], color: khaki },
    { j: J.chest, shape: 'box', size: [0.58, 0.3, 0.06], at: [0, 0.02, -0.18], color: khaki },
    { j: J.chest, shape: 'box', size: [0.12, 0.1, 0.06], at: [0.18, -0.05, 0.22], color: oliveDark },
    { j: J.chest, shape: 'box', size: [0.12, 0.1, 0.06], at: [0, -0.05, 0.22], color: oliveDark },
    { j: J.chest, shape: 'box', size: [0.12, 0.1, 0.06], at: [-0.18, -0.05, 0.22], color: oliveDark },
    { j: J.chest, shape: 'box', size: [0.06, 0.08, 0.02], at: [0.12, 0.14, 0.215], color: 0xc0c8d0 },
    // ombros musculosos
    { j: J.upperArmL, shape: 'box', size: [0.25, 0.17, 0.26], at: [0.03, -0.02, 0], color: olive },
    { j: J.upperArmR, shape: 'box', size: [0.25, 0.17, 0.26], at: [-0.03, -0.02, 0], color: olive },
    { j: J.neck, shape: 'cyl', size: [0.09, 0.1, 0.12, 6], at: [0, 0, 0], color: skin },
    { j: J.head, shape: 'box', size: [0.29, 0.29, 0.29], at: [0, 0.15, 0.01], color: skin },
    { j: J.head, shape: 'box', size: [0.27, 0.08, 0.27], at: [0, 0.03, 0.03], color: 0xb07a4a },
    { j: J.head, shape: 'box', size: [0.3, 0.04, 0.3], at: [0, 0.3, 0], color: 0x2a2018 },
    { j: J.head, shape: 'box', size: [0.26, 0.055, 0.02], at: [0, 0.18, 0.16], color: black },
    // boina vermelha inclinada
    {
      j: J.head,
      shape: 'box',
      size: [0.3, 0.06, 0.3],
      at: [0.02, 0.34, -0.01],
      rot: [0, 0, 0.18],
      color: 0x8a1a1a,
    },
    // joelheiras
    { j: J.shinL, shape: 'box', size: [0.22, 0.1, 0.14], at: [0, 0.02, 0.07], color: khaki },
    { j: J.shinR, shape: 'box', size: [0.22, 0.1, 0.14], at: [0, 0.02, 0.07], color: khaki },
    ...limbs({
      upper: skin,
      fore: skin,
      hand: 0xa8703f,
      thigh: olive,
      shin: olive,
      foot: black,
      armW: 0.19,
      legW: 0.21,
      props: pr,
    }),
  ];
  return {
    key: 'char-military',
    joints: humanoidJoints(pr),
    parts,
    sockets: fitSockets(humanSockets(0.31, 0.29, 0.34), 0.95, 1.18),
    height: 2.0,
    metal: 0.1,
    rough: 0.75,
  };
}

// ---------------------------------------------------------------------------
// Ciborgue: metade do rosto e o braço esquerdo de metal com linhas vermelhas, núcleo brilhando no peito
// ---------------------------------------------------------------------------
export function cyborgRig(): RigSpec {
  const suit = 0x2a2d36;
  const metal = 0x9aa6b8;
  const metalDark = 0x4a5160;
  const skin = 0xd8a888;
  const red = 0xff2a3a;
  const pr: Proportions = { ...HUMAN, shoulderW: 0.28 };
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.36, 0.18, 0.24], at: [0, 0, 0], color: suit },
    { j: J.spine, shape: 'box', size: [0.3, 0.16, 0.2], at: [0, 0.02, 0], color: metalDark },
    { j: J.chest, shape: 'box', size: [0.5, 0.36, 0.28], at: [0, 0.06, 0], color: suit },
    { j: J.chest, shape: 'box', size: [0.26, 0.3, 0.05], at: [0.11, 0.06, 0.15], color: metal },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.055, 6, 5],
      at: [-0.1, 0.1, 0.15],
      color: red,
      glow: true,
      glowI: 3.5,
    },
    { j: J.chest, shape: 'box', size: [0.3, 0.26, 0.1], at: [0, 0.06, -0.18], color: metalDark },
    {
      j: J.chest,
      shape: 'box',
      size: [0.02, 0.22, 0.02],
      at: [0.08, 0.06, -0.235],
      color: red,
      glow: true,
      glowI: 2.5,
    },
    // ombro e braço esquerdo de metal
    { j: J.upperArmL, shape: 'box', size: [0.23, 0.15, 0.25], at: [0.03, 0.01, 0], color: metal },
    { j: J.upperArmL, shape: 'box', size: [0.15, 0.25, 0.15], at: [0, -0.14, 0], color: metal },
    {
      j: J.upperArmL,
      shape: 'box',
      size: [0.02, 0.2, 0.02],
      at: [0, -0.14, 0.078],
      color: red,
      glow: true,
      glowI: 2.5,
    },
    { j: J.foreArmL, shape: 'box', size: [0.145, 0.24, 0.145], at: [0, -0.13, 0], color: metalDark },
    {
      j: J.foreArmL,
      shape: 'box',
      size: [0.02, 0.18, 0.02],
      at: [0, -0.13, 0.075],
      color: red,
      glow: true,
      glowI: 2.5,
    },
    { j: J.handL, shape: 'box', size: [0.14, 0.11, 0.14], at: [0, -0.04, 0.01], color: metal },
    { j: J.neck, shape: 'cyl', size: [0.06, 0.07, 0.12, 6], at: [0, 0, 0], color: metalDark },
    // cabeça: lado direito humano, lado esquerdo de metal com o olho vermelho
    { j: J.head, shape: 'box', size: [0.27, 0.28, 0.27], at: [0, 0.14, 0.01], color: skin },
    { j: J.head, shape: 'box', size: [0.145, 0.292, 0.282], at: [0.068, 0.14, 0.01], color: metal },
    {
      j: J.head,
      shape: 'box',
      size: [0.07, 0.045, 0.02],
      at: [0.065, 0.17, 0.15],
      color: red,
      glow: true,
      glowI: 3.5,
    },
    { j: J.head, shape: 'box', size: [0.05, 0.025, 0.01], at: [-0.065, 0.17, 0.142], color: 0x2a1a10 },
    { j: J.head, shape: 'box', size: [0.14, 0.05, 0.28], at: [-0.068, 0.29, 0], color: 0x2a1a10 },
    {
      j: J.head,
      shape: 'cyl',
      size: [0.03, 0.03, 0.06, 6],
      at: [0.16, 0.17, 0],
      rot: [0, 0, Math.PI / 2],
      color: metalDark,
    },
    { j: J.shinL, shape: 'box', size: [0.17, 0.3, 0.18], at: [0, -0.2, 0.01], color: metalDark },
    { j: J.shinR, shape: 'box', size: [0.17, 0.3, 0.18], at: [0, -0.2, 0.01], color: metalDark },
    ...limbs({
      upper: suit,
      fore: suit,
      hand: skin,
      thigh: suit,
      shin: metalDark,
      foot: metal,
      armW: 0.12,
      legW: 0.15,
      props: pr,
    }),
  ];
  return {
    key: 'char-cyborg',
    joints: humanoidJoints(pr),
    parts,
    sockets: fitSockets(humanSockets(0.29, 0.28, 0.28), 0.85, 1),
    height: 1.9,
    metal: 0.45,
    rough: 0.45,
  };
}

// ---------------------------------------------------------------------------
// Mutante: pele verde, curvado, braço direito enorme com garras, espinhos nas costas e olhos amarelos
// ---------------------------------------------------------------------------
export function mutantRig(): RigSpec {
  const skin = 0x4f9a3a;
  const dark = 0x2e5a22;
  const glow = 0xc8ff3a;
  const pants = 0x4a2a5a;
  const bone = 0xd8d0a8;
  const pr: Proportions = {
    ...HUMAN,
    hipH: 0.88,
    hipW: 0.13,
    shoulderW: 0.31,
    chest: 0.25,
    neck: 0.25,
    upperArm: 0.33,
    foreArm: 0.31,
  };
  const spike = (at: [number, number, number], s = 0.2): PartSpec => ({
    j: J.chest,
    shape: 'cone',
    size: [0.05, s, 4],
    at,
    rot: [-0.9, 0, 0],
    color: bone,
  });
  const parts: PartSpec[] = [
    { j: J.hips, shape: 'box', size: [0.38, 0.2, 0.26], at: [0, 0, 0], color: pants },
    { j: J.hips, shape: 'box', size: [0.12, 0.08, 0.02], at: [0.1, -0.08, 0.135], color: skin },
    { j: J.spine, shape: 'box', size: [0.36, 0.2, 0.26], at: [0, 0.02, 0], color: skin },
    { j: J.chest, shape: 'box', size: [0.6, 0.4, 0.36], at: [0, 0.06, 0], color: skin },
    { j: J.chest, shape: 'box', size: [0.22, 0.14, 0.04], at: [0.12, 0.1, 0.18], color: dark },
    { j: J.chest, shape: 'box', size: [0.22, 0.14, 0.04], at: [-0.12, 0.1, 0.18], color: dark },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.04, 5, 4],
      at: [0.17, -0.06, 0.18],
      color: glow,
      glow: true,
      glowI: 2.5,
    },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.03, 5, 4],
      at: [-0.08, -0.08, 0.18],
      color: glow,
      glow: true,
      glowI: 2.5,
    },
    {
      j: J.chest,
      shape: 'sphere',
      size: [0.035, 5, 4],
      at: [-0.2, 0.16, -0.17],
      color: glow,
      glow: true,
      glowI: 2.5,
    },
    spike([0, 0.18, -0.2], 0.24),
    spike([0.13, 0.1, -0.19]),
    spike([-0.13, 0.1, -0.19]),
    spike([0, 0, -0.19], 0.18),
    { j: J.upperArmR, shape: 'box', size: [0.26, 0.2, 0.28], at: [-0.03, -0.02, 0], color: skin },
    { j: J.upperArmR, shape: 'cone', size: [0.05, 0.2, 4], at: [-0.05, 0.12, 0], color: bone },
    { j: J.upperArmL, shape: 'box', size: [0.2, 0.15, 0.22], at: [0.03, -0.02, 0], color: skin },
    { j: J.neck, shape: 'cyl', size: [0.1, 0.12, 0.12, 6], at: [0, 0, 0.02], color: skin },
    { j: J.head, shape: 'box', size: [0.28, 0.26, 0.27], at: [0, 0.13, 0.03], color: skin },
    { j: J.head, shape: 'box', size: [0.3, 0.06, 0.09], at: [0, 0.2, 0.13], color: dark },
    {
      j: J.head,
      shape: 'box',
      size: [0.055, 0.03, 0.01],
      at: [0.065, 0.16, 0.172],
      color: 0xffe04a,
      glow: true,
      glowI: 3,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.055, 0.03, 0.01],
      at: [-0.065, 0.16, 0.172],
      color: 0xffe04a,
      glow: true,
      glowI: 3,
    },
    { j: J.head, shape: 'box', size: [0.2, 0.05, 0.02], at: [0, 0.05, 0.17], color: 0xe8e0c8 },
    { j: J.head, shape: 'cone', size: [0.04, 0.14, 4], at: [0.08, 0.3, 0], color: bone },
    { j: J.head, shape: 'cone', size: [0.04, 0.14, 4], at: [-0.08, 0.3, 0], color: bone },
    // braço direito gigante com garras
    { j: J.foreArmR, shape: 'box', size: [0.24, 0.28, 0.24], at: [0, -0.15, 0], color: skin },
    {
      j: J.foreArmR,
      shape: 'sphere',
      size: [0.035, 5, 4],
      at: [0.1, -0.12, 0.11],
      color: glow,
      glow: true,
      glowI: 2.5,
    },
    { j: J.handR, shape: 'box', size: [0.24, 0.14, 0.22], at: [0, -0.06, 0.01], color: dark },
    {
      j: J.handR,
      shape: 'cone',
      size: [0.03, 0.12, 4],
      at: [0.07, -0.17, 0.06],
      rot: [Math.PI, 0, 0],
      color: bone,
    },
    {
      j: J.handR,
      shape: 'cone',
      size: [0.03, 0.12, 4],
      at: [0, -0.17, 0.08],
      rot: [Math.PI, 0, 0],
      color: bone,
    },
    {
      j: J.handR,
      shape: 'cone',
      size: [0.03, 0.12, 4],
      at: [-0.07, -0.17, 0.06],
      rot: [Math.PI, 0, 0],
      color: bone,
    },
    ...limbs({
      upper: skin,
      fore: skin,
      hand: dark,
      thigh: pants,
      shin: skin,
      foot: dark,
      armW: 0.17,
      legW: 0.19,
      props: pr,
    }),
  ];
  return {
    key: 'char-mutant',
    joints: humanoidJoints(pr),
    parts,
    sockets: fitSockets(humanSockets(0.27, 0.27, 0.36), 0.88, 1.15),
    height: 1.85,
    metal: 0.05,
    rough: 0.85,
  };
}

/** Rig de cada personagem jogável. */
export function characterRig(id: CharacterId): RigSpec {
  switch (id) {
    case 'mage':
      return mageRig();
    case 'military':
      return militaryRig();
    case 'cyborg':
      return cyborgRig();
    case 'mutant':
      return mutantRig();
    default:
      return robotPlayerRig();
  }
}

/** Estilo de animação por personagem (o mutante anda curvado; o militar é um pouco maior). */
export function characterStyle(id: CharacterId): { hunch: number; scale: number } {
  if (id === 'mutant') return { hunch: 0.25, scale: 1.02 };
  if (id === 'military') return { hunch: 0, scale: 1.05 };
  if (id === 'mage') return { hunch: 0, scale: 0.97 };
  return { hunch: 0, scale: 1 };
}
