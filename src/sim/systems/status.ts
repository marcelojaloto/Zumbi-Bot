import { secToTicks } from '../../core/time';
import { STATUS } from '../../data/statusEffects';
import type { StatusApply, StatusId } from '../../data/types';
import type { Entity, EntityId } from '../Entity';
import type { World } from '../World';
import { applyDot, applyHeal, killEntity } from '../combat/applyHit';
import { getStatusImmune, isBossEntity, statusDurationMult } from '../defs';

/** Aplica um status respeitando imunidades, bosses, empilhamento e troca de time. */
export function applyStatus(w: World, e: Entity, s: StatusApply, src: EntityId): boolean {
  if (!e.health || !e.fighter || e.fighter.state === 'dead') return false;
  if (s.chance !== undefined && s.chance < 1 && !w.rng.chance(s.chance)) return false;
  let id: StatusId = s.id;
  const def0 = STATUS[id];
  const boss = isBossEntity(e);
  if (boss && def0.bossDurationMult === 0) {
    if (!def0.bossFallback) return false;
    id = def0.bossFallback;
  }
  if (getStatusImmune(e).includes(id)) return false;
  const def = STATUS[id];
  // troca de time: só inimigos comuns da família certa
  if (def.teamSwitch) {
    if (e.kind !== 'enemy' || e.team !== 'enemies') return false;
  }
  let dur = secToTicks((id === s.id ? s.durationS : undefined) ?? def.durationS);
  if (boss) dur = Math.round(dur * def.bossDurationMult * statusDurationMult(e));
  if (e.kind === 'player' && (id === 'freeze' || id === 'stun')) dur = Math.round(dur * 0.7);
  if (dur <= 0) return false;
  e.statuses ??= [];
  const cur = e.statuses.find((x) => x.id === id);
  const addStacks = s.stacks ?? 1;
  if (cur) {
    switch (def.stacking) {
      case 'ignore':
        return false;
      case 'refresh':
        cur.ticks = Math.max(cur.ticks, dur);
        break;
      case 'extend':
        cur.ticks += dur;
        break;
      case 'stack':
        cur.stacks = Math.min(def.maxStacks, cur.stacks + addStacks);
        cur.ticks = Math.max(cur.ticks, dur);
        break;
    }
    cur.src = src;
  } else {
    e.statuses.push({ id, ticks: dur, stacks: Math.min(def.maxStacks, addStacks), src, acc: 0 });
    w.emit({ t: 'status', id: e.id, status: id, on: true });
    onStatusAdded(w, e, id, src, dur);
  }
  const inst = e.statuses.find((x) => x.id === id)!;
  if (def.onMaxStacks && inst.stacks >= def.maxStacks) {
    removeStatus(w, e, id);
    applyStatus(w, e, { id: def.onMaxStacks }, src);
    w.emit({ t: 'interaction', id: e.id, kind: 'freeze' });
  }
  return true;
}

function onStatusAdded(w: World, e: Entity, id: StatusId, src: EntityId, dur: number): void {
  const fi = e.fighter!;
  if (id === 'freeze' || id === 'stun') {
    if (fi.state !== 'dead' && fi.state !== 'knockdown' && fi.state !== 'down') {
      fi.state = id === 'freeze' ? 'frozen' : 'stunned';
      fi.st = 0;
      fi.moveId = null;
      e.t.vx = 0;
      e.t.vz = 0;
    }
    if (e.player) e.player.mash = 0;
  }
  if (id === 'hacked' || id === 'raised') {
    e.team = 'players';
    e.control = { ticks: dur, by: src, kind: id };
    if (e.ai) {
      e.ai.token = null;
      e.ai.target = 0;
      e.ai.mode = 'approach';
    }
    w.emit({ t: 'control', id: e.id, kind: id, on: true });
  }
  if (id === 'burn') removeStatus(w, e, 'wet');
  if (id === 'wet') removeStatus(w, e, 'burn');
}

export function removeStatus(w: World, e: Entity, id: StatusId): void {
  if (!e.statuses) return;
  const i = e.statuses.findIndex((s) => s.id === id);
  if (i < 0) return;
  e.statuses.splice(i, 1);
  w.emit({ t: 'status', id: e.id, status: id, on: false });
  const fi = e.fighter;
  if (fi && ((id === 'freeze' && fi.state === 'frozen') || (id === 'stun' && fi.state === 'stunned'))) {
    fi.state = 'idle';
    fi.st = 0;
  }
  if ((id === 'hacked' || id === 'raised') && e.control) {
    e.team = 'enemies';
    e.control = undefined;
    if (e.ai) {
      e.ai.token = null;
      e.ai.target = 0;
    }
    w.emit({ t: 'control', id: e.id, kind: id, on: false });
    // zumbis erguidos pela necromancia desmoronam ao fim do controle
    if (id === 'raised' && e.health && e.fighter?.state !== 'dead') {
      e.health.hp = 0;
      killEntity(w, e, 0);
    }
  }
}

export function statusSystem(w: World): void {
  for (const e of w.entities) {
    if (!e.statuses || e.statuses.length === 0) continue;
    if (e.fighter?.state === 'dead') {
      e.statuses.length = 0;
      continue;
    }
    for (let i = e.statuses.length - 1; i >= 0; i--) {
      const s = e.statuses[i];
      if (!s) continue;
      const def = STATUS[s.id];
      s.ticks--;
      if (s.id === 'freeze' && e.player && e.player.mash > 0) {
        s.ticks -= e.player.mash * 6;
        e.player.mash = 0;
      }
      if (def.tick) {
        s.acc++;
        const every = secToTicks(def.tick.everyS);
        if (s.acc >= every) {
          s.acc = 0;
          const dmg = def.tick.damage * (def.tick.perStack ? s.stacks : 1);
          applyDot(w, e, dmg, def.tick.dtype, s.src);
        }
      }
      if (def.heal) {
        s.acc++;
        if (s.acc >= 60) {
          s.acc = 0;
          applyHeal(w, e, def.heal);
        }
      }
      if (e.control && (s.id === 'hacked' || s.id === 'raised')) e.control.ticks = s.ticks;
      if (s.ticks <= 0) removeStatus(w, e, s.id);
      if (isDead(e)) break;
    }
  }
}

export function moveMultiplier(e: Entity): number {
  let m = 1;
  if (!e.statuses) return m;
  for (const s of e.statuses) {
    const mods = STATUS[s.id].mods;
    if (!mods) continue;
    if (mods.moveMult) m *= mods.moveMult;
    if (mods.perStackMoveMult) m *= Math.pow(mods.perStackMoveMult, s.stacks);
    if (mods.canMove === false) m = 0;
  }
  if (isBossEntity(e)) m = Math.max(m, 0.7);
  return m;
}

export function canMove(e: Entity): boolean {
  return !e.statuses?.some((s) => STATUS[s.id].mods?.canMove === false);
}

export function canAct(e: Entity): boolean {
  return !e.statuses?.some((s) => STATUS[s.id].mods?.canAct === false);
}

export function regenBlocked(e: Entity): boolean {
  return !!e.statuses?.some((s) => STATUS[s.id].mods?.regenBlocked);
}

function isDead(e: Entity): boolean {
  return e.fighter?.state === 'dead';
}
