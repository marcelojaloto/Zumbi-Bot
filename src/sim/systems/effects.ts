import { secToTicks } from '../../core/time';
import type { Element, ExplosionSpec, HitSource, HitSpec, TelegraphShape, ZoneSpec } from '../../data/types';
import {
  makeTransform,
  isHostile,
  type Entity,
  type EntityId,
  type HazardComp,
  type HazardShape,
  type Team,
} from '../Entity';
import type { World } from '../World';
import { applyHit } from '../combat/applyHit';

/** Explosão em área (granadas, barris, zumbi bomba, bosses). */
const ELEMENTAL_DTYPES = new Set<string>([
  'fire',
  'water',
  'ice',
  'electric',
  'toxic',
  'cyber',
  'wind',
  'earth',
  'necro',
]);

export function explode(
  w: World,
  x: number,
  y: number,
  z: number,
  spec: ExplosionSpec,
  owner: EntityId,
  team: Team,
  element?: Element,
  source?: HitSource,
): void {
  // sem elemento explícito, o tipo de dano elemental da explosão define a cor do efeito
  const el = element ?? (ELEMENTAL_DTYPES.has(spec.dtype) ? (spec.dtype as Element) : 'explosive');
  w.emit({ t: 'explosion', x, y, z, r: spec.radius, element: el });
  w.emit({ t: 'shake', trauma: Math.min(0.7, 0.2 + spec.radius * 0.12) });
  const ownerEnt = w.get(owner);
  // cópia: explosões encadeadas podem alterar a lista
  for (const e of [...w.entities]) {
    if (!e.health || !e.alive) continue;
    if (e.fighter?.state === 'dead') continue;
    const self = e.id === owner;
    if (self && spec.selfMult <= 0) continue;
    if (!self && !isHostile(team, e.team) && e.kind !== 'prop') continue;
    const r = spec.radius + (e.body?.radius ?? 0.4);
    const dx = e.t.x - x;
    const dz = e.t.z - z;
    const dy = e.t.y + (e.body?.height ?? 1) * 0.5 - y;
    const d = Math.sqrt(dx * dx + dz * dz + dy * dy * 0.3);
    if (d > r) continue;
    const t = Math.min(1, d / r);
    const mult = (1 + (spec.minMult - 1) * t) * (self ? spec.selfMult : 1);
    const hit: HitSpec = {
      damage: spec.damage,
      dtype: spec.dtype,
      knockback: spec.knockback,
      launch: spec.launch ?? 3,
      knockdown: true,
      hitstun: 30,
      hitstop: 3,
      status: spec.status,
      heavy: true,
      poise: spec.damage * 1.5,
    };
    applyHit(w, ownerEnt, e, hit, {
      mult,
      dirX: dx || 0.01,
      dirZ: dz,
      x: e.t.x,
      y: e.t.y + 1,
      z: e.t.z,
      ignoreInvuln: false,
      source,
    });
  }
}

export interface HazardOpts {
  x: number;
  z: number;
  y?: number;
  owner: EntityId;
  team: Team;
  shape: HazardShape;
  hit: HitSpec;
  delay?: number;
  active: number;
  tickEvery?: number;
  grow?: number;
  height?: number;
  hitsAll?: boolean;
  fx: string;
  slow?: number;
  vx?: number;
  vz?: number;
  telegraph?: TelegraphShape;
  telegraphColor?: number;
  element?: Element;
  pushX?: number;
  pushZ?: number;
  defId?: string;
  /** Origem do dano quando o dono é um jogador. */
  source?: HitSource;
}

export function spawnHazard(w: World, o: HazardOpts): Entity {
  const hz: HazardComp = {
    owner: o.owner,
    shape: o.shape,
    hit: o.hit,
    delay: o.delay ?? 0,
    active: o.active,
    tickEvery: o.tickEvery ?? 0,
    tickAcc: 0,
    hitSet: [],
    grow: o.grow ?? 0,
    height: o.height ?? 99,
    hitsAll: !!o.hitsAll,
    fx: o.fx,
    slow: o.slow ?? 0,
    period: 0,
    phase: 0,
    offset: 0,
    telegraph: o.telegraph,
    element: o.element,
    pushX: o.pushX ?? 0,
    pushZ: o.pushZ ?? 0,
    ...(o.source ? { source: o.source } : {}),
  };
  const t = makeTransform(o.x, o.y ?? 0, o.z);
  t.vx = o.vx ?? 0;
  t.vz = o.vz ?? 0;
  const e = w.add({
    kind: 'hazard',
    team: o.team,
    defId: o.defId ?? o.fx,
    alive: true,
    age: 0,
    t,
    hazard: hz,
  });
  if (o.telegraph && (o.delay ?? 0) > 0) {
    w.emit({
      t: 'telegraph',
      owner: o.owner,
      hazard: e.id,
      shape: o.telegraph,
      x: o.x,
      z: o.z,
      ticks: o.delay ?? 0,
      color: o.telegraphColor ?? 0xff2a2a,
    });
  }
  return e;
}

/** Zona persistente (poça tóxica, fogo, gelo) em círculo. */
export function spawnZone(
  w: World,
  x: number,
  z: number,
  spec: ZoneSpec,
  owner: EntityId,
  team: Team,
  element?: Element,
  source?: HitSource,
): Entity {
  return spawnHazard(w, {
    x,
    z,
    owner,
    team: spec.hitsAll ? 'neutral' : team,
    shape: { k: 'circle', r: spec.radius },
    hit: spec.hit,
    active: secToTicks(spec.durationS),
    tickEvery: secToTicks(spec.tickS),
    fx: spec.fx,
    hitsAll: spec.hitsAll,
    slow: spec.slow,
    height: 0.6,
    element,
    source,
  });
}
