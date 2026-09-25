import type { BossDef, BossId } from '../types';

export const BOSSES: Record<BossId, BossDef> = {};

export function registerBoss(b: BossDef): BossDef {
  BOSSES[b.id] = b;
  return b;
}

export function getBoss(id: BossId): BossDef {
  const b = BOSSES[id];
  if (!b) throw new Error(`Boss desconhecido: ${id}`);
  return b;
}
