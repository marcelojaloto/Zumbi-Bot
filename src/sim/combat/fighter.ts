import { PLAYER } from '../../data/balance';
import { MELEE_WEAPONS, MOVES } from '../../data/melee';
import type { MeleeMoveDef } from '../../data/types';
import { isCharacter, isHostile, type Entity } from '../Entity';
import { Btn, pressed } from '../InputFrame';
import type { World } from '../World';
import { applyHit } from './applyHit';
import { isAoe, meleeHits } from './hitbox';
import { tryManualPickup } from '../systems/pickups';
import { LOCOMOTION } from '../systems/playerControl';

const FRICTION = 16;

export function getMoveDef(id: string | null): MeleeMoveDef | undefined {
  return id ? MOVES[id] : undefined;
}

/** Inicia um golpe corpo a corpo. */
export function startMove(w: World, e: Entity, moveId: string): boolean {
  const m = MOVES[moveId];
  const fi = e.fighter;
  if (!m || !fi) return false;
  const p = e.player;
  if (m.manaCost && p) {
    if (p.mana >= m.manaCost) {
      p.mana -= m.manaCost;
      p.manaDelay = 90;
    } else if (m.hpCost && e.health!.hp > m.hpCost + 1) {
      e.health!.hp -= m.hpCost;
    } else {
      return false;
    }
  }
  fi.state = 'attack';
  fi.st = 0;
  fi.moveId = moveId;
  fi.hitSet.length = 0;
  fi.buffer = null;
  fi.bufferTicks = 0;
  fi.superArmor = !!m.superArmor;
  w.emit({ t: 'swing', id: e.id, move: moveId, heavy: !!m.hit.heavy });
  return true;
}

/** Entrada de golpes do jogador (J soco / K chute / U especial). */
export function playerMeleeInput(w: World, e: Entity): void {
  const p = e.player!;
  const fi = e.fighter!;
  const jP = pressed(p.buttons, p.prevButtons, Btn.Punch);
  const kP = pressed(p.buttons, p.prevButtons, Btn.Kick);
  const sP = pressed(p.buttons, p.prevButtons, Btn.Special) || (jP && kP);
  const grounded = e.body!.grounded;

  if (fi.state === 'attack') {
    if (jP || kP) {
      fi.buffer = jP ? 'J' : 'K';
      fi.bufferTicks = PLAYER.inputBufferTicks;
    }
    return;
  }
  if (!LOCOMOTION.has(fi.state)) return;

  if (sP && grounded) {
    startMove(w, e, 'giroTurbo');
    return;
  }
  if (jP && tryManualPickup(w, e)) return;

  if (!grounded) {
    if (!fi.airUsed && (jP || kP)) {
      fi.airUsed = true;
      startMove(w, e, jP ? 'airPunch' : 'airKick');
    }
    return;
  }
  if (jP) {
    const first = p.melee ? MELEE_WEAPONS[p.melee.id].combo[0]! : 'jab';
    startMove(w, e, first);
  } else if (kP) {
    startMove(w, e, p.running && Math.abs(e.t.vx) > 3 ? 'flyKick' : 'kick');
  }
}

/**
 * Sistema de lutadores: avança golpes e reações (hurt, knockdown, down, getup, stagger)
 * de todos os personagens. A locomoção fica com o controle do jogador / IA.
 */
export function fighterSystem(w: World): void {
  for (const e of w.entities) {
    const fi = e.fighter;
    if (!fi || !e.alive) continue;
    if (fi.hitstop > 0) {
      fi.hitstop--;
      continue;
    }
    fi.st++;
    if (e.health) {
      if (e.health.invuln > 0) e.health.invuln--;
      e.health.sinceHit++;
      if (e.health.poiseTimer > 0) {
        e.health.poiseTimer--;
        if (e.health.poiseTimer === 0) e.health.poise = e.health.poiseMax;
      }
    }
    if (fi.bufferTicks > 0 && --fi.bufferTicks === 0) fi.buffer = null;

    switch (fi.state) {
      case 'attack':
        updateAttack(w, e);
        break;
      case 'hurt':
        friction(e);
        if (--fi.hitstun <= 0) toIdle(e);
        break;
      case 'knockdown':
        if (e.body!.grounded && fi.st > 2) {
          fi.state = 'down';
          fi.st = 0;
          fi.juggle = 0;
          e.body!.low = true;
          w.emit({ t: 'land', id: e.id, heavy: true });
        }
        break;
      case 'down':
        friction(e);
        if (fi.st >= (e.player ? 36 : 50)) {
          fi.state = 'getup';
          fi.st = 0;
        }
        break;
      case 'getup':
        friction(e);
        if (fi.st >= 20) {
          e.body!.low = false;
          if (e.player && e.health) e.health.invuln = Math.max(e.health.invuln, PLAYER.getupInvuln);
          if (e.health && e.health.invuln < 10 && !e.player) e.health.invuln = 10;
          toIdle(e);
        }
        break;
      case 'stagger':
        friction(e);
        if (fi.st >= 90) toIdle(e);
        break;
      case 'land':
        friction(e);
        if (!e.player && fi.st >= 4) toIdle(e);
        break;
      case 'cast':
        friction(e);
        break;
      case 'dead':
        friction(e);
        e.deadTicks = (e.deadTicks ?? 0) + 1;
        break;
      case 'frozen':
      case 'stunned':
        friction(e);
        break;
      default:
        break;
    }
    if (e.body?.grounded && fi.state !== 'knockdown') {
      fi.juggle = 0;
      fi.airUsed = false;
    }
  }
}

function toIdle(e: Entity): void {
  const fi = e.fighter!;
  fi.state = e.body && !e.body.grounded ? 'fall' : 'idle';
  fi.st = 0;
  fi.moveId = null;
  fi.superArmor = false;
}

function friction(e: Entity): void {
  if (!e.body?.grounded) return;
  const t = e.t;
  const f = FRICTION / 60;
  const sp = Math.hypot(t.vx, t.vz);
  if (sp <= f) {
    t.vx = 0;
    t.vz = 0;
  } else {
    const k = (sp - f) / sp;
    t.vx *= k;
    t.vz *= k;
  }
}

function updateAttack(w: World, e: Entity): void {
  const fi = e.fighter!;
  const m = getMoveDef(fi.moveId);
  if (!m) {
    // ataques contínuos da IA (rajadas, lança-chamas) não usam golpe: a IA encerra
    if (!e.ai) toIdle(e);
    return;
  }
  const st = fi.st;
  const activeStart = m.startup;
  const activeEnd = m.startup + m.active;
  const total = activeEnd + m.recovery;

  // movimento durante o golpe
  if (m.lunge && st <= activeEnd) {
    e.t.vx = e.t.facing * m.lunge;
    if (!m.air) e.t.vz *= 0.8;
  } else if (!m.air) {
    friction(e);
  }
  if (e.player && st <= activeStart) laneAssist(w, e, m);

  if (m.invulnActive && e.health) {
    if (st >= activeStart && st < activeEnd) e.health.invuln = Math.max(e.health.invuln, 2);
  }

  if (st >= activeStart && st < activeEnd) {
    if (m.rehitEvery && (st - activeStart) % m.rehitEvery === 0) fi.hitSet.length = 0;
    resolveMeleeHits(w, e, m);
  }

  // aéreo termina ao pousar
  if (m.air && e.body!.grounded && st > 2) {
    fi.state = 'land';
    fi.st = 0;
    fi.moveId = null;
    return;
  }

  // cancelamento em combo
  if (e.player && fi.buffer && m.next) {
    const next = m.next[fi.buffer];
    const can = st >= (m.cancelFrom ?? total) && (fi.hitSet.length > 0 || st >= activeEnd);
    if (next && can) {
      startMove(w, e, next);
      return;
    }
  }
  if (st >= total) {
    // K depois de uma sequência de socos sem "next": chute normal
    if (e.player && fi.buffer) {
      const b = fi.buffer;
      toIdle(e);
      if (b === 'K') startMove(w, e, 'kick');
      else startMove(w, e, e.player.melee ? MELEE_WEAPONS[e.player.melee.id].combo[0]! : 'jab');
      return;
    }
    toIdle(e);
  }
}

/** Assistência de plano: puxa levemente em Z em direção ao inimigo à frente. */
function laneAssist(w: World, e: Entity, m: MeleeMoveDef): void {
  if (isAoe(m.hitbox)) return;
  const reach = m.hitbox.x1 + 0.5;
  let best: Entity | undefined;
  let bd = Infinity;
  for (const o of w.entities) {
    if (!isCharacter(o) || !isHostile(e.team, o.team) || o.fighter?.state === 'dead') continue;
    const dx = (o.t.x - e.t.x) * e.t.facing;
    const dz = o.t.z - e.t.z;
    if (dx < 0 || dx > reach || Math.abs(dz) > 0.9) continue;
    const d = dx + Math.abs(dz);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  if (!best) return;
  const step = 0.35 / Math.max(1, m.startup);
  const dz = best.t.z - e.t.z;
  e.t.z += Math.sign(dz) * Math.min(Math.abs(dz), step);
}

/** Resolve acertos de um golpe ativo contra todos os alvos hostis. */
export function resolveMeleeHits(w: World, e: Entity, m: MeleeMoveDef): void {
  const fi = e.fighter!;
  const scale = e.scale ?? 1;
  const a = { x: e.t.x, y: e.t.y, z: e.t.z, facing: e.t.facing };
  for (const o of w.entities) {
    if (o === e || !o.health || !o.alive) continue;
    if (o.kind !== 'prop' && !isCharacter(o)) continue;
    if (o.kind !== 'prop' && !isHostile(e.team, o.team)) continue;
    if (o.kind === 'prop' && e.kind !== 'player' && e.team !== 'players') continue;
    if (o.fighter?.state === 'dead') continue;
    if (o.body?.low && o.fighter?.state === 'down') continue;
    if (fi.hitSet.includes(o.id)) continue;
    if (o.fighter && o.fighter.juggle >= PLAYER.juggleCap && !o.body!.grounded) continue;
    const r = o.body?.radius ?? 0.4;
    const hgt = o.body?.height ?? 1;
    if (!meleeHits(a, m.hitbox, { x: o.t.x, y: o.t.y, z: o.t.z, radius: r, height: hgt }, scale)) continue;
    fi.hitSet.push(o.id);
    const dmg = applyHit(w, e, o, m.hit, { dirX: e.t.facing, dirZ: 0, element: undefined });
    if (dmg > 0 && e.player) onPlayerMeleeConnect(w, e, m);
    if (m.hit.heavy && dmg > 0) w.emit({ t: 'shake', trauma: 0.25 });
  }
}

function onPlayerMeleeConnect(w: World, e: Entity, _m: MeleeMoveDef): void {
  const p = e.player!;
  // durabilidade da arma branca
  if (p.melee && _m.id.startsWith(p.melee.id)) {
    p.melee.durability--;
    if (p.melee.durability <= 0) {
      w.emit({ t: 'meleeBreak', id: e.id, melee: p.melee.id });
      p.melee = null;
    }
  }
}
