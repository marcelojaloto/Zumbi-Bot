import { PLAYER, comboMultiplier, COMBO_TIMEOUT_TICKS, levelDamageMult } from '../../data/balance';
import type { DamageType, Element, HitSpec } from '../../data/types';
import type { Entity, EntityId } from '../Entity';
import type { World } from '../World';
import { computeDamage } from './damage';
import { applyStatus, removeStatus } from '../systems/status';
import { getPhaseResist, getResist, isBossEntity } from '../defs';
import { onEntityKilled } from '../systems/deaths';

export interface HitOpts {
  crit?: boolean;
  critMult?: number;
  falloff?: number;
  /** Direção do empurrão no plano XZ (normalizada). Padrão: do atacante para o alvo. */
  dirX?: number;
  dirZ?: number;
  /** Ponto de impacto (para efeitos). */
  x?: number;
  y?: number;
  z?: number;
  element?: Element;
  /** Multiplicador extra (ex.: explosão na borda). */
  mult?: number;
  /** Ignora invulnerabilidade de hurt (DoT, zonas). */
  ignoreInvuln?: boolean;
  /** Não gera reação física (DoT). */
  noReact?: boolean;
  /** Não conta combo (DoT). */
  noCombo?: boolean;
}

function attackerMults(w: World, src: Entity | undefined) {
  if (!src) return { levelMult: 1, powerDouble: false, diffMult: 1, mapMult: 1 };
  if (src.player) {
    return {
      levelMult: levelDamageMult(src.player.level),
      powerDouble: src.player.powers.doubleDamage > 0,
      diffMult: 1,
      mapMult: 1,
    };
  }
  // inimigo controlado pelo jogador bate com força "normal"
  if (src.team === 'players') return { levelMult: 1, powerDouble: false, diffMult: 1, mapMult: 1 };
  return { levelMult: 1, powerDouble: false, diffMult: 1, mapMult: src.dmgMult ?? 1 };
}

/** Aplica um golpe/projétil/zona em `dst`. Retorna o dano causado ao HP+escudo. */
export function applyHit(
  w: World,
  src: Entity | undefined,
  dst: Entity,
  hit: HitSpec,
  opts: HitOpts = {},
): number {
  const h = dst.health;
  const fi = dst.fighter;
  if (!h || !dst.alive) return 0;
  if (fi?.state === 'dead') return 0;
  if (h.invuln > 0 && !opts.ignoreInvuln) return 0;
  if (dst.player && (dst.player.powers.invulnerable > 0 || dst.player.respawn > 0)) return 0;
  if (dst.boss && (dst.boss.transitioning || dst.boss.intro > 0 || dst.boss.defeated)) {
    w.emit({
      t: 'hit',
      src: src?.id ?? 0,
      dst: dst.id,
      amount: 0,
      dtype: hit.dtype,
      crit: false,
      x: opts.x ?? dst.t.x,
      y: opts.y ?? dst.t.y + 1.5,
      z: opts.z ?? dst.t.z,
      heavy: false,
      shield: false,
      blocked: true,
    });
    return 0;
  }

  const res = computeDamage({
    base: hit.damage * (opts.mult ?? 1),
    dtype: hit.dtype,
    falloffMult: opts.falloff,
    crit: opts.crit,
    critMult: opts.critMult,
    attacker: attackerMults(w, src),
    target: {
      resist: getResist(dst),
      phaseResist: getPhaseResist(dst),
      statuses: dst.statuses,
      shield: h.shield,
      vulnMult: dst.boss ? dst.boss.vulnMult * (dst.boss.staggered > 0 ? 1.3 : 1) : 1,
      hpFrac: h.hp / h.max,
      isBoss: isBossEntity(dst),
    },
  });

  if (res.total <= 0) return 0;

  // modo deus (debug)
  const god = dst.player?.god;
  h.shield -= res.toShield;
  if (!god) h.hp -= res.amount;
  h.lastHitBy = src?.id ?? 0;
  h.lastHitType = hit.dtype;
  h.sinceHit = 0;

  const x = opts.x ?? dst.t.x;
  const y = opts.y ?? dst.t.y + (dst.body?.height ?? 1.6) * 0.65;
  const z = opts.z ?? dst.t.z;
  w.emit({
    t: 'hit',
    src: src?.id ?? 0,
    dst: dst.id,
    amount: res.total,
    dtype: hit.dtype,
    crit: !!opts.crit,
    x,
    y,
    z,
    heavy: !!hit.heavy,
    shield: res.toShield > 0 && res.amount === 0,
  });

  for (const id of res.removeStatuses) removeStatus(w, dst, id);
  for (const k of res.interactions) {
    if (k === 'conduct' || k === 'steam' || k === 'shatter' || k === 'spread')
      w.emit({ t: 'interaction', id: dst.id, kind: k });
    if (k === 'spread') spreadBurn(w, dst, src);
  }
  for (const a of res.addStatuses) applyStatus(w, dst, { id: a.id, durationS: a.durationS }, src?.id ?? 0);

  // combo / pontuação do atacante
  const owner = ownerPlayer(w, src);
  if (owner && !opts.noCombo && dst.kind !== 'player' && dst.kind !== 'prop') {
    const p = owner.player!;
    p.combo++;
    p.comboTimer = COMBO_TIMEOUT_TICKS;
    if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    p.score += Math.round(res.total * comboMultiplier(p.combo));
    w.emit({ t: 'combo', player: owner.id, combo: p.combo });
  }

  if (dst.player) {
    const p = dst.player;
    p.damageTaken += res.amount;
    if (p.combo > 0 && res.amount > 0) {
      p.combo = 0;
      p.comboTimer = 0;
      w.emit({ t: 'combo', player: dst.id, combo: 0 });
    }
  }

  if (res.shatter || h.hp <= 0) {
    h.hp = 0;
    if (res.shatter) w.emit({ t: 'interaction', id: dst.id, kind: 'shatter' });
    // empurrão final para o corpo voar
    if (dst.body && !dst.boss) {
      const d = dir(src, dst, opts);
      dst.t.vx = d.x * Math.max(3, hit.knockback * 1.3);
      dst.t.vz = d.z * Math.max(1, hit.knockback * 0.4);
      dst.t.vy = Math.max(dst.t.vy, (hit.launch ?? 0) + 3);
      dst.body.grounded = false;
    }
    killEntity(w, dst, src?.id ?? 0);
    if (src?.fighter && hit.hitstop > 0) src.fighter.hitstop = Math.max(src.fighter.hitstop, hit.hitstop + 2);
    return res.total;
  }

  if (hit.status) applyStatus(w, dst, hit.status, src?.id ?? 0);
  if (!opts.noReact) react(w, src, dst, hit, opts);
  return res.total;
}

function spreadBurn(w: World, dst: Entity, src: Entity | undefined): void {
  for (const e of w.entities) {
    if (e === dst || !e.health || e.team !== dst.team) continue;
    const dx = e.t.x - dst.t.x;
    const dz = e.t.z - dst.t.z;
    if (dx * dx + dz * dz <= 2.5 * 2.5) applyStatus(w, e, { id: 'burn' }, src?.id ?? 0);
  }
}

function dir(src: Entity | undefined, dst: Entity, opts: HitOpts): { x: number; z: number } {
  if (opts.dirX !== undefined || opts.dirZ !== undefined) {
    const x = opts.dirX ?? 0;
    const z = opts.dirZ ?? 0;
    const l = Math.hypot(x, z) || 1;
    return { x: x / l, z: z / l };
  }
  if (!src) return { x: -dst.t.facing, z: 0 };
  const dx = dst.t.x - src.t.x;
  if (Math.abs(dx) < 0.05) return { x: src.t.facing, z: 0 };
  return { x: Math.sign(dx), z: 0 };
}

/** Reação física: hitstun, knockback, knockdown, poise/super armadura, juggle. */
function react(w: World, src: Entity | undefined, dst: Entity, hit: HitSpec, opts: HitOpts): void {
  const fi = dst.fighter;
  const b = dst.body;
  const h = dst.health!;
  if (!fi || !b) return;
  const d = dir(src, dst, opts);
  const massK = 1 / Math.sqrt(Math.max(0.3, b.mass));

  // hitstop compartilhado
  if (hit.hitstop > 0) {
    fi.hitstop = Math.max(fi.hitstop, hit.hitstop);
    if (src?.fighter) src.fighter.hitstop = Math.max(src.fighter.hitstop, hit.hitstop);
  }

  if (fi.state === 'frozen') return; // congelado não reage (mas pode estilhaçar)

  // super armadura (poise): bosses e inimigos pesados
  const armored = h.poiseMax > 0 && (fi.superArmor || dst.boss || h.poise > 0);
  if (armored && fi.state !== 'stagger' && fi.state !== 'knockdown' && fi.state !== 'down') {
    h.poise -= hit.poise ?? hit.damage;
    h.poiseTimer = 120;
    if (h.poise <= 0) {
      h.poise = h.poiseMax;
      fi.state = 'stagger';
      fi.st = 0;
      fi.moveId = null;
      dst.t.vx = d.x * 1.5;
      if (dst.boss) dst.boss.staggered = 90;
      w.emit({ t: 'shake', trauma: 0.25 });
      return;
    }
    // pequeno empurrão sem interromper
    dst.t.vx += d.x * hit.knockback * 0.15 * massK;
    return;
  }
  if (dst.boss) return;

  const airborne = !b.grounded;
  if (airborne) {
    fi.juggle++;
    if (fi.juggle >= PLAYER.juggleCap) h.invuln = Math.max(h.invuln, 40);
  }

  if (hit.knockdown || (hit.launch ?? 0) > 0 || airborne) {
    fi.state = 'knockdown';
    fi.st = 0;
    fi.moveId = null;
    dst.t.vx = d.x * hit.knockback * massK;
    dst.t.vz = d.z * hit.knockback * massK * 0.5;
    dst.t.vy = Math.max(airborne ? 3 : 0, (hit.launch ?? 3) * massK + (airborne ? 1.5 : 0));
    b.grounded = false;
  } else {
    fi.state = 'hurt';
    fi.st = 0;
    fi.moveId = null;
    fi.hitstun = hit.hitstun;
    dst.t.vx = d.x * hit.knockback * massK;
    dst.t.vz = d.z * hit.knockback * massK * 0.5;
  }
  if (dst.player && !hit.knockdown) h.invuln = Math.max(h.invuln, PLAYER.hurtInvuln);
  if (dst.ai) {
    dst.ai.mode = 'recover';
    dst.ai.mt = 0;
  }
}

/** Dano periódico (status/zonas): sem reação física, sem invulnerabilidade. */
export function applyDot(w: World, e: Entity, dmg: number, dtype: DamageType, src: EntityId): void {
  const s = w.get(src);
  applyHit(
    w,
    s,
    e,
    { damage: dmg, dtype, knockback: 0, hitstun: 0, hitstop: 0 },
    { ignoreInvuln: true, noReact: true, noCombo: true },
  );
}

export function applyHeal(w: World, e: Entity, amount: number): number {
  const h = e.health;
  if (!h || e.fighter?.state === 'dead') return 0;
  const before = h.hp;
  h.hp = Math.min(h.max, h.hp + amount);
  const healed = h.hp - before;
  if (healed > 0)
    w.emit({ t: 'heal', dst: e.id, amount: Math.round(healed), x: e.t.x, y: e.t.y + 1.8, z: e.t.z });
  return healed;
}

/** Jogador responsável por uma fonte de dano (o próprio, dono de projétil/controlado). */
export function ownerPlayer(w: World, src: Entity | undefined): Entity | undefined {
  if (!src) return undefined;
  if (src.player) return src;
  if (src.control) {
    const by = w.get(src.control.by);
    if (by?.player) return by;
  }
  return undefined;
}

export function killEntity(w: World, e: Entity, killer: EntityId): void {
  if (!e.fighter || e.fighter.state === 'dead') {
    if (e.kind === 'prop' && e.alive) onEntityKilled(w, e, killer);
    return;
  }
  e.fighter.state = 'dead';
  e.fighter.st = 0;
  e.fighter.moveId = null;
  e.deadTicks = 0;
  if (e.body) e.body.low = true;
  if (e.health) e.health.hp = 0;
  onEntityKilled(w, e, killer);
}
