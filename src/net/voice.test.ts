import { describe, expect, it } from 'vitest';
import { SPEAK_HOLD, SPEAK_LEVEL, SpeakingDetector, callPlan, levelBetween, micProblem, rms } from './voice';

const m = (slot: 0 | 1 | 2 | 3 | 4, pid: string) => ({ slot, pid });

describe('chat de voz', () => {
  it('malha: em cada par o de slot menor liga; todos ficam ligados com todos', () => {
    const members = [m(0, 'a'), m(1, 'b'), m(2, 'c'), m(3, 'd')];
    expect(callPlan(members, 0, []).call).toEqual(['b', 'c', 'd']);
    expect(callPlan(members, 1, []).call).toEqual(['c', 'd']);
    expect(callPlan(members, 3, []).call).toEqual([]);
    // cada par aparece exatamente uma vez
    const pairs = members.flatMap((x) => callPlan(members, x.slot, []).call.map((to) => [x.pid, to].join()));
    expect(pairs.length).toBe(6);
    expect(new Set(pairs).size).toBe(6);
  });

  it('não liga de novo para quem já está na chamada; desfaz chamadas de quem saiu', () => {
    const members = [m(0, 'a'), m(2, 'c'), m(4, 'e')];
    expect(callPlan(members, 0, ['c'])).toEqual({ call: ['e'], close: [] });
    expect(callPlan(members, 2, ['a', 'x'])).toEqual({ call: ['e'], close: ['x'] });
    // quem entrou no lugar de quem saiu tem outro id
    expect(callPlan([m(0, 'a'), m(1, 'z')], 0, ['b'])).toEqual({ call: ['z'], close: ['b'] });
  });

  it('nível do áudio e indicador de quem está falando (sem piscar entre as palavras)', () => {
    expect(rms([])).toBe(0);
    expect(rms([0.5, -0.5, 0.5, -0.5])).toBeCloseTo(0.5);
    // um bipe de 50 ms com nível 0,5 entre duas leituras (100 ms) ainda conta como fala
    expect(
      levelBetween({ energy: 1, duration: 10 }, { energy: 1 + 0.25 * 0.05, duration: 10.1 }),
    ).toBeCloseTo(Math.sqrt(0.125));
    expect(levelBetween(null, { energy: 1, duration: 1 })).toBeNull();
    expect(levelBetween({ energy: 1, duration: 1 }, { energy: 1, duration: 1 })).toBe(0);
    expect(levelBetween({ energy: 1, duration: 2 }, { energy: 0, duration: 1 })).toBeNull();
    const d = new SpeakingDetector();
    expect(d.update(0.001, 0.1)).toBe(false);
    expect(d.update(SPEAK_LEVEL * 3, 0.1)).toBe(true);
    expect(d.update(0, 0.1)).toBe(true);
    expect(d.update(0, SPEAK_HOLD)).toBe(false);
  });

  it('erros do microfone viram mensagens que dá para explicar', () => {
    expect(micProblem({ name: 'NotAllowedError' })).toBe('denied');
    expect(micProblem({ name: 'SecurityError' })).toBe('denied');
    expect(micProblem({ name: 'NotFoundError' })).toBe('no-mic');
    expect(micProblem({ name: 'NotReadableError' })).toBe('busy');
    expect(micProblem(new Error('x'))).toBe('error');
    expect(micProblem(null)).toBe('error');
  });
});
