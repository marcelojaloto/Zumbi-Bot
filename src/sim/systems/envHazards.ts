import type { Entity } from '../Entity';
import type { World } from '../World';

/**
 * Perigos ambientais cíclicos: alternam entre inativo (fase 0) e ativo (fase 1).
 * O aviso visual acontece no último segundo da fase inativa.
 */
export function tickEnvHazard(w: World, h: Entity): void {
  const hz = h.hazard!;
  if (hz.period <= 0) {
    hz.phase = 1;
    return;
  }
  const t = (w.tick + hz.offset) % hz.period;
  const activeLen = Math.floor(hz.period * 0.35);
  const wasActive = hz.phase === 1;
  hz.phase = t >= hz.period - activeLen ? 1 : 0;
  if (hz.phase === 1 && !wasActive) {
    hz.hitSet.length = 0;
    w.emit({ t: 'sfx', id: `hz_${hz.env}`, x: h.t.x });
  }
}
