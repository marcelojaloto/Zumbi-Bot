import { INTERACTIONS, type InteractionId } from '../../data/statusEffects';
import type { DamageType, Resist, StatusId } from '../../data/types';

export interface DamageInput {
  base: number;
  dtype: DamageType;
  /** Queda por distância (1 = sem queda). */
  falloffMult?: number;
  crit?: boolean;
  critMult?: number;
  attacker?: { levelMult?: number; powerDouble?: boolean; diffMult?: number; mapMult?: number };
  target: {
    resist?: Resist;
    phaseResist?: Resist;
    statuses?: readonly { id: StatusId; stacks: number }[];
    shield?: number;
    vulnMult?: number;
    /** HP atual / máximo (para estilhaçar). */
    hpFrac?: number;
    isBoss?: boolean;
  };
}

export interface DamageResult {
  /** Dano final (após escudo) aplicado no HP. */
  amount: number;
  /** Dano absorvido pelo escudo. */
  toShield: number;
  total: number;
  interactions: InteractionId[];
  removeStatuses: StatusId[];
  addStatuses: { id: StatusId; durationS?: number }[];
  /** Morte instantânea por estilhaçamento. */
  shatter: boolean;
}

/**
 * Cálculo de dano puro:
 * base × queda × nível × dano duplo × crítico × resistência × resistência de fase × interação × vulnerabilidade
 * → escudo absorve primeiro → mínimo 1.
 */
export function computeDamage(i: DamageInput): DamageResult {
  const a = i.attacker ?? {};
  const tgt = i.target;
  let dmg = i.base;
  dmg *= i.falloffMult ?? 1;
  dmg *= a.levelMult ?? 1;
  dmg *= a.powerDouble ? 2 : 1;
  dmg *= a.diffMult ?? 1;
  dmg *= a.mapMult ?? 1;
  if (i.crit) dmg *= i.critMult ?? 1.5;
  dmg *= tgt.resist?.[i.dtype] ?? 1;
  dmg *= tgt.phaseResist?.[i.dtype] ?? 1;
  dmg *= tgt.vulnMult ?? 1;

  const interactions: InteractionId[] = [];
  const removeStatuses: StatusId[] = [];
  const addStatuses: { id: StatusId; durationS?: number }[] = [];
  let shatter = false;
  const seen = new Set<StatusId>();
  for (const rule of INTERACTIONS) {
    if (seen.has(rule.has)) continue;
    if (!rule.incoming.includes(i.dtype)) continue;
    if (!tgt.statuses?.some((s) => s.id === rule.has)) continue;
    seen.add(rule.has);
    interactions.push(rule.id);
    dmg = dmg * rule.dmgMult + (rule.bonus ?? 0);
    if (rule.remove) removeStatuses.push(rule.has);
    if (rule.add) addStatuses.push(rule.add);
    if (rule.id === 'shatter' && !tgt.isBoss && (tgt.hpFrac ?? 1) < 0.15) shatter = true;
  }

  if (dmg <= 0) {
    return { amount: 0, toShield: 0, total: 0, interactions, removeStatuses, addStatuses, shatter };
  }
  dmg = Math.max(1, Math.round(dmg));
  const shield = Math.max(0, tgt.shield ?? 0);
  const toShield = Math.min(shield, dmg);
  const amount = dmg - toShield;
  return { amount, toShield, total: dmg, interactions, removeStatuses, addStatuses, shatter };
}

/** Multiplicador de queda por distância (linear entre start e end até minMult). */
export function falloff(dist: number, start: number, end: number, minMult: number): number {
  if (dist <= start) return 1;
  if (dist >= end) return minMult;
  const t = (dist - start) / (end - start);
  return 1 + (minMult - 1) * t;
}
