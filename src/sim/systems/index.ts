import type { PlayerSlot } from '../Entity';
import type { InputFrame } from '../InputFrame';
import type { World } from '../World';
import { playerControl } from './playerControl';
import { aiSystem } from '../ai/brains';
import { bossSystem } from './boss';
import { fighterSystem } from '../combat/fighter';
import { movementSystem, cameraSystem } from './movement';
import { projectileSystem } from './projectiles';
import { hazardSystem } from './hazards';
import { statusSystem } from './status';
import { pickupSystem } from './pickups';
import { levelSystem } from '../level/LevelRunner';
import { cleanupSystem } from './cleanup';

/** Ordem fixa dos sistemas a cada tick. */
export function runSystems(w: World, inputs: ReadonlyMap<PlayerSlot, InputFrame>): void {
  if (w.slowmo > 0) w.slowmo--;
  if (w.freeze > 0) {
    w.freeze--;
    return;
  }
  playerControl(w, inputs);
  aiSystem(w);
  bossSystem(w);
  fighterSystem(w);
  movementSystem(w);
  cameraSystem(w);
  projectileSystem(w);
  hazardSystem(w);
  statusSystem(w);
  pickupSystem(w);
  levelSystem(w);
  cleanupSystem(w);
}
