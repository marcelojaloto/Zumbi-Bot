import { DEG } from '../../core/math';
import { DT, secToTicks } from '../../core/time';
import { coopScaling } from '../../data/balance';
import { getBoss } from '../../data/bosses';
import { MOVES } from '../../data/melee';
import type { BossDef, BossPattern, BossPhaseDef, BossStep, TelegraphShape } from '../../data/types';
import {
  isCharacter,
  isHostile,
  makeFighter,
  makeHealth,
  makeTransform,
  type BossComp,
  type Entity,
  type EntityId,
} from '../Entity';
import type { World } from '../World';
import { applyHit, killEntity } from '../combat/applyHit';
import { startMove } from '../combat/fighter';
import { spawnEnemy } from '../ai/spawnEnemy';
import { explode, spawnHazard } from './effects';
import { spawnProjectile } from './projectiles';
import { spawnPickup } from './pickups';
import { grantXp } from '../progression';
import { grantCosmetic } from './loot';
import { spawnPos } from '../level/LevelRunner';

const INTRO_TICKS = 150;

/** Achata `repeat` em uma lista linear de passos. */
export function compileSteps(steps: BossStep[]): BossStep[] {
  const out: BossStep[] = [];
  for (const s of steps) {
    if (s.t === 'repeat') for (let i = 0; i < s.times; i++) out.push(...compileSteps(s.steps));
    else out.push(s);
  }
  return out;
}

export function spawnBoss(w: World, def: BossDef, x: number, z: number): Entity {
  const hp = Math.round(def.hp * coopScaling(w.playerCount).bossHp * w.diff.enemyHp);
  const boss: BossComp = {
    phase: 0,
    transitioning: false,
    patternId: null,
    steps: [],
    pc: 0,
    stepTick: 0,
    stepData: {},
    cooldowns: {},
    idle: 60,
    element: def.element,
    vulnMult: 1,
    vulnTicks: 0,
    staggered: 0,
    addsTimer: 0,
    cycleTimer: 0,
    cycleIdx: 0,
    scaleMult: 1,
    intro: INTRO_TICKS,
    defeated: false,
    lastPattern: null,
    pose: 'roar',
    poseTicks: INTRO_TICKS,
    poseStart: 0,
    markX: x,
    markZ: z,
    chargeHits: [],
  };
  const e = w.add({
    kind: 'boss',
    team: 'enemies',
    defId: def.id,
    alive: true,
    age: 0,
    t: makeTransform(x, 0, z, -1),
    body: {
      radius: def.radius,
      height: def.height,
      mass: 20,
      grounded: true,
      gravityScale: 1,
      anchored: true,
    },
    health: makeHealth(hp, def.poise),
    fighter: makeFighter('idle'),
    statuses: [],
    boss,
    scale: def.scale,
    dmgMult: w.map.scaling.dmg * w.diff.enemyDmg,
  });
  boss.poseStart = w.tick;
  w.emit({ t: 'bossIntro', id: e.id, bossId: def.id });
  w.emit({ t: 'shake', trauma: 0.6 });
  return e;
}

function phaseDef(def: BossDef, e: Entity): BossPhaseDef {
  return def.phases[Math.min(e.boss!.phase, def.phases.length - 1)]!;
}

function nearestPlayer(w: World, e: Entity): Entity | undefined {
  let best: Entity | undefined;
  let bd = Infinity;
  for (const p of w.entities) {
    if (!isCharacter(p) || !isHostile(e.team, p.team) || p.fighter?.state === 'dead') continue;
    if (p.player && p.player.respawn > 0) continue;
    const d = Math.abs(p.t.x - e.t.x) + Math.abs(p.t.z - e.t.z) + (p.kind === 'player' ? 0 : 3);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

function setPose(w: World, e: Entity, pose: string | null, ticks: number): void {
  const b = e.boss!;
  b.pose = pose;
  b.poseTicks = ticks;
  b.poseStart = w.tick;
}

function arenaCenter(w: World): { x: number; z: number } {
  return { x: (w.bounds.minX + w.bounds.maxX) / 2, z: (w.zBand[0] + w.zBand[1]) / 2 };
}

function targetPoint(w: World, e: Entity, t: string): { x: number; z: number } {
  const p = nearestPlayer(w, e);
  const c = arenaCenter(w);
  switch (t) {
    case 'player':
      return p ? { x: p.t.x, z: p.t.z } : c;
    case 'playerLane':
      return p ? { x: e.t.x, z: p.t.z } : c;
    case 'center':
      return c;
    case 'edgeNear': {
      const left = Math.abs(e.t.x - w.bounds.minX) < Math.abs(e.t.x - w.bounds.maxX);
      return { x: left ? w.bounds.minX + 2.5 : w.bounds.maxX - 2.5, z: c.z };
    }
    case 'edgeFar': {
      const left = Math.abs(e.t.x - w.bounds.minX) < Math.abs(e.t.x - w.bounds.maxX);
      return { x: left ? w.bounds.maxX - 2.5 : w.bounds.minX + 2.5, z: c.z };
    }
    case 'random':
      return {
        x: w.rng.range(w.bounds.minX + 2, w.bounds.maxX - 2),
        z: w.rng.range(w.zBand[0] + 0.5, w.zBand[1] - 0.5),
      };
    case 'marked':
      return { x: e.boss!.markX, z: e.boss!.markZ };
    default:
      return { x: e.t.x, z: e.t.z };
  }
}

function hitScaled(
  e: Entity,
  hit: import('../../data/types').HitSpec,
  def: BossDef,
): import('../../data/types').HitSpec {
  const ph = phaseDef(def, e);
  return { ...hit, damage: hit.damage * ph.damageMult };
}

/** Executa um passo; retorna true quando termina. */
function runStep(w: World, e: Entity, def: BossDef, s: BossStep): boolean {
  const b = e.boss!;
  const st = b.stepTick;
  const ph = phaseDef(def, e);
  const tgt = nearestPlayer(w, e);
  const face = () => {
    if (tgt) e.t.facing = tgt.t.x >= e.t.x ? 1 : -1;
  };
  switch (s.t) {
    case 'wait':
      e.t.vx *= 0.8;
      e.t.vz *= 0.8;
      return st >= secToTicks(s.s);
    case 'face':
      if (s.target === 'player') face();
      else e.t.facing = arenaCenter(w).x >= e.t.x ? 1 : -1;
      return true;
    case 'pose':
      if (st === 0) setPose(w, e, s.pose, secToTicks(s.s));
      return st >= secToTicks(s.s);
    case 'move': {
      const p = targetPoint(w, e, s.to);
      const dx = p.x - e.t.x;
      const dz = p.z - e.t.z;
      const d = Math.hypot(dx, dz);
      const sp = s.speed * ph.speedMult;
      const fi = e.fighter!;
      if (d < 0.6 || st >= secToTicks(s.maxS)) {
        e.t.vx = 0;
        e.t.vz = 0;
        if (fi.state === 'walk') fi.state = 'idle';
        return true;
      }
      e.t.vx = (dx / d) * sp;
      e.t.vz = (dz / d) * sp * 0.8;
      e.t.facing = dx >= 0 ? 1 : -1;
      if (fi.state === 'idle') fi.state = 'walk';
      return false;
    }
    case 'telegraph': {
      if (st === 0) {
        face();
        const n = s.count ?? 1;
        for (let i = 0; i < n; i++) {
          const p = targetPoint(w, e, i === 0 ? s.at : 'random');
          if (i === 0) {
            b.markX = p.x;
            b.markZ = p.z;
          }
          telegraphAt(w, e, s.shape, p.x, p.z, secToTicks(s.s));
        }
        setPose(w, e, 'windup', secToTicks(s.s));
        if (s.sfx) w.emit({ t: 'sfx', id: s.sfx, x: e.t.x });
      }
      return st >= secToTicks(s.s);
    }
    case 'melee':
      if (st === 0) {
        face();
        MOVES[s.move.id] ??= s.move;
        startMove(w, e, s.move.id);
        setPose(w, e, null, 0);
        return false;
      }
      return e.fighter!.state !== 'attack';
    case 'projectile': {
      const interval = secToTicks(s.intervalS ?? 0);
      const shotsDone = interval > 0 ? Math.floor(st / interval) : 0;
      if (st === 0) {
        face();
        setPose(w, e, 'cast', Math.max(20, interval * s.count + 10));
      }
      const fireIdx = interval > 0 ? (st % interval === 0 ? shotsDone : -1) : st === 0 ? -2 : -1;
      if (fireIdx === -2) {
        for (let i = 0; i < s.count; i++) bossShoot(w, e, def, s, i);
      } else if (fireIdx >= 0 && fireIdx < s.count) {
        bossShoot(w, e, def, s, fireIdx);
      }
      return interval > 0 ? st >= interval * s.count : st >= 12;
    }
    case 'shockwave': {
      if (st !== 0) return st >= 10;
      const hit = hitScaled(e, s.hit, def);
      const [z0, z1] = w.zBand;
      const dirs = s.both ? [1, -1] : [e.t.facing];
      if (s.axis === 'x') {
        for (const dir of dirs) {
          spawnHazard(w, {
            x: e.t.x + dir * def.radius,
            z: (z0 + z1) / 2,
            owner: e.id,
            team: e.team,
            shape: { k: 'rect', w: 0.9, d: z1 - z0 + 1 },
            hit,
            active: secToTicks(s.range / s.speed),
            vx: dir * s.speed,
            fx: 'shockwave',
            height: s.height,
          });
        }
      } else if (s.axis === 'z') {
        spawnHazard(w, {
          x: e.t.x + e.t.facing * s.range * 0.5,
          z: z0,
          owner: e.id,
          team: e.team,
          shape: { k: 'rect', w: s.range, d: 0.9 },
          hit,
          active: secToTicks((z1 - z0 + 1) / s.speed),
          vz: s.speed,
          fx: 'shockwave',
          height: s.height,
        });
      } else {
        spawnHazard(w, {
          x: e.t.x,
          z: e.t.z,
          owner: e.id,
          team: e.team,
          shape: { k: 'ring', r: def.radius, width: 0.8 },
          hit,
          active: secToTicks(s.range / s.speed),
          grow: s.speed / 60,
          fx: 'shockwave',
          height: s.height,
        });
      }
      w.emit({ t: 'shake', trauma: 0.45 });
      w.emit({ t: 'sfx', id: 'explosionSmall', x: e.t.x });
      setPose(w, e, 'slamGround', 20);
      return false;
    }
    case 'beam': {
      const dur = secToTicks(s.durationS);
      if (st === 0) {
        face();
        setPose(w, e, 'cast', dur);
        const hit = hitScaled(e, s.hit, def);
        const [z0, z1] = w.zBand;
        if (s.mode === 'playerLane' || s.mode === 'facing') {
          const z = s.mode === 'playerLane' ? b.markZ : e.t.z;
          const dir = e.t.facing;
          const x0 = dir > 0 ? e.t.x : w.bounds.minX - 2;
          const x1 = dir > 0 ? w.bounds.maxX + 2 : e.t.x;
          spawnHazard(w, {
            x: (x0 + x1) / 2,
            z,
            owner: e.id,
            team: e.team,
            shape: { k: 'lane', width: s.width, x0, x1 },
            hit,
            active: dur,
            tickEvery: 12,
            fx: 'beam',
            height: 3,
            element: b.element,
          });
        } else if (s.mode === 'sweepZ') {
          const dir = e.t.facing;
          const x0 = dir > 0 ? e.t.x : w.bounds.minX - 2;
          const x1 = dir > 0 ? w.bounds.maxX + 2 : e.t.x;
          spawnHazard(w, {
            x: (x0 + x1) / 2,
            z: z0,
            owner: e.id,
            team: e.team,
            shape: { k: 'lane', width: s.width, x0, x1 },
            hit,
            active: dur,
            tickEvery: 12,
            vz: (z1 - z0) / s.durationS,
            fx: 'beam',
            height: 3,
            element: b.element,
          });
        } else {
          spawnHazard(w, {
            x: e.t.x,
            z: (z0 + z1) / 2,
            owner: e.id,
            team: e.team,
            shape: { k: 'rect', w: s.width, d: z1 - z0 + 1 },
            hit,
            active: dur,
            tickEvery: 12,
            vx: e.t.facing * 10,
            fx: 'beam',
            height: 3,
            element: b.element,
          });
        }
        w.emit({ t: 'shake', trauma: 0.3 });
      }
      return st >= dur;
    }
    case 'zone': {
      const delay = secToTicks(s.delayS ?? 0.8);
      if (st === 0) {
        for (let i = 0; i < s.count; i++) {
          let p: { x: number; z: number };
          if (s.at === 'player') p = targetPoint(w, e, 'player');
          else if (s.at === 'aroundBoss') {
            const a = (i / s.count) * Math.PI * 2;
            p = { x: e.t.x + Math.cos(a) * (def.radius + 1.5), z: e.t.z + Math.sin(a) * 1.5 };
          } else if (s.at === 'trail') p = { x: e.t.x - e.t.facing * i * 1.5, z: e.t.z };
          else if (s.at === 'grid') {
            const cols = Math.ceil(Math.sqrt(s.count * 2));
            const [z0, z1] = w.zBand;
            p = {
              x: w.bounds.minX + 1.5 + ((i % cols) + 0.5) * ((w.bounds.maxX - w.bounds.minX - 3) / cols),
              z: z0 + 0.5 + (Math.floor(i / cols) + 0.5) * ((z1 - z0 - 1) / Math.ceil(s.count / cols)),
            };
          } else p = targetPoint(w, e, 'random');
          if (s.at === 'player' && i > 0) {
            p.x += w.rng.range(-2.5, 2.5);
            p.z += w.rng.range(-1.2, 1.2);
          }
          p.z = Math.max(w.zBand[0], Math.min(w.zBand[1], p.z));
          const z = s.zone;
          spawnHazard(w, {
            x: p.x,
            z: p.z,
            owner: e.id,
            team: e.team,
            shape: { k: 'circle', r: z.radius },
            hit: hitScaled(e, z.hit, def),
            delay,
            active: secToTicks(z.durationS),
            tickEvery: secToTicks(z.tickS),
            fx: z.fx,
            height: 2.5,
            slow: z.slow,
            telegraph: { k: 'circle', r: z.radius },
            element: b.element,
          });
        }
        setPose(w, e, 'cast', 20);
      }
      return st >= Math.min(delay, 30);
    }
    case 'summon':
      if (st === 0) {
        for (let i = 0; i < s.count; i++) {
          const p = spawnPos(w, s.from, i);
          spawnEnemy(w, s.enemy, p.x, p.z, p.from === 'sides' ? 'right' : p.from);
        }
        setPose(w, e, 'roar', 40);
        w.emit({ t: 'sfx', id: 'roar', x: e.t.x, vol: 0.7 });
      }
      return st >= 40;
    case 'leap': {
      const air = secToTicks(s.airS);
      if (st === 0) {
        const p = targetPoint(w, e, s.to);
        b.markX = p.x;
        b.markZ = p.z;
        telegraphAt(w, e, { k: 'circle', r: s.landing.radius }, p.x, p.z, air);
        e.t.vy = (26 * s.airS) / 2;
        e.body!.grounded = false;
        e.t.vx = (p.x - e.t.x) / s.airS;
        e.t.vz = (p.z - e.t.z) / s.airS;
        setPose(w, e, 'jump', air);
        return false;
      }
      if (st > 3 && e.body!.grounded) {
        e.t.vx = 0;
        e.t.vz = 0;
        explode(
          w,
          e.t.x,
          0.3,
          e.t.z,
          { ...s.landing, damage: s.landing.damage * ph.damageMult },
          e.id,
          e.team,
          b.element,
        );
        setPose(w, e, 'slamGround', 20);
        return true;
      }
      return st > air + 60;
    }
    case 'teleport': {
      if (st === 0) {
        w.emit({ t: 'explosion', x: e.t.x, y: 1.5, z: e.t.z, r: 1.2, element: b.element });
        let p: { x: number; z: number };
        if (s.to === 'behindPlayer' && tgt) {
          const side = tgt.t.facing;
          p = { x: tgt.t.x - side * 2.5, z: tgt.t.z };
        } else p = targetPoint(w, e, s.to === 'center' ? 'center' : 'random');
        e.t.x = e.t.px = Math.max(w.bounds.minX + 1.5, Math.min(w.bounds.maxX - 1.5, p.x));
        e.t.z = e.t.pz = Math.max(w.zBand[0], Math.min(w.zBand[1], p.z));
        face();
        w.emit({ t: 'explosion', x: e.t.x, y: 1.5, z: e.t.z, r: 1.2, element: b.element });
      }
      return st >= 12;
    }
    case 'charge': {
      if (st === 0) {
        face();
        b.chargeHits = [];
        setPose(w, e, 'charge', secToTicks(s.maxS));
      }
      e.t.vx = e.t.facing * s.speed * ph.speedMult;
      e.t.vz *= 0.9;
      for (const o of w.entities) {
        if (
          !isCharacter(o) ||
          !isHostile(e.team, o.team) ||
          o.fighter?.state === 'dead' ||
          b.chargeHits.includes(o.id)
        )
          continue;
        if (
          Math.abs(o.t.x - e.t.x) < def.radius + 0.6 &&
          Math.abs(o.t.z - e.t.z) < def.radius * 0.8 + 0.4 &&
          o.t.y < def.height * 0.7
        ) {
          b.chargeHits.push(o.id);
          applyHit(w, e, o, hitScaled(e, s.hit, def), { dirX: e.t.facing, dirZ: 0 });
        }
      }
      const atWall =
        (e.t.facing > 0 && e.t.x >= w.bounds.maxX - def.radius - 0.4) ||
        (e.t.facing < 0 && e.t.x <= w.bounds.minX + def.radius + 0.4);
      if (atWall || st >= secToTicks(s.maxS)) {
        e.t.vx = 0;
        if (atWall) {
          w.emit({ t: 'shake', trauma: 0.5 });
          setPose(w, e, 'stagger', 30);
        }
        return true;
      }
      return false;
    }
    case 'setElement':
      b.element = s.element;
      w.emit({ t: 'bossElement', id: e.id, element: s.element });
      return true;
    case 'vulnerable':
      if (st === 0) {
        b.vulnTicks = secToTicks(s.s);
        b.vulnMult = s.mult;
        setPose(w, e, 'stagger', secToTicks(s.s));
      }
      return st >= secToTicks(s.s);
    case 'heal':
      e.health!.hp = Math.min(e.health!.max, e.health!.hp + e.health!.max * s.frac);
      w.emit({
        t: 'heal',
        dst: e.id,
        amount: Math.round(e.health!.max * s.frac),
        x: e.t.x,
        y: e.t.y + def.height,
        z: e.t.z,
      });
      return true;
    case 'absorb': {
      if (st === 0) {
        let n = 0;
        for (const o of w.entities) {
          if (o.kind !== 'enemy' || o.team !== 'enemies' || o.fighter?.state === 'dead') continue;
          if (Math.hypot(o.t.x - e.t.x, o.t.z - e.t.z) > s.radius) continue;
          killEntity(w, o, e.id);
          n++;
        }
        if (n > 0) {
          const amt = e.health!.max * s.healFrac * n;
          e.health!.hp = Math.min(e.health!.max, e.health!.hp + amt);
          w.emit({
            t: 'heal',
            dst: e.id,
            amount: Math.round(amt),
            x: e.t.x,
            y: e.t.y + def.height,
            z: e.t.z,
          });
        }
        setPose(w, e, 'roar', 30);
      }
      return st >= 30;
    }
    case 'shake':
      w.emit({ t: 'shake', trauma: s.trauma });
      return true;
    case 'sfx':
      w.emit({ t: 'sfx', id: s.id, x: e.t.x });
      return true;
    case 'arena':
      if (s.zBand) {
        w.zBand = [...s.zBand];
        w.updateBounds();
      }
      return true;
    case 'scale':
      b.scaleMult *= s.mult;
      e.scale = (e.scale ?? 1) * s.mult;
      e.body!.radius *= s.mult;
      e.body!.height *= s.mult;
      return true;
    case 'repeat':
      return true;
  }
}

function telegraphAt(w: World, e: Entity, shape: TelegraphShape, x: number, z: number, ticks: number): void {
  const [z0, z1] = w.zBand;
  let hs: import('../Entity').HazardShape;
  let hx = x;
  let hz = z;
  switch (shape.k) {
    case 'circle':
      hs = { k: 'circle', r: shape.r };
      break;
    case 'ring':
      hs = { k: 'ring', r: shape.r, width: 0.6 };
      break;
    case 'rect':
      hs = { k: 'rect', w: shape.w, d: shape.d };
      break;
    case 'lane': {
      const dir = e.t.facing;
      const x0 = dir > 0 ? e.t.x : w.bounds.minX - 2;
      const x1 = dir > 0 ? w.bounds.maxX + 2 : e.t.x;
      hs = { k: 'lane', width: shape.width, x0, x1 };
      hx = (x0 + x1) / 2;
      break;
    }
    case 'cone':
      hs = { k: 'cone', angle: shape.angleDeg * DEG, range: shape.range, dir: e.t.facing > 0 ? 0 : Math.PI };
      hx = e.t.x;
      hz = e.t.z;
      break;
  }
  void z0;
  void z1;
  spawnHazard(w, {
    x: hx,
    z: hz,
    owner: e.id,
    team: e.team,
    shape: hs,
    hit: { damage: 0, dtype: 'blunt', knockback: 0, hitstun: 0, hitstop: 0 },
    delay: ticks,
    active: 1,
    fx: 'telegraph',
    height: -1,
    telegraph: shape,
  });
}

function bossShoot(
  w: World,
  e: Entity,
  def: BossDef,
  s: Extract<BossStep, { t: 'projectile' }>,
  i: number,
): void {
  const b = e.boss!;
  const tgt = nearestPlayer(w, e);
  const spec = { ...s.spec, hit: hitScaled(e, s.spec.hit, def) };
  const sc = e.scale ?? 1;
  let x = e.t.x + e.t.facing * def.radius * 0.8;
  let y = e.t.y + (s.spec.y ?? 1.4) * sc;
  let z = e.t.z;
  if (s.from === 'top') y = e.t.y + def.height * 0.9;
  if (s.from === 'mouth') y = e.t.y + def.height * 0.8;
  const tx = tgt?.t.x ?? x + e.t.facing * 5;
  const tz = tgt?.t.z ?? z;
  let yaw = Math.atan2(tz - z, tx - x);
  let target: { x: number; z: number } | undefined;
  switch (s.aim) {
    case 'fan':
      yaw += (i - (s.count - 1) / 2) * s.spreadDeg * DEG;
      break;
    case 'lanes': {
      const [z0, z1] = w.zBand;
      const lz = z0 + 0.4 + ((z1 - z0 - 0.8) * i) / Math.max(1, s.count - 1);
      yaw = Math.atan2(lz - z, tx - x);
      target = { x: tx, z: lz };
      break;
    }
    case 'random':
      yaw += w.rng.range(-1, 1) * s.spreadDeg * DEG;
      target = { x: tx + w.rng.range(-3, 3), z: tz + w.rng.range(-1.2, 1.2) };
      break;
    case 'ring':
      yaw = (i / s.count) * Math.PI * 2;
      break;
    case 'down': {
      // chuva: cai do céu perto do alvo
      const px = tx + w.rng.range(-3, 3);
      const pz = Math.max(w.zBand[0], Math.min(w.zBand[1], tz + w.rng.range(-1.2, 1.2)));
      telegraphAt(
        w,
        e,
        { k: 'circle', r: Math.max(0.8, (spec.onImpact?.explosion?.radius ?? 1) * 0.9) },
        px,
        pz,
        50,
      );
      x = px;
      z = pz;
      y = 12;
      const pr = spawnProjectile(w, { owner: e, x, y, z, yaw: 0, spec: { ...spec, gravity: 0, lob: false } });
      pr.t.vx = 0;
      pr.t.vz = 0;
      pr.t.vy = -12 / (50 / 60);
      return;
    }
    default:
      yaw += (w.rng.next() - 0.5) * s.spreadDeg * DEG;
  }
  if (spec.lob && !target) target = { x: tx, z: tz };
  spawnProjectile(w, {
    owner: e,
    x,
    y,
    z,
    yaw,
    spec,
    target: spec.lob ? (target ?? { x: tx, z: tz }) : undefined,
    aimAt: spec.lob ? undefined : tgt ? { x: tgt.t.x, y: tgt.t.y + 1.1, z: target?.z ?? tgt.t.z } : undefined,
    homingTarget: tgt?.id,
  });
  w.emit({
    t: 'shot',
    id: e.id,
    weapon: 'enemy',
    x,
    y,
    z,
    dx: Math.cos(yaw),
    dz: Math.sin(yaw),
    visual: spec.visual,
  });
  void b;
}

function pickPattern(w: World, e: Entity, def: BossDef): BossPattern | undefined {
  const b = e.boss!;
  const ph = phaseDef(def, e);
  const tgt = nearestPlayer(w, e);
  const dist = tgt ? Math.abs(tgt.t.x - e.t.x) : 5;
  let pool = ph.patterns.filter(
    (p) =>
      (b.cooldowns[p.id] ?? 0) <= 0 &&
      (p.minRange === undefined || dist >= p.minRange) &&
      (p.maxRange === undefined || dist <= p.maxRange),
  );
  if (pool.length > 1 && b.lastPattern) pool = pool.filter((p) => p.id !== b.lastPattern);
  if (pool.length === 0) pool = ph.patterns.filter((p) => (b.cooldowns[p.id] ?? 0) <= 0);
  if (pool.length === 0) return undefined;
  return w.rng.weighted(pool, (p) => p.weight);
}

/** Interpretador de chefes: fases por limite de vida, padrões ponderados, adds, aura e rotação de elemento. */
export function bossSystem(w: World): void {
  for (const e of w.entities) {
    const b = e.boss;
    if (!b || !e.alive) continue;
    const def = getBoss(e.defId);
    const fi = e.fighter!;
    if (b.defeated) {
      e.t.vx *= 0.9;
      e.t.vz *= 0.9;
      continue;
    }
    for (const k in b.cooldowns) if (b.cooldowns[k]! > 0) b.cooldowns[k]!--;
    if (b.vulnTicks > 0 && --b.vulnTicks === 0) b.vulnMult = 1;
    if (b.staggered > 0) b.staggered--;
    if (fi.hitstop > 0) continue;

    if (b.intro > 0) {
      b.intro--;
      e.t.vx = 0;
      e.t.vz = 0;
      if (b.intro === 0) setPose(w, e, null, 0);
      continue;
    }

    // troca de fase
    const frac = e.health!.hp / e.health!.max;
    let target = 0;
    while (target < def.phases.length - 1 && frac <= def.phases[target]!.untilHpFrac) target++;
    if (target > b.phase) {
      b.phase = target;
      b.transitioning = true;
      const ph = phaseDef(def, e);
      b.steps = compileSteps(
        ph.transition ?? [
          { t: 'pose', pose: 'roar', s: 1.6 },
          { t: 'shake', trauma: 0.6 },
        ],
      );
      b.pc = 0;
      b.stepTick = 0;
      b.patternId = null;
      fi.state = 'idle';
      fi.moveId = null;
      e.t.vx = 0;
      w.emit({ t: 'bossPhase', id: e.id, phase: b.phase });
      w.emit({ t: 'shake', trauma: 0.6 });
      spawnPickup(w, 'medkitS', e.t.x - e.t.facing * 2, e.t.z + 0.8);
      spawnPickup(w, 'ammoCurrent', e.t.x - e.t.facing * 2.5, e.t.z - 0.8);
      spawnPickup(w, 'mana', e.t.x - e.t.facing * 3, e.t.z);
    }
    const ph = phaseDef(def, e);

    // efeitos contínuos
    if (ph.elementCycle) {
      b.cycleTimer++;
      if (b.cycleTimer >= secToTicks(ph.elementCycle.everyS)) {
        b.cycleTimer = 0;
        b.cycleIdx = (b.cycleIdx + 1) % ph.elementCycle.elements.length;
        b.element = ph.elementCycle.elements[b.cycleIdx]!;
        w.emit({ t: 'bossElement', id: e.id, element: b.element });
      }
    }
    if (ph.adds && !b.transitioning) {
      b.addsTimer++;
      if (b.addsTimer >= secToTicks(ph.adds.everyS)) {
        b.addsTimer = 0;
        const alive = w.entities.filter(
          (o) => o.kind === 'enemy' && o.defId === ph.adds!.enemy && o.fighter?.state !== 'dead',
        ).length;
        for (let i = 0; i < Math.min(ph.adds.count, ph.adds.maxAlive - alive); i++) {
          const p = spawnPos(w, 'sides', i);
          spawnEnemy(w, ph.adds.enemy, p.x, p.z, p.from);
        }
      }
    }
    contactDamage(w, e, def, ph);

    const reacting = fi.state === 'stagger' || fi.state === 'frozen' || fi.state === 'stunned';
    if (reacting && !b.transitioning) {
      e.t.vx *= 0.8;
      continue;
    }

    if (b.steps.length === 0) {
      e.t.vx *= 0.8;
      e.t.vz *= 0.8;
      if (fi.state === 'walk') fi.state = 'idle';
      const tgt = nearestPlayer(w, e);
      if (tgt && fi.state === 'idle') e.t.facing = tgt.t.x >= e.t.x ? 1 : -1;
      if (b.idle > 0) {
        b.idle--;
        // aproxima devagar enquanto espera
        if (tgt && Math.abs(tgt.t.x - e.t.x) > def.radius + 3) {
          e.t.vx = Math.sign(tgt.t.x - e.t.x) * def.speed * 0.5 * ph.speedMult;
          if (fi.state === 'idle') fi.state = 'walk';
        }
        continue;
      }
      const pat = pickPattern(w, e, def);
      if (!pat) {
        b.idle = 20;
        continue;
      }
      b.patternId = pat.id;
      b.lastPattern = pat.id;
      b.steps = compileSteps(pat.steps);
      b.pc = 0;
      b.stepTick = 0;
      b.cooldowns[pat.id] = secToTicks(pat.cooldownS);
    }
    const step = b.steps[b.pc];
    if (!step) {
      b.steps = [];
      continue;
    }
    const done = runStep(w, e, def, step);
    b.stepTick++;
    if (done) {
      b.pc++;
      b.stepTick = 0;
      if (b.pc >= b.steps.length) {
        b.steps = [];
        b.patternId = null;
        if (b.transitioning) b.transitioning = false;
        b.idle = secToTicks(w.rng.range(ph.idleBetweenS[0], ph.idleBetweenS[1]));
        if (fi.state === 'walk') fi.state = 'idle';
      }
    }
  }
}

const contactTimers = new Map<EntityId, number>();

function contactDamage(w: World, e: Entity, def: BossDef, ph: BossPhaseDef): void {
  const auraHit = ph.aura;
  for (const o of w.entities) {
    if (!isCharacter(o) || !isHostile(e.team, o.team) || o.fighter?.state === 'dead') continue;
    const d = Math.hypot(o.t.x - e.t.x, (o.t.z - e.t.z) * 1.3);
    if (auraHit && d <= auraHit.radius && w.tick % 30 === 0) {
      applyHit(w, e, o, auraHit.hit, { ignoreInvuln: true, noReact: true, noCombo: true });
    }
    // encostar no chefe empurra e machuca um pouco
    if (d < def.radius + (o.body?.radius ?? 0.35) && o.t.y < def.height * 0.5) {
      const key = o.id * 100000 + e.id;
      const last = contactTimers.get(key) ?? -999;
      if (w.tick - last > 60) {
        contactTimers.set(key, w.tick);
        applyHit(w, e, o, hitScaled(e, def.contact, def), { dirX: o.t.x - e.t.x || 1, dirZ: 0 });
      }
    }
  }
}

/** Chefe derrotado: recompensas, fim dos inimigos e contagem para a vitória. */
export function onBossKilled(w: World, e: Entity, killer: EntityId): void {
  const b = e.boss!;
  const def = getBoss(e.defId);
  b.defeated = true;
  b.steps = [];
  w.emit({ t: 'bossDefeated', id: e.id, bossId: def.id });
  w.emit({ t: 'shake', trauma: 1 });
  w.slowmo = 90;
  w.freeze = 8;
  const ls = w.levelState;
  ls.bossDead = true;
  ls.bossDeadTick = w.tick;
  if (def.rewards.unlockStaff) ls.unlockedStaff = def.rewards.unlockStaff;
  for (const o of [...w.entities]) {
    if (o.kind === 'enemy' && o.fighter?.state !== 'dead') killEntity(w, o, 0);
    if (o.kind === 'hazard' && o.hazard && !o.hazard.env) w.remove(o.id);
    if (o.kind === 'projectile' && o.team === 'enemies') w.remove(o.id);
  }
  for (const p of w.playerEntities()) {
    const pc = p.player!;
    pc.bossKills++;
    pc.score += def.rewards.score;
    pc.scrap += def.rewards.scrap;
    grantXp(w, p, def.rewards.xp);
    if (def.rewards.unlockStaff && !pc.staffs.includes(def.rewards.unlockStaff)) {
      pc.staffs.push(def.rewards.unlockStaff);
      w.emit({ t: 'unlock', player: p.id, kind: 'staff', id: def.rewards.unlockStaff });
    }
    for (const c of def.rewards.cosmetics) grantCosmetic(w, p, c);
  }
  // 2 sacos de loot raros ou melhores
  spawnPickup(w, w.rng.chance(0.25) ? 'lootEpic' : 'lootRare', e.t.x - 1, e.t.z);
  spawnPickup(w, 'lootRare', e.t.x + 1, e.t.z);
  spawnPickup(w, 'medkitL', e.t.x, e.t.z + 1);
  void killer;
  void DT;
}
