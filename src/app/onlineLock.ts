const STORE = 'zumbibot.onlinelock.v1';

/**
 * Bloqueio do jogo online neste aparelho, pelos pais (Configurações > Jogo). Bloquear é na hora; liberar pede a trava
 * para pais. Fica guardado à parte do save, então "Apagar progresso" não desfaz o bloqueio. É a ferramenta para os
 * responsáveis desligarem a interação com outros jogadores (Lei 14.852/2024, art. 16, VII; ECA Digital, art. 17).
 */
export class OnlineLock {
  /** O bloqueio, quando o aparelho não deixa guardar (vale até fechar o jogo). */
  private mem = '';

  constructor(private store: Pick<globalThis.Storage, 'getItem' | 'setItem'> | null = safeStorage()) {}

  get blocked(): boolean {
    try {
      const v = this.store?.getItem(STORE);
      if (v !== null && v !== undefined) return v === 'blocked';
    } catch {
      /* sem armazenamento: vale o que está na memória */
    }
    return this.mem === 'blocked';
  }

  block(): void {
    this.save('blocked');
  }

  /** Só depois da trava para pais. */
  unblock(): void {
    this.save('');
  }

  private save(v: string): void {
    this.mem = v;
    try {
      this.store?.setItem(STORE, v);
    } catch {
      /* sem armazenamento: vale até fechar o jogo */
    }
  }
}

function safeStorage(): Pick<globalThis.Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
