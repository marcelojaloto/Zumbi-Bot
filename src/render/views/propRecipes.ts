import type { MeshRecipe, PropKind } from '../../data/types';

/** Receitas visuais dos objetos quebráveis. */
export const PROP_RECIPES: Record<PropKind, MeshRecipe> = {
  crate: {
    parts: [
      { shape: 'box', size: [0.85, 0.85, 0.85], pos: [0, 0.425, 0], color: 0x7a5a32 },
      { shape: 'box', size: [0.87, 0.12, 0.87], pos: [0, 0.1, 0], color: 0x4a3218 },
      { shape: 'box', size: [0.87, 0.12, 0.87], pos: [0, 0.75, 0], color: 0x4a3218 },
      { shape: 'box', size: [0.1, 0.87, 0.87], pos: [0, 0.425, 0], color: 0x5a4020 },
    ],
  },
  weaponCrate: {
    parts: [
      { shape: 'box', size: [1.2, 0.6, 0.7], pos: [0, 0.3, 0], color: 0x3a4a2a },
      { shape: 'box', size: [1.22, 0.08, 0.72], pos: [0, 0.6, 0], color: 0x2a3a1a },
      { shape: 'box', size: [0.5, 0.18, 0.02], pos: [0, 0.35, 0.36], color: 0xffd24a },
    ],
  },
  barrel: {
    parts: [
      { shape: 'cyl', size: [0.38, 0.38, 1.0, 10], pos: [0, 0.5, 0], color: 0x3a4a5a },
      { shape: 'cyl', size: [0.395, 0.395, 0.06, 10], pos: [0, 0.25, 0], color: 0x1a1a1a },
      { shape: 'cyl', size: [0.395, 0.395, 0.06, 10], pos: [0, 0.75, 0], color: 0x1a1a1a },
    ],
  },
  explosiveBarrel: {
    parts: [
      { shape: 'cyl', size: [0.38, 0.38, 1.0, 10], pos: [0, 0.5, 0], color: 0xc02a10 },
      { shape: 'cyl', size: [0.395, 0.395, 0.08, 10], pos: [0, 0.25, 0], color: 0x2a2a2a },
      { shape: 'cyl', size: [0.395, 0.395, 0.08, 10], pos: [0, 0.75, 0], color: 0x2a2a2a },
      {
        shape: 'box',
        size: [0.3, 0.3, 0.02],
        pos: [0, 0.5, 0.385],
        color: 0xffd24a,
        glow: true,
        glowIntensity: 1.6,
      },
    ],
  },
  bin: {
    parts: [
      { shape: 'cyl', size: [0.36, 0.3, 0.95, 8], pos: [0, 0.475, 0], color: 0x4a5a4a },
      { shape: 'cyl', size: [0.4, 0.4, 0.08, 8], pos: [0, 0.96, 0], color: 0x3a4a3a },
    ],
  },
  tombstone: {
    parts: [
      { shape: 'box', size: [0.7, 1.0, 0.2], pos: [0, 0.5, 0], color: 0x7a7a82 },
      {
        shape: 'cyl',
        size: [0.35, 0.35, 0.2, 10],
        pos: [0, 1.0, 0],
        rot: [Math.PI / 2, 0, 0],
        color: 0x7a7a82,
      },
      { shape: 'box', size: [0.4, 0.06, 0.02], pos: [0, 0.8, 0.11], color: 0x3a3a42 },
    ],
  },
  atm: {
    parts: [
      { shape: 'box', size: [0.9, 1.8, 0.7], pos: [0, 0.9, 0], color: 0x5a6068 },
      {
        shape: 'box',
        size: [0.6, 0.4, 0.02],
        pos: [0, 1.3, 0.36],
        color: 0x3ad8ff,
        glow: true,
        glowIntensity: 1.8,
      },
      { shape: 'box', size: [0.5, 0.1, 0.1], pos: [0, 0.9, 0.36], color: 0x2a2e36 },
    ],
  },
  car: {
    parts: [
      { shape: 'box', size: [3.8, 0.7, 1.7], pos: [0, 0.6, 0], color: 0x2a4a7a },
      { shape: 'box', size: [2.0, 0.55, 1.5], pos: [-0.2, 1.2, 0], color: 0x2a4a7a },
      { shape: 'box', size: [2.02, 0.4, 1.52], pos: [-0.2, 1.2, 0], color: 0x10141a },
      {
        shape: 'cyl',
        size: [0.32, 0.32, 0.22, 8],
        pos: [-1.2, 0.32, 0.8],
        rot: [Math.PI / 2, 0, 0],
        color: 0x111111,
      },
      {
        shape: 'cyl',
        size: [0.32, 0.32, 0.22, 8],
        pos: [1.2, 0.32, 0.8],
        rot: [Math.PI / 2, 0, 0],
        color: 0x111111,
      },
      {
        shape: 'cyl',
        size: [0.32, 0.32, 0.22, 8],
        pos: [-1.2, 0.32, -0.8],
        rot: [Math.PI / 2, 0, 0],
        color: 0x111111,
      },
      {
        shape: 'cyl',
        size: [0.32, 0.32, 0.22, 8],
        pos: [1.2, 0.32, -0.8],
        rot: [Math.PI / 2, 0, 0],
        color: 0x111111,
      },
      {
        shape: 'box',
        size: [0.1, 0.18, 0.4],
        pos: [1.9, 0.65, 0.5],
        color: 0xffe8a0,
        glow: true,
        glowIntensity: 2,
      },
      {
        shape: 'box',
        size: [0.1, 0.18, 0.4],
        pos: [1.9, 0.65, -0.5],
        color: 0xffe8a0,
        glow: true,
        glowIntensity: 2,
      },
    ],
  },
};
