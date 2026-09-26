import { approach } from '../../core/math';
import { DT } from '../../core/time';
import { DEPTH_SPEED, PLAYER } from '../../data/balance';
import { RAGE } from '../../data/characters';
import { characterDef } from '../defs';
import type { Entity, FighterState, PlayerSlot } from '../Entity';
import { Btn, emptyFrame, held, pressed, type InputFrame } from '../InputFrame';
import { updateDoubleTap } from '../doubleTap';
import type { World } from '../World';
import { moveMultiplier, canAct, canMove, regenBlocked } from './status';
import { playerMeleeInput } from '../combat/fighter';
import { playerWeaponsInput } from './weapons';
import { playerStaffInput } from './staffs';
import { borrowLife, playerRespawnTick } from './lives';

const GROUND_ACCEL = 60;
const AIR_ACCEL = 60 * PLAYER.airControl;

export const LOCOMOTION = new Set(['idle', 'walk', 'run', 'jump', 'fall', 'land']);

export function playerControl(w: World, inputs: ReadonlyMap<PlayerSlot, InputFrame>): void {
  for (const e of w.playerEntities()) {
    const p = e.player!;
    const f = inputs.get(p.slot) ?? emptyFrame(w.tick);
    p.prevButtons = p.buttons;
    p.buttons = f.buttons;
    p.prevMoveX = p.moveX;
    p.moveX = f.moveX;
    p.moveZ = f.moveZ;
    p.aimYaw = f.aimYaw;
    p.aimMode = f.aimMode;

    if (p.respawn > 0) {
      playerRespawnTick(w, e);
      continue;
    }
    tickPlayerTimers(w, e);
    const fi = e.fighter!;
    if (fi.hitstop > 0) continue;
    if (fi.state === 'dead') {
      if (p.lives <= 0 && pressed(p.buttons, p.prevButtons, Btn.Jump)) borrowLife(w, e);
      continue;
    }

    // congelado: apertar botões reduz a duração
    if (fi.state === 'frozen') {
      if (pressed(p.buttons, p.prevButtons, Btn.Punch | Btn.Kick | Btn.Jump)) p.mash++;
      continue;
    }

    const movable = canMove(e);
    const actable = canAct(e);
    locomotion(w, e, movable);
    if (actable) {
      playerMeleeInput(w, e);
      playerWeaponsInput(w, e);
      playerStaffInput(w, e);
    }
  }
}

function tickPlayerTimers(w: World, e: Entity): void {
  const p = e.player!;
  if (p.coyote > 0) p.coyote--;
  if (p.jumpBuffer > 0) p.jumpBuffer--;
  for (const k of ['doubleDamage', 'turbo', 'invulnerable', 'rage'] as const) {
    if (p.powers[k] > 0) {
      p.powers[k]--;
      if (p.powers[k] === 0) w.emit({ t: 'power', player: e.id, power: k, on: false });
    }
  }
  if (p.comboTimer > 0) {
    p.comboTimer--;
    if (p.comboTimer === 0 && p.combo > 0) {
      p.combo = 0;
      w.emit({ t: 'combo', player: e.id, combo: 0 });
    }
  }
  const st = characterDef(e).stats;
  // regeneração de mana
  if (p.manaDelay > 0) p.manaDelay--;
  else if (p.mana < p.manaMax) p.mana = Math.min(p.manaMax, p.mana + PLAYER.manaRegen * st.manaRegen * DT);
  // regeneração de vida (mutante): depois de um tempo sem apanhar
  const h = e.health!;
  if (st.hpRegen > 0 && h.hp > 0 && h.hp < h.max && h.sinceHit >= st.hpRegenDelayS * 60 && !regenBlocked(e))
    h.hp = Math.min(h.max, h.hp + st.hpRegen * DT);
}

/** Andar, correr, pular e pulo duplo. */
function locomotion(w: World, e: Entity, movable: boolean): void {
  const p = e.player!;
  const fi = e.fighter!;
  const t = e.t;
  const b = e.body!;
  const inLoco = LOCOMOTION.has(fi.state);

  const dt = updateDoubleTap(
    { lastDir: p.tapDir, lastTapTick: p.tapTick, prevAxisDir: axisDir(p.prevMoveX), running: p.tapRun },
    p.moveX,
    w.tick,
    PLAYER.doubleTapTicks,
  );
  p.tapRun = dt.running;
  p.running = dt.running || held(p.buttons, Btn.Run);
  p.tapDir = dt.lastDir;
  p.tapTick = dt.lastTapTick;

  if (!inLoco) return;

  const aiming = held(p.buttons, Btn.Aim);
  p.aiming = aiming;
  const turbo = p.powers.turbo > 0 ? 1.4 : 1;
  const st = characterDef(e).stats;
  const rage = p.powers.rage > 0 ? RAGE.speed : 1;
  const mult =
    moveMultiplier(e) * turbo * rage * st.speed * (aiming ? PLAYER.aimMoveMult : 1) * firingMoveMult(e);
  const run = p.running && !aiming;
  let mx = movable ? p.moveX : 0;
  let mz = movable ? p.moveZ : 0;
  if (e.statuses?.some((s) => s.id === 'glitch')) {
    mx = -mx;
    mz = -mz;
  }
  const tx = mx * (run ? PLAYER.runX : PLAYER.walkX) * mult;
  const tz = mz * (run ? PLAYER.runZ : PLAYER.walkZ) * mult;
  const acc = (b.grounded ? GROUND_ACCEL : AIR_ACCEL) * DT;
  t.vx = approach(t.vx, tx, acc * Math.max(1, Math.abs(tx) / 4));
  // em Z tudo é o movimento de X ampliado por DEPTH_SPEED (arrancar e frear iguais na tela)
  t.vz = approach(t.vz, tz, acc * Math.max(DEPTH_SPEED, Math.abs(tz) / 4));

  // direção: mira do mouse tem prioridade enquanto mira/atira
  const firing = held(p.buttons, Btn.Fire) || w.tick - p.lastFireTick < 20;
  if (p.aimMode === 1 && (aiming || firing)) {
    const c = Math.cos(p.aimYaw);
    if (Math.abs(c) > 0.05) t.facing = c > 0 ? 1 : -1;
  } else if (Math.abs(mx) > 0.2) {
    t.facing = mx > 0 ? 1 : -1;
  }

  // pulo
  if (pressed(p.buttons, p.prevButtons, Btn.Jump) && movable) p.jumpBuffer = PLAYER.jumpBufferTicks;
  if (p.jumpBuffer > 0 && movable) {
    if (b.grounded || p.coyote > 0) {
      t.vy = PLAYER.jumpV * st.jump;
      b.grounded = false;
      p.coyote = 0;
      p.jumpsUsed = 1;
      p.jumpBuffer = 0;
      setState(e, 'jump');
      w.emit({ t: 'jump', id: e.id, double: false });
    } else if (p.jumpsUsed < 2) {
      t.vy = PLAYER.doubleJumpV * st.jump;
      p.jumpsUsed = 2;
      p.jumpBuffer = 0;
      setState(e, 'jump');
      w.emit({ t: 'jump', id: e.id, double: true });
    }
  }

  // transições de locomoção
  if (!b.grounded) {
    if (t.vy < 0 && fi.state !== 'fall') setState(e, 'fall');
  } else if (fi.state === 'land') {
    if (fi.st >= 4) setState(e, 'idle');
  } else {
    const speed = Math.hypot(t.vx, t.vz);
    const want = speed < 0.3 ? 'idle' : run && Math.abs(t.vx) > 1 ? 'run' : 'walk';
    if (fi.state !== want) setState(e, want);
  }
}

function firingMoveMult(e: Entity): number {
  const p = e.player!;
  if (p.mode !== 'gun') return 1;
  if (!held(p.buttons, Btn.Fire)) return 1;
  const gun = p.guns[p.gunIdx];
  return gun === 'mg' ? 0.7 : 1;
}

function axisDir(v: number): number {
  return v > 0.5 ? 1 : v < -0.5 ? -1 : 0;
}

export function setState(e: Entity, s: FighterState): void {
  const fi = e.fighter!;
  fi.state = s;
  fi.st = 0;
}
