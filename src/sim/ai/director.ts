import type { Entity, EntityId } from '../Entity';
import type { World } from '../World';

/**
 * Diretor de combate: distribui "tokens" de ataque por jogador para que só alguns inimigos
 * ataquem ao mesmo tempo, enquanto os demais esperam num anel ao redor.
 */
export interface DirectorState {
  /** Tokens em uso por jogador: melee e ranged. */
  melee: Map<EntityId, EntityId[]>;
  ranged: Map<EntityId, EntityId[]>;
}

export function createDirector(): DirectorState {
  return { melee: new Map(), ranged: new Map() };
}

/** Libera os tokens de ataque de uma entidade (morte, fim do ataque, tempo esgotado). */
export function releaseTokens(w: World, e: Entity): void {
  const d = w.director;
  for (const map of [d.melee, d.ranged]) {
    for (const [pid, list] of map) {
      const i = list.indexOf(e.id);
      if (i >= 0) list.splice(i, 1);
      if (list.length === 0) map.delete(pid);
    }
  }
  if (e.ai) {
    e.ai.token = null;
    e.ai.tokenTicks = 0;
  }
}

/** Tenta obter um token de ataque contra o alvo. */
export function requestToken(w: World, e: Entity, target: EntityId, kind: 'melee' | 'ranged'): boolean {
  const ai = e.ai!;
  if (ai.token === kind) return true;
  if (ai.token) releaseTokens(w, e);
  // unidades controladas pelo jogador não disputam tokens
  if (e.team === 'players') {
    ai.token = kind;
    ai.tokenTicks = 0;
    return true;
  }
  const map = kind === 'melee' ? w.director.melee : w.director.ranged;
  const cap =
    (kind === 'melee' ? w.diff.meleeTokens : w.diff.rangedTokens) +
    (kind === 'melee' && w.map.index >= 5 ? 1 : 0);
  const list = map.get(target) ?? [];
  // limpa ids mortos
  for (let i = list.length - 1; i >= 0; i--) {
    const o = w.get(list[i]!);
    if (!o || o.fighter?.state === 'dead') list.splice(i, 1);
  }
  if (list.length >= cap) {
    map.set(target, list);
    return false;
  }
  list.push(e.id);
  map.set(target, list);
  ai.token = kind;
  ai.tokenTicks = 0;
  return true;
}
