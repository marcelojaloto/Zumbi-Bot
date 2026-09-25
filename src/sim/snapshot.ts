import type { Entity } from './Entity';
import type { World } from './World';

/** Snapshot completo do mundo (base para o co-op host-autoritativo). */
export interface WorldSnapshot {
  tick: number;
  rng: number[];
  camX: number;
  entities: Entity[];
}

export function serializeWorld(w: World): WorldSnapshot {
  return {
    tick: w.tick,
    rng: w.rng.getState(),
    camX: w.camX,
    entities: JSON.parse(JSON.stringify(w.entities)) as Entity[],
  };
}

export function applySnapshot(w: World, s: WorldSnapshot): void {
  w.tick = s.tick;
  w.rng.setState(s.rng);
  w.camX = s.camX;
  w.entities = JSON.parse(JSON.stringify(s.entities)) as Entity[];
  w.byId = new Map(w.entities.map((e) => [e.id, e]));
  w.players = w.entities.filter((e) => e.kind === 'player').map((e) => e.id);
  w.updateBounds();
}

/** Hash simples do estado (teste de determinismo). */
export function hashWorld(w: World): number {
  const s = JSON.stringify(w.entities) + w.tick + w.camX;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
