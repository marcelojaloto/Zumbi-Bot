import { isCharacter, isHostile, type Entity } from '../Entity';
import type { World } from '../World';
import { applyHit } from '../combat/applyHit';
import { inCone } from '../combat/hitbox';
import { tickEnvHazard } from './envHazards';

/** Teste de sobreposição de um alvo com a forma do perigo. */
export function hazardOverlaps(h: Entity, e: Entity): boolean {
  const hz = h.hazard!;
  const r = e.body?.radius ?? 0.35;
  const dx = e.t.x - h.t.x;
  const dz = e.t.z - h.t.z;
  const s = hz.shape;
  switch (s.k) {
    case 'circle': {
      const rr = s.r + r;
      return dx * dx + dz * dz <= rr * rr;
    }
    case 'ring': {
      const d = Math.hypot(dx, dz);
      return Math.abs(d - s.r) <= s.width / 2 + r;
    }
    case 'rect':
      return Math.abs(dx) <= s.w / 2 + r && Math.abs(dz) <= s.d / 2 + r;
    case 'lane':
      return e.t.x + r >= s.x0 && e.t.x - r <= s.x1 && Math.abs(dz) <= s.width / 2 + r * 0.5;
    case 'cone':
      return inCone(h.t.x, h.t.z, s.dir, s.angle, s.range, e.t.x, e.t.z, r);
  }
}

export function hazardSystem(w: World): void {
  for (const h of [...w.entities]) {
    const hz = h.hazard;
    if (!hz || !h.alive) continue;
    if (hz.env) {
      tickEnvHazard(w, h);
      if (!h.alive) continue;
    }
    if (hz.delay > 0) {
      hz.delay--;
      continue;
    }
    h.t.x += h.t.vx / 60;
    h.t.z += h.t.vz / 60;
    if (hz.grow) {
      if (hz.shape.k === 'circle' || hz.shape.k === 'ring') hz.shape.r += hz.grow;
      else if (hz.shape.k === 'cone') hz.shape.range += hz.grow;
    }
    const envActive = !hz.env || hz.phase === 1;
    if (envActive) {
      let doTick = true;
      if (hz.tickEvery > 0) {
        // acerta no primeiro quadro ativo e depois a cada `tickEvery` quadros
        doTick = hz.tickAcc % hz.tickEvery === 0;
        hz.tickAcc++;
      }
      const owner = w.get(hz.owner);
      for (const e of w.entities) {
        if (!isCharacter(e) || !e.health || e.fighter?.state === 'dead') continue;
        if (!hz.hitsAll && !isHostile(h.team, e.team)) continue;
        if (e.id === hz.owner) continue;
        if (e.t.y > hz.height) continue;
        if (!hazardOverlaps(h, e)) continue;
        if (hz.slow > 0) e.t.vx *= 1 - hz.slow * 0.2;
        if (hz.pushX || hz.pushZ) {
          e.t.vx += hz.pushX / 60;
          e.t.vz += hz.pushZ / 60;
        }
        if (hz.hit.damage <= 0 && !hz.hit.status) continue;
        if (hz.tickEvery > 0) {
          if (!doTick) continue;
        } else if (hz.hitSet.includes(e.id)) continue;
        else hz.hitSet.push(e.id);
        const dx = e.t.x - h.t.x;
        const dz = e.t.z - h.t.z;
        applyHit(w, owner, e, hz.hit, {
          dirX: hz.shape.k === 'lane' ? (h.t.vx !== 0 ? Math.sign(h.t.vx) : Math.sign(dx) || 1) : dx || 0.01,
          dirZ: hz.shape.k === 'lane' ? 0 : dz,
          ignoreInvuln: hz.tickEvery > 0,
          noReact: hz.tickEvery > 0 && hz.hit.knockback <= 0,
          noCombo: hz.tickEvery > 0,
          source: hz.source,
        });
      }
    }
    if (!hz.env) {
      hz.active--;
      if (hz.active <= 0) w.remove(h.id);
    }
  }
}
