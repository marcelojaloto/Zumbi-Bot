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
