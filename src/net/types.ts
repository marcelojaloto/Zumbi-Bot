import type { PlayerSlot } from '../sim/Entity';
import type { GameEvent } from '../sim/events';
import type { InputFrame } from '../sim/InputFrame';
import type { World } from '../sim/World';

/**
 * Costura de rede para o co-op online futuro (até 5 jogadores; o local já existe via LocalAdapter).
 * - solo: coleta a entrada local e não publica nada.
 * - host (futuro): coleta entradas locais + remotas, publica snapshots a 20 Hz + eventos.
 * - cliente (futuro): envia entradas, recebe snapshots e interpola.
 */
export interface NetAdapter {
  readonly role: 'solo' | 'host' | 'client';
  localSlots(): PlayerSlot[];
  collectInputs(tick: number): Map<PlayerSlot, InputFrame>;
  publish(tick: number, world: World, events: GameEvent[]): void;
  dispose(): void;
}
