import { comboMultiplier } from '../../data/balance';
import { ENEMIES } from '../../data/enemies';
import type { Entity, EntityId } from '../Entity';
import type { World } from '../World';
import { grantXp } from '../progression';
import { releaseTokens } from '../ai/director';
import { explode, spawnZone } from './effects';
import { spawnPickup } from './pickups';
import { rollCosmeticDrop, rollTable } from './loot';
import { onPlayerDown } from './lives';
import { onBossKilled } from './boss';
import { family } from '../defs';

/** Jogador que recebe a recompensa: o matador (ou dono), senão quem bateu por último, senão o mais próximo. */
function rewardTarget(w: World, e: Entity, killer: EntityId): Entity | undefined {
  const tryIds = [killer, e.health?.lastHitBy ?? 0];
  for (const id of tryIds) {
    const k = w.get(id);
    if (k?.player) return k;
    if (k?.control) {
      const by = w.get(k.control.by);
      if (by?.player) return by;
    }
    if (k?.kind === 'projectile' || k?.kind === 'hazard') {
      const o = w.get(k.projectile?.owner ?? k.hazard?.owner ?? 0);
      if (o?.player) return o;
    }
  }
  let best: Entity | undefined;
  let bd = Infinity;
  for (const p of w.activePlayers()) {
    const d = Math.abs(p.t.x - e.t.x);
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

export function onEntityKilled(w: World, e: Entity, killer: EntityId): void {
  w.emit({ t: 'death', id: e.id, defId: e.defId, killer, x: e.t.x, y: e.t.y, z: e.t.z, family: family(e) });
  switch (e.kind) {
    case 'enemy':
      onEnemyKilled(w, e, killer);
      break;
    case 'boss':
      onBossKilled(w, e, killer);
      break;
    case 'player':
      onPlayerDown(w, e);
      break;
    case 'prop':
      onPropBroken(w, e, killer);
      break;
    default:
      break;
  }
}

function onEnemyKilled(w: World, e: Entity, killer: EntityId): void {
  releaseTokens(w, e);
  const def = ENEMIES[e.defId];
  if (!def) return;
  // inimigos controlados pelo jogador não dão recompensa ao morrer
  const wasControlled = !!e.control;
  if (!wasControlled) {
    const pl = rewardTarget(w, e, killer);
    if (pl?.player) {
      const p = pl.player;
      p.kills++;
      p.score += Math.round(def.rewards.score * comboMultiplier(p.combo));
      grantXp(w, pl, def.rewards.xp);
      const [s0, s1] = def.rewards.scrap;
      p.scrap += w.rng.int(s0, s1);
      const drop = rollTable(w.rng, def.rewards.drops);
      if (drop) spawnPickup(w, drop, e.t.x, e.t.z);
      const bag = rollCosmeticDrop(w, pl, def.rewards.cosmeticChance);
      if (bag) spawnPickup(w, bag, e.t.x + 0.3, e.t.z);
    }
  }
  if (def.onDeath?.explosion) {
    explode(w, e.t.x, e.t.y + 0.8, e.t.z, def.onDeath.explosion, e.id, 'neutral');
    e.lifetime = 1;
  }
  if (def.onDeath?.zone) spawnZone(w, e.t.x, e.t.z, def.onDeath.zone, e.id, 'neutral');
}

function onPropBroken(w: World, e: Entity, killer: EntityId): void {
  const pr = e.prop!;
  w.emit({ t: 'propBreak', id: e.id, kind: pr.kind, x: e.t.x, y: e.t.y, z: e.t.z });
  if (pr.kind === 'explosiveBarrel' || pr.kind === 'car') {
    const big = pr.kind === 'car';
    explode(
      w,
      e.t.x,
      0.8,
      e.t.z,
      {
        radius: big ? 4 : 3,
        damage: big ? 60 : 45,
        minMult: 0.35,
        dtype: 'explosive',
        knockback: 7,
        launch: 5,
        selfMult: 0,
        status: { id: 'burn', chance: 0.6 },
        fx: 'explosion',
      },
      killer || e.id,
      'neutral',
      'fire',
    );
  } else {
    const drop = pr.drop ?? rollTable(w.rng, pr.kind === 'weaponCrate' ? 'weaponCrate' : 'crate');
    if (drop) spawnPickup(w, drop, e.t.x, e.t.z);
    if (pr.kind === 'weaponCrate') {
      const extra = rollTable(w.rng, 'weaponCrate');
      if (extra) spawnPickup(w, extra, e.t.x + 0.4, e.t.z);
    }
  }
  w.remove(e.id);
}
