import type { PlayerSlot } from '../sim/Entity';
import type { InputFrame, InputSource } from '../sim/InputFrame';
import type { NetAdapter } from './types';

/**
 * Adaptador local: um ou mais jogadores na mesma máquina, sem rede. Cada jogador tem sua fonte de entrada
 * (teclado, metade do teclado, controle ou toque); depois de ler todos, `onTickEnd` limpa os toques curtos.
 */
export class LocalAdapter implements NetAdapter {
  readonly role = 'solo' as const;
  private sources: InputSource[];
  private overrides = new Map<PlayerSlot, InputSource>();

  constructor(
    sources: InputSource | InputSource[],
    private onTickEnd?: () => void,
  ) {
    this.sources = (Array.isArray(sources) ? sources : [sources]).slice().sort((a, b) => a.slot - b.slot);
  }

  /** Substitui a fonte de entrada de um jogador (piloto automático / replay em testes); null devolve a original. */
  setOverride(s: InputSource | null, slot: PlayerSlot = s?.slot ?? 0): void {
    if (s) this.overrides.set(slot, s);
    else this.overrides.delete(slot);
  }

  localSlots(): PlayerSlot[] {
    return this.sources.map((s) => s.slot);
  }

  collectInputs(tick: number): Map<PlayerSlot, InputFrame> {
    const out = new Map<PlayerSlot, InputFrame>();
    for (const src of this.sources) {
      const s = this.overrides.get(src.slot) ?? src;
      out.set(src.slot, s.sample(tick));
    }
    this.onTickEnd?.();
    return out;
  }

  publish(): void {}

  dispose(): void {}
}
