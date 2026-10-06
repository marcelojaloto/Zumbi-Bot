import { describe, expect, it } from 'vitest';
import { gateNumbers } from './parentGate';

describe('trava para pais', () => {
  it('a conta fica entre 12 × 3 e 19 × 9', () => {
    expect(gateNumbers(() => 0)).toEqual({ a: 12, b: 3 });
    expect(gateNumbers(() => 0.999)).toEqual({ a: 19, b: 9 });
    for (let i = 0; i < 50; i++) {
      const { a, b } = gateNumbers();
      expect(a).toBeGreaterThanOrEqual(12);
      expect(a).toBeLessThanOrEqual(19);
      expect(b).toBeGreaterThanOrEqual(3);
      expect(b).toBeLessThanOrEqual(9);
    }
  });
});
