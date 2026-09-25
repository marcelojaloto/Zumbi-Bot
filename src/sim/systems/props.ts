import { makeHealth, makeTransform, type Entity } from '../Entity';
import type { PropPlacement } from '../../data/types';
import type { World } from '../World';

const PROP_HP: Record<PropPlacement['kind'], number> = {
  crate: 20,
  barrel: 25,
  explosiveBarrel: 12,
  bin: 18,
  tombstone: 35,
  atm: 40,
  car: 80,
  weaponCrate: 30,
};

const PROP_SIZE: Record<PropPlacement['kind'], [number, number]> = {
  crate: [0.45, 0.9],
  barrel: [0.4, 1.0],
  explosiveBarrel: [0.4, 1.0],
  bin: [0.4, 1.0],
  tombstone: [0.45, 1.1],
  atm: [0.5, 1.8],
  car: [1.1, 1.4],
  weaponCrate: [0.55, 0.8],
};

/** Objetos quebráveis do cenário. */
export function spawnProp(w: World, p: PropPlacement): Entity {
  const [r, h] = PROP_SIZE[p.kind];
  return w.add({
    kind: 'prop',
    team: 'neutral',
    defId: p.kind,
    alive: true,
    age: 0,
    t: makeTransform(p.x, 0, p.z, 1),
    body: { radius: r, height: h, mass: 99, grounded: true, gravityScale: 0, anchored: true },
    health: makeHealth(PROP_HP[p.kind]),
    prop: { kind: p.kind, drop: p.drop },
  });
}
