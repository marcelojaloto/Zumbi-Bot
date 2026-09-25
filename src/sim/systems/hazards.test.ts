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

describe('projéteis destrutíveis', () => {
  it('tiro do jogador abate um míssil com vida', async () => {
    const { spawnProjectile } = await import('./projectiles');
    const w = makeWorld();
    const p = w.get(1)!;
    const boss = spawnEnemy(w, 'walker', 14, 0, 'right');
    const missile = spawnProjectile(w, {
      owner: boss,
      x: 9,
      y: 1.3,
      z: p.t.z,
      yaw: Math.PI,
      spec: {
        visual: 'missile',
        speed: 0.01,
        radius: 0.35,
        lifeS: 5,
        hp: 8,
        y: 1.3,
        hit: { damage: 14, dtype: 'explosive', knockback: 2, hitstun: 10, hitstop: 2 },
      },
    });
    const bullet = { damage: 14, dtype: 'bullet' as const, knockback: 1, hitstun: 6, hitstop: 1 };
    spawnProjectile(w, {
      owner: p,
      x: p.t.x + 0.5,
      y: 1.3,
      z: p.t.z,
      yaw: 0,
      spec: { visual: 'bullet', speed: 40, radius: 0.08, lifeS: 1, y: 1.3, hit: bullet },
    });
    run(w, 30);
    expect(missile.alive).toBe(false);
    expect(p.health!.hp).toBe(p.health!.max);
  });
});

describe('drones', () => {
  it('drone que chega pelo céu ou leva um golpe continua agindo', async () => {
    const { applyHit } = await import('../combat/applyHit');
    const w = makeWorld();
    const p = w.get(1)!;
    const d = spawnEnemy(w, 'drone', p.t.x + 5, 0, 'sky');
    run(w, 90);
    expect(d.fighter!.state).not.toBe('fall');
    applyHit(w, p, d, { damage: 1, dtype: 'bullet', knockback: 2, hitstun: 10, hitstop: 1 }, {});
    const x0 = d.t.x;
    run(w, 240);
    expect(d.fighter!.state).not.toBe('fall');
    expect(Math.abs(d.t.x - x0) + Math.abs(p.health!.max - p.health!.hp)).toBeGreaterThan(0.2);
  });
});
