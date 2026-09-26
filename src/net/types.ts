import type { PlayerSlot } from '../sim/Entity';
import type { GameEvent } from '../sim/events';
import type { InputFrame, InputSource } from '../sim/InputFrame';
import type { World } from '../sim/World';

/**
 * De onde vêm as entradas e para onde vai o estado da partida.
 * - solo: um ou mais jogadores no mesmo aparelho (LocalAdapter); nada é publicado.
 * - host: o anfitrião online roda a simulação com a própria entrada + as recebidas, e publica o estado ~20×/s.
 * - client: quem entrou na sala só envia a própria entrada, recebe o estado e mostra (com interpolação).
 */
export interface NetAdapter {
  readonly role: 'solo' | 'host' | 'client';
  localSlots(): PlayerSlot[];
  collectInputs(tick: number): Map<PlayerSlot, InputFrame>;
  publish(tick: number, world: World, events: GameEvent[]): void;
  /** Substitui a entrada de um jogador deste aparelho (piloto automático); null devolve a original. */
  setOverride(s: InputSource | null, slot?: PlayerSlot): void;
  /** Cliente: aplica no mundo espelho o que chegou do anfitrião e devolve os eventos. */
  receive?(world: World): GameEvent[];
  /** Cliente: fração do caminho entre o estado anterior e o atual (interpolação da tela). */
  alpha?(): number;
  dispose(): void;
}
