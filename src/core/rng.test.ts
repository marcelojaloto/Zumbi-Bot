import { describe, expect, it } from 'vitest';
import { Rng, hashString } from './rng';

describe('Rng', () => {
  it('é reprodutível com a mesma semente', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('sementes diferentes geram sequências diferentes', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('next() fica em [0,1) e int() respeita limites', () => {
    const r = new Rng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const n = r.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('escolha ponderada segue a distribuição', () => {
    const r = new Rng(9);
    const counts = [0, 0, 0];
    const N = 30000;
    for (let i = 0; i < N; i++) counts[r.weightedIndex([1, 2, 7])]!++;
    expect(counts[0]! / N).toBeCloseTo(0.1, 1);
    expect(counts[1]! / N).toBeCloseTo(0.2, 1);
    expect(counts[2]! / N).toBeCloseTo(0.7, 1);
  });

  it('estado pode ser salvo e restaurado', () => {
    const r = new Rng(5);
    r.next();
    const s = r.getState();
    const x = r.next();
    r.setState(s);
    expect(r.next()).toBe(x);
  });

  it('hashString é estável', () => {
    expect(hashString('vila-1')).toBe(hashString('vila-1'));
    expect(hashString('vila-1')).not.toBe(hashString('vila-2'));
  });
});
