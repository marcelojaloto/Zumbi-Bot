import { coopScaling } from '../../data/balance';
import { getEnemy } from '../../data/enemies';
import type { SpawnFrom } from '../../data/types';
import { makeFighter, makeHealth, makeTransform, type AiComp, type Entity } from '../Entity';
import type { World } from '../World';

export function makeAi(from: string): AiComp {
  return {
    mode: 'spawn',
    mt: 0,
    target: 0,
    token: null,
    tokenTicks: 0,
    slot: -1,
    slotX: 0,
    slotZ: 0,
    attackId: null,
    cooldowns: {},
    replan: 0,
    a: 0,
    b: 0,
    c: 0,
    shotsLeft: 0,
    aggro: true,
    entered: false,
    fromSpawn: from,
  };
}

/** Cria um inimigo com HP/dano escalados por mapa, dificuldade e número de jogadores. */
export function spawnEnemy(w: World, id: string, x: number, z: number, from: SpawnFrom): Entity {
  const def = getEnemy(id);
  const co = coopScaling(w.playerCount);
  const hp = Math.round(def.hp * w.map.scaling.hp * w.diff.enemyHp * co.hp);
  const zc = Math.max(w.zBand[0] + 0.3, Math.min(w.zBand[1] - 0.3, z));
  const t = makeTransform(x, def.fly ?? 0, zc, x > w.camX ? -1 : 1);
  const e = w.add({
    kind: 'enemy',
    team: 'enemies',
    defId: id,
    alive: true,
    age: 0,
    t,
    body: {
      radius: def.radius,
      height: def.height,
      mass: def.mass,
      grounded: !def.fly,
      gravityScale: 1,
      fly: def.fly,
    },
    health: makeHealth(hp, def.poise),
    fighter: makeFighter(from === 'ground' ? 'spawn' : 'idle'),
    statuses: [],
    ai: makeAi(from),
    dmgMult: w.map.scaling.dmg * w.diff.enemyDmg,
    scale: def.rig.scale,
  });
  if (from === 'sky') {
    e.t.y = 7;
    e.t.py = 7;
    e.body!.grounded = false;
    // voadores descem planando até a altura de voo, já ativos
    if (!def.fly) e.fighter!.state = 'fall';
  }
  if (from === 'ground' && e.health) e.health.invuln = 30;
  return e;
}
