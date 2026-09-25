import { describe, expect, it } from 'vitest';
import { comboMultiplier, xpToNext } from '../data/balance';
import { computeStars, levelEndBonus } from './progression';

describe('progressão', () => {
  it('curva de XP cresce', () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(4)).toBe(800);
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(9));
  });

  it('multiplicador de combo', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(5)).toBeCloseTo(1.1);
    expect(comboMultiplier(12)).toBeCloseTo(1.2);
    expect(comboMultiplier(1000)).toBe(3);
  });

  it('estrelas', () => {
    expect(computeStars({ completed: false, livesLost: 0, timeS: 1, parTimeS: 10 })).toBe(0);
    expect(computeStars({ completed: true, livesLost: 1, timeS: 20, parTimeS: 10 })).toBe(1);
    expect(computeStars({ completed: true, livesLost: 0, timeS: 20, parTimeS: 10 })).toBe(2);
    expect(computeStars({ completed: true, livesLost: 0, timeS: 5, parTimeS: 10 })).toBe(3);
  });

  it('bônus de fim de fase', () => {
    expect(levelEndBonus({ completed: true, livesLost: 0, timeS: 90, parTimeS: 100 })).toBe(
      5000 + 200 + 10000,
    );
    expect(levelEndBonus({ completed: true, livesLost: 2, timeS: 200, parTimeS: 100 })).toBe(5000);
  });
});
