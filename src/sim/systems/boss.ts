import type { Entity, EntityId } from '../Entity';
import type { World } from '../World';

/** Bosses (implementado no M6). */
export function bossSystem(_w: World): void {}

export function onBossKilled(_w: World, _e: Entity, _killer: EntityId): void {}
