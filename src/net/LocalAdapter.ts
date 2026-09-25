import type { PlayerSlot } from '../sim/Entity';
import type { InputFrame, InputSource } from '../sim/InputFrame';
import type { NetAdapter } from './types';

/** Adaptador solo: um jogador local, sem rede. */
export class LocalAdapter implements NetAdapter {
  readonly role = 'solo' as const;
  private override: InputSource | null = null;

  constructor(private source: InputSource) {}

  /** Substitui a fonte de entrada (autopilot / replay em testes). */
  setOverride(s: InputSource | null): void {
    this.override = s;
  }

  localSlots(): PlayerSlot[] {
    return [this.source.slot];
  }

  collectInputs(tick: number): Map<PlayerSlot, InputFrame> {
    const src = this.override ?? this.source;
    return new Map([[src.slot, src.sample(tick)]]);
  }

  publish(): void {}

  dispose(): void {}
}
