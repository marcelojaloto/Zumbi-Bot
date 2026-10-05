import { secToTicks } from '../../core/time';
import { DEFENSE } from '../../data/workshop';
import type { Entity } from '../Entity';
import type { World } from '../World';
import { hasDefense } from '../perks';

/** Estados em que a Guarda funciona: em pé, sem atacar, sem estar caído ou atordoado. */
const GUARD_STATES = new Set(['idle', 'walk', 'run', 'land']);

/** Contra-golpe da Oficina: depois de uma esquiva ou de um bloqueio, dano dobrado por um instante. */
export function counterReady(w: World, e: Entity): void {
  if (!hasDefense(e, 'counter')) return;
  const p = e.player!;
  const was = p.powers.doubleDamage > 0;
  p.powers.doubleDamage = Math.max(p.powers.doubleDamage, secToTicks(DEFENSE.counter.s));
  if (!was) w.emit({ t: 'power', player: e.id, power: 'doubleDamage', on: true });
}

/**
 * Multiplicador do dano que um jogador recebe pelas defesas da Oficina (Couraça) e se a Guarda bloqueou o golpe: de
 * frente, em pé e sem atacar, às vezes ele bloqueia golpes e tiros (dano reduzido e sem cair). Dano contínuo
 * (zonas, venenos) não se bloqueia.
 */
export function incomingDefense(
  w: World,
  src: Entity | undefined,
  dst: Entity,
  o: { x?: number; dirX?: number; continuous: boolean },
): { mult: number; blocked: boolean } {
  if (!dst.player) return { mult: 1, blocked: false };
  let mult = hasDefense(dst, 'armor') ? DEFENSE.armor.mult : 1;
  let blocked = false;
  const fi = dst.fighter;
  // de frente: o golpe empurra para trás de quem apanha (direção do golpe contra o lado para onde ele olha)
  const from = o.x ?? src?.t.x;
  const frontal =
    o.dirX !== undefined && Math.abs(o.dirX) > 0.05
      ? o.dirX * dst.t.facing < 0
      : from !== undefined && (from - dst.t.x) * dst.t.facing > -0.1;
  if (
    !o.continuous &&
    frontal &&
    fi &&
    GUARD_STATES.has(fi.state) &&
    dst.body?.grounded &&
    hasDefense(dst, 'guard') &&
    w.rng.chance(DEFENSE.guard.chance)
  ) {
    blocked = true;
    mult *= DEFENSE.guard.mult;
  }
  return { mult, blocked };
}

/** Golpe bloqueado pela Guarda: não cai nem fica atordoado, só recua um pouco; e arma o contra-golpe. */
export function onGuardBlock(w: World, dst: Entity, dirX: number): void {
  dst.t.vx = Math.sign(dirX || -dst.t.facing) * 1.5;
  dst.health!.invuln = Math.max(dst.health!.invuln, 12);
  w.emit({ t: 'guard', player: dst.id, x: dst.t.x, y: dst.t.y + 1.3, z: dst.t.z });
  counterReady(w, dst);
}
