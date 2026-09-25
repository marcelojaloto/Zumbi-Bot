import { describe, expect, it } from 'vitest';
import { makeWorld, run } from '../sim/test/helpers';
import { applySnapshot, serializeWorld } from '../sim/snapshot';

describe('snapshot de rede', () => {
  it('serializa e reaplica o estado', () => {
    const a = makeWorld({ seed: 3 });
    run(a, 30, { moveX: 1 });
    const snap = serializeWorld(a);
    const b = makeWorld({ seed: 99 });
    applySnapshot(b, snap);
    expect(b.tick).toBe(a.tick);
    expect(b.get(1)!.t.x).toBeCloseTo(a.get(1)!.t.x);
    expect(b.rng.next()).toBe(a.rng.next());
  });
});
