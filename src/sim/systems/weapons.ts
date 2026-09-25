import { DEG, wrapAngle } from '../../core/math';
import { DT, secToTicks } from '../../core/time';
import { FIREARMS } from '../../data/weapons';
import type { FirearmDef, HitSpec, WeaponId } from '../../data/types';
import { isCharacter, isHostile, type Entity, type PlayerComp } from '../Entity';
import { Btn, held, pressed } from '../InputFrame';
import type { World } from '../World';
import { applyHit } from '../combat/applyHit';
import { falloff } from '../combat/damage';
import { spawnProjectile } from './projectiles';
import { LOCOMOTION } from './playerControl';

/** Munição inicial de cada arma desbloqueada: 1 pente cheio + 1 pente de reserva. */
export function initAmmo(p: PlayerComp): void {
  for (const g of p.guns) {
    const d = FIREARMS[g];
    p.ammoMag[g] = d.mag;
    if (d.reserveMax !== 'infinite') p.ammo[d.ammo] = Math.max(p.ammo[d.ammo], d.mag);
  }
}

export function currentGun(p: PlayerComp): FirearmDef {
  return FIREARMS[p.guns[p.gunIdx] ?? 'pistol'];
}

export function reserveOf(p: PlayerComp, d: FirearmDef): number {
  return d.reserveMax === 'infinite' ? Infinity : p.ammo[d.ammo];
}

/** Troca de modo (arma/cajado) e de arma. */
function handleSwitching(w: World, e: Entity): void {
  const p = e.player!;
  const b = p.buttons;
  const pb = p.prevButtons;
  let newMode = p.mode;
  if (pressed(b, pb, Btn.ModeGun)) newMode = 'gun';
  if (pressed(b, pb, Btn.ModeStaff)) newMode = 'staff';
  if (pressed(b, pb, Btn.ToggleMode)) newMode = p.mode === 'gun' ? 'staff' : 'gun';
  if (newMode === 'staff' && p.staffs.length === 0) newMode = 'gun';
  if (newMode !== p.mode) {
    p.mode = newMode;
    cancelReload(p);
    w.emit({
      t: 'weaponSwap',
      id: e.id,
      mode: p.mode,
      weapon: p.mode === 'gun' ? currentGun(p).id : (p.staffs[p.staffIdx] ?? 'heal'),
    });
    return;
  }
  const dir = pressed(b, pb, Btn.Next) ? 1 : pressed(b, pb, Btn.Prev) ? -1 : 0;
  if (!dir) return;
  if (p.mode === 'gun' && p.guns.length > 1) {
    p.gunIdx = (p.gunIdx + dir + p.guns.length) % p.guns.length;
    cancelReload(p);
    p.fire.spin = 0;
    p.fire.cd = Math.max(p.fire.cd, 0.25);
    w.emit({ t: 'weaponSwap', id: e.id, mode: 'gun', weapon: currentGun(p).id });
  } else if (p.mode === 'staff' && p.staffs.length > 1) {
    p.staffIdx = (p.staffIdx + dir + p.staffs.length) % p.staffs.length;
    w.emit({ t: 'weaponSwap', id: e.id, mode: 'staff', weapon: p.staffs[p.staffIdx]! });
  }
}

function cancelReload(p: PlayerComp): void {
  p.fire.reload = 0;
  p.fire.reloadTotal = 0;
  p.fire.shellReload = false;
}

function startReload(w: World, e: Entity, d: FirearmDef): boolean {
  const p = e.player!;
  const mag = p.ammoMag[d.id] ?? 0;
  if (mag >= d.mag || reserveOf(p, d) <= 0 || p.fire.reload > 0) return false;
  if (d.reload.kind === 'mag') {
    p.fire.reload = secToTicks(d.reload.s);
    p.fire.reloadTotal = p.fire.reload;
    p.fire.shellReload = false;
  } else {
    p.fire.reload = secToTicks(d.reload.startS + d.reload.perShellS);
    p.fire.reloadTotal = p.fire.reload;
    p.fire.shellReload = true;
  }
  w.emit({ t: 'reload', id: e.id, phase: 'start', weapon: d.id });
  return true;
}

function tickReload(w: World, e: Entity, d: FirearmDef): void {
  const p = e.player!;
  if (p.fire.reload <= 0) return;
  const turbo = p.powers.turbo > 0 ? 1.3 : 1;
  p.fire.reload -= turbo;
  if (p.fire.reload > 0) return;
  if (d.reload.kind === 'mag') {
    const need = d.mag - (p.ammoMag[d.id] ?? 0);
    const take = d.reserveMax === 'infinite' ? need : Math.min(need, p.ammo[d.ammo]);
    p.ammoMag[d.id] = (p.ammoMag[d.id] ?? 0) + take;
    if (d.reserveMax !== 'infinite') p.ammo[d.ammo] -= take;
    p.fire.reloadTotal = 0;
    w.emit({ t: 'reload', id: e.id, phase: 'end', weapon: d.id });
  } else {
    // um cartucho por vez
    p.ammoMag[d.id] = (p.ammoMag[d.id] ?? 0) + 1;
    if (d.reserveMax !== 'infinite') p.ammo[d.ammo]--;
    w.emit({ t: 'reload', id: e.id, phase: 'shell', weapon: d.id });
    if ((p.ammoMag[d.id] ?? 0) < d.mag && reserveOf(p, d) > 0) {
      p.fire.reload = secToTicks(d.reload.perShellS);
      p.fire.reloadTotal = p.fire.reload;
    } else {
      p.fire.shellReload = false;
      p.fire.reloadTotal = 0;
      w.emit({ t: 'reload', id: e.id, phase: 'end', weapon: d.id });
    }
  }
}

/** Mira: modo ponteiro usa o mouse (com magnetismo); modo direcional usa auto-mira em cone. */
export function resolveAim(w: World, e: Entity, range: number): number {
  const p = e.player!;
  if (p.aimMode === 1) {
    const mag = magnet(w, e, p.aimYaw, 4 * DEG, range);
    return mag ?? p.aimYaw;
  }
  const want = e.t.facing > 0 ? p.moveZ * 0.35 : Math.PI - p.moveZ * 0.35;
  const assist = magnet(w, e, want, 20 * DEG, Math.min(range, 20));
  return assist ?? want;
}

function magnet(w: World, e: Entity, yaw: number, cone: number, range: number): number | null {
  let best: number | null = null;
  let bestErr = cone;
  for (const o of w.entities) {
    if (!isCharacter(o) || !isHostile(e.team, o.team) || o.fighter?.state === 'dead' || o.body?.low) continue;
    const dx = o.t.x - e.t.x;
    const dz = o.t.z - e.t.z;
    const d = Math.hypot(dx, dz);
    if (d > range || d < 0.3) continue;
    const a = Math.atan2(dz, dx);
    const err = Math.abs(wrapAngle(a - yaw));
    if (err < bestErr) {
      bestErr = err;
      best = a;
    }
  }
  return best;
}

export function playerWeaponsInput(w: World, e: Entity): void {
  const p = e.player!;
  const fi = e.fighter!;
  handleSwitching(w, e);
  const f = p.fire;
  const d = currentGun(p);
  const turbo = p.powers.turbo > 0 ? 1.3 : 1;
  // recuperação de bloom/recuo
  f.bloom = Math.max(0, f.bloom - d.bloomRecover * DT);
  f.recoil = Math.max(0, f.recoil - d.recoilRecover * DT);
  if (f.cd > 0) f.cd -= DT * turbo;
  if (p.mode !== 'gun') return;

  tickReload(w, e, d);
  const b = p.buttons;
  const trigger = held(b, Btn.Fire);
  if (pressed(b, p.prevButtons, Btn.Reload)) startReload(w, e, d);
  if (!trigger) {
    f.triggerWasDown = false;
    f.needsRelease = false;
    f.spin = Math.max(0, f.spin - DT * 2);
    return;
  }
  if (!LOCOMOTION.has(fi.state)) return;

  // metralhadora precisa girar
  if (d.spinUpS) {
    f.spin = Math.min(d.spinUpS, f.spin + DT);
    if (f.spin < d.spinUpS) {
      f.triggerWasDown = true;
      return;
    }
  }
  const semi = d.mode !== 'auto';
  const edge = !f.triggerWasDown;
  f.triggerWasDown = true;
  if (semi && !edge) return;
  if (f.cd > 0) return;

  const mag = p.ammoMag[d.id] ?? 0;
  if (mag <= 0) {
    if (edge) w.emit({ t: 'dryfire', id: e.id });
    startReload(w, e, d);
    return;
  }
  // atirar interrompe recarga cartucho a cartucho
  if (f.reload > 0) {
    if (f.shellReload && mag > 0) cancelReload(p);
    else return;
  }
  fire(w, e, d);
  p.ammoMag[d.id] = mag - 1;
  f.cd += 60 / d.rpm;
  if (f.cd < 0) f.cd = 0;
  if ((p.ammoMag[d.id] ?? 0) <= 0) startReload(w, e, d);
}

/** Dispara a arma atual (projéteis, hitscan ou granada). */
function fire(w: World, e: Entity, d: FirearmDef): void {
  const p = e.player!;
  const f = p.fire;
  const aiming = held(p.buttons, Btn.Aim);
  const yaw0 = resolveAim(w, e, d.range.max);
  if (p.aimMode === 1 || Math.abs(Math.cos(yaw0)) > 0.05) e.t.facing = Math.cos(yaw0) >= 0 ? 1 : -1;
  const mx = e.t.x + Math.cos(yaw0) * 0.55;
  const mz = e.t.z + Math.sin(yaw0) * 0.3;
  const my = e.t.y + 1.3;
  const spreadBase = (d.spreadDeg * (aiming ? d.aimedSpreadMult : 1) + f.bloom) * DEG;
  const crit = aiming && d.aimedCrit > 1 ? d.aimedCrit : 0;
  const hit: HitSpec = {
    damage: d.damage,
    dtype: d.dtype,
    knockback: d.knockback,
    hitstun: d.hitstun,
    hitstop: d.pellets > 1 ? 1 : d.id === 'sniper' ? 5 : 2,
    heavy: d.id === 'sniper' || d.id === 'shotgun',
    knockdown: d.id === 'sniper',
    launch: d.id === 'sniper' ? 2 : undefined,
    poise: d.damage * (d.id === 'shotgun' ? 1.5 : 1),
  };
  for (let i = 0; i < d.pellets; i++) {
    const spread = d.pellets > 1 ? (w.rng.next() - 0.5) * spreadBase : (w.rng.next() - 0.5) * spreadBase;
    const recoilDir = f.recoil * DEG * (w.rng.next() < 0.5 ? -1 : 1) * 0.5;
    const yaw = yaw0 + spread + recoilDir;
    const del = d.delivery;
    if (del.kind === 'hitscan') {
      hitscan(w, e, mx, my, mz, yaw, d.range.max, del.pierce, hit, crit);
    } else if (del.kind === 'grenade') {
      const gr = spawnProjectile(w, {
        owner: e,
        x: mx,
        y: my,
        z: mz,
        yaw,
        spec: {
          visual: 'grenade',
          speed: del.speed,
          radius: 0.18,
          lifeS: 4,
          gravity: del.gravity,
          hit: { ...hit, damage: d.damage },
          onImpact: { explosion: del.explosion },
        },
        fuseS: del.fuseS,
      });
      // lança um pouco para cima
      gr.t.vy = 4.5;
    } else {
      spawnProjectile(w, {
        owner: e,
        x: mx,
        y: my,
        z: mz,
        yaw,
        spec: {
          visual: del.visual,
          speed: del.speed,
          radius: 0.12,
          lifeS: d.range.max / del.speed,
          hit,
          pierce: del.pierce,
        },
        crit,
        falloff: { start: d.range.falloffStart, end: d.range.falloffEnd, minMult: d.range.minMult },
        weapon: d.id,
      });
    }
  }
  f.bloom = Math.min(d.bloomMax, f.bloom + d.bloomPerShot);
  f.recoil += d.recoilDeg;
  if (d.pushback) e.t.vx -= Math.cos(yaw0) * d.pushback;
  p.lastFireTick = w.tick;
  w.emit({ t: 'shot', id: e.id, weapon: d.id, x: mx, y: my, z: mz, dx: Math.cos(yaw0), dz: Math.sin(yaw0) });
  if (d.id === 'shotgun' || d.id === 'sniper' || d.id === 'gl') w.emit({ t: 'shake', trauma: 0.15 });
}

/** Tiro instantâneo com perfuração (rifle de precisão). */
function hitscan(
  w: World,
  e: Entity,
  x: number,
  y: number,
  z: number,
  yaw: number,
  range: number,
  pierce: number,
  hit: HitSpec,
  crit: number,
): void {
  const dx = Math.cos(yaw);
  const dz = Math.sin(yaw);
  const hits: { e: Entity; t: number }[] = [];
  for (const o of w.entities) {
    if (!o.health || !o.alive || o === e) continue;
    if (o.kind === 'prop') {
      // objetos bloqueiam
    } else if (!isCharacter(o) || !isHostile(e.team, o.team)) continue;
    if (o.fighter?.state === 'dead' || o.body?.low) continue;
    const ox = o.t.x - x;
    const oz = o.t.z - z;
    const t = ox * dx + oz * dz;
    if (t < 0 || t > range) continue;
    const px = ox - dx * t;
    const pz = oz - dz * t;
    const r = (o.body?.radius ?? 0.4) + 0.1;
    if (px * px + pz * pz * 1.4 > r * r) continue;
    const h = o.body?.height ?? 1.6;
    if (y < o.t.y - 1.0 || y > o.t.y + h + 0.3) continue;
    hits.push({ e: o, t });
  }
  hits.sort((a, b) => a.t - b.t);
  let endT = range;
  let n = 0;
  let stopped = false;
  for (const h of hits) {
    applyHit(w, e, h.e, hit, {
      crit: crit > 1,
      critMult: crit > 1 ? crit : undefined,
      falloff: falloff(h.t, range, range + 1, 1),
      dirX: dx,
      dirZ: dz * 0.3,
      x: x + dx * h.t,
      y,
      z: z + dz * h.t,
    });
    n++;
    if (h.e.kind === 'prop' || n > pierce) {
      endT = h.t;
      stopped = true;
      break;
    }
  }
  if (!stopped) endT = range;
  w.emit({ t: 'tracer', x0: x, y0: y, z0: z, x1: x + dx * endT, y1: y, z1: z + dz * endT, color: 0xffe8b0 });
}

export function gunName(id: WeaponId): string {
  return FIREARMS[id].name;
}
