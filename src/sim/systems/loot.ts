import { COSMETICS, DUP_SCRAP, PITY_KILLS, RARITY_ORDER, RARITY_WEIGHTS } from '../../data/cosmetics';
import { LOOT_TABLES } from '../../data/items';
import type { CosmeticDef, ItemId, LootTableId, Rarity } from '../../data/types';
import type { Rng } from '../../core/rng';
import type { Entity } from '../Entity';
import type { World } from '../World';

/** Rola uma tabela de loot; retorna o item ou undefined (nada). */
export function rollTable(rng: Rng, id: LootTableId): ItemId | undefined {
  const t = LOOT_TABLES[id];
  if (!t) return undefined;
  const e = rng.weighted(t.entries, (x) => x.weight);
  return e?.item;
}

export function rollRarity(rng: Rng, minRarity: Rarity = 'common'): Rarity {
  const min = RARITY_ORDER.indexOf(minRarity);
  const pool = RARITY_ORDER.filter((r, i) => i >= min && RARITY_WEIGHTS[r] > 0);
  if (pool.length === 0) return minRarity;
  return rng.weighted(pool, (r) => RARITY_WEIGHTS[r]) ?? minRarity;
}

const BAG_BY_RARITY: Record<Rarity, ItemId> = {
  common: 'lootCommon',
  uncommon: 'lootUncommon',
  rare: 'lootRare',
  epic: 'lootEpic',
  legendary: 'lootLegendary',
};

/**
 * Rola um drop cosmético por abate (com pity). Retorna o item "saco de loot" a dropar, se houver.
 */
export function rollCosmeticDrop(w: World, killer: Entity, chance: number): ItemId | undefined {
  const p = killer.player;
  if (!p) return undefined;
  p.pity++;
  if (w.rng.chance(chance) || p.pity >= PITY_KILLS) {
    p.pity = 0;
    return BAG_BY_RARITY[rollRarity(w.rng)];
  }
  return undefined;
}

export function bagForRarity(r: Rarity): ItemId {
  return BAG_BY_RARITY[r];
}

/** Escolhe uma peça cosmética da raridade, com viés de conjunto (mago/zumbi). */
export function pickCosmetic(
  rng: Rng,
  rarity: Rarity,
  wizardBias: number,
  pool: CosmeticDef[] = Object.values(COSMETICS),
): CosmeticDef | undefined {
  const byRarity = pool.filter((c) => c.rarity === rarity && c.set !== 'boss');
  if (byRarity.length === 0) return undefined;
  const wantWizard = rng.chance(wizardBias);
  const set = byRarity.filter((c) => (wantWizard ? c.set === 'wizard' : c.set === 'zombie'));
  return rng.pick(set.length > 0 ? set : byRarity);
}

/** Resolve um saco de loot: dá uma peça (ou sucata se duplicada). */
export function grantCosmeticBag(w: World, e: Entity, rarity: Rarity): void {
  const p = e.player!;
  const c = pickCosmetic(w.rng, rarity, w.map.wizardBias);
  if (!c) {
    const scrap = DUP_SCRAP[rarity];
    p.scrap += scrap;
    w.emit({ t: 'loot', player: e.id, scrap });
    return;
  }
  grantCosmetic(w, e, c.id);
}

export function grantCosmetic(w: World, e: Entity, id: string): void {
  const p = e.player!;
  const c = COSMETICS[id];
  if (!c) return;
  const owned = w.loadouts.find((l) => l.slot === p.slot)?.ownedCosmetics ?? [];
  if (owned.includes(id) || p.loot.includes(id)) {
    const scrap = DUP_SCRAP[c.rarity];
    p.scrap += scrap;
    w.emit({ t: 'loot', player: e.id, cosmetic: id, scrap, duplicate: true });
  } else {
    p.loot.push(id);
    w.emit({ t: 'loot', player: e.id, cosmetic: id });
  }
}
