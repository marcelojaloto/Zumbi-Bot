import { describe, expect, it } from 'vitest';
import { OnlineLock } from './onlineLock';

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('bloqueio do jogo online pelos pais', () => {
  it('começa liberado, bloqueia e libera, e fica guardado no aparelho', () => {
    const store = memStore();
    const lock = new OnlineLock(store);
    expect(lock.blocked).toBe(false);
    lock.block();
    expect(lock.blocked).toBe(true);
    expect(new OnlineLock(store).blocked).toBe(true);
    lock.unblock();
    expect(new OnlineLock(store).blocked).toBe(false);
  });

  it('sem armazenamento, o bloqueio vale até fechar o jogo', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    const lock = new OnlineLock(broken);
    lock.block();
    expect(lock.blocked).toBe(true);
  });
});
