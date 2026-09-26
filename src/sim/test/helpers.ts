import { sandbox } from '../../data/maps/00-sandbox';
import type { Difficulty, MapDef } from '../../data/types';
import type { PlayerSlot } from '../Entity';
import { emptyFrame, type InputFrame } from '../InputFrame';
import { World, type PlayerLoadout } from '../World';

export function loadout(over: Partial<PlayerLoadout> = {}): PlayerLoadout {
  return {
    slot: 0,
    name: 'Teste',
    character: 'robot',
    level: 1,
    xp: 0,
    guns: ['pistol'],
    staffs: ['heal'],
    cosmetics: {},
    pity: 0,
    ownedCosmetics: [],
    ...over,
  };
}

export function makeWorld(
  opts: {
    map?: MapDef;
    seed?: number;
    noLevel?: boolean;
    loadout?: Partial<PlayerLoadout>;
    ngPlus?: boolean;
    difficulty?: Difficulty;
  } = {},
): World {
  return new World({
    seed: opts.seed ?? 42,
    map: opts.map ?? sandbox,
    levelIdx: 0,
    loadouts: [loadout(opts.loadout)],
    difficulty: opts.difficulty ?? 'normal',
    enemyCap: 14,
    noLevel: opts.noLevel ?? true,
    ngPlus: opts.ngPlus,
  });
}

export function frame(p: Partial<InputFrame> = {}): Map<PlayerSlot, InputFrame> {
  return new Map([[0 as PlayerSlot, { ...emptyFrame(), ...p }]]);
}

export function run(w: World, ticks: number, p: Partial<InputFrame> = {}): void {
  for (let i = 0; i < ticks; i++) w.step(frame({ ...p, tick: w.tick }));
}

export function player(w: World) {
  return w.get(1)!;
}
