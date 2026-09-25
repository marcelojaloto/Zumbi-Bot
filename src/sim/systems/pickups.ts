import { secToTicks } from '../../core/time';
import { PLAYER } from '../../data/balance';
import { getItem, ITEMS } from '../../data/items';
import { MELEE_WEAPONS } from '../../data/melee';
import { FIREARMS, ammoCap } from '../../data/weapons';
import type { AmmoType, ItemId, WeaponId } from '../../data/types';
import { makeTransform, type Entity } from '../Entity';
import { Btn, pressed } from '../InputFrame';
import type { World } from '../World';
import { applyHeal } from '../combat/applyHit';
import { grantCosmeticBag } from './loot';

export function spawnPickup(w: World, item: ItemId, x: number, z: number, pop = true): Entity | undefined {
  const def = ITEMS[item];
  if (!def) return undefined;
  const t = makeTransform(x, pop ? 0.6 : 0, Math.max(w.zBand[0], Math.min(w.zBand[1], z)));
  if (pop) {
    t.vy = 4.5;
    t.vx = w.rng.range(-1.2, 1.2);
    t.vz = w.rng.range(-0.6, 0.6);
  }
  return w.add({
    kind: 'pickup',
    team: 'neutral',
    defId: item,
    alive: true,
    age: 0,
    t,
    body: { radius: 0.3, height: 0.4, mass: 0.2, grounded: !pop, gravityScale: 1 },
    pickup: {
      item,
      auto: def.auto,
      despawn: def.despawnS ? secToTicks(def.despawnS) : -1,
      grace: pop ? 20 : 0,
    },
  });
}

/** Pickup manual mais próximo (armas no chão) ao alcance do jogador. */
export function nearbyManualPickup(w: World, e: Entity): Entity | undefined {
  let best: Entity | undefined;
  let bestD = 1.0 * 1.0;
  for (const p of w.entities) {
    if (p.kind !== 'pickup' || !p.pickup || p.pickup.auto || p.pickup.grace > 0) continue;
    const dx = p.t.x - e.t.x;
    const dz = (p.t.z - e.t.z) * 1.3;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

export function pickupSystem(w: World): void {
  const players = w.activePlayers();
  for (const pk of [...w.entities]) {
    if (pk.kind !== 'pickup' || !pk.pickup || !pk.alive) continue;
    const pc = pk.pickup;
    if (pc.grace > 0) pc.grace--;
    if (pc.despawn > 0) {
      pc.despawn--;
      if (pc.despawn === 0) {
        w.remove(pk.id);
        continue;
      }
    }
    if (!pc.auto || pc.grace > 0) continue;
    for (const pl of players) {
      const dx = pl.t.x - pk.t.x;
      const dz = pl.t.z - pk.t.z;
      if (dx * dx + dz * dz > 0.75 * 0.75 || pl.t.y > 1.5) continue;
      if (applyItem(w, pl, pc.item)) {
        w.emit({ t: 'pickup', player: pl.id, item: pc.item, x: pk.t.x, y: pk.t.y + 0.5, z: pk.t.z });
        w.remove(pk.id);
        break;
      }
    }
  }
}

/** Tenta pegar uma arma no chão com J. Retorna true se consumiu o comando. */
export function tryManualPickup(w: World, e: Entity): boolean {
  const p = e.player!;
  if (!pressed(p.buttons, p.prevButtons, Btn.Punch)) return false;
  const pk = nearbyManualPickup(w, e);
  if (!pk) return false;
  const item = pk.pickup!.item;
  if (applyItem(w, e, item)) {
    w.emit({ t: 'pickup', player: e.id, item, x: pk.t.x, y: pk.t.y + 0.5, z: pk.t.z });
    w.remove(pk.id);
    return true;
  }
  return false;
}

function currentAmmoType(e: Entity): AmmoType | null {
  const p = e.player!;
  const gun = p.guns[p.gunIdx];
  if (gun && gun !== 'pistol') return FIREARMS[gun].ammo;
  const other = p.guns.find((g) => g !== 'pistol');
  return other ? FIREARMS[other].ammo : null;
}

export function giveAmmo(e: Entity, t: AmmoType, amount: number): boolean {
  const p = e.player!;
  const cap = ammoCap(t);
  if (p.ammo[t] >= cap) return false;
  p.ammo[t] = Math.min(cap, p.ammo[t] + amount);
  return true;
}

export function giveFirearm(w: World, e: Entity, id: WeaponId): void {
  const p = e.player!;
  const def = FIREARMS[id];
  if (!p.guns.includes(id)) {
    p.guns.push(id);
    p.guns.sort((a, b) => order(a) - order(b));
    w.emit({ t: 'unlock', player: e.id, kind: 'gun', id });
  }
  p.ammoMag[id] = def.mag;
  if (def.reserveMax !== 'infinite') giveAmmo(e, def.ammo, def.mag * 2);
  p.gunIdx = p.guns.indexOf(id);
  p.mode = 'gun';
  w.emit({ t: 'weaponSwap', id: e.id, mode: 'gun', weapon: id });
}

function order(id: WeaponId): number {
  return ['pistol', 'shotgun', 'smg', 'rifle', 'sniper', 'mg', 'gl'].indexOf(id);
}

/** Aplica o efeito de um item. Retorna false se não teve efeito (ex.: vida cheia). */
export function applyItem(w: World, e: Entity, item: ItemId): boolean {
  const def = getItem(item);
  const p = e.player!;
  const h = e.health!;
  const ef = def.effect;
  switch (ef.k) {
    case 'heal':
      if (h.hp >= h.max) return false;
      applyHeal(w, e, ef.amount);
      return true;
    case 'mana':
      if (p.mana >= p.manaMax) return false;
      p.mana = Math.min(p.manaMax, p.mana + ef.amount);
      return true;
    case 'shield':
      if (h.shield >= PLAYER.shieldMax) return false;
      h.shield = Math.min(PLAYER.shieldMax, h.shield + ef.amount);
      return true;
    case 'ammo': {
      if (ef.ammo === 'current') {
        const t = currentAmmoType(e);
        if (!t) {
          p.mana = Math.min(p.manaMax, p.mana + 15);
          return true;
        }
        const gun = Object.values(FIREARMS).find((g) => g.ammo === t)!;
        return giveAmmo(
          e,
          t,
          Math.max(4, Math.round(gun.mag * (t === 'sniper' || t === 'grenade' ? 0.6 : 1))),
        );
      }
      return giveAmmo(e, ef.ammo, ef.amount);
    }
    case 'power':
      p.powers[ef.power] = secToTicks(ef.s);
      w.emit({ t: 'power', player: e.id, power: ef.power, on: true });
      return true;
    case 'firearm':
      giveFirearm(w, e, ef.id);
      return true;
    case 'melee':
      if (p.melee) {
        // solta a arma atual no chão
        spawnPickup(w, `melee_${p.melee.id}`, e.t.x - e.t.facing * 0.6, e.t.z);
      }
      p.melee = { id: ef.id, durability: MELEE_WEAPONS[ef.id].durability };
      w.emit({ t: 'weaponSwap', id: e.id, mode: p.mode, weapon: ef.id });
      return true;
    case 'scrap':
      p.scrap += ef.amount;
      return true;
    case 'cosmetic':
      grantCosmeticBag(w, e, ef.rarity);
      return true;
  }
}
