import { describe, expect, it, vi } from 'vitest';
import { VoiceGate, readAgeSignal, type StoreAgeRange } from './voiceGate';

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

const shared = (ageRange: StoreAgeRange['ageRange'], extra: Partial<StoreAgeRange> = {}): StoreAgeRange => ({
  status: 'SHARED',
  ageRange,
  ...extra,
});

describe('trava do chat de voz por idade', () => {
  it('lê a resposta da loja', () => {
    expect(readAgeSignal(shared({ lowerBound: 18 }))).toBe('adult');
    expect(readAgeSignal(shared({ lowerBound: 21, upperBound: 99 }))).toBe('adult');
    // menor com limites de comunicação (iOS) ou com a mudança recusada pelo responsável (Android)
    expect(readAgeSignal(shared({ upperBound: 17, activeParentalControls: ['COMMUNICATION_LIMITS'] }))).toBe(
      'limited',
    );
    expect(readAgeSignal(shared({ upperBound: 15 }, { significantChange: { status: 'DECLINED' } }))).toBe(
      'limited',
    );
    // menor sem controle dos pais, idade não compartilhada, sem resposta: fica com um adulto liberar
    expect(readAgeSignal(shared({ upperBound: 17 }))).toBe('unknown');
    expect(readAgeSignal({ status: 'NOT_SHARED' })).toBe('unknown');
    expect(readAgeSignal({ status: 'VERIFICATION_REQUIRED' })).toBe('unknown');
    expect(readAgeSignal(null)).toBe('unknown');
  });

  it('começa desligada e só um adulto libera, até bloquear de novo', async () => {
    const changed = vi.fn();
    const store = memStore();
    const g = new VoiceGate(async () => null, changed, store);
    await g.check();
    expect(g.state).toBe('ask');
    expect(g.allowed).toBe(false);
    g.release();
    expect(g.state).toBe('allowed');
    // a liberação fica guardada no aparelho
    expect(
      new VoiceGate(
        async () => null,
        () => {},
        store,
      ).allowed,
    ).toBe(true);
    g.revoke();
    expect(g.state).toBe('ask');
    expect(changed).toHaveBeenCalledTimes(3);
  });

  it('adulto confirmado pela loja já tem a voz liberada', async () => {
    const g = new VoiceGate(
      async () => shared({ lowerBound: 18 }),
      () => {},
      memStore(),
    );
    expect(g.allowed).toBe(false);
    await g.check();
    expect(g.allowed).toBe(true);
  });

  it('com os pais limitando a comunicação, nem um adulto libera pelo jogo', async () => {
    const g = new VoiceGate(
      async () => shared({ upperBound: 12, activeParentalControls: ['COMMUNICATION_LIMITS'] }),
      () => {},
      memStore(),
    );
    await g.check();
    g.release();
    expect(g.state).toBe('blocked');
  });

  it('pergunta à loja uma vez só, e erro vale idade desconhecida', async () => {
    const read = vi.fn(() => Promise.reject(new Error('API_NOT_AVAILABLE')));
    const g = new VoiceGate(read, () => {}, memStore());
    await Promise.all([g.check(), g.check()]);
    await g.check();
    expect(read).toHaveBeenCalledTimes(1);
    expect(g.state).toBe('ask');
  });

  it('sem armazenamento, a liberação vale até fechar o jogo', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    const g = new VoiceGate(
      async () => null,
      () => {},
      broken,
    );
    g.release();
    expect(g.allowed).toBe(true);
  });
});
