import { secToTicks } from '../../core/time';
import { PLAYER } from '../../data/balance';
import { getItem, ITEMS } from '../../data/items';
import { MELEE_WEAPONS } from '../../data/melee';
import { FIREARMS, ammoCap } from '../../data/weapons';
import type { AmmoType, ItemId, WeaponId } from '../../data/types';
import { makeTransform, type Entity } from '../Entity';
import { characterDef } from '../defs';
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
      const d2 = dx * dx + dz * dz;
      // quem soltou a arma branca só pega de volta depois de se afastar dela
      if (pc.owner === pl.id) {
        if (d2 > 1.3 * 1.3) pc.owner = undefined;
        continue;
      }
      if (d2 > 0.75 * 0.75 || pl.t.y > 1.5) continue;
      if (applyItem(w, pl, pc.item)) {
        w.emit({ t: 'pickup', player: pl.id, item: pc.item, x: pk.t.x, y: pk.t.y + 0.5, z: pk.t.z });
        w.remove(pk.id);
        break;
      }
    }
  }
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
  // quem não sabe atirar (Maga, Prodígio) nunca fica com arma de fogo na mão
  if (!characterDef(e).arms.guns) return;
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
    case 'firearm': {
      // quem não sabe atirar (a maga) deixa a arma no chão para os colegas
      if (!characterDef(e).arms.guns) return false;
      if (!p.guns.includes(ef.id)) {
        giveFirearm(w, e, ef.id);
        return true;
      }
      // arma que já tem: vale como munição (sem trocar o que está na mão); cheia, fica no chão
      const d = FIREARMS[ef.id];
      if (d.reserveMax === 'infinite') return false;
      return giveAmmo(e, d.ammo, d.mag);
    }
    case 'melee': {
      const max = MELEE_WEAPONS[ef.id].durability;
      // a mesma arma inteira na mão: deixa no chão
      if (p.melee?.id === ef.id && p.melee.durability >= max) return false;
      if (p.melee && p.melee.id !== ef.id) {
        // solta a arma atual no chão (quem soltou só pega de volta depois de se afastar)
        const drop = spawnPickup(w, `melee_${p.melee.id}`, e.t.x - e.t.facing * 0.6, e.t.z);
        if (drop) drop.pickup!.owner = e.id;
      }
      p.melee = { id: ef.id, durability: max };
      w.emit({ t: 'weaponSwap', id: e.id, mode: p.mode, weapon: ef.id });
      return true;
    }
    case 'scrap':
      p.scrap += ef.amount;
      return true;
    case 'cosmetic':
      grantCosmeticBag(w, e, ef.rarity);
      return true;
  }
}
