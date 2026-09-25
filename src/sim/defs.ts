import { BOSSES } from '../data/bosses';
import { ENEMIES } from '../data/enemies';
import type { BossDef, EnemyDef, Resist, StatusId } from '../data/types';
import type { Entity } from './Entity';

/** Consultas às definições de dados a partir de uma entidade. */
export function enemyDef(e: Entity): EnemyDef | undefined {
  return e.kind === 'enemy' ? ENEMIES[e.defId] : undefined;
}

export function bossDef(e: Entity): BossDef | undefined {
  return e.kind === 'boss' ? BOSSES[e.defId] : undefined;
}

export function isBossEntity(e: Entity): boolean {
  return e.kind === 'boss';
}

export function getResist(e: Entity): Resist | undefined {
  return enemyDef(e)?.resist ?? bossDef(e)?.resist;
}

export function getPhaseResist(e: Entity): Resist | undefined {
  const b = bossDef(e);
  if (!b || !e.boss) return undefined;
  return b.phases[e.boss.phase]?.resist;
}

export function getStatusImmune(e: Entity): StatusId[] {
  return enemyDef(e)?.statusImmune ?? bossDef(e)?.statusImmune ?? [];
}

export function statusDurationMult(e: Entity): number {
  return bossDef(e)?.statusDurationMult ?? 1;
}

export function family(e: Entity): 'zombie' | 'robot' | 'cyborg' | 'player' | 'other' {
  if (e.kind === 'player') return 'player';
  return enemyDef(e)?.family ?? bossDef(e)?.family ?? 'other';
}
