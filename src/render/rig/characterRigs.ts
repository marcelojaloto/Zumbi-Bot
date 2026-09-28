import type { CharacterId, MeshRecipe } from '../../data/types';
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
    defaultHead: apprenticeHat(robe, magic),
  };
}

/**
 * Chapéu de aprendiz de feiticeira: aba larga, copa roxa com a ponta caída para o lado, faixa lilás e uma
 * estrelinha brilhando. Medidas no espaço do encaixe do topo da cabeça.
 */
function apprenticeHat(robe: number, magic: number): MeshRecipe {
  const hat = 0x6a2fb0;
  return {
    parts: [
      { shape: 'cyl', size: [0.3, 0.31, 0.035, 14], pos: [0, 0.02, 0], color: hat },
      { shape: 'cyl', size: [0.1, 0.19, 0.28, 12], pos: [0, 0.17, 0], color: hat },
      { shape: 'cyl', size: [0.195, 0.2, 0.055, 12], pos: [0, 0.07, 0], color: robe },
      { shape: 'cone', size: [0.1, 0.25, 10], pos: [0.062, 0.415, 0], rot: [0, 0, -0.55], color: hat },
      { shape: 'oct', size: [0.035], pos: [0.135, 0.525, 0], color: magic, glow: true, glowIntensity: 3 },
      { shape: 'oct', size: [0.04], pos: [0, 0.09, 0.2], color: 0xffe07a, glow: true, glowIntensity: 3 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Militar: largo e musculoso, colete com bolsos, camuflagem verde-oliva, boina, óculos escuros e bigode
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
    // óculos escuros (duas lentes com um brilho, ponte e hastes)
    { j: J.head, shape: 'box', size: [0.11, 0.07, 0.025], at: [0.066, 0.185, 0.165], color: 0x0c0f14 },
    { j: J.head, shape: 'box', size: [0.11, 0.07, 0.025], at: [-0.066, 0.185, 0.165], color: 0x0c0f14 },
    {
      j: J.head,
      shape: 'box',
      size: [0.035, 0.012, 0.005],
      at: [0.045, 0.205, 0.18],
      color: 0xbfd8ff,
      glow: true,
      glowI: 0.7,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.035, 0.012, 0.005],
      at: [-0.087, 0.205, 0.18],
      color: 0xbfd8ff,
      glow: true,
      glowI: 0.7,
    },
    { j: J.head, shape: 'box', size: [0.04, 0.018, 0.02], at: [0, 0.2, 0.165], color: 0x2a2e36 },
    { j: J.head, shape: 'box', size: [0.018, 0.018, 0.17], at: [0.146, 0.2, 0.085], color: 0x2a2e36 },
    { j: J.head, shape: 'box', size: [0.018, 0.018, 0.17], at: [-0.146, 0.2, 0.085], color: 0x2a2e36 },
    // bigode grosso com as pontas caídas
    { j: J.head, shape: 'box', size: [0.15, 0.04, 0.03], at: [0, 0.105, 0.165], color: 0x2a1a10 },
    {
      j: J.head,
      shape: 'box',
      size: [0.05, 0.035, 0.03],
      at: [0.085, 0.09, 0.163],
      rot: [0, 0, 0.55],
      color: 0x2a1a10,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.05, 0.035, 0.03],
      at: [-0.085, 0.09, 0.163],
      rot: [0, 0, -0.55],
      color: 0x2a1a10,
    },
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

// ---------------------------------------------------------------------------
// Prodígio (secreto): adolescente baixinho, loiro de olhos azuis, quimono de caratê branco com faixa preta,
// bandana azul e punhos envoltos em energia arcana
// ---------------------------------------------------------------------------
export function prodigyRig(): RigSpec {
  const gi = 0xf2f1ea;
  const giShade = 0xd6d2c4;
  const belt = 0x161616;
  const skin = 0xf2caa2;
  const hair = 0xf2d060;
  const hairHi = 0xffe890;
  const band = 0x2a5aff;
  const arcane = 0x4ad8ff;
  const pr: Proportions = {
    ...HUMAN,
    hipH: 0.8,
    hipW: 0.1,
    thigh: 0.38,
    shin: 0.38,
    spine: 0.09,
    chest: 0.2,
    neck: 0.24,
    shoulderW: 0.21,
    shoulderH: 0.18,
    upperArm: 0.25,
    foreArm: 0.23,
  };
  const eye = (x: number): PartSpec[] => [
    { j: J.head, shape: 'box', size: [0.056, 0.04, 0.01], at: [x, 0.1375, 0.121], color: 0xf6f6f6 },
    // olhos azuis (as lentes do disfarce ficam por cima)
    { j: J.head, shape: 'box', size: [0.028, 0.034, 0.008], at: [x, 0.136, 0.126], color: 0x2f86ff },
    { j: J.head, shape: 'box', size: [0.012, 0.016, 0.006], at: [x, 0.136, 0.13], color: 0x0a1020 },
    { j: J.head, shape: 'box', size: [0.062, 0.014, 0.01], at: [x, 0.178, 0.123], color: 0xc8a040 },
  ];
  const parts: PartSpec[] = [
    // quimono: calça, casaco com lapelas e faixa preta
    { j: J.hips, shape: 'box', size: [0.28, 0.16, 0.2], at: [0, 0, 0], color: gi },
    { j: J.hips, shape: 'box', size: [0.3, 0.1, 0.21], at: [0, -0.03, 0], color: gi },
    { j: J.spine, shape: 'box', size: [0.27, 0.14, 0.19], at: [0, 0.02, 0], color: gi },
    { j: J.spine, shape: 'box', size: [0.29, 0.045, 0.21], at: [0, -0.07, 0], color: belt },
    { j: J.spine, shape: 'box', size: [0.06, 0.05, 0.03], at: [0, -0.07, 0.11], color: belt },
    {
      j: J.spine,
      shape: 'box',
      size: [0.03, 0.13, 0.015],
      at: [-0.025, -0.14, 0.112],
      rot: [0, 0, 0.15],
      color: belt,
    },
    {
      j: J.spine,
      shape: 'box',
      size: [0.03, 0.12, 0.015],
      at: [0.03, -0.13, 0.112],
      rot: [0, 0, -0.2],
      color: belt,
    },
    { j: J.chest, shape: 'box', size: [0.32, 0.28, 0.21], at: [0, 0.04, 0], color: gi },
    { j: J.chest, shape: 'box', size: [0.07, 0.09, 0.01], at: [0, 0.13, 0.107], color: skin },
    {
      j: J.chest,
      shape: 'box',
      size: [0.05, 0.27, 0.02],
      at: [-0.045, 0.05, 0.107],
      rot: [0, 0, -0.35],
      color: giShade,
    },
    {
      j: J.chest,
      shape: 'box',
      size: [0.05, 0.27, 0.02],
      at: [0.045, 0.05, 0.107],
      rot: [0, 0, 0.35],
      color: giShade,
    },
    {
      j: J.chest,
      shape: 'oct',
      size: [0.032],
      at: [-0.095, 0.08, 0.115],
      color: arcane,
      glow: true,
      glowI: 2.5,
    },
    { j: J.neck, shape: 'cyl', size: [0.045, 0.05, 0.1, 6], at: [0, 0, 0], color: skin },
    // cabeça um pouco grande (ainda é um garoto), nariz, sorriso
    { j: J.head, shape: 'box', size: [0.23, 0.25, 0.22], at: [0, 0.13, 0.01], color: skin },
    { j: J.head, shape: 'box', size: [0.024, 0.04, 0.024], at: [0, 0.105, 0.128], color: 0xe2b089 },
    { j: J.head, shape: 'box', size: [0.07, 0.015, 0.01], at: [0, 0.068, 0.122], color: 0xb55252 },
    ...eye(0.052),
    ...eye(-0.052),
    // cabelo loiro espetado
    { j: J.head, shape: 'box', size: [0.25, 0.07, 0.24], at: [0, 0.28, -0.005], color: hair },
    {
      j: J.head,
      shape: 'box',
      size: [0.1, 0.07, 0.05],
      at: [0.045, 0.262, 0.112],
      rot: [0.35, 0, -0.25],
      color: hairHi,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.09, 0.06, 0.05],
      at: [-0.06, 0.255, 0.108],
      rot: [0.3, 0, 0.3],
      color: hair,
    },
    { j: J.head, shape: 'box', size: [0.03, 0.12, 0.18], at: [0.125, 0.2, -0.01], color: hair },
    { j: J.head, shape: 'box', size: [0.03, 0.12, 0.18], at: [-0.125, 0.2, -0.01], color: hair },
    { j: J.head, shape: 'box', size: [0.24, 0.16, 0.05], at: [0, 0.19, -0.115], color: hair },
    {
      j: J.head,
      shape: 'cone',
      size: [0.05, 0.11, 5],
      at: [0.03, 0.335, -0.02],
      rot: [0, 0, -0.45],
      color: hairHi,
    },
    {
      j: J.head,
      shape: 'cone',
      size: [0.045, 0.09, 5],
      at: [-0.05, 0.325, -0.04],
      rot: [0.2, 0, 0.5],
      color: hair,
    },
    // bandana azul com as pontas soltas atrás
    { j: J.head, shape: 'box', size: [0.245, 0.035, 0.235], at: [0, 0.215, 0], color: band },
    {
      j: J.head,
      shape: 'box',
      size: [0.03, 0.14, 0.015],
      at: [0.03, 0.15, -0.125],
      rot: [0.2, 0, 0.25],
      color: band,
    },
    {
      j: J.head,
      shape: 'box',
      size: [0.03, 0.13, 0.015],
      at: [-0.02, 0.15, -0.125],
      rot: [0.2, 0, -0.1],
      color: band,
    },
    // punhos com energia arcana
    {
      j: J.foreArmL,
      shape: 'box',
      size: [0.1, 0.05, 0.1],
      at: [0, -0.19, 0],
      color: arcane,
      glow: true,
      glowI: 2,
    },
    {
      j: J.foreArmR,
      shape: 'box',
      size: [0.1, 0.05, 0.1],
      at: [0, -0.19, 0],
      color: arcane,
      glow: true,
      glowI: 2,
    },
    ...limbs({
      upper: gi,
      fore: gi,
      hand: skin,
      thigh: gi,
      shin: gi,
      foot: skin,
      armW: 0.095,
      legW: 0.12,
      props: pr,
    }),
  ];
  return {
    key: 'char-prodigy',
    joints: humanoidJoints(pr),
    parts,
    sockets: fitSockets(humanSockets(0.25, 0.22, 0.21), 0.78, 0.82),
    height: 1.62,
    metal: 0.03,
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
    case 'prodigy':
      return prodigyRig();
    default:
      return robotPlayerRig();
  }
}

/** Estilo de animação por personagem (o mutante anda curvado; o militar é um pouco maior). */
export function characterStyle(id: CharacterId): { hunch: number; scale: number } {
  if (id === 'mutant') return { hunch: 0.25, scale: 1.02 };
  if (id === 'military') return { hunch: 0, scale: 1.05 };
  if (id === 'mage') return { hunch: 0, scale: 0.97 };
  // baixinho: ainda é um garoto
  if (id === 'prodigy') return { hunch: 0, scale: 0.94 };
  return { hunch: 0, scale: 1 };
}
