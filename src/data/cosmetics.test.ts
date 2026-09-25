import { describe, expect, it } from 'vitest';
import { COSMETICS, RARITY_ORDER } from './cosmetics';
import { Rng } from '../core/rng';
import { pickCosmetic, rollRarity } from '../sim/systems/loot';

describe('cosméticos', () => {
  it('catálogo tem ~40 peças em 5 encaixes', () => {
    const all = Object.values(COSMETICS);
    expect(all.length).toBeGreaterThanOrEqual(38);
    for (const s of ['head', 'eyes', 'mask', 'body', 'back'])
      expect(all.some((c) => c.slot === s)).toBe(true);
    for (const c of all) expect(c.mesh.parts.length > 0 || !!c.cape).toBe(true);
  });

  it('raridade segue os pesos (±2%)', () => {
    const r = new Rng(123);
    const n = 20000;
    const counts: Record<string, number> = {};
    for (let i = 0; i < n; i++) {
      const k = rollRarity(r);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    expect((counts.common ?? 0) / n).toBeCloseTo(0.6, 1);
    expect(Math.abs((counts.uncommon ?? 0) / n - 0.28)).toBeLessThan(0.02);
    expect(Math.abs((counts.rare ?? 0) / n - 0.1)).toBeLessThan(0.02);
    expect(counts.legendary ?? 0).toBe(0);
    void RARITY_ORDER;
  });

  it('viés de conjunto mago/zumbi', () => {
    const r = new Rng(5);
    let wiz = 0;
    for (let i = 0; i < 2000; i++) if (pickCosmetic(r, 'common', 0.8)?.set === 'wizard') wiz++;
    expect(wiz / 2000).toBeGreaterThan(0.7);
  });
});

describe('loot por abate', () => {
  it('pity garante drop após 60 abates sem sorte', async () => {
    const { makeWorld } = await import('../sim/test/helpers');
    const { rollCosmeticDrop } = await import('../sim/systems/loot');
    const w = makeWorld();
    const p = w.get(1)!;
    let got = -1;
    for (let i = 1; i <= 60; i++) {
      if (rollCosmeticDrop(w, p, 0)) {
        got = i;
        break;
      }
    }
    expect(got).toBe(60);
    expect(p.player!.pity).toBe(0);
  });

  it('duplicata vira sucata', async () => {
    const { makeWorld } = await import('../sim/test/helpers');
    const { grantCosmetic } = await import('../sim/systems/loot');
    const w = makeWorld({ loadout: { ownedCosmetics: ['cap_torn'] } });
    const p = w.get(1)!;
    grantCosmetic(w, p, 'cap_torn');
    expect(p.player!.loot).not.toContain('cap_torn');
    expect(p.player!.scrap).toBeGreaterThan(0);
    grantCosmetic(w, p, 'hat_starry');
    expect(p.player!.loot).toContain('hat_starry');
  });
});
