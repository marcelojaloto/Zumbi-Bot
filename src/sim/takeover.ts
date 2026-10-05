import { createDirector } from './ai/director';
import { makeAi } from './ai/spawnEnemy';
import type { Entity } from './Entity';
import type { World } from './World';

/**
 * Troca de anfitrião no meio da fase: o mundo "espelho" de quem assumiu (montado com o que o anfitrião mandava)
 * passa a rodar a simulação. O espelho não tem a memória da IA, os passos do chefe nem os dados dos tiros em voo,
 * então: tiros e áreas de dano do momento somem (os perigos do cenário voltam no passo seguinte), inimigos
 * recomeçam a pensar a partir de onde estão, o chefe escolhe o próximo ataque e o resto ganha os valores iniciais.
 * A fase, as vidas, a vida de cada um, as armas e o progresso continuam como estavam.
 */
export function takeOverWorld(w: World): void {
  for (const e of [...w.entities]) {
    if (e.projectile || e.hazard) {
      w.remove(e.id);
      continue;
    }
    repairEntity(e);
  }
  // perigos do cenário (lasers, chão elétrico...) são criados de novo pelo passo da fase
  w.levelState.levelHazards = false;
  w.director = createDirector();
  w.syncNextId();
  w.updateBounds();
}

function repairEntity(e: Entity): void {
  const t = e.t;
  t.px = t.x;
  t.py = t.y;
  t.pz = t.z;
  e.age ??= 0;
  const fi = e.fighter;
  if (fi) {
    fi.hitSet = [];
    fi.buffer = null;
    fi.bufferTicks = 0;
    fi.hitstop = Math.min(fi.hitstop ?? 0, 4);
    // ataque de inimigo a meio caminho sem a memória da IA: volta ao normal
    if (e.ai && (fi.state === 'windup' || (fi.state === 'attack' && !fi.moveId))) {
      fi.state = 'idle';
      fi.st = 0;
    }
  }
  const h = e.health;
  if (h) {
    h.poiseTimer ??= 0;
    h.lastHitBy ??= 0;
    h.lastHitType ??= null;
    h.sinceHit ??= 9999;
  }
  if (e.statuses) e.statuses = e.statuses.map((s) => ({ ...s, src: s.src ?? 0, acc: s.acc ?? 0 }));
  const p = e.player;
  if (p) {
    p.prevButtons ??= 0;
    p.prevMoveX ??= 0;
    p.coyote ??= 0;
    p.jumpBuffer ??= 0;
    p.tapRun ??= false;
    p.tapDir ??= 0;
    p.tapTick ??= -999;
    p.mash ??= 0;
    p.lastFireTick ??= -999;
    p.manaDelay ??= 0;
    p.aimTicks ??= 0;
    p.prevMoveZ ??= 0;
    p.zTapDir ??= 0;
    p.zTapTick ??= -999;
    p.dodgeCd ??= 0;
  }
  if (e.ai) {
    const ai = makeAi(e.ai.fromSpawn ?? 'sides');
    ai.mode = fi?.state === 'spawn' ? 'spawn' : 'approach';
    ai.entered = e.ai.entered ?? true;
    if (fi?.moveId) ai.attackId = e.ai.attackId ?? null;
    e.ai = ai;
  }
  const b = e.boss;
  if (b) {
    b.steps = [];
    b.pc = 0;
    b.stepTick = 0;
    b.stepData = {};
    b.cooldowns = {};
    b.idle = 30;
    b.addsTimer = 0;
    b.cycleTimer = 0;
    b.cycleIdx = 0;
    b.lastPattern = null;
    b.patternId = null;
    b.transitioning = false;
    b.markX = t.x;
    b.markZ = t.z;
    b.chargeHits = [];
  }
}
