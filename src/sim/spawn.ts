import { PLAYER, maxHpForLevel, maxManaForLevel } from '../data/balance';
import { getCharacter } from '../data/characters';
import type { AmmoType } from '../data/types';
import { makeFighter, makeHealth, makeTransform, type Entity, type PlayerComp } from './Entity';
import type { PlayerLoadout, World } from './World';
import { initAmmo } from './systems/weapons';

export function emptyAmmo(): Record<AmmoType, number> {
  return { light: 0, shell: 0, rifle: 0, sniper: 0, grenade: 0 };
}

export function makePlayerComp(lo: PlayerLoadout): PlayerComp {
  const ch = getCharacter(lo.character);
  const manaMax = maxManaForLevel(lo.level, ch.stats.mana);
  return {
    slot: lo.slot,
    name: lo.name,
    character: ch.id,
    level: lo.level,
    xp: lo.xp,
    mana: manaMax,
    manaMax,
    manaDelay: 0,
    lives: PLAYER.lives,
    score: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    kills: 0,
    bossKills: 0,
    damageTaken: 0,
    livesLost: 0,
    buttons: 0,
    prevButtons: 0,
    moveX: 0,
    moveZ: 0,
    prevMoveX: 0,
    aimYaw: 0,
    aimMode: 0,
    jumpsUsed: 0,
    coyote: 0,
    jumpBuffer: 0,
    running: false,
    tapRun: false,
    tapDir: 0,
    tapTick: -999,
    mode: ch.startMode === 'staff' && lo.staffs.length > 0 ? 'staff' : 'gun',
    guns: [...lo.guns],
    gunIdx: 0,
    ammoMag: {},
    ammo: emptyAmmo(),
    fire: {
      cd: 0,
      reload: 0,
      reloadTotal: 0,
      shellReload: false,
      bloom: 0,
      recoil: 0,
      spin: 0,
      triggerWasDown: false,
      needsRelease: false,
    },
    staffs: [...lo.staffs],
    staffIdx: 0,
    staffCd: {},
    castStaff: null,
    castFired: false,
    melee: null,
    powers: { doubleDamage: 0, turbo: 0, invulnerable: 0, rage: 0 },
    aiming: false,
    respawn: 0,
    aimTicks: 0,
    scrap: 0,
    loot: [],
    pity: lo.pity,
    mash: 0,
    god: false,
    lastFireTick: -999,
  };
}

export function spawnPlayer(w: World, lo: PlayerLoadout): Entity {
  const ch = getCharacter(lo.character);
  const start = w.level.playerStart;
  const n = w.opts.loadouts.length;
  // solo: ponto de partida do nível; em grupo: espalhados pela faixa de profundidade
  const [z0, z1] = w.zBand;
  const z = n > 1 ? z0 + ((z1 - z0) * (lo.slot + 1)) / (n + 1) : start.z;
  const x = n > 1 ? start.x + 0.6 - lo.slot * 0.3 : start.x;
  const e = w.add({
    id: lo.slot + 1,
    kind: 'player',
    team: 'players',
    defId: ch.id,
    alive: true,
    age: 0,
    t: makeTransform(x, 0, z, 1),
    body: {
      radius: PLAYER.radius,
      height: PLAYER.height,
      mass: ch.stats.mass,
      grounded: true,
      gravityScale: 1,
    },
    health: makeHealth(maxHpForLevel(lo.level, ch.stats.hp), 0),
    fighter: makeFighter('idle'),
    statuses: [],
    player: makePlayerComp(lo),
  });
  initAmmo(e.player!);
  return e;
}
