import { DT } from '../../core/time';
import { GRAVITY, VIEW_HALF_WIDTH } from '../../data/balance';
import { isCharacter, type Entity } from '../Entity';
import type { World } from '../World';
import { applyHit } from '../combat/applyHit';

/** Integração física: gravidade, chão, limites de profundidade/câmera e separação entre corpos. */
export function movementSystem(w: World): void {
  const b = w.bounds;
  for (const e of w.entities) {
    const body = e.body;
    if (!body || !e.alive) continue;
    if (e.fighter && e.fighter.hitstop > 0) continue;
    if (e.player && e.player.respawn > 0) continue;
    const t = e.t;
    const flying =
      body.fly !== undefined &&
      e.fighter?.state !== 'knockdown' &&
      e.fighter?.state !== 'dead' &&
      e.fighter?.state !== 'down';

    if (flying) {
      // drones mantêm altitude
      t.vy += (body.fly! - t.y) * 8 * DT - t.vy * 4 * DT;
      body.grounded = false;
    } else if (!body.grounded) {
      t.vy -= GRAVITY * body.gravityScale * DT;
    }

    t.x += t.vx * DT;
    t.y += t.vy * DT;
    t.z += t.vz * DT;

    if (t.y <= 0 && !flying) {
      const impact = t.vy;
      t.y = 0;
      if (!body.grounded) {
        body.grounded = true;
        if (e.kind === 'pickup') {
          t.vx = 0;
          t.vz = 0;
        }
        onLand(w, e, impact);
      }
      t.vy = 0;
    } else if (t.y > 0.001 && !flying && body.grounded && t.vy > 0) {
      body.grounded = false;
    }

    // profundidade
    const zMin = b.zMin + body.radius * 0.5;
    const zMax = b.zMax - body.radius * 0.5;
    if (t.z < zMin) {
      t.z = zMin;
      if (t.vz < 0) t.vz = 0;
    } else if (t.z > zMax) {
      t.z = zMax;
      if (t.vz > 0) t.vz = 0;
    }

    // limites horizontais
    if (e.kind === 'player') {
      clampX(w, e, b.minX + 0.4, b.maxX - 0.4);
    } else if (e.kind === 'enemy' || e.kind === 'boss') {
      const ai = e.ai;
      const inside = t.x > b.minX + 0.3 && t.x < b.maxX - 0.3;
      if (ai && !ai.entered && inside) ai.entered = true;
      if (!ai || ai.entered || e.kind === 'boss') clampX(w, e, b.minX + 0.3, b.maxX - 0.3);
      else clampX(w, e, b.minX - VIEW_HALF_WIDTH - 6, b.maxX + VIEW_HALF_WIDTH + 6);
    } else if (e.kind === 'pickup') {
      if (t.x < b.minX + 0.3) t.x = b.minX + 0.3;
      if (t.x > w.level.length - 0.3) t.x = w.level.length - 0.3;
    }
  }
  separation(w);
}

function clampX(w: World, e: Entity, min: number, max: number): void {
  const t = e.t;
  if (t.x < min) {
    wallSplat(w, e, 1);
    t.x = min;
    if (t.vx < 0) t.vx = 0;
  } else if (t.x > max) {
    wallSplat(w, e, -1);
    t.x = max;
    if (t.vx > 0) t.vx = 0;
  }
}

/** Corpo arremessado contra a borda da arena: dano extra e quique. */
function wallSplat(w: World, e: Entity, dir: number): void {
  const fi = e.fighter;
  if (!fi || fi.state !== 'knockdown' || Math.abs(e.t.vx) < 5 || e.kind === 'player') return;
  applyHit(
    w,
    undefined,
    e,
    { damage: 5, dtype: 'blunt', knockback: 2, hitstun: 10, hitstop: 4, knockdown: true, launch: 2 },
    { dirX: dir, ignoreInvuln: true, noCombo: true },
  );
  w.emit({ t: 'shake', trauma: 0.2 });
}

function onLand(w: World, e: Entity, impact: number): void {
  const fi = e.fighter;
  if (!fi) return;
  if (e.player) {
    const p = e.player;
    p.jumpsUsed = 0;
    p.coyote = 0;
    if (fi.state === 'jump' || fi.state === 'fall') {
      fi.state = 'land';
      fi.st = 0;
      w.emit({ t: 'land', id: e.id, heavy: impact < -12 });
    }
  } else if (fi.state === 'fall' || fi.state === 'jump') {
    fi.state = 'land';
    fi.st = 0;
  }
  if (fi.state === 'knockdown' && impact < -4) {
    // quique leve
    e.t.vy = Math.min(3, -impact * 0.25);
    e.body!.grounded = e.t.vy < 1;
    e.t.vx *= 0.6;
  }
}

/** Separação suave entre personagens (evita empilhamento). */
function separation(w: World): void {
  const chars: Entity[] = [];
  for (const e of w.entities) {
    if (!isCharacter(e) || !e.body || !e.alive) continue;
    if (e.fighter?.state === 'dead' || e.body.low) continue;
    if (e.player && e.player.respawn > 0) continue;
    chars.push(e);
  }
  for (let i = 0; i < chars.length; i++) {
    const a = chars[i]!;
    for (let j = i + 1; j < chars.length; j++) {
      const c = chars[j]!;
      if (Math.abs(a.t.y - c.t.y) > 1.2) continue;
      const dx = c.t.x - a.t.x;
      const dz = (c.t.z - a.t.z) * 1.4;
      const r = (a.body!.radius + c.body!.radius) * 0.9;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const push = (r - d) * 0.5;
      const nx = dx / d;
      const nz = dz / d / 1.4;
      const ma = a.body!.anchored || a.kind === 'boss' ? 0 : 1 / a.body!.mass;
      const mc = c.body!.anchored || c.kind === 'boss' ? 0 : 1 / c.body!.mass;
      const sum = ma + mc || 1;
      a.t.x -= nx * push * (ma / sum);
      a.t.z -= nz * push * (ma / sum);
      c.t.x += nx * push * (mc / sum);
      c.t.z += nz * push * (mc / sum);
    }
  }
}

/** Âncora da câmera (sim): segue os jogadores, nunca volta, respeita travas de segmento. */
export function cameraSystem(w: World): void {
  const ps = w.activePlayers();
  if (ps.length > 0) {
    let sx = 0;
    for (const p of ps) sx += p.t.x;
    const target = sx / ps.length + 1.5;
    if (target > w.camX) w.camX = Math.min(target, w.camX + 12 * DT);
  }
  const half = VIEW_HALF_WIDTH;
  if (w.lock) {
    const lo = w.lock.minX + half;
    const hi = Math.max(lo, w.lock.maxX - half);
    if (w.camX < lo) w.camX = Math.min(lo, w.camX + 14 * DT);
    if (w.camX > hi) w.camX = hi;
  }
  w.camX = Math.max(half, Math.min(w.level.length - half, w.camX));
  w.updateBounds();
  if (w.lock) {
    w.bounds.minX = Math.max(w.bounds.minX, w.lock.minX);
    w.bounds.maxX = Math.min(w.bounds.maxX, w.lock.maxX);
  }
}
