import { DEG } from '../../core/math';
import { secToTicks } from '../../core/time';
import { STAFFS } from '../../data/staffs';
import type { StaffDef, StaffId } from '../../data/types';
import { isCharacter, isHostile, type Entity } from '../Entity';
import { Btn, held, pressed } from '../InputFrame';
import type { World } from '../World';
import { applyHeal, applyHit } from '../combat/applyHit';
import { inCone } from '../combat/hitbox';
import { family } from '../defs';
import { spawnHazard } from './effects';
import { spawnProjectile } from './projectiles';
import { applyStatus } from './status';
import { resolveAim } from './weapons';
import { LOCOMOTION } from './playerControl';

export function currentStaff(e: Entity): StaffDef | undefined {
  const p = e.player!;
  const id = p.staffs[p.staffIdx];
  return id ? STAFFS[id] : undefined;
}

/** Entrada do modo cajado: conjura com o botão de tiro se houver mana e o cooldown permitir. */
export function playerStaffInput(w: World, e: Entity): void {
  const p = e.player!;
  const fi = e.fighter!;
  // cooldowns
  for (const k in p.staffCd) {
    const id = k as StaffId;
    if ((p.staffCd[id] ?? 0) > 0) p.staffCd[id]!--;
  }
  // conjuração em andamento
  if (fi.state === 'cast' && p.castStaff) {
    const def = STAFFS[p.castStaff];
    if (fi.st >= def.castTicks && !p.castFired) {
      p.castFired = true;
      executeStaff(w, e, def);
    }
    if (fi.st >= def.castTicks + 8) {
      fi.state = e.body!.grounded ? 'idle' : 'fall';
      fi.st = 0;
      p.castStaff = null;
    }
    return;
  }
  if (p.mode !== 'staff') return;
  if (!LOCOMOTION.has(fi.state)) return;
  const def = currentStaff(e);
  if (!def) return;
  const want =
    pressed(p.buttons, p.prevButtons, Btn.Fire) || (held(p.buttons, Btn.Fire) && def.cooldownS <= 1);
  if (!want) return;
  if ((p.staffCd[def.id] ?? 0) > 0) return;
  if (p.mana < def.manaCost) {
    if (pressed(p.buttons, p.prevButtons, Btn.Fire)) w.emit({ t: 'dryfire', id: e.id });
    return;
  }
  p.mana -= def.manaCost;
  p.manaDelay = secToTicks(1.5);
  p.staffCd[def.id] = secToTicks(def.cooldownS);
  p.castStaff = def.id;
  p.castFired = false;
  fi.state = 'cast';
  fi.st = 0;
  fi.moveId = null;
  if (p.aimMode === 1) e.t.facing = Math.cos(p.aimYaw) >= 0 ? 1 : -1;
}

function countControlled(w: World, kind: 'hacked' | 'raised'): number {
  let n = 0;
  for (const e of w.entities) if (e.control?.kind === kind && e.fighter?.state !== 'dead') n++;
  return n;
}

/** Executa o efeito do cajado no quadro de liberação da conjuração. */
export function executeStaff(w: World, e: Entity, def: StaffDef): void {
  const range =
    def.delivery.kind === 'hitscan'
      ? def.delivery.range
      : def.delivery.kind === 'cone'
        ? def.delivery.range
        : 14;
  const yaw = resolveAim(w, e, range);
  const x = e.t.x + Math.cos(yaw) * 0.6;
  const z = e.t.z + Math.sin(yaw) * 0.3;
  const y = e.t.y + 1.35;
  w.emit({ t: 'cast', id: e.id, staff: def.id, x: e.t.x, y: e.t.y, z: e.t.z, dir: yaw });
  const d = def.delivery;
  switch (d.kind) {
    case 'projectile': {
      const n = d.count ?? 1;
      for (let i = 0; i < n; i++) {
        const off = n > 1 ? (i - (n - 1) / 2) * (d.spreadDeg ?? 5) * DEG : 0;
        if (def.special === 'charmRobot' && countControlled(w, 'hacked') >= 2) break;
        if (def.special === 'charmZombie' && countControlled(w, 'raised') >= 3) break;
        const pr = spawnProjectile(w, {
          owner: e,
          x,
          y,
          z,
          yaw: yaw + off,
          spec: {
            visual: d.visual,
            speed: d.speed,
            radius: d.radius,
            lifeS: d.lifeS,
            pierce: d.pierce,
            gravity: d.gravity,
            homing: d.homing,
            lob: !!d.gravity,
            hit: def.hit,
            onImpact: def.onImpact,
          },
          target: d.gravity ? { x: e.t.x + Math.cos(yaw) * 7, z: e.t.z + Math.sin(yaw) * 3 } : undefined,
          special: def.special === 'charmRobot' || def.special === 'charmZombie' ? def.special : undefined,
          staff: def.id,
        });
        if (def.special === 'charmRobot' && countControlled(w, 'hacked') >= 2)
          pr.projectile!.special = undefined;
      }
      break;
    }
    case 'hitscan':
      chainLightning(w, e, def, x, y, z, yaw);
      break;
    case 'cone': {
      const hits = w.entities.filter(
        (o) =>
          isCharacter(o) &&
          isHostile(e.team, o.team) &&
          o.fighter?.state !== 'dead' &&
          inCone(e.t.x, e.t.z, yaw, d.angleDeg * DEG, d.range, o.t.x, o.t.z, o.body?.radius ?? 0.4),
      );
      for (const o of hits)
        applyHit(w, e, o, def.hit, {
          dirX: Math.cos(yaw),
          dirZ: Math.sin(yaw) * 0.5,
          element: 'wind',
          source: 'staff',
        });
      // perigo curto só para o visual
      spawnHazard(w, {
        x: e.t.x,
        z: e.t.z,
        owner: e.id,
        team: e.team,
        shape: { k: 'cone', angle: d.angleDeg * DEG, range: d.range, dir: yaw },
        hit: { ...def.hit, damage: 0, status: undefined },
        active: 14,
        fx: 'wind',
        height: -1,
        element: 'wind',
      });
      break;
    }
    case 'groundWave': {
      const T = d.range / d.speed;
      spawnHazard(w, {
        x: e.t.x + Math.cos(yaw) * 0.8,
        z: e.t.z + Math.sin(yaw) * 0.4,
        owner: e.id,
        team: e.team,
        shape: { k: 'rect', w: d.width, d: d.width * 1.2 },
        hit: def.hit,
        active: secToTicks(T),
        vx: Math.cos(yaw) * d.speed,
        vz: Math.sin(yaw) * d.speed * 0.6,
        fx: 'spikes',
        height: 1.2,
        element: 'earth',
        source: 'staff',
      });
      break;
    }
    case 'aura': {
      if (def.special === 'heal') {
        applyHeal(w, e, def.healAmount ?? 30);
        applyStatus(w, e, { id: 'regen' }, e.id);
        for (const o of w.entities) {
          if (o === e || !o.health || o.fighter?.state === 'dead') continue;
          const dist = Math.hypot(o.t.x - e.t.x, o.t.z - e.t.z);
          if (dist > d.radius) continue;
          if (o.team === e.team && isCharacter(o)) {
            applyHeal(w, o, (def.healAmount ?? 30) * 0.6);
          } else if (isHostile(e.team, o.team) && isCharacter(o)) {
            const fam = family(o);
            if (fam === 'zombie' || fam === 'cyborg')
              applyHit(w, e, o, def.hit, { dirX: o.t.x - e.t.x, dirZ: 0, source: 'staff' });
          }
        }
        spawnHazard(w, {
          x: e.t.x,
          z: e.t.z,
          owner: e.id,
          team: e.team,
          shape: { k: 'ring', r: 0.5, width: 0.5 },
          hit: { ...def.hit, damage: 0 },
          active: 20,
          grow: d.radius / 20,
          fx: 'heal',
          height: -1,
        });
      }
      break;
    }
  }
}

/** Raio elétrico: primeiro alvo na linha de mira e saltos para os próximos. */
function chainLightning(
  w: World,
  e: Entity,
  def: StaffDef,
  x: number,
  y: number,
  z: number,
  yaw: number,
): void {
  const d = def.delivery;
  if (d.kind !== 'hitscan') return;
  const dx = Math.cos(yaw);
  const dz = Math.sin(yaw);
  let first: Entity | undefined;
  let bestT = Infinity;
  for (const o of w.entities) {
    if (!isCharacter(o) || !isHostile(e.team, o.team) || o.fighter?.state === 'dead' || o.body?.low) continue;
    const ox = o.t.x - x;
    const oz = o.t.z - z;
    const t = ox * dx + oz * dz;
    if (t < 0 || t > d.range) continue;
    const px = ox - dx * t;
    const pz = oz - dz * t;
    const r = (o.body?.radius ?? 0.4) + 0.5;
    if (px * px + pz * pz > r * r) continue;
    if (t < bestT) {
      bestT = t;
      first = o;
    }
  }
  if (!first) {
    w.emit({
      t: 'beam',
      x0: x,
      y0: y,
      z0: z,
      x1: x + dx * d.range,
      y1: y,
      z1: z + dz * d.range,
      element: 'electric',
    });
    return;
  }
  const hitIds: number[] = [];
  let cur: Entity = first;
  let px = x;
  let py = y;
  let pz = z;
  let mult = 1;
  for (let j = 0; j <= (d.chain?.jumps ?? 0); j++) {
    const cy = cur.t.y + (cur.body?.height ?? 1.6) * 0.6;
    w.emit({ t: 'beam', x0: px, y0: py, z0: pz, x1: cur.t.x, y1: cy, z1: cur.t.z, element: 'electric' });
    applyHit(w, e, cur, def.hit, {
      mult,
      dirX: cur.t.x - px,
      dirZ: 0,
      x: cur.t.x,
      y: cy,
      z: cur.t.z,
      element: 'electric',
      source: 'staff',
    });
    hitIds.push(cur.id);
    px = cur.t.x;
    py = cy;
    pz = cur.t.z;
    mult *= d.chain?.falloff ?? 0.7;
    // próximo alvo mais perto
    let next: Entity | undefined;
    let nd = (d.chain?.radius ?? 4) ** 2;
    for (const o of w.entities) {
      if (
        !isCharacter(o) ||
        !isHostile(e.team, o.team) ||
        o.fighter?.state === 'dead' ||
        hitIds.includes(o.id)
      )
        continue;
      const dd = (o.t.x - cur.t.x) ** 2 + (o.t.z - cur.t.z) ** 2;
      if (dd < nd) {
        nd = dd;
        next = o;
      }
    }
    if (!next) break;
    cur = next;
  }
}
