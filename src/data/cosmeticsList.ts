import { PRICES, registerCosmetics } from './cosmeticsBase';
import { hairWig } from './prodigyHair';
import type { CosmeticDef, CosmeticSlot, MeshPart, Rarity } from './types';

/**
 * Catálogo de cosméticos (mago, zumbi e chefes). Coordenadas relativas ao encaixe:
 * head_top = topo da cabeça (y para cima), face = frente dos olhos (+z para fora),
 * mouth = boca, torso = centro do peito, back = costas (-z para trás).
 * Membros (a mesma peça nos dois lados, então simétrica em x), na medida do robô:
 * arm = meio do antebraço (antebraço 0.12 de largura, o pulso fica 0.1 abaixo),
 * leg = meio da canela (canela 0.15 de largura, o joelho fica 0.2 acima),
 * foot = sola, no meio do pé (pé 0.16 x 0.08 x 0.29; a canela começa 0.05 acima, em z -0.05).
 */

type P = MeshPart;
const H = Math.PI / 2;

function c(
  id: string,
  name: string,
  slot: CosmeticSlot,
  set: CosmeticDef['set'],
  rarity: Rarity,
  parts: P[],
  extra: Partial<CosmeticDef> = {},
): CosmeticDef {
  return {
    id,
    name,
    slot,
    set,
    rarity,
    price: set === 'boss' || set === 'secret' ? null : PRICES[rarity],
    mesh: { parts },
    ...extra,
  };
}

// ---------------------------------------------------------------- chapéus
const wizardHat = (col: number, band: number, star: number, h = 0.52): P[] => [
  { shape: 'cyl', size: [0.34, 0.34, 0.03, 14], pos: [0, 0.015, 0], color: col },
  { shape: 'cone', size: [0.21, h, 10], pos: [0, 0.03 + h / 2, 0], rot: [-0.18, 0, 0.12], color: col },
  { shape: 'cyl', size: [0.215, 0.215, 0.05, 10], pos: [0, 0.06, 0], color: band },
  { shape: 'oct', size: [0.045, 0], pos: [0.1, 0.2, 0.13], color: star, glow: true, glowIntensity: 3 },
  { shape: 'oct', size: [0.03, 0], pos: [-0.09, 0.3, 0.1], color: star, glow: true, glowIntensity: 3 },
];

const cap = (col: number, visor: number, torn = false): P[] => [
  { shape: 'sphere', size: [0.19, 10, 5], pos: [0, 0.02, 0], color: col },
  { shape: 'box', size: [0.26, 0.025, 0.2], pos: [0, 0.0, 0.2], rot: [0.12, 0, 0], color: visor },
  ...(torn ? [{ shape: 'box', size: [0.08, 0.06, 0.02], pos: [0.1, 0.08, 0.14], color: 0x1a1a1a } as P] : []),
];

// ---------------------------------------------------------------- mantos / roupas (torso)
const robe = (col: number, trim: number, rune?: number): P[] => [
  { shape: 'cyl', size: [0.29, 0.44, 1.05, 10], pos: [0, -0.52, 0], color: col },
  { shape: 'cyl', size: [0.3, 0.3, 0.4, 10], pos: [0, 0.05, 0], color: col },
  { shape: 'torus', size: [0.3, 0.03, 4, 14], pos: [0, 0.26, 0], rot: [H, 0, 0], color: trim },
  { shape: 'torus', size: [0.44, 0.03, 4, 14], pos: [0, -1.03, 0], rot: [H, 0, 0], color: trim },
  { shape: 'box', size: [0.05, 1.2, 0.02], pos: [0, -0.4, 0.31], color: trim },
  ...(rune
    ? ([
        {
          shape: 'oct',
          size: [0.05, 0],
          pos: [0.14, -0.3, 0.33],
          color: rune,
          glow: true,
          glowIntensity: 2.5,
        },
        {
          shape: 'oct',
          size: [0.05, 0],
          pos: [-0.16, -0.6, 0.37],
          color: rune,
          glow: true,
          glowIntensity: 2.5,
        },
        {
          shape: 'oct',
          size: [0.05, 0],
          pos: [0.18, -0.85, 0.4],
          color: rune,
          glow: true,
          glowIntensity: 2.5,
        },
      ] as P[])
    : []),
];

/** Manto até a canela: caneleiras e joelheiras atravessariam o tecido. */
const LONG: Partial<CosmeticDef> = { hides: ['legs'] };

const shirt = (col: number, detail: number): P[] => [
  { shape: 'box', size: [0.56, 0.4, 0.34], pos: [0, 0.06, 0], color: col },
  { shape: 'box', size: [0.42, 0.2, 0.28], pos: [0, -0.2, 0], color: col },
  { shape: 'box', size: [0.14, 0.12, 0.02], pos: [0.12, 0.0, 0.175], color: detail },
  { shape: 'box', size: [0.1, 0.18, 0.02], pos: [-0.1, -0.12, 0.175], color: detail },
];

// ---------------------------------------------------------------- membros
const bracer = (col: number, trim: number): P[] => [
  { shape: 'box', size: [0.17, 0.15, 0.17], pos: [0, 0.01, 0], color: col },
  { shape: 'box', size: [0.18, 0.03, 0.18], pos: [0, 0.085, 0], color: trim },
  { shape: 'box', size: [0.18, 0.03, 0.18], pos: [0, -0.065, 0], color: trim },
];

const shinGuard = (col: number): P[] => [
  { shape: 'box', size: [0.19, 0.26, 0.19], pos: [0, -0.01, 0], color: col },
];

/** Joelheira na frente do joelho (cobre a do robô). */
const kneePad = (col: number): P => ({
  shape: 'box',
  size: [0.21, 0.14, 0.1],
  pos: [0, 0.2, 0.08],
  color: col,
});

const boot = (col: number, shaft: number | null, sole?: number): P[] => [
  { shape: 'box', size: [0.2, 0.125, 0.34], pos: [0, 0.058, 0.005], color: col },
  ...(shaft !== null
    ? [{ shape: 'box', size: [0.18, 0.12, 0.2], pos: [0, 0.15, -0.04], color: shaft } as P]
    : []),
  ...(sole !== undefined
    ? [{ shape: 'box', size: [0.205, 0.03, 0.345], pos: [0, 0.012, 0.005], color: sole } as P]
    : []),
];

// ---------------------------------------------------------------- capas (costas)
const cape = (col: number, col2: number, len = 1.1, width = 0.55): Partial<CosmeticDef> => ({
  cape: { segments: 4, width, length: len, color: col, color2: col2 },
});

export const COSMETIC_LIST: CosmeticDef[] = [
  // ======================= cabeça do MAGO
  c(
    'hat_apprentice',
    'Chapéu de Aprendiz',
    'head',
    'wizard',
    'common',
    wizardHat(0x3a4a8a, 0x8a7a3a, 0xfff0a0, 0.42),
  ),
  c(
    'hat_starry',
    'Chapéu de Mago Estrelado',
    'head',
    'wizard',
    'uncommon',
    wizardHat(0x1a2a6a, 0xffd24a, 0xfff0a0),
  ),
  c(
    'hat_purple',
    'Chapéu Pontudo Roxo',
    'head',
    'wizard',
    'uncommon',
    wizardHat(0x5a2a8a, 0x2a1a3a, 0xd8a8ff, 0.6),
  ),
  c('hat_archmage', 'Chapéu do Arquimago', 'head', 'wizard', 'epic', [
    ...wizardHat(0x2a1a4a, 0xffd24a, 0x9ff0ff, 0.7),
    {
      shape: 'torus',
      size: [0.1, 0.02, 4, 10],
      pos: [0, 0.42, 0.05],
      rot: [0.4, 0, 0],
      color: 0x9ff0ff,
      glow: true,
      glowIntensity: 3,
    },
  ]),
  c('hood_arcane', 'Capuz Arcano', 'head', 'wizard', 'rare', [
    { shape: 'sphere', size: [0.25, 10, 6], pos: [0, -0.1, -0.03], color: 0x2a2a5a },
    { shape: 'cone', size: [0.16, 0.34, 8], pos: [0, 0.18, -0.12], rot: [-0.7, 0, 0], color: 0x2a2a5a },
    {
      shape: 'torus',
      size: [0.2, 0.025, 4, 12],
      pos: [0, -0.15, 0.1],
      color: 0x9ff0ff,
      glow: true,
      glowIntensity: 1.8,
    },
  ]),
  c('circlet_moon', 'Diadema Lunar', 'head', 'wizard', 'rare', [
    { shape: 'torus', size: [0.19, 0.02, 4, 16], pos: [0, -0.06, 0], rot: [H, 0, 0], color: 0xc8c8d8 },
    {
      shape: 'cone',
      size: [0.05, 0.12, 4],
      pos: [0, 0.0, 0.17],
      color: 0xdfe6ff,
      glow: true,
      glowIntensity: 3,
    },
  ]),
  // ======================= cabeça do ZUMBI
  c('cap_torn', 'Boné Rasgado', 'head', 'zombie', 'common', cap(0x8a2a2a, 0x6a1a1a, true)),
  c('cap_trucker', 'Boné de Caminhoneiro', 'head', 'zombie', 'common', cap(0x3a5a8a, 0xe8e8e8)),
  c('tophat_rotten', 'Cartola Podre', 'head', 'zombie', 'uncommon', [
    { shape: 'cyl', size: [0.3, 0.3, 0.03, 12], pos: [0, 0.015, 0], color: 0x1a1612 },
    { shape: 'cyl', size: [0.17, 0.18, 0.34, 10], pos: [0, 0.2, 0], rot: [0, 0, 0.15], color: 0x1a1612 },
    { shape: 'cyl', size: [0.18, 0.18, 0.05, 10], pos: [0, 0.07, 0], color: 0x3a4a1a },
  ]),
  c('helmet_army', 'Capacete Amassado', 'head', 'zombie', 'uncommon', [
    { shape: 'sphere', size: [0.22, 10, 5], pos: [0, -0.02, 0], color: 0x4a5a3a },
    { shape: 'torus', size: [0.22, 0.03, 4, 14], pos: [0, -0.02, 0], rot: [H, 0, 0], color: 0x3a4a2a },
  ]),
  c('bucket', 'Balde na Cabeça', 'head', 'zombie', 'rare', [
    { shape: 'cyl', size: [0.2, 0.23, 0.36, 10], pos: [0, 0.02, 0], color: 0x8a8e96 },
    { shape: 'torus', size: [0.12, 0.012, 4, 10], pos: [0, 0.22, 0], rot: [0, 0, H], color: 0x5a5e66 },
  ]),
  c('brain_exposed', 'Cérebro à Mostra', 'head', 'zombie', 'epic', [
    { shape: 'sphere', size: [0.17, 8, 6], pos: [0, 0.04, 0], color: 0xd87a8a },
    { shape: 'torus', size: [0.08, 0.03, 4, 8], pos: [0.05, 0.1, 0.02], rot: [0.3, 0.5, 0], color: 0xc86a7a },
    {
      shape: 'torus',
      size: [0.08, 0.03, 4, 8],
      pos: [-0.05, 0.1, -0.02],
      rot: [0.3, -0.5, 0],
      color: 0xc86a7a,
    },
  ]),
  // ======================= óculos (olhos)
  c('glasses_round', 'Óculos Redondos', 'eyes', 'wizard', 'common', [
    { shape: 'torus', size: [0.055, 0.012, 4, 12], pos: [0.07, 0, 0.01], color: 0xc8a040 },
    { shape: 'torus', size: [0.055, 0.012, 4, 12], pos: [-0.07, 0, 0.01], color: 0xc8a040 },
    { shape: 'box', size: [0.04, 0.01, 0.01], pos: [0, 0.01, 0.01], color: 0xc8a040 },
  ]),
  c('monocle_arcane', 'Monóculo Arcano', 'eyes', 'wizard', 'rare', [
    { shape: 'torus', size: [0.06, 0.014, 4, 14], pos: [0.07, 0, 0.015], color: 0xffd24a },
    {
      shape: 'cyl',
      size: [0.05, 0.05, 0.005, 12],
      pos: [0.07, 0, 0.012],
      rot: [H, 0, 0],
      color: 0x9ff0ff,
      glow: true,
      glowIntensity: 1.8,
    },
    { shape: 'box', size: [0.005, 0.18, 0.005], pos: [0.12, -0.1, 0.01], color: 0xffd24a },
  ]),
  c('goggles_alchemy', 'Óculos de Alquimista', 'eyes', 'wizard', 'epic', [
    { shape: 'cyl', size: [0.06, 0.06, 0.06, 10], pos: [0.075, 0, 0.03], rot: [H, 0, 0], color: 0x6a4a2a },
    { shape: 'cyl', size: [0.06, 0.06, 0.06, 10], pos: [-0.075, 0, 0.03], rot: [H, 0, 0], color: 0x6a4a2a },
    {
      shape: 'cyl',
      size: [0.045, 0.045, 0.01, 10],
      pos: [0.075, 0, 0.065],
      rot: [H, 0, 0],
      color: 0x5aff9a,
      glow: true,
      glowIntensity: 2.5,
    },
    {
      shape: 'cyl',
      size: [0.045, 0.045, 0.01, 10],
      pos: [-0.075, 0, 0.065],
      rot: [H, 0, 0],
      color: 0xff5ad8,
      glow: true,
      glowIntensity: 2.5,
    },
    { shape: 'box', size: [0.38, 0.03, 0.02], pos: [0, 0, -0.02], color: 0x3a2a1a },
  ]),
  c('glasses_cracked', 'Óculos Rachados', 'eyes', 'zombie', 'common', [
    { shape: 'box', size: [0.1, 0.07, 0.01], pos: [0.07, 0, 0.01], color: 0x1a1a1a },
    { shape: 'box', size: [0.1, 0.07, 0.01], pos: [-0.07, 0, 0.01], color: 0x1a1a1a },
    { shape: 'box', size: [0.08, 0.05, 0.005], pos: [-0.07, 0, 0.017], rot: [0, 0, 0.5], color: 0xc8d0d8 },
  ]),
  c('goggles_welding', 'Óculos de Solda', 'eyes', 'zombie', 'uncommon', [
    { shape: 'box', size: [0.32, 0.1, 0.05], pos: [0, 0, 0.02], color: 0x2a2a2a },
    {
      shape: 'box',
      size: [0.12, 0.06, 0.01],
      pos: [0.07, 0, 0.05],
      color: 0x3a6a2a,
      glow: true,
      glowIntensity: 1.2,
    },
    {
      shape: 'box',
      size: [0.12, 0.06, 0.01],
      pos: [-0.07, 0, 0.05],
      color: 0x3a6a2a,
      glow: true,
      glowIntensity: 1.2,
    },
  ]),
  c('shades_cool', 'Óculos Escuros Estilosos', 'eyes', 'zombie', 'rare', [
    { shape: 'box', size: [0.34, 0.07, 0.02], pos: [0, 0, 0.015], color: 0x0a0a0a },
    {
      shape: 'box',
      size: [0.3, 0.02, 0.022],
      pos: [0, 0.02, 0.02],
      color: 0xff5ad8,
      glow: true,
      glowIntensity: 1.5,
    },
  ]),
  // ======================= máscaras (boca)
  c('mask_hockey', 'Máscara de Hóquei', 'mask', 'zombie', 'uncommon', [
    { shape: 'box', size: [0.26, 0.26, 0.04], pos: [0, 0.09, 0.015], color: 0xe8e4d8 },
    { shape: 'box', size: [0.06, 0.02, 0.01], pos: [0.06, 0.14, 0.04], color: 0x1a1a1a },
    { shape: 'box', size: [0.06, 0.02, 0.01], pos: [-0.06, 0.14, 0.04], color: 0x1a1a1a },
    { shape: 'box', size: [0.02, 0.1, 0.01], pos: [0.09, 0.06, 0.04], rot: [0, 0, 0.3], color: 0xb02a2a },
  ]),
  c('mask_gas', 'Máscara de Gás', 'mask', 'zombie', 'common', [
    { shape: 'box', size: [0.22, 0.16, 0.08], pos: [0, 0.04, 0.03], color: 0x2a2e2a },
    { shape: 'cyl', size: [0.05, 0.05, 0.1, 8], pos: [0, 0.0, 0.1], rot: [H, 0, 0], color: 0x3a3e3a },
  ]),
  c('bandages', 'Bandagens', 'mask', 'zombie', 'common', [
    { shape: 'box', size: [0.36, 0.05, 0.33], pos: [0, 0.1, -0.13], rot: [0, 0, 0.1], color: 0xd8d0b8 },
    { shape: 'box', size: [0.36, 0.05, 0.33], pos: [0, 0.2, -0.13], rot: [0, 0, -0.08], color: 0xc8c0a8 },
  ]),
  c('mask_skull', 'Máscara de Caveira', 'mask', 'zombie', 'rare', [
    { shape: 'box', size: [0.3, 0.3, 0.04], pos: [0, 0.1, 0.015], color: 0xe8e8e0 },
    { shape: 'box', size: [0.08, 0.06, 0.01], pos: [0.07, 0.15, 0.04], color: 0x0a0a0a },
    { shape: 'box', size: [0.08, 0.06, 0.01], pos: [-0.07, 0.15, 0.04], color: 0x0a0a0a },
    { shape: 'box', size: [0.16, 0.03, 0.01], pos: [0, 0.0, 0.04], color: 0x0a0a0a },
    {
      shape: 'box',
      size: [0.04, 0.03, 0.01],
      pos: [0.07, 0.15, 0.045],
      color: 0xff3a3a,
      glow: true,
      glowIntensity: 3,
    },
    {
      shape: 'box',
      size: [0.04, 0.03, 0.01],
      pos: [-0.07, 0.15, 0.045],
      color: 0xff3a3a,
      glow: true,
      glowIntensity: 3,
    },
  ]),
  c('beard_wizard', 'Barba de Mago', 'mask', 'wizard', 'uncommon', [
    {
      shape: 'cone',
      size: [0.15, 0.42, 8],
      pos: [0, -0.16, 0.03],
      rot: [Math.PI + 0.25, 0, 0],
      color: 0xe8e8e8,
    },
    { shape: 'box', size: [0.22, 0.05, 0.05], pos: [0, 0.06, 0.02], color: 0xe8e8e8 },
  ]),
  c('scarf_mystic', 'Cachecol Místico', 'mask', 'wizard', 'common', [
    { shape: 'torus', size: [0.16, 0.05, 5, 12], pos: [0, -0.06, -0.12], rot: [H, 0, 0], color: 0x8a2a5a },
    { shape: 'box', size: [0.08, 0.3, 0.03], pos: [0.1, -0.2, 0.04], color: 0x8a2a5a },
  ]),
  // ======================= corpo
  c('robe_apprentice', 'Túnica do Aprendiz', 'body', 'wizard', 'common', robe(0x3a4a7a, 0x8a7a3a), LONG),
  c('robe_starry', 'Manto Estrelado', 'body', 'wizard', 'rare', robe(0x1a2248, 0xffd24a, 0xfff0a0), LONG),
  c('robe_runic', 'Robe Rúnico', 'body', 'wizard', 'epic', robe(0x2a1a3a, 0x9ff0ff, 0x9ff0ff), LONG),
  c('robe_crimson', 'Veste Carmesim', 'body', 'wizard', 'uncommon', robe(0x6a1a1a, 0xc8a040), LONG),
  c('shirt_plaid', 'Camisa Xadrez Rasgada', 'body', 'zombie', 'common', shirt(0x8a2a2a, 0x2a1a1a)),
  c('coat_lab', 'Jaleco Ensanguentado', 'body', 'zombie', 'uncommon', [
    { shape: 'box', size: [0.58, 0.44, 0.36], pos: [0, 0.05, 0], color: 0xe8e8e0 },
    { shape: 'box', size: [0.52, 0.7, 0.34], pos: [0, -0.45, 0], color: 0xe0e0d8 },
    { shape: 'box', size: [0.16, 0.2, 0.02], pos: [0.1, -0.1, 0.19], color: 0x8a1010 },
    { shape: 'box', size: [0.1, 0.12, 0.02], pos: [-0.14, -0.4, 0.18], color: 0x7a0a0a },
  ]),
  c('suit_banker', 'Terno do Bancário', 'body', 'zombie', 'rare', [
    ...shirt(0x1a1c24, 0x1a1c24),
    { shape: 'box', size: [0.14, 0.34, 0.02], pos: [0, 0.02, 0.18], color: 0xe8e8e8 },
    { shape: 'box', size: [0.05, 0.3, 0.02], pos: [0, 0.0, 0.19], color: 0x8a1a1a },
  ]),
  c('vest_hazard', 'Colete Refletivo', 'body', 'zombie', 'common', [
    { shape: 'box', size: [0.58, 0.44, 0.36], pos: [0, 0.03, 0], color: 0xff8a1a },
    {
      shape: 'box',
      size: [0.59, 0.05, 0.37],
      pos: [0, 0.08, 0],
      color: 0xd8d8d8,
      glow: true,
      glowIntensity: 1.2,
    },
    {
      shape: 'box',
      size: [0.59, 0.05, 0.37],
      pos: [0, -0.08, 0],
      color: 0xd8d8d8,
      glow: true,
      glowIntensity: 1.2,
    },
  ]),
  // ======================= costas
  c('cape_arcane', 'Capa Arcana', 'back', 'wizard', 'rare', [], cape(0x2a1a5a, 0x9ff0ff)),
  c('cape_ruby', 'Capa Rubi', 'back', 'wizard', 'epic', [], cape(0x8a1020, 0xffd24a, 1.2, 0.6)),
  c('cape_novice', 'Capa de Novato', 'back', 'wizard', 'common', [], cape(0x3a4a6a, 0x2a3a5a, 0.9, 0.5)),
  c('cape_curtain', 'Capa de Cortina', 'back', 'zombie', 'uncommon', [], cape(0x6a2a4a, 0x4a1a3a, 1.0, 0.58)),
  c('backpack', 'Mochila de Sobrevivência', 'back', 'zombie', 'common', [
    { shape: 'box', size: [0.4, 0.46, 0.2], pos: [0, -0.1, -0.08], color: 0x4a5a3a },
    { shape: 'box', size: [0.3, 0.14, 0.06], pos: [0, -0.2, -0.2], color: 0x3a4a2a },
    { shape: 'cyl', size: [0.08, 0.08, 0.36, 8], pos: [0, 0.18, -0.08], rot: [0, 0, H], color: 0x6a4a2a },
  ]),
  c('grave_sign', 'Placa de Lápide', 'back', 'zombie', 'rare', [
    { shape: 'box', size: [0.45, 0.6, 0.08], pos: [0, 0.05, -0.08], rot: [0, 0, 0.12], color: 0x7a7a82 },
    {
      shape: 'cyl',
      size: [0.225, 0.225, 0.08, 10],
      pos: [0.04, 0.35, -0.08],
      rot: [H, 0, 0.12],
      color: 0x7a7a82,
    },
    { shape: 'box', size: [0.25, 0.04, 0.01], pos: [0.02, 0.1, -0.03], rot: [0, 0, 0.12], color: 0x3a3a42 },
  ]),
  c('wings_bat', 'Asas de Morcego', 'back', 'zombie', 'epic', [
    { shape: 'box', size: [0.7, 0.4, 0.02], pos: [0.42, 0.15, -0.1], rot: [0, 0.4, 0.3], color: 0x2a1a2a },
    { shape: 'box', size: [0.7, 0.4, 0.02], pos: [-0.42, 0.15, -0.1], rot: [0, -0.4, -0.3], color: 0x2a1a2a },
    { shape: 'box', size: [0.75, 0.04, 0.03], pos: [0.44, 0.35, -0.1], rot: [0, 0.4, 0.3], color: 0x4a2a4a },
    {
      shape: 'box',
      size: [0.75, 0.04, 0.03],
      pos: [-0.44, 0.35, -0.1],
      rot: [0, -0.4, -0.3],
      color: 0x4a2a4a,
    },
  ]),
  // ======================= acessórios novos (caem dos inimigos, saem no baú e estão na loja)
  c('crown_gears', 'Coroa de Engrenagens', 'head', 'zombie', 'rare', [
    { shape: 'torus', size: [0.18, 0.03, 4, 16], pos: [0, 0.03, 0], rot: [H, 0, 0], color: 0x8a8e96 },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i): P => {
      const a = (i / 8) * Math.PI * 2;
      return {
        shape: 'box',
        size: [0.05, 0.08, 0.05],
        pos: [Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2],
        rot: [0, -a, 0],
        color: 0xc8a040,
      };
    }),
    {
      shape: 'sphere',
      size: [0.035, 6, 4],
      pos: [0, 0.06, 0.2],
      color: 0xff8c1a,
      glow: true,
      glowIntensity: 3,
    },
  ]),
  c('helmet_viking', 'Elmo Viking', 'head', 'zombie', 'rare', [
    { shape: 'sphere', size: [0.21, 10, 6], pos: [0, -0.03, 0], color: 0x8a8e96 },
    { shape: 'torus', size: [0.21, 0.025, 4, 14], pos: [0, -0.03, 0], rot: [H, 0, 0], color: 0x6a4a2a },
    { shape: 'cone', size: [0.045, 0.22, 6], pos: [0.21, 0.08, 0], rot: [0, 0, -0.9], color: 0xe8e0c8 },
    { shape: 'cone', size: [0.045, 0.22, 6], pos: [-0.21, 0.08, 0], rot: [0, 0, 0.9], color: 0xe8e0c8 },
  ]),
  c('antennae_alien', 'Antenas de ET', 'head', 'zombie', 'common', [
    { shape: 'cyl', size: [0.012, 0.012, 0.22, 5], pos: [0.07, 0.1, 0], rot: [0, 0, -0.35], color: 0x5aff7a },
    { shape: 'cyl', size: [0.012, 0.012, 0.22, 5], pos: [-0.07, 0.1, 0], rot: [0, 0, 0.35], color: 0x5aff7a },
    {
      shape: 'sphere',
      size: [0.035, 6, 4],
      pos: [0.11, 0.2, 0],
      color: 0x5aff7a,
      glow: true,
      glowIntensity: 2.5,
    },
    {
      shape: 'sphere',
      size: [0.035, 6, 4],
      pos: [-0.11, 0.2, 0],
      color: 0x5aff7a,
      glow: true,
      glowIntensity: 2.5,
    },
  ]),
  c('halo_arcane', 'Auréola Arcana', 'head', 'wizard', 'epic', [
    {
      shape: 'torus',
      size: [0.16, 0.02, 4, 20],
      pos: [0, 0.16, 0],
      rot: [H, 0, 0],
      color: 0xfff0a0,
      glow: true,
      glowIntensity: 3.5,
    },
  ]),
  c('headband_ninja', 'Faixa de Ninja', 'head', 'wizard', 'uncommon', [
    { shape: 'torus', size: [0.2, 0.03, 4, 16], pos: [0, -0.1, 0], rot: [H, 0, 0], color: 0x1a1a24 },
    { shape: 'box', size: [0.08, 0.05, 0.01], pos: [0, -0.1, 0.205], color: 0xc8c8d8 },
    {
      shape: 'box',
      size: [0.03, 0.18, 0.015],
      pos: [0.04, -0.18, -0.2],
      rot: [0.3, 0, 0.3],
      color: 0x1a1a24,
    },
    {
      shape: 'box',
      size: [0.03, 0.16, 0.015],
      pos: [-0.03, -0.17, -0.2],
      rot: [0.3, 0, -0.2],
      color: 0x1a1a24,
    },
  ]),
  c('visor_neon', 'Visor de Neon', 'eyes', 'zombie', 'uncommon', [
    {
      shape: 'box',
      size: [0.32, 0.06, 0.02],
      pos: [0, 0, 0.015],
      color: 0x39e6ff,
      glow: true,
      glowIntensity: 2,
    },
    { shape: 'box', size: [0.34, 0.015, 0.02], pos: [0, 0.035, 0.012], color: 0x1a1e26 },
  ]),
  c('goggles_aviator', 'Óculos de Aviador', 'eyes', 'zombie', 'common', [
    { shape: 'cyl', size: [0.055, 0.055, 0.04, 10], pos: [0.07, 0, 0.02], rot: [H, 0, 0], color: 0x6a4a2a },
    { shape: 'cyl', size: [0.055, 0.055, 0.04, 10], pos: [-0.07, 0, 0.02], rot: [H, 0, 0], color: 0x6a4a2a },
    { shape: 'cyl', size: [0.045, 0.045, 0.01, 10], pos: [0.07, 0, 0.042], rot: [H, 0, 0], color: 0x9ad8e8 },
    { shape: 'cyl', size: [0.045, 0.045, 0.01, 10], pos: [-0.07, 0, 0.042], rot: [H, 0, 0], color: 0x9ad8e8 },
    { shape: 'box', size: [0.36, 0.03, 0.02], pos: [0, 0, -0.005], color: 0x3a2a1a },
  ]),
  c('mask_samurai', 'Máscara de Samurai', 'mask', 'zombie', 'epic', [
    { shape: 'box', size: [0.26, 0.16, 0.05], pos: [0, 0.03, 0.02], color: 0x8a1a1a },
    { shape: 'box', size: [0.12, 0.025, 0.01], pos: [0, 0.07, 0.05], color: 0xe8e0c8 },
    { shape: 'box', size: [0.14, 0.012, 0.01], pos: [0, 0.0, 0.05], color: 0x1a0a0a },
    { shape: 'cone', size: [0.03, 0.08, 4], pos: [0, -0.08, 0.04], rot: [Math.PI, 0, 0], color: 0xe8e0c8 },
  ]),
  c('mustache_fancy', 'Bigode Elegante', 'mask', 'wizard', 'common', [
    { shape: 'box', size: [0.1, 0.03, 0.02], pos: [0.05, 0.07, 0.03], rot: [0, 0, 0.3], color: 0x3a2414 },
    { shape: 'box', size: [0.1, 0.03, 0.02], pos: [-0.05, 0.07, 0.03], rot: [0, 0, -0.3], color: 0x3a2414 },
    { shape: 'sphere', size: [0.02, 6, 4], pos: [0.1, 0.09, 0.03], color: 0x3a2414 },
    { shape: 'sphere', size: [0.02, 6, 4], pos: [-0.1, 0.09, 0.03], color: 0x3a2414 },
  ]),
  c('armor_knight', 'Armadura de Cavaleiro', 'body', 'zombie', 'epic', [
    { shape: 'box', size: [0.58, 0.44, 0.36], pos: [0, 0.04, 0], color: 0xa8aeb8 },
    { shape: 'box', size: [0.46, 0.22, 0.32], pos: [0, -0.22, 0], color: 0x8a909a },
    { shape: 'sphere', size: [0.14, 8, 5], pos: [0.3, 0.22, 0], color: 0xc8ced8 },
    { shape: 'sphere', size: [0.14, 8, 5], pos: [-0.3, 0.22, 0], color: 0xc8ced8 },
    { shape: 'box', size: [0.06, 0.3, 0.02], pos: [0, 0.04, 0.185], color: 0xffd24a },
    { shape: 'box', size: [0.22, 0.06, 0.02], pos: [0, 0.1, 0.186], color: 0xffd24a },
  ]),
  c('kimono_dojo', 'Quimono do Dojo', 'body', 'wizard', 'uncommon', [
    ...shirt(0xf0f0f0, 0xd8d8d8),
    { shape: 'box', size: [0.44, 0.06, 0.3], pos: [0, -0.22, 0], color: 0x1a1a1a },
    { shape: 'box', size: [0.05, 0.3, 0.02], pos: [-0.05, 0.02, 0.18], rot: [0, 0, -0.35], color: 0xc8c8c8 },
  ]),
  c('jetpack', 'Mochila a Jato', 'back', 'zombie', 'rare', [
    { shape: 'cyl', size: [0.09, 0.09, 0.42, 10], pos: [0.11, -0.05, -0.1], color: 0x8a8e96 },
    { shape: 'cyl', size: [0.09, 0.09, 0.42, 10], pos: [-0.11, -0.05, -0.1], color: 0x8a8e96 },
    { shape: 'cone', size: [0.07, 0.1, 8], pos: [0.11, -0.31, -0.1], rot: [Math.PI, 0, 0], color: 0x3a3e46 },
    { shape: 'cone', size: [0.07, 0.1, 8], pos: [-0.11, -0.31, -0.1], rot: [Math.PI, 0, 0], color: 0x3a3e46 },
    {
      shape: 'sphere',
      size: [0.05, 6, 4],
      pos: [0.11, -0.38, -0.1],
      color: 0xff8a2a,
      glow: true,
      glowIntensity: 3,
    },
    {
      shape: 'sphere',
      size: [0.05, 6, 4],
      pos: [-0.11, -0.38, -0.1],
      color: 0xff8a2a,
      glow: true,
      glowIntensity: 3,
    },
  ]),
  c('wings_angel', 'Asas de Anjo', 'back', 'wizard', 'epic', [
    { shape: 'box', size: [0.6, 0.34, 0.03], pos: [0.36, 0.12, -0.1], rot: [0, 0.35, 0.35], color: 0xf4f4f8 },
    {
      shape: 'box',
      size: [0.6, 0.34, 0.03],
      pos: [-0.36, 0.12, -0.1],
      rot: [0, -0.35, -0.35],
      color: 0xf4f4f8,
    },
    {
      shape: 'box',
      size: [0.45, 0.2, 0.031],
      pos: [0.3, -0.05, -0.1],
      rot: [0, 0.35, 0.15],
      color: 0xe0e4ee,
    },
    {
      shape: 'box',
      size: [0.45, 0.2, 0.031],
      pos: [-0.3, -0.05, -0.1],
      rot: [0, -0.35, -0.15],
      color: 0xe0e4ee,
    },
  ]),
  c('cape_phoenix', 'Capa de Fênix', 'back', 'wizard', 'epic', [], cape(0xd8401a, 0xffd24a, 1.15, 0.6)),
  // ======================= braços (antebraços)
  c('bracers_apprentice', 'Braçadeiras de Aprendiz', 'arms', 'wizard', 'common', bracer(0x3a4a8a, 0x8a7a3a)),
  c('cuffs_starry', 'Punhos Estrelados', 'arms', 'wizard', 'rare', [
    { shape: 'box', size: [0.17, 0.12, 0.17], pos: [0, 0.01, 0], color: 0x1a2a6a },
    { shape: 'cyl', size: [0.1, 0.13, 0.06, 8], pos: [0, -0.07, 0], color: 0x1a2a6a },
    { shape: 'box', size: [0.18, 0.025, 0.18], pos: [0, 0.07, 0], color: 0xffd24a },
    ...[0.09, -0.09].map((x): P => ({
      shape: 'oct',
      size: [0.035, 0],
      pos: [x, 0.01, 0],
      color: 0xfff0a0,
      glow: true,
      glowIntensity: 3,
    })),
    { shape: 'oct', size: [0.035, 0], pos: [0, 0.01, 0.09], color: 0xfff0a0, glow: true, glowIntensity: 3 },
  ]),
  c('gauntlets_crystal', 'Manoplas de Cristal', 'arms', 'wizard', 'epic', [
    { shape: 'box', size: [0.18, 0.17, 0.18], pos: [0, 0.01, 0], color: 0x5a3a8a },
    { shape: 'box', size: [0.19, 0.03, 0.19], pos: [0, 0.1, 0], color: 0xffd24a },
    { shape: 'oct', size: [0.05, 0], pos: [0, 0.02, 0.1], color: 0x9ff0ff, glow: true, glowIntensity: 3 },
    ...[0.1, -0.1].map((x): P => ({
      shape: 'oct',
      size: [0.035, 0],
      pos: [x, 0.03, 0],
      color: 0x9ff0ff,
      glow: true,
      glowIntensity: 3,
    })),
  ]),
  c('wristbands_sport', 'Munhequeiras Listradas', 'arms', 'zombie', 'common', [
    { shape: 'box', size: [0.15, 0.1, 0.15], pos: [0, -0.03, 0], color: 0xf0f0f0 },
    { shape: 'box', size: [0.155, 0.025, 0.155], pos: [0, -0.03, 0], color: 0x2a7aff },
  ]),
  c('bracers_tape', 'Braçadeiras de Fita Prateada', 'arms', 'zombie', 'uncommon', [
    { shape: 'box', size: [0.15, 0.05, 0.15], pos: [0, 0.06, 0], rot: [0, 0, 0.08], color: 0xa8b0b8 },
    { shape: 'box', size: [0.15, 0.05, 0.15], pos: [0, 0, 0], rot: [0, 0, -0.06], color: 0x98a0a8 },
    { shape: 'box', size: [0.15, 0.05, 0.15], pos: [0, -0.06, 0], rot: [0, 0, 0.05], color: 0xb0b8c0 },
  ]),
  // ======================= pernas (canelas e joelhos)
  c('shinguards_forest', 'Caneleiras do Bosque', 'legs', 'wizard', 'common', [
    ...shinGuard(0x3a6a3a),
    { shape: 'box', size: [0.2, 0.03, 0.2], pos: [0, 0.12, 0], color: 0x8a6a3a },
    { shape: 'box', size: [0.2, 0.03, 0.2], pos: [0, -0.14, 0], color: 0x8a6a3a },
    { shape: 'box', size: [0.06, 0.1, 0.02], pos: [0, 0, 0.1], rot: [0, 0, 0.6], color: 0x7ad84a },
  ]),
  c('greaves_moon', 'Grevas Lunares', 'legs', 'wizard', 'epic', [
    ...shinGuard(0xc8c8d8),
    kneePad(0xa8a8c0),
    {
      shape: 'torus',
      size: [0.05, 0.012, 4, 10],
      pos: [0, 0, 0.1],
      color: 0xdfe6ff,
      glow: true,
      glowIntensity: 2.5,
    },
  ]),
  c('kneepads_patch', 'Joelheiras Remendadas', 'legs', 'zombie', 'common', [
    kneePad(0x8a6a4a),
    { shape: 'box', size: [0.17, 0.04, 0.17], pos: [0, 0.12, 0], color: 0x2a2a2a },
    { shape: 'box', size: [0.07, 0.06, 0.01], pos: [0.04, 0.21, 0.135], rot: [0, 0, 0.3], color: 0x5a8ad8 },
  ]),
  c('shinguards_soccer', 'Caneleiras de Futebol', 'legs', 'zombie', 'uncommon', [
    { shape: 'box', size: [0.18, 0.26, 0.18], pos: [0, -0.01, 0], color: 0xf0f0f0 },
    { shape: 'box', size: [0.185, 0.05, 0.185], pos: [0, 0.05, 0], color: 0x2ab84a },
    { shape: 'box', size: [0.185, 0.05, 0.185], pos: [0, -0.07, 0], color: 0x2ab84a },
  ]),
  c('greaves_scrap', 'Caneleiras de Sucata', 'legs', 'zombie', 'rare', [
    ...shinGuard(0x8a8e96),
    kneePad(0x6a6e76),
    ...[
      [0.05, 0.06],
      [-0.05, 0.06],
      [0.05, -0.08],
      [-0.05, -0.08],
    ].map(([x, y]): P => ({ shape: 'sphere', size: [0.018, 5, 4], pos: [x!, y!, 0.097], color: 0xc8a040 })),
    { shape: 'box', size: [0.08, 0.06, 0.01], pos: [0.03, -0.01, 0.1], color: 0xc87a2a },
  ]),
  // ======================= pés
  c('slippers_star', 'Pantufas de Estrela', 'feet', 'wizard', 'common', [
    ...boot(0x3a4a8a, null, 0xe8e0c8),
    { shape: 'oct', size: [0.04, 0], pos: [0, 0.11, 0.13], color: 0xfff0a0, glow: true, glowIntensity: 3 },
  ]),
  c('boots_curly', 'Botinhas de Bico Enrolado', 'feet', 'wizard', 'uncommon', [
    ...boot(0x5a2a8a, 0x5a2a8a),
    { shape: 'cone', size: [0.06, 0.12, 6], pos: [0, 0.06, 0.21], rot: [H, 0, 0], color: 0x5a2a8a },
    { shape: 'torus', size: [0.04, 0.015, 4, 8], pos: [0, 0.1, 0.27], rot: [0, H, 0], color: 0xffd24a },
  ]),
  c('boots_cloud', 'Botas de Nuvem', 'feet', 'wizard', 'epic', [
    ...boot(0xf4f4f8, 0xe0e4ee),
    ...[
      [0.07, 0.1],
      [-0.07, 0.1],
      [0.07, -0.1],
      [-0.07, -0.1],
    ].map(([x, z]): P => ({ shape: 'sphere', size: [0.07, 6, 4], pos: [x!, 0.07, z!], color: 0xffffff })),
    {
      shape: 'box',
      size: [0.19, 0.03, 0.21],
      pos: [0, 0.2, -0.04],
      color: 0x9ff0ff,
      glow: true,
      glowIntensity: 3,
    },
  ]),
  c('boots_rain', 'Galochas Amarelas', 'feet', 'zombie', 'common', boot(0xffd23a, 0xffd23a, 0x3a3a3a)),
  c('sneakers_neon', 'Tênis de Neon', 'feet', 'zombie', 'rare', [
    { shape: 'box', size: [0.2, 0.125, 0.34], pos: [0, 0.058, 0.005], color: 0x2a2e3a },
    { shape: 'box', size: [0.18, 0.07, 0.2], pos: [0, 0.14, -0.04], color: 0x2a2e3a },
    {
      shape: 'box',
      size: [0.21, 0.035, 0.35],
      pos: [0, 0.015, 0.005],
      color: 0x39e6ff,
      glow: true,
      glowIntensity: 2,
    },
    { shape: 'box', size: [0.1, 0.02, 0.1], pos: [0, 0.125, 0.06], color: 0xf0f0f0 },
  ]),
  // ======================= chefes (únicos)
  c('crown_coveiro', 'Coroa do Coveiro', 'head', 'boss', 'epic', [
    { shape: 'cyl', size: [0.2, 0.22, 0.12, 8], pos: [0, 0.05, 0], color: 0x3a3228 },
    { shape: 'cone', size: [0.04, 0.14, 4], pos: [0.14, 0.17, 0], color: 0x6a6e76 },
    { shape: 'cone', size: [0.04, 0.14, 4], pos: [-0.14, 0.17, 0], color: 0x6a6e76 },
    { shape: 'cone', size: [0.04, 0.16, 4], pos: [0, 0.18, 0.14], color: 0x6a6e76 },
    {
      shape: 'sphere',
      size: [0.035, 6, 4],
      pos: [0, 0.07, 0.2],
      color: 0xb8ff4a,
      glow: true,
      glowIntensity: 3,
    },
  ]),
  c('crown_omega', 'Coroa do Ômega', 'head', 'boss', 'legendary', [
    { shape: 'torus', size: [0.19, 0.035, 4, 16], pos: [0, 0.03, 0], rot: [H, 0, 0], color: 0xffd24a },
    ...[0, 1, 2, 3, 4, 5].map((i): P => {
      const a = (i / 6) * Math.PI * 2;
      return {
        shape: 'cone',
        size: [0.035, 0.18, 4],
        pos: [Math.cos(a) * 0.19, 0.12, Math.sin(a) * 0.19],
        color: 0xffd24a,
      };
    }),
    { shape: 'oct', size: [0.06, 0], pos: [0, 0.1, 0.21], color: 0xff3ad7, glow: true, glowIntensity: 4 },
    {
      shape: 'torus',
      size: [0.24, 0.012, 4, 20],
      pos: [0, 0.28, 0],
      rot: [H, 0, 0],
      color: 0x9ff0ff,
      glow: true,
      glowIntensity: 3,
    },
  ]),
  c('gauntlets_mecha', 'Manoplas do Mecha Dominador', 'arms', 'boss', 'epic', [
    { shape: 'box', size: [0.2, 0.18, 0.2], pos: [0, 0.01, 0], color: 0x3a3e46 },
    { shape: 'box', size: [0.22, 0.05, 0.22], pos: [0, -0.08, 0], color: 0x22262e },
    {
      shape: 'box',
      size: [0.04, 0.12, 0.03],
      pos: [0, 0.01, 0.11],
      color: 0xff8a2a,
      glow: true,
      glowIntensity: 2.5,
    },
    ...[0.11, -0.11].map((x): P => ({
      shape: 'cyl',
      size: [0.03, 0.03, 0.08, 6],
      pos: [x, 0.05, 0],
      rot: [0, 0, H],
      color: 0x8a8e96,
    })),
  ]),
  c('kneepads_halfpipe', 'Joelheiras do Half-Pipe', 'legs', 'boss', 'epic', [
    { shape: 'box', size: [0.19, 0.24, 0.19], pos: [0, -0.02, 0], color: 0x2a2a3a },
    { shape: 'box', size: [0.22, 0.16, 0.12], pos: [0, 0.2, 0.08], color: 0xffd24a },
    { shape: 'oct', size: [0.04, 0], pos: [0, 0.2, 0.145], color: 0xff5ad8, glow: true, glowIntensity: 3 },
    {
      shape: 'box',
      size: [0.03, 0.2, 0.01],
      pos: [0, -0.02, 0.1],
      color: 0x39e6ff,
      glow: true,
      glowIntensity: 2,
    },
  ]),
  c('boots_frost', 'Botas Geladas do General', 'feet', 'boss', 'epic', [
    ...boot(0x9ad8f0, 0xc8ecff),
    { shape: 'box', size: [0.21, 0.08, 0.1], pos: [0, 0.05, 0.13], color: 0xe8f8ff },
    ...[0.1, -0.1].map((x): P => ({
      shape: 'oct',
      size: [0.04, 0],
      pos: [x, 0.17, -0.04],
      color: 0x5ad8ff,
      glow: true,
      glowIntensity: 2.5,
    })),
  ]),

  // ---------------------------------------------------------------- disfarce do Prodígio (vem com ele)
  // (o id continua "wig_black" para não sumir dos saves de quem já tem)
  // vem com sobrancelhas pretas: as loiras entregariam o disfarce
  c('wig_black', 'Peruca Castanho-Escura', 'head', 'secret', 'epic', hairWig(0x3b2415, 0x5a3a22), {
    desc: 'Disfarce do Prodígio.',
    brows: 0x16110d,
  }),
  c('lens_green', 'Lentes Verdes', 'eyes', 'secret', 'rare', lenses(0x3aa84a), {
    desc: 'Disfarce do Prodígio.',
  }),
  c('lens_brown', 'Lentes Castanhas', 'eyes', 'secret', 'rare', lenses(0x6a3a1a), {
    desc: 'Disfarce do Prodígio.',
  }),
];

/** Lentes de contato coloridas por cima dos olhos (no encaixe do rosto). */
function lenses(color: number): P[] {
  return [0.0667, -0.0667].flatMap((x): P[] => [
    { shape: 'box', size: [0.038, 0.046, 0.008], pos: [x, -0.002, 0.0205], color },
    { shape: 'box', size: [0.015, 0.02, 0.004], pos: [x, -0.002, 0.026], color: 0x0a0a0a },
  ]);
}

/** O disfarce que vem junto com o Prodígio (personagem secreto). */
export const SECRET_GIFTS = ['wig_black', 'lens_green', 'lens_brown'];

registerCosmetics(COSMETIC_LIST);
