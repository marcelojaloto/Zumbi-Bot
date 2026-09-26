import { PLAYER } from '../../data/balance';
import type { Entity } from '../Entity';
import type { World } from '../World';
import { finishRun } from '../level/LevelRunner';

const RESPAWN_TICKS = 150;

/** Jogador derrubado: perde uma vida e renasce caindo do alto, ou fim de jogo. */
export function onPlayerDown(w: World, e: Entity): void {
  const p = e.player!;
  p.lives--;
  p.livesLost++;
  p.combo = 0;
  p.comboTimer = 0;
  w.emit({ t: 'playerDown', player: e.id, livesLeft: p.lives });
  w.emit({ t: 'shake', trauma: 0.5 });
  if (p.lives > 0) {
    p.respawn = RESPAWN_TICKS;
  } else if (w.activePlayers().length === 0 && w.playerEntities().every((pl) => pl.player!.lives <= 0)) {
    finishRun(w, false);
  }
}

/** Colega que pode doar uma vida (tem 2 ou mais); empate → menor slot. */
export function lifeDonor(w: World, e: Entity): Entity | undefined {
  let best: Entity | undefined;
  for (const o of w.playerEntities()) {
    if (o === e || o.player!.lives < 2) continue;
    if (!best || o.player!.lives > best.player!.lives) best = o;
  }
  return best;
}

/** Sem vidas e com colegas na partida: apertar PULAR pega uma vida emprestada e renasce. */
export function borrowLife(w: World, e: Entity): boolean {
  const p = e.player!;
  if (p.lives > 0 || w.finished || p.gone) return false;
  const donor = lifeDonor(w, e);
  if (!donor) return false;
  donor.player!.lives--;
  p.lives = 1;
  p.respawn = 1;
  w.emit({ t: 'lifeShare', from: donor.id, to: e.id });
  return true;
}

/** Online: quem saiu da sala fica fora da partida (sem vidas); os outros continuam. */
export function retirePlayer(w: World, e: Entity): void {
  const p = e.player!;
  if (p.gone) return;
  p.gone = true;
  p.lives = 0;
  p.respawn = 0;
  const fi = e.fighter!;
  if (fi.state !== 'dead') {
    fi.state = 'dead';
    fi.st = 0;
    fi.moveId = null;
    e.deadTicks = 0;
    if (e.body) e.body.low = true;
  }
  e.health!.hp = 0;
  if (
    !w.finished &&
    w.activePlayers().length === 0 &&
    w.playerEntities().every((pl) => pl.player!.lives <= 0)
  )
    finishRun(w, false);
}

export function playerRespawnTick(w: World, e: Entity): void {
  const p = e.player!;
  p.respawn--;
  if (p.respawn > 0) return;
  const h = e.health!;
  h.hp = h.max;
  h.invuln = PLAYER.respawnInvuln;
  p.mana = p.manaMax;
  e.statuses = [];
  const fi = e.fighter!;
  fi.state = 'fall';
  fi.st = 0;
  fi.moveId = null;
  fi.hitstun = 0;
  fi.juggle = 0;
  e.body!.low = false;
  e.body!.grounded = false;
  e.t.x = Math.max(w.bounds.minX + 1, Math.min(w.bounds.maxX - 1, w.camX - 2));
  e.t.z = (w.zBand[0] + w.zBand[1]) / 2;
  e.t.y = 7;
  e.t.px = e.t.x;
  e.t.py = e.t.y;
  e.t.pz = e.t.z;
  e.t.vx = 0;
  e.t.vy = -2;
  e.t.vz = 0;
  e.deadTicks = undefined;
  w.emit({ t: 'respawn', player: e.id });
}
