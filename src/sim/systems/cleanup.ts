import type { World } from '../World';

const CORPSE_TICKS = 150;

/** Remove corpos antigos, entidades com tempo de vida esgotado e mortas. */
export function cleanupSystem(w: World): void {
  for (const e of [...w.entities]) {
    e.age++;
    if (e.lifetime !== undefined) {
      e.lifetime--;
      if (e.lifetime <= 0) {
        w.remove(e.id);
        continue;
      }
    }
    if (!e.alive) {
      w.remove(e.id);
      continue;
    }
    if (e.kind === 'enemy' && e.fighter?.state === 'dead' && (e.deadTicks ?? 0) > CORPSE_TICKS) {
      w.remove(e.id);
    }
    // fora do mundo
    if (e.t.y < -20) w.remove(e.id);
  }
}
