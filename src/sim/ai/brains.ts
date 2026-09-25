import { clamp } from '../../core/math';
import { secToTicks } from '../../core/time';
import { getEnemy } from '../../data/enemies';
import type { EnemyAttackDef, EnemyDef } from '../../data/types';
import { isCharacter, isHostile, type Entity } from '../Entity';
import type { World } from '../World';
import { startMove } from '../combat/fighter';
import { applyHit, killEntity } from '../combat/applyHit';
import { spawnProjectile } from '../systems/projectiles';
import { spawnHazard } from '../systems/effects';
import { canAct, moveMultiplier } from '../systems/status';
import { releaseTokens, requestToken } from './director';

const REACTION = new Set([
  'hurt',
  'knockdown',
  'down',
  'getup',
  'stagger',
  'frozen',
  'stunned',
  'dead',
  'attack',
]);

/** IA de todos os inimigos (e unidades controladas pelo jogador). */
export function aiSystem(w: World): void {
  for (const e of w.entities) {
    const ai = e.ai;
    if (!ai || !e.alive || e.kind !== 'enemy') continue;
    const fi = e.fighter!;
    if (fi.hitstop > 0) continue;
    ai.mt++;
    for (const k in ai.cooldowns) if (ai.cooldowns[k]! > 0) ai.cooldowns[k]!--;
    if (ai.token) {
      ai.tokenTicks++;
      if (ai.tokenTicks > 240 && ai.mode !== 'windup') releaseTokens(w, e);
    }
    const def = getEnemy(e.defId);
    if (fi.state === 'dead') continue;

    if (fi.state === 'spawn') {
      e.t.vx = 0;
      e.t.vz = 0;
      if (fi.st >= 40) {
        fi.state = 'idle';
        fi.st = 0;
      }
      continue;
    }
    // reações: perde o token se derrubado
    if (REACTION.has(fi.state)) {
      if ((fi.state === 'knockdown' || fi.state === 'down') && ai.token) releaseTokens(w, e);
      if (fi.state === 'attack') tickAttack(w, e, def);
      continue;
    }
    if (!canAct(e)) continue;
    if (fi.state === 'land' || fi.state === 'fall' || fi.state === 'jump') {
      if (!e.body!.grounded) continue;
    }

    // alvo
    const tgt = pickTarget(w, e);
    if (!tgt) {
      stopMove(e);
      continue;
    }
    ai.target = tgt.id;

    if (fi.state === 'windup' || ai.mode === 'windup') {
      runWindup(w, e, def, tgt);
      continue;
    }

    if (def.aura?.hit) auraTick(w, e, def);

    // ruídos de zumbi
    if (def.groan && w.rng.chance(0.0025)) w.emit({ t: 'groan', id: e.id });

    switch (def.archetype) {
      case 'walker':
        meleeBrain(w, e, def, tgt, 1);
        break;
      case 'runner':
        runnerBrain(w, e, def, tgt);
        break;
      case 'brute':
        bruteBrain(w, e, def, tgt);
        break;
      case 'spitter':
      case 'drone':
      case 'soldier':
        rangedBrain(w, e, def, tgt);
        break;
      case 'exploder':
        exploderBrain(w, e, def, tgt);
        break;
      case 'mech':
        mechBrain(w, e, def, tgt);
        break;
    }
  }
}

function pickTarget(w: World, e: Entity): Entity | undefined {
  const ai = e.ai!;
  const cur = ai.target ? w.get(ai.target) : undefined;
  const valid = (o: Entity | undefined): o is Entity =>
    !!o &&
    isCharacter(o) &&
    isHostile(e.team, o.team) &&
    o.fighter?.state !== 'dead' &&
    !(o.player && o.player.respawn > 0);
  if (valid(cur) && ai.mt % 60 !== 0) return cur;
  let best: Entity | undefined;
  let bd = Infinity;
  for (const o of w.entities) {
    if (!valid(o)) continue;
    const d = Math.abs(o.t.x - e.t.x) + Math.abs(o.t.z - e.t.z) * 1.5 + (o.kind === 'player' ? 0 : 1.5);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

function speedOf(e: Entity, def: EnemyDef): number {
  return def.speed * moveMultiplier(e) * (e.team === 'players' ? 1.2 : 1);
}

/** Move em direção a um ponto no plano XZ. Retorna a distância restante. */
function moveTo(e: Entity, x: number, z: number, speed: number, arrive = 0.15): number {
  const dx = x - e.t.x;
  const dz = z - e.t.z;
  const d = Math.hypot(dx, dz * 1.3);
  const fi = e.fighter!;
  if (d <= arrive) {
    e.t.vx *= 0.7;
    e.t.vz *= 0.7;
    if (fi.state === 'walk') setLoco(e, 'idle');
    return d;
  }
  const k = Math.min(1, d / 0.6);
  e.t.vx = (dx / d) * speed * k;
  e.t.vz = (dz / d) * speed * 0.8 * k;
  setLoco(e, 'walk');
  return d;
}

function setLoco(e: Entity, s: 'idle' | 'walk'): void {
  const fi = e.fighter!;
  if (fi.state !== s && (fi.state === 'idle' || fi.state === 'walk' || fi.state === 'land')) {
    fi.state = s;
    fi.st = 0;
  }
}

function stopMove(e: Entity): void {
  e.t.vx *= 0.7;
  e.t.vz *= 0.7;
  setLoco(e, 'idle');
}

function face(e: Entity, tgt: Entity): void {
  const dx = tgt.t.x - e.t.x;
  if (Math.abs(dx) > 0.1) e.t.facing = dx > 0 ? 1 : -1;
}

function attackReady(e: Entity, a: EnemyAttackDef): boolean {
  return (e.ai!.cooldowns[a.id] ?? 0) <= 0;
}

/** Inicia a preparação (telegraph) de um ataque. */
function beginWindup(w: World, e: Entity, a: EnemyAttackDef): void {
  const ai = e.ai!;
  const fi = e.fighter!;
  ai.mode = 'windup';
  ai.mt = 0;
  ai.attackId = a.id;
  fi.state = 'windup';
  fi.st = 0;
  fi.superArmor = e.kind === 'enemy' && !!getEnemy(e.defId).superArmor;
  e.t.vx = 0;
  e.t.vz = 0;
  if (a.kind === 'explode') w.emit({ t: 'sfx', id: 'fuse', x: e.t.x });
  if (a.kind === 'charge' || a.kind === 'slam') w.emit({ t: 'sfx', id: 'roar', x: e.t.x, vol: 0.6 });
}

function runWindup(w: World, e: Entity, def: EnemyDef, tgt: Entity): void {
  const ai = e.ai!;
  const a = def.attacks.find((x) => x.id === ai.attackId);
  if (!a) {
    ai.mode = 'approach';
    setLoco(e, 'idle');
    return;
  }
  e.t.vx *= 0.8;
  e.t.vz *= 0.8;
  // mira durante a preparação (exceto investidas já travadas)
  if (a.kind !== 'charge' || ai.mt < a.windup * 0.6) face(e, tgt);
  if (ai.mt < a.windup) return;
  executeAttack(w, e, def, a, tgt);
}

function executeAttack(w: World, e: Entity, def: EnemyDef, a: EnemyAttackDef, tgt: Entity): void {
  const ai = e.ai!;
  const fi = e.fighter!;
  ai.cooldowns[a.id] = secToTicks(a.cooldownS);
  ai.mode = 'attack';
  ai.mt = 0;
  switch (a.kind) {
    case 'melee':
    case 'lunge':
    case 'charge':
    case 'slam':
      if (a.move) startMove(w, e, a.move.id);
      else toRecover(w, e);
      break;
    case 'ranged':
      fireAt(w, e, a, tgt, 0);
      toRecover(w, e);
      break;
    case 'burst':
    case 'minigun':
      ai.shotsLeft = a.count ?? 3;
      ai.a = 0;
      fi.state = 'attack';
      fi.st = 0;
      fi.moveId = null;
      break;
    case 'flame':
      fi.state = 'attack';
      fi.st = 0;
      fi.moveId = null;
      ai.shotsLeft = secToTicks(a.durationS ?? 1.2);
      break;
    case 'explode':
      e.health!.hp = 0;
      killEntity(w, e, 0);
      break;
    case 'beam':
      toRecover(w, e);
      break;
  }
}

/** Ataques contínuos (rajadas, metralhadora, lança-chamas) durante o estado 'attack' sem golpe. */
function tickAttack(w: World, e: Entity, def: EnemyDef): void {
  const ai = e.ai!;
  const fi = e.fighter!;
  if (fi.moveId) {
    // golpe corpo a corpo: o fighter controla; ao terminar volta a idle
    return;
  }
  const a = def.attacks.find((x) => x.id === ai.attackId);
  const tgt = w.get(ai.target);
  if (!a || !tgt) {
    toRecover(w, e);
    return;
  }
  e.t.vx *= 0.8;
  e.t.vz *= 0.8;
  if (a.kind === 'burst' || a.kind === 'minigun') {
    ai.a--;
    if (ai.a <= 0 && ai.shotsLeft > 0) {
      const idx = (a.count ?? 3) - ai.shotsLeft;
      const sweep = a.kind === 'minigun' ? (idx / Math.max(1, (a.count ?? 1) - 1) - 0.5) * 0.5 : 0;
      fireAt(w, e, a, tgt, sweep);
      ai.shotsLeft--;
      ai.a = a.interval ?? 6;
    }
    if (ai.shotsLeft <= 0 && ai.a <= 0) toRecover(w, e);
  } else if (a.kind === 'flame') {
    if (ai.shotsLeft % 6 === 0 && a.hit) {
      const dir = e.t.facing > 0 ? 0 : Math.PI;
      spawnHazard(w, {
        x: e.t.x + e.t.facing * 0.6,
        z: e.t.z,
        owner: e.id,
        team: e.team,
        shape: { k: 'cone', angle: 0.7, range: 3.2, dir },
        hit: a.hit,
        active: 7,
        fx: 'flame',
        height: 2.5,
        element: 'fire',
      });
    }
    ai.shotsLeft--;
    if (ai.shotsLeft <= 0) toRecover(w, e);
  } else {
    toRecover(w, e);
  }
}

function fireAt(w: World, e: Entity, a: EnemyAttackDef, tgt: Entity, sweep: number): void {
  const spec = a.projectile;
  if (!spec) return;
  const y = e.t.y + (spec.y ?? 1.3) * (e.scale ?? 1);
  const sx = e.t.x + e.t.facing * 0.5 * (e.scale ?? 1);
  let yaw = Math.atan2(tgt.t.z - e.t.z, tgt.t.x - sx);
  yaw += sweep;
  yaw += w.rng.range(-0.05, 0.05);
  const scaledHit = spec.hit;
  spawnProjectile(w, {
    owner: e,
    x: sx,
    y,
    z: e.t.z,
    yaw,
    spec: { ...spec, hit: scaledHit },
    target: spec.lob ? { x: tgt.t.x + tgt.t.vx * 0.4, z: tgt.t.z + tgt.t.vz * 0.4 } : undefined,
  });
  w.emit({
    t: 'shot',
    id: e.id,
    weapon: 'enemy',
    x: sx,
    y,
    z: e.t.z,
    dx: Math.cos(yaw),
    dz: Math.sin(yaw),
    visual: spec.visual,
  });
}

function toRecover(w: World, e: Entity): void {
  const ai = e.ai!;
  const fi = e.fighter!;
  ai.mode = 'recover';
  ai.mt = 0;
  ai.attackId = null;
  if (fi.state === 'attack' || fi.state === 'windup') {
    fi.state = 'idle';
    fi.st = 0;
    fi.moveId = null;
  }
  fi.superArmor = false;
  if (ai.token === 'ranged') releaseTokens(w, e);
}

/** Posição de espera no anel ao redor do alvo (lado atual, espalhado por id). */
function waitSpot(w: World, e: Entity, tgt: Entity, radius: number): { x: number; z: number } {
  const side = e.t.x >= tgt.t.x ? 1 : -1;
  const k = (e.id * 7) % 5;
  const zOff = (k - 2) * 0.7;
  let x = tgt.t.x + side * (radius + (k % 2) * 0.6);
  // mantém dentro da tela
  x = clamp(x, w.bounds.minX + 0.8, w.bounds.maxX - 0.8);
  const z = clamp(tgt.t.z + zOff, w.zBand[0] + 0.4, w.zBand[1] - 0.4);
  return { x, z };
}

function afterAttack(w: World, e: Entity): boolean {
  const ai = e.ai!;
  const fi = e.fighter!;
  if (ai.mode === 'attack' && fi.state !== 'attack') {
    toRecover(w, e);
  }
  if (ai.mode === 'recover') {
    if (ai.mt < 36) {
      stopMove(e);
      return true;
    }
    ai.mode = 'approach';
    ai.mt = 0;
    if (ai.token === 'melee') releaseTokens(w, e);
  }
  return false;
}

/** Andarilho e afins: aproxima, pede token, prepara e golpeia. */
function meleeBrain(w: World, e: Entity, def: EnemyDef, tgt: Entity, aggression: number): void {
  const ai = e.ai!;
  face(e, tgt);
  if (afterAttack(w, e)) return;
  const sp = speedOf(e, def);
  const dx = tgt.t.x - e.t.x;
  const dz = tgt.t.z - e.t.z;
  const dist = Math.abs(dx);
  const atk = def.attacks[0]!;
  const wantToken = dist < 4 * aggression;
  if (wantToken && !ai.token) requestToken(w, e, tgt.id, 'melee');
  if (ai.token === 'melee') {
    const side = dx > 0 ? -1 : 1;
    const range = (atk.range[1] - 0.15) * (e.scale ?? 1);
    const tx = tgt.t.x + side * Math.max(0.55, range * 0.85);
    moveTo(e, tx, tgt.t.z, sp, 0.1);
    if (Math.abs(dz) < 0.35 && dist <= range + 0.25 && attackReady(e, atk)) beginWindup(w, e, atk);
  } else {
    const spot = waitSpot(w, e, tgt, 2.6);
    // passo de espera com leve oscilação
    const wob = Math.sin((w.tick + e.id * 31) / 40) * 0.4;
    moveTo(e, spot.x, spot.z + wob, sp * 0.7, 0.3);
  }
}

function runnerBrain(w: World, e: Entity, def: EnemyDef, tgt: Entity): void {
  const ai = e.ai!;
  face(e, tgt);
  if (afterAttack(w, e)) return;
  const sp = speedOf(e, def);
  const dx = tgt.t.x - e.t.x;
  const dz = tgt.t.z - e.t.z;
  const dist = Math.abs(dx);
  const atk = def.attacks[0]!;
  if (!ai.token && dist < 6) requestToken(w, e, tgt.id, 'melee');
  if (ai.token === 'melee') {
    const zig = Math.sin((w.tick + e.id * 13) / 9) * 0.8 * Math.min(1, dist / 4);
    const side = dx > 0 ? -1 : 1;
    moveTo(e, tgt.t.x + side * 2.4, tgt.t.z + zig, sp, 0.2);
    if (Math.abs(dz) < 0.5 && dist >= atk.range[0] && dist <= atk.range[1] && attackReady(e, atk))
      beginWindup(w, e, atk);
    else if (dist < 1.2 && attackReady(e, atk)) {
      // perto demais: recua um pouco para o bote
      moveTo(e, tgt.t.x + side * 2.2, tgt.t.z, sp);
    }
  } else {
    const spot = waitSpot(w, e, tgt, 3.4);
    moveTo(e, spot.x, spot.z + Math.sin((w.tick + e.id * 17) / 20), sp * 0.6, 0.3);
  }
}

function bruteBrain(w: World, e: Entity, def: EnemyDef, tgt: Entity): void {
  const ai = e.ai!;
  face(e, tgt);
  if (afterAttack(w, e)) return;
  const sp = speedOf(e, def);
  const dx = tgt.t.x - e.t.x;
  const dz = tgt.t.z - e.t.z;
  const dist = Math.abs(dx);
  const slam = def.attacks.find((a) => a.kind === 'slam')!;
  const charge = def.attacks.find((a) => a.kind === 'charge');
  if (!ai.token && dist < 10) requestToken(w, e, tgt.id, 'melee');
  if (ai.token === 'melee') {
    if (
      charge &&
      attackReady(e, charge) &&
      Math.abs(dz) < 0.8 &&
      dist >= charge.range[0] &&
      dist <= charge.range[1]
    ) {
      beginWindup(w, e, charge);
      return;
    }
    const side = dx > 0 ? -1 : 1;
    moveTo(e, tgt.t.x + side * 1.3 * (e.scale ?? 1), tgt.t.z, sp, 0.15);
    if (dist <= slam.range[1] * (e.scale ?? 1) && Math.abs(dz) < 1.0 && attackReady(e, slam))
      beginWindup(w, e, slam);
  } else {
    const spot = waitSpot(w, e, tgt, 3.5);
    moveTo(e, spot.x, spot.z, sp * 0.7, 0.3);
  }
}

function rangedBrain(w: World, e: Entity, def: EnemyDef, tgt: Entity): void {
  face(e, tgt);
  if (afterAttack(w, e)) return;
  const sp = speedOf(e, def);
  const dx = tgt.t.x - e.t.x;
  const dz = tgt.t.z - e.t.z;
  const dist = Math.abs(dx);
  const [kmin, kmax] = def.keepDistance ?? [5, 9];
  const ranged = def.attacks.find((a) => a.token === 'ranged')!;
  const melee = def.attacks.find((a) => a.token === 'melee');

  // corpo a corpo de emergência (robô soldado)
  if (melee && dist < 1.3 && Math.abs(dz) < 0.5 && attackReady(e, melee)) {
    beginWindup(w, e, melee);
    return;
  }
  // mantém distância
  const side = dx > 0 ? -1 : 1;
  const want = (kmin + kmax) / 2;
  let tx = tgt.t.x + side * want;
  tx = clamp(tx, w.bounds.minX + 0.8, w.bounds.maxX - 0.8);
  // alinhar o plano de tiro (drones e soldados), cuspidor alinha "mais ou menos"
  const lane =
    def.archetype === 'spitter'
      ? tgt.t.z + Math.sin(e.id) * 1.2
      : tgt.t.z + Math.sin((w.tick + e.id * 50) / 90) * 0.3;
  const dodge = def.dodgeChance && e.health!.sinceHit < 2 && w.rng.chance(def.dodgeChance);
  if (dodge) {
    e.t.vz = (e.t.z > tgt.t.z ? 1 : -1) * 6;
    return;
  }
  if (dist < kmin - 0.5) moveTo(e, tx, lane, sp * 1.1, 0.2);
  else if (dist > kmax + 0.5) moveTo(e, tx, lane, sp, 0.2);
  else moveTo(e, e.t.x + Math.sin((w.tick + e.id * 21) / 50) * 0.5, lane, sp * 0.6, 0.25);

  const aligned = def.archetype === 'spitter' ? true : Math.abs(dz) < 0.6;
  if (aligned && dist >= ranged.range[0] && dist <= ranged.range[1] && attackReady(e, ranged)) {
    if (requestToken(w, e, tgt.id, 'ranged')) beginWindup(w, e, ranged);
  }
}

function exploderBrain(w: World, e: Entity, def: EnemyDef, tgt: Entity): void {
  face(e, tgt);
  const sp = speedOf(e, def);
  const dx = tgt.t.x - e.t.x;
  const dz = tgt.t.z - e.t.z;
  const atk = def.attacks[0]!;
  moveTo(e, tgt.t.x, tgt.t.z, sp, 0.3);
  if (Math.hypot(dx, dz) < atk.range[1]) beginWindup(w, e, atk);
}

function mechBrain(w: World, e: Entity, def: EnemyDef, tgt: Entity): void {
  const ai = e.ai!;
  face(e, tgt);
  if (afterAttack(w, e)) return;
  const sp = speedOf(e, def);
  const dx = tgt.t.x - e.t.x;
  const dz = tgt.t.z - e.t.z;
  const dist = Math.abs(dx);
  const pool = def.attacks.filter(
    (a) => attackReady(e, a) && dist >= a.range[0] && dist <= a.range[1] * (e.scale ?? 1),
  );
  if (pool.length && ai.mt > 30) {
    const a = w.rng.weighted(pool, (x) => x.weight)!;
    const tokenOk = requestToken(w, e, tgt.id, a.token);
    if (tokenOk && (a.kind !== 'flame' && a.kind !== 'slam' ? true : Math.abs(dz) < 1.2)) {
      beginWindup(w, e, a);
      return;
    }
  }
  const side = dx > 0 ? -1 : 1;
  moveTo(e, tgt.t.x + side * 3.5, tgt.t.z, sp, 0.4);
}

/** Aura de dano (zumbi em chamas). */
function auraTick(w: World, e: Entity, def: EnemyDef): void {
  if (w.tick % 30 !== e.id % 30) return;
  const aura = def.aura!;
  for (const o of w.entities) {
    if (!isCharacter(o) || !isHostile(e.team, o.team) || o.fighter?.state === 'dead') continue;
    const d = Math.hypot(o.t.x - e.t.x, o.t.z - e.t.z);
    if (d <= aura.radius + (o.body?.radius ?? 0.3))
      applyHit(w, e, o, aura.hit!, { ignoreInvuln: true, noReact: true, noCombo: true });
  }
}
