import { describe, expect, it } from 'vitest';
import { createDoubleTap, updateDoubleTap } from './doubleTap';

function feed(seq: number[], window = 15) {
  let s = createDoubleTap();
  const out: boolean[] = [];
  seq.forEach((v, i) => {
    s = updateDoubleTap(s, v, i, window);
    out.push(s.running);
  });
  return out;
}

describe('toque duplo', () => {
  it('ativa corrida com dois toques rápidos na mesma direção', () => {
    const r = feed([1, 1, 0, 0, 1, 1, 1]);
    expect(r[4]).toBe(true);
    expect(r[6]).toBe(true);
  });

  it('não ativa se o segundo toque demorar', () => {
    const seq = [1, 0, ...Array(20).fill(0), 1];
    expect(feed(seq).at(-1)).toBe(false);
  });

  it('para ao soltar', () => {
    const r = feed([1, 0, 1, 1, 0]);
    expect(r[3]).toBe(true);
    expect(r[4]).toBe(false);
  });

  it('não ativa com direções diferentes', () => {
    expect(feed([1, 0, -1, -1]).at(-1)).toBe(false);
  });
});
