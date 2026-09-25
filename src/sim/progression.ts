import { PLAYER, maxHpForLevel, maxManaForLevel, xpToNext } from '../data/balance';
import type { Entity } from './Entity';
import type { World } from './World';

/** Concede XP a um jogador, processando subidas de nível. Retorna quantos níveis subiu. */
export function grantXp(w: World, e: Entity, amount: number): number {
  const p = e.player;
  if (!p || amount <= 0) return 0;
  p.xp += Math.round(amount);
  w.emit({ t: 'xp', player: e.id, amount: Math.round(amount) });
  let ups = 0;
  while (p.level < PLAYER.maxLevel && p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    ups++;
    const h = e.health!;
    const newMax = maxHpForLevel(p.level);
    h.hp = Math.min(newMax, h.hp + (newMax - h.max) + 20);
    h.max = newMax;
    p.manaMax = maxManaForLevel(p.level);
    p.mana = Math.min(p.manaMax, p.mana + 20);
    w.emit({ t: 'levelUp', player: e.id, level: p.level });
  }
  if (p.level >= PLAYER.maxLevel) p.xp = Math.min(p.xp, xpToNext(p.level));
  return ups;
}

export interface StarInput {
  completed: boolean;
  livesLost: number;
  timeS: number;
  parTimeS: number;
}

/** Estrelas: 1 por concluir, 1 por não perder vidas, 1 por terminar abaixo do tempo par. */
export function computeStars(s: StarInput): number {
  if (!s.completed) return 0;
  let n = 1;
  if (s.livesLost === 0) n++;
  if (s.timeS <= s.parTimeS) n++;
  return n;
}

/** Bônus de fim de fase. */
export function levelEndBonus(s: StarInput): number {
  if (!s.completed) return 0;
  let b = 5000;
  b += Math.max(0, Math.round((s.parTimeS - s.timeS) * 20));
  if (s.livesLost === 0) b += 10000;
  return b;
}
