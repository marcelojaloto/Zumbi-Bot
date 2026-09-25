import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../ai/spawnEnemy';
import { makeWorld, run } from '../test/helpers';
import { spawnHazard } from './effects';

describe('perigos', () => {
  it('zona com tickEvery acerta no início e depois a cada intervalo (sem acerto duplo)', () => {
    const w = makeWorld();
    const e = spawnEnemy(w, 'brute', 8, 0, 'right');
    e.ai = undefined;
    let hits = 0;
    spawnHazard(w, {
      x: 8,
      z: 0,
      owner: 1,
      team: 'players',
      shape: { k: 'circle', r: 1.5 },
      hit: { damage: 1, dtype: 'fire', knockback: 0, hitstun: 0, hitstop: 0 },
      active: 36,
      tickEvery: 12,
      fx: 'fire',
    });
    for (let i = 0; i < 40; i++) {
      run(w, 1);
      hits += w.drainEvents().filter((ev) => ev.t === 'hit' && ev.dst === e.id && ev.amount > 0).length;
    }
    expect(hits).toBe(3);
  });

  it('golpe só de status aplica o efeito mesmo sem dano', () => {
    const w = makeWorld();
    const e = spawnEnemy(w, 'walker', 8, 0, 'right');
    spawnHazard(w, {
      x: 8,
      z: 0,
      owner: 1,
      team: 'players',
      shape: { k: 'circle', r: 1.5 },
      hit: { damage: 0, dtype: 'water', knockback: 0, hitstun: 0, hitstop: 0, status: { id: 'wet' } },
      active: 2,
      fx: 'water',
    });
    run(w, 2);
    expect(e.statuses?.some((s) => s.id === 'wet')).toBe(true);
    expect(e.health!.hp).toBe(e.health!.max);
  });
});
