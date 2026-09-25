import type { RankEntry, RankingV1 } from './schema';

export const RANK_SIZE = 20;

/** Posição que a pontuação ocuparia (0-based) ou -1 se não entra no top 20. */
export function rankPosition(r: RankingV1, score: number): number {
  if (score <= 0) return -1;
  const i = r.entries.findIndex((e) => score > e.score);
  if (i >= 0) return i;
  return r.entries.length < RANK_SIZE ? r.entries.length : -1;
}

export function insertRank(r: RankingV1, e: RankEntry): number {
  const pos = rankPosition(r, e.score);
  if (pos < 0) return -1;
  r.entries.splice(pos, 0, e);
  if (r.entries.length > RANK_SIZE) r.entries.length = RANK_SIZE;
  return pos;
}

export function filterByMap(r: RankingV1, mapId: string | null): RankEntry[] {
  return mapId ? r.entries.filter((e) => e.mapId === mapId) : r.entries;
}
