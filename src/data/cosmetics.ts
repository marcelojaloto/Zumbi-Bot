import type { CosmeticDef, CosmeticId, Rarity } from './types';

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  uncommon: 28,
  rare: 10,
  epic: 2,
  legendary: 0,
};
export const RARITY_NAMES: Record<Rarity, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
};
export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0xc8c8c8,
  uncommon: 0x5aff7a,
  rare: 0x3a9cff,
  epic: 0xb05aff,
  legendary: 0xffa01a,
};
export const DUP_SCRAP: Record<Rarity, number> = {
  common: 20,
  uncommon: 50,
  rare: 150,
  epic: 400,
  legendary: 1000,
};
export const PRICES: Record<Rarity, number | null> = {
  common: 150,
  uncommon: 400,
  rare: 1000,
  epic: 2500,
  legendary: null,
};
export const SELL_VALUE: Record<Rarity, number> = {
  common: 30,
  uncommon: 80,
  rare: 200,
  epic: 500,
  legendary: 1200,
};

/** Kills sem drop cosmético até o drop garantido (pity). */
export const PITY_KILLS = 60;

export const COSMETICS: Record<CosmeticId, CosmeticDef> = {};

export function registerCosmetics(list: CosmeticDef[]): void {
  for (const c of list) COSMETICS[c.id] = c;
}

export function getCosmetic(id: CosmeticId): CosmeticDef | undefined {
  return COSMETICS[id];
}
