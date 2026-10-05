import { approach } from '../../core/math';
import { DT } from '../../core/time';
import { PLAYER, depthSpeed } from '../../data/balance';
import { RAGE } from '../../data/characters';
import { characterDef } from '../defs';
import type { Entity, FighterState, PlayerSlot } from '../Entity';
import { Btn, emptyFrame, held, pressed, type InputFrame } from '../InputFrame';
import { updateDoubleTap } from '../doubleTap';
import type { World } from '../World';
import { moveMultiplier, canAct, canMove, regenBlocked } from './status';
import { bufferComboInput, playerMeleeInput } from '../combat/fighter';
import { playerWeaponsInput } from './weapons';
import { playerStaffInput } from './staffs';
import { borrowLife, playerRespawnTick } from './lives';
import { counterReady } from './defense';
import { playerPerks } from '../perks';
import { DEFENSE } from '../../data/workshop';

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
    p.prevMoveZ = p.moveZ;
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
    if (fi.hitstop > 0) {
      // golpe congelado no impacto: o próximo comando do combo não se perde
      if (fi.state === 'attack') bufferComboInput(e);
      continue;
    }
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
  const fx = playerPerks(e);
  if (p.dodge > 0) p.dodge--;
  if (p.dodgeCd > 0) p.dodgeCd--;
  // regeneração de mana (Energia da Oficina acelera)
  if (p.manaDelay > 0) p.manaDelay--;
  else if (p.mana < p.manaMax)
    p.mana = Math.min(p.manaMax, p.mana + PLAYER.manaRegen * st.manaRegen * (1 + fx.manaRegen) * DT);
  // regeneração de vida (mutante): depois de um tempo sem apanhar
  const h = e.health!;
  if (st.hpRegen > 0 && h.hp > 0 && h.hp < h.max && h.sinceHit >= st.hpRegenDelayS * 60 && !regenBlocked(e))
    h.hp = Math.min(h.max, h.hp + st.hpRegen * DT);
  // escudo de energia da Oficina: recarrega sozinho depois de um tempo sem apanhar
  const sh = DEFENSE.shield;
  if (fx.defenses.has('shield') && h.hp > 0 && h.shield < sh.max && h.sinceHit >= sh.delayS * 60)
    h.shield = Math.min(sh.max, h.shield + sh.regen * DT);
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
  const fx = playerPerks(e);
  // esquiva da Oficina: toque duplo para cima ou para baixo
  const zt = updateDoubleTap(
    { lastDir: p.zTapDir, lastTapTick: p.zTapTick, prevAxisDir: axisDir(p.prevMoveZ), running: false },
    p.moveZ,
    w.tick,
    DEFENSE.dodge.tapTicks,
  );
  p.zTapDir = zt.lastDir;
  p.zTapTick = zt.lastTapTick;
  if (zt.running && inLoco && movable && b.grounded && p.dodgeCd <= 0 && fx.defenses.has('dodge'))
    startDodge(w, e, zt.lastDir);
  // esquivando: desliza em profundidade sem levar dano
  if (p.dodge > 0) {
    t.vx *= 0.85;
    return;
  }

  if (!inLoco) return;

  const aiming = held(p.buttons, Btn.Aim);
  p.aiming = aiming;
  const turbo = p.powers.turbo > 0 ? 1.4 : 1;
  const st = characterDef(e).stats;
  const rage = p.powers.rage > 0 ? RAGE.speed : 1;
  const mult =
    moveMultiplier(e) *
    turbo *
    rage *
    st.speed *
    (1 + fx.speed) *
    (aiming ? PLAYER.aimMoveMult : 1) *
    firingMoveMult(e);
  const run = p.running && !aiming;
  let [mx, mz] = movable ? moveDir(w, e, p.moveX, p.moveZ) : [0, 0];
  if (e.statuses?.some((s) => s.id === 'glitch')) {
    mx = -mx;
    mz = -mz;
  }
  // velocidade do vetor pelos eixos: X anda `speed`, Z anda o mesmo na tela; qualquer diagonal fica igual
  const speed = (run ? PLAYER.runX : PLAYER.walkX) * mult;
  const k = depthSpeed(t.z);
  const tx = mx * speed;
  const tz = mz * speed * k;
  const acc = (b.grounded ? GROUND_ACCEL : AIR_ACCEL) * DT;
  t.vx = approach(t.vx, tx, acc * Math.max(1, Math.abs(tx) / 4));
  // em Z tudo é o movimento de X ampliado pela profundidade (arrancar e frear iguais na tela)
  t.vz = approach(t.vz, tz, acc * Math.max(k, Math.abs(tz) / 4));

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
      t.vy = PLAYER.jumpV * st.jump * (1 + fx.jump);
      b.grounded = false;
      p.coyote = 0;
      p.jumpsUsed = 1;
      p.jumpBuffer = 0;
      setState(e, 'jump');
      w.emit({ t: 'jump', id: e.id, double: false });
    } else if (p.jumpsUsed < 2) {
      t.vy = PLAYER.doubleJumpV * st.jump * (1 + fx.jump);
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

/** Esquiva: um impulso rápido em profundidade com invencibilidade (sai pela borda livre se a faixa acabar). */
function startDodge(w: World, e: Entity, dir: number): void {
  const p = e.player!;
  const d = DEFENSE.dodge;
  const [z0, z1] = w.zBand;
  // encostado na borda: esquiva para o outro lado
  if ((dir > 0 && e.t.z > z1 - 0.4) || (dir < 0 && e.t.z < z0 + 0.4)) dir = -dir;
  p.dodge = d.ticks;
  p.dodgeCd = d.cooldown;
  e.t.vz = dir * d.speed;
  e.health!.invuln = Math.max(e.health!.invuln, d.invuln);
  w.emit({ t: 'dodge', player: e.id, x: e.t.x, z: e.t.z });
  // contra-golpe: o próximo golpe sai com dano dobrado
  counterReady(w, e);
}

/**
 * Direção do movimento (vetor de até 1: diagonais não somam velocidade). Encostado na borda da faixa ou da tela,
 * o eixo travado não gasta velocidade: numa diagonal (45° ou mais para o lado livre) o personagem desliza pela borda
 * na velocidade cheia; quase reto contra a borda, desliza devagar.
 */
export function moveDir(w: World, e: Entity, x: number, z: number): [number, number] {
  let len = Math.hypot(x, z);
  if (len < 1e-4) return [0, 0];
  if (len > 1) {
    x /= len;
    z /= len;
    len = 1;
  }
  const t = e.t;
  const b = w.bounds;
  const r = (e.body?.radius ?? 0.35) * 0.5;
  const zBlocked = (z < 0 && t.z <= b.zMin + r + 1e-3) || (z > 0 && t.z >= b.zMax - r - 1e-3);
  const xBlocked = (x < 0 && t.x <= b.minX + 0.4 + 1e-3) || (x > 0 && t.x >= b.maxX - 0.4 - 1e-3);
  const slide = (v: number) => Math.sign(v) * len * Math.min(1, Math.abs(v) / Math.SQRT1_2);
  if (zBlocked && !xBlocked) return [slide(x), 0];
  if (xBlocked && !zBlocked) return [0, slide(z)];
  return [x, z];
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
