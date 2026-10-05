import { secToTicks } from '../../core/time';
import { REVIVE } from '../../data/revive';
import { DEFENSE } from '../../data/workshop';
import type { Entity } from '../Entity';
import type { World } from '../World';
import { hasDefense } from '../perks';
import { spawnHazard } from './effects';

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

/** Caiu carregando o item de reviver: fica no chão um instante e levanta ali mesmo (sem gastar vida). */
export function startRevive(w: World, e: Entity): boolean {
  const p = e.player!;
  if (!p.revive) return false;
  p.revive = false;
  p.reviveUsed = true;
  p.reviving = REVIVE.delayTicks;
  p.combo = 0;
  p.comboTimer = 0;
  w.emit({ t: 'revive', player: e.id, phase: 'down', x: e.t.x, y: e.t.y, z: e.t.z });
  return true;
}

/** Caído com o item de reviver: conta o tempo e levanta com metade da vida, invencível e empurrando quem está perto. */
export function reviveTick(w: World, e: Entity): void {
  const p = e.player!;
  if (--p.reviving > 0) return;
  const h = e.health!;
  const fi = e.fighter!;
  h.hp = Math.round(h.max * REVIVE.hpFrac);
  h.invuln = REVIVE.invuln;
  e.statuses = [];
  fi.state = 'getup';
  fi.st = 0;
  fi.moveId = null;
  fi.hitstun = 0;
  fi.juggle = 0;
  e.deadTicks = undefined;
  p.mana = Math.max(p.mana, p.manaMax * 0.5);
  w.emit({ t: 'revive', player: e.id, phase: 'up', x: e.t.x, y: e.t.y, z: e.t.z });
  // onda de luz que afasta quem estava em volta
  spawnHazard(w, {
    x: e.t.x,
    z: e.t.z,
    owner: e.id,
    team: e.team,
    shape: { k: 'ring', r: 0.6, width: 0.9 },
    hit: { damage: 12, dtype: 'holy', knockback: 8, launch: 4, knockdown: true, hitstun: 24, hitstop: 3 },
    active: 20,
    grow: 0.12,
    fx: 'heal',
    height: 2.2,
  });
}
