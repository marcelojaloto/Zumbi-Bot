import { COSMETICS, RARITY_WEIGHTS } from '../data/cosmetics';
import { getMap } from '../data/maps';
import { FIREARM_PRICES, MELEE_ORDER } from '../data/shop';
import { WEAPON_ORDER } from '../data/weapons';
import type { CharacterId, CosmeticId, MeleeId, Rarity, StaffId, WeaponId } from '../data/types';
import type { RunStats } from '../sim/events';
import type { Profile } from './Profile';

/** Um prêmio mostrado em volta do baú. */
export type ChestPrize =
  | { k: 'scrap'; n: number }
  | { k: 'cosmetic'; id: CosmeticId }
  | { k: 'staff'; id: StaffId }
  | { k: 'gun'; id: WeaponId }
  | { k: 'melee'; id: MeleeId }
  | { k: 'revive'; c: CharacterId };

/** Chances do item extra do baú (o resto vira sucata a mais). */
export const CHEST_ODDS = { revive: 0.12, cosmetic: 0.28, melee: 0.12, gun: 0.08 };

/** Sucata do baú: cresce com o mapa e as estrelas; no Novo Jogo+, 50% a mais. */
export function chestScrap(mapIndex: number, stars: number, ngPlus: boolean): number {
  const n = (40 + 15 * Math.max(0, mapIndex) + 30 * stars) * (ngPlus ? 1.5 : 1);
  return Math.round(n / 5) * 5;
}

function pickWeighted<T>(items: T[], weight: (x: T) => number, rand: () => number): T | undefined {
  const total = items.reduce((a, x) => a + weight(x), 0);
  if (total <= 0) return undefined;
  let r = rand() * total;
  for (const x of items) {
    r -= weight(x);
    if (r <= 0) return x;
  }
  return items[items.length - 1];
}

/**
 * Baú do fim de fase: o que a fase deu (o cajado do chefe, armas novas, as peças achadas e a sucata) e mais um
 * bônus do baú, que já vai para o perfil aqui: sucata e, às vezes, uma peça nova, o item de reviver do
 * personagem, uma arma branca ou uma arma de fogo que ainda não tinha.
 */
export function openChest(
  prof: Profile,
  stats: RunStats,
  mine: { character: CharacterId; loot: string[]; scrap: number },
  rand: () => number = Math.random,
): ChestPrize[] {
  const s = prof.save;
  const out: ChestPrize[] = [];
  if (stats.unlockedStaff) out.push({ k: 'staff', id: stats.unlockedStaff });
  for (const g of stats.unlockedGuns) out.push({ k: 'gun', id: g });
  for (const id of mine.loot) if (COSMETICS[id]) out.push({ k: 'cosmetic', id });

  let bonus = chestScrap(getMap(stats.mapId).index, stats.stars, !!stats.ngPlus);
  const r = rand();
  let extra: ChestPrize | null = null;
  let acc = CHEST_ODDS.revive;
  if (r < acc) {
    if (prof.giveRevive(mine.character)) extra = { k: 'revive', c: mine.character };
  } else if (r < (acc += CHEST_ODDS.cosmetic)) {
    const pool = Object.values(COSMETICS).filter(
      (c) => c.price !== null && !s.cosmetics.owned.includes(c.id) && c.rarity !== 'legendary',
    );
    const c = pickWeighted(pool, (x) => RARITY_WEIGHTS[x.rarity as Rarity] || 1, rand);
    if (c) {
      s.cosmetics.owned.push(c.id);
      extra = { k: 'cosmetic', id: c.id };
    }
  } else if (r < (acc += CHEST_ODDS.melee)) {
    const pool = MELEE_ORDER.filter((id) => !s.unlocks.melee.includes(id));
    const id = pool[Math.floor(rand() * pool.length)];
    if (id) {
      s.unlocks.melee.push(id);
      extra = { k: 'melee', id };
    }
  } else if (r < (acc += CHEST_ODDS.gun)) {
    const pool = (Object.keys(FIREARM_PRICES) as WeaponId[]).filter((id) => !s.unlocks.firearms.includes(id));
    const id = pool[Math.floor(rand() * pool.length)];
    if (id) {
      s.unlocks.firearms.push(id);
      s.unlocks.firearms.sort((a, b) => WEAPON_ORDER.indexOf(a) - WEAPON_ORDER.indexOf(b));
      extra = { k: 'gun', id };
    }
  }
  // sem item extra (ou nada novo para dar): mais sucata
  if (!extra) bonus += Math.round((50 + 10 * getMap(stats.mapId).index) / 5) * 5;
  s.profile.scrap += bonus;
  out.unshift({ k: 'scrap', n: mine.scrap + bonus });
  if (extra) out.push(extra);
  prof.persist();
  return out;
}
