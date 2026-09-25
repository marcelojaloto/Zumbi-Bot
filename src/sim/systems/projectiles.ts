import { DT, secToTicks } from '../../core/time';
import type { ProjectileSpec } from '../../data/types';
import {
  isCharacter,
  isHostile,
  makeTransform,
  type Entity,
  type ProjectileComp,
  type Team,
} from '../Entity';
import type { World } from '../World';
import { applyHit } from '../combat/applyHit';
import { falloff } from '../combat/damage';
import { explode, spawnZone } from './effects';
import { applyStatus } from './status';
import { family } from '../defs';

export interface ProjOpts {
  owner: Entity;
  x: number;
  y: number;
  z: number;
  /** Ângulo no plano XZ. */
  yaw: number;
  spec: ProjectileSpec;
  /** Ponto alvo para lançamento em arco. */
  target?: { x: number; z: number };
  /** Altura alvo para tiros retos (inclina o disparo para acertar o peito do alvo). */
  aimAt?: { x: number; y: number; z: number };
  crit?: number;
  falloff?: { start: number; end: number; minMult: number };
  fuseS?: number;
  special?: ProjectileComp['special'];
  staff?: ProjectileComp['staff'];
  weapon?: ProjectileComp['weapon'];
  homingTarget?: number;
  team?: Team;
}

export function spawnProjectile(w: World, o: ProjOpts): Entity {
  const s = o.spec;
  const t = makeTransform(o.x, o.y, o.z, Math.cos(o.yaw) >= 0 ? 1 : -1);
  let speed = s.speed;
  if (s.lob && o.target) {
    // arco balístico até o alvo
    const dx = o.target.x - o.x;
    const dz = o.target.z - o.z;
    const d = Math.max(0.5, Math.hypot(dx, dz));
    const g = s.gravity ?? 14;
    const T = Math.max(0.35, d / speed);
    t.vx = dx / T;
    t.vz = dz / T;
    t.vy = (0.25 - o.y + 0.5 * g * T * T) / T;
    speed = d / T;
  } else {
    t.vx = Math.cos(o.yaw) * speed;
    t.vz = Math.sin(o.yaw) * speed;
    t.vy = 0;
    if (o.aimAt && !s.gravity) {
      const d = Math.max(0.5, Math.hypot(o.aimAt.x - o.x, o.aimAt.z - o.z));
      t.vy = ((o.aimAt.y - o.y) * speed) / d;
    }
  }
  const e = w.add({
    kind: 'projectile',
    team: o.team ?? o.owner.team,
    defId: s.visual,
    alive: true,
    age: 0,
    t,
    lifetime: secToTicks(s.lifeS),
    projectile: {
      owner: o.owner.id,
      visual: s.visual,
      hit: s.hit,
      radius: s.radius,
      gravity: s.gravity ?? 0,
      pierce: s.pierce ?? 0,
      hitSet: [],
      homing: s.homing ?? 0,
      homingTarget: o.homingTarget ?? 0,
      onImpact: s.onImpact,
      ox: o.x,
      oz: o.z,
      falloff: o.falloff,
      crit: o.crit ?? 0,
      fuse: o.fuseS !== undefined ? secToTicks(o.fuseS) : -1,
      bounce: o.fuseS !== undefined,
      special: o.special,
      hp: s.hp ?? 0,
      boomerang: !!s.boomerang,
      turnAt: Math.floor(secToTicks(s.lifeS) / 2),
      age: 0,
      staff: o.staff,
      weapon: o.weapon,
    },
  });
  return e;
}

/** Projétil destrutível abatido: estoura sem causar dano. */
export function shootDown(w: World, p: Entity, dmg: number): boolean {
  const pc = p.projectile!;
  pc.hp -= dmg;
  w.emit({ t: 'impact', x: p.t.x, y: p.t.y, z: p.t.z, visual: pc.visual, element: undefined });
  if (pc.hp > 0) return false;
  w.emit({ t: 'explosion', x: p.t.x, y: p.t.y, z: p.t.z, r: 0.7, element: pc.element ?? 'explosive' });
  w.remove(p.id);
  return true;
}

/** Projétil inimigo destrutível no caminho do segmento (tiros do jogador podem abatê-lo). */
function shootableOnPath(
  w: World,
  p: Entity,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  z1: number,
): Entity | undefined {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz;
  for (const o of w.entities) {
    const oc = o.projectile;
    if (!oc || o === p || oc.hp <= 0 || !o.alive || !isHostile(p.team, o.team)) continue;
    let tt = len2 > 0 ? ((o.t.x - x0) * dx + (o.t.z - z0) * dz) / len2 : 0;
    tt = Math.max(0, Math.min(1, tt));
    const ex = o.t.x - (x0 + dx * tt);
    const ez = o.t.z - (z0 + dz * tt);
    const r = oc.radius + p.projectile!.radius + 0.25;
    if (ex * ex + ez * ez > r * r) continue;
    if (Math.abs(o.t.y - y0) > 0.9) continue;
    return o;
  }
  return undefined;
}

function impact(w: World, p: Entity, x: number, y: number, z: number): void {
  const pc = p.projectile!;
  w.emit({ t: 'impact', x, y, z, visual: pc.visual, element: undefined });
  const oi = pc.onImpact;
  if (oi?.explosion) explode(w, x, Math.max(0.3, y), z, oi.explosion, pc.owner, p.team);
  if (oi?.zone) spawnZone(w, x, z, oi.zone, pc.owner, p.team);
  w.remove(p.id);
}

/** Move projéteis, aplica gravidade/perseguição e resolve colisões varridas. */
export function projectileSystem(w: World): void {
  for (const p of [...w.entities]) {
    const pc = p.projectile;
    if (!pc || !p.alive) continue;
    pc.age++;
    const t = p.t;

    // perseguição
    if (pc.homing > 0) {
      let tgt = pc.homingTarget ? w.get(pc.homingTarget) : undefined;
      if (!tgt || tgt.fighter?.state === 'dead') {
        tgt = nearestHostile(w, p, 12);
        pc.homingTarget = tgt?.id ?? 0;
      }
      if (tgt) {
        const sp = Math.hypot(t.vx, t.vz);
        const cur = Math.atan2(t.vz, t.vx);
        const want = Math.atan2(tgt.t.z - t.z, tgt.t.x - t.x);
        let da = want - cur;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        const step = pc.homing * DT;
        const na = cur + Math.max(-step, Math.min(step, da));
        t.vx = Math.cos(na) * sp;
        t.vz = Math.sin(na) * sp;
        t.vy += ((tgt.t.y + 1.2 - t.y) * 2 - t.vy) * DT * 2;
      }
    }
    if (pc.boomerang && pc.age === pc.turnAt) {
      t.vx = -t.vx;
      t.vz = -t.vz;
      pc.hitSet.length = 0;
    }
    if (pc.gravity) t.vy -= pc.gravity * DT;

    const x0 = t.x;
    const z0 = t.z;
    const y0 = t.y;
    const x1 = x0 + t.vx * DT;
    const z1 = z0 + t.vz * DT;
    const y1 = y0 + t.vy * DT;

    // colisão com personagens e objetos
    let hitSomething = false;
    for (const e of w.entities) {
      if (e === p || !e.health || !e.alive) continue;
      if (e.kind === 'prop') {
        if (p.team !== 'players') continue;
      } else if (!isCharacter(e) || !isHostile(p.team, e.team)) continue;
      if (e.fighter?.state === 'dead') continue;
      if (e.body?.low) continue;
      if (pc.hitSet.includes(e.id)) continue;
      const r = (e.body?.radius ?? 0.4) + pc.radius;
      const h = e.body?.height ?? 1.6;
      // teste varrido no plano XZ
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len2 = dx * dx + dz * dz;
      let tt = len2 > 0 ? ((e.t.x - x0) * dx + (e.t.z - z0) * dz) / len2 : 0;
      tt = Math.max(0, Math.min(1, tt));
      const cx = x0 + dx * tt;
      const cz = z0 + dz * tt;
      const ex = e.t.x - cx;
      const ez = (e.t.z - cz) * 1.2;
      if (ex * ex + ez * ez > r * r) continue;
      const cy = y0 + (y1 - y0) * tt;
      // tiros retos do jogador têm tolerância vertical (acertam drones no mesmo plano)
      const vtol = !pc.gravity && p.team === 'players' ? 1.0 : pc.radius;
      if (cy < e.t.y - vtol || cy > e.t.y + h + pc.radius) continue;
      pc.hitSet.push(e.id);
      const owner = w.get(pc.owner);
      const dist = Math.hypot(cx - pc.ox, cz - pc.oz);
      const fo = pc.falloff ? falloff(dist, pc.falloff.start, pc.falloff.end, pc.falloff.minMult) : 1;
      applyHit(w, owner, e, pc.hit, {
        falloff: fo,
        crit: pc.crit > 1,
        critMult: pc.crit > 1 ? pc.crit : undefined,
        dirX: t.vx,
        dirZ: t.vz * 0.3,
        x: cx,
        y: cy,
        z: cz,
      });
      if (pc.special) applySpecial(w, p, e);
      if (pc.pierce > 0) {
        pc.pierce--;
        continue;
      }
      hitSomething = true;
      impact(w, p, cx, cy, cz);
      break;
    }
    if (hitSomething || !p.alive) continue;

    // tiros do jogador abatem mísseis, caveiras e afins
    if (p.team === 'players' && !pc.gravity) {
      const o = shootableOnPath(w, p, x0, y0, z0, x1, z1);
      if (o) {
        shootDown(w, o, pc.hit.damage);
        if (pc.pierce > 0) pc.pierce--;
        else {
          w.remove(p.id);
          continue;
        }
      }
    }

    t.x = x1;
    t.y = y1;
    t.z = z1;

    // chão
    if (t.y <= 0.05) {
      if (pc.bounce && pc.fuse > 0) {
        t.y = 0.05;
        t.vy = Math.abs(t.vy) * 0.35;
        t.vx *= 0.6;
        t.vz *= 0.6;
        if (Math.abs(t.vy) < 1) t.vy = 0;
      } else {
        impact(w, p, t.x, 0.05, t.z);
        continue;
      }
    }
    if (pc.fuse > 0 && --pc.fuse === 0) {
      impact(w, p, t.x, t.y, t.z);
      continue;
    }
    // fora dos limites
    if (
      t.x < w.bounds.minX - 12 ||
      t.x > w.bounds.maxX + 12 ||
      t.z < w.zBand[0] - 6 ||
      t.z > w.zBand[1] + 6
    ) {
      w.remove(p.id);
    }
  }
}

function applySpecial(w: World, p: Entity, e: Entity): void {
  const pc = p.projectile!;
  if (e.fighter?.state === 'dead') return;
  const fam = family(e);
  if (pc.special === 'charmRobot' && (fam === 'robot' || fam === 'cyborg'))
    applyStatus(w, e, { id: 'hacked' }, pc.owner);
  if (pc.special === 'charmZombie' && (fam === 'zombie' || fam === 'cyborg'))
    applyStatus(w, e, { id: 'raised' }, pc.owner);
}

export function nearestHostile(w: World, from: Entity, maxDist: number): Entity | undefined {
  let best: Entity | undefined;
  let bd = maxDist * maxDist;
  for (const e of w.entities) {
    if (!isCharacter(e) || !isHostile(from.team, e.team) || e.fighter?.state === 'dead') continue;
    if (e.player && e.player.respawn > 0) continue;
    const dx = e.t.x - from.t.x;
    const dz = e.t.z - from.t.z;
    const d = dx * dx + dz * dz;
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}
