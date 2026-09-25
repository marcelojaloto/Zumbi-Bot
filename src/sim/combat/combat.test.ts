import { describe, expect, it } from 'vitest';
import { Btn } from '../InputFrame';
import { makeWorld, player, run } from '../test/helpers';
import { spawnEnemy } from '../ai/spawnEnemy';
import { computeDamage, falloff } from './damage';
import { spawnProp } from '../systems/props';
import { killEntity } from './applyHit';

describe('dano', () => {
  it('resistências, crítico, dano duplo e escudo', () => {
    expect(computeDamage({ base: 10, dtype: 'fire', target: { resist: { fire: 1.3 } } }).amount).toBe(13);
    expect(computeDamage({ base: 10, dtype: 'blunt', crit: true, target: {} }).amount).toBe(15);
    expect(
      computeDamage({ base: 10, dtype: 'blunt', attacker: { powerDouble: true }, target: {} }).amount,
    ).toBe(20);
    const s = computeDamage({ base: 30, dtype: 'blunt', target: { shield: 20 } });
    expect(s.toShield).toBe(20);
    expect(s.amount).toBe(10);
    expect(computeDamage({ base: 0.2, dtype: 'blunt', target: {} }).amount).toBe(1);
    expect(computeDamage({ base: 10, dtype: 'toxic', target: { resist: { toxic: 0 } } }).total).toBe(0);
  });

  it('interações elementais', () => {
    const conduct = computeDamage({
      base: 10,
      dtype: 'electric',
      target: { statuses: [{ id: 'wet', stacks: 1 }] },
    });
    expect(conduct.amount).toBe(16);
    expect(conduct.removeStatuses).toContain('wet');
    expect(conduct.addStatuses.map((a) => a.id)).toContain('stun');
    const shatter = computeDamage({
      base: 10,
      dtype: 'blunt',
      target: { statuses: [{ id: 'freeze', stacks: 1 }], hpFrac: 0.1 },
    });
    expect(shatter.shatter).toBe(true);
    const boss = computeDamage({
      base: 10,
      dtype: 'blunt',
      target: { statuses: [{ id: 'freeze', stacks: 1 }], hpFrac: 0.1, isBoss: true },
    });
    expect(boss.shatter).toBe(false);
  });

  it('queda por distância', () => {
    expect(falloff(5, 10, 20, 0.5)).toBe(1);
    expect(falloff(15, 10, 20, 0.5)).toBeCloseTo(0.75);
    expect(falloff(30, 10, 20, 0.5)).toBe(0.5);
  });
});

describe('combate corpo a corpo', () => {
  it('soco acerta e mata um zumbi com combo', () => {
    const w = makeWorld();
    const p = player(w);
    const z = spawnEnemy(w, 'walker', p.t.x + 0.9, p.t.z, 'right');
    const fz = z.fighter as { state: string };
    fz.state = 'idle';
    const hp0 = z.health!.hp;
    run(w, 1, { buttons: Btn.Punch });
    run(w, 10);
    expect(z.health!.hp).toBeLessThan(hp0);
    // combo completo várias vezes
    for (let i = 0; i < 12 && fz.state !== 'dead'; i++) {
      run(w, 1, { buttons: Btn.Punch });
      run(w, 8);
    }
    expect(fz.state === 'dead' || z.health!.hp < hp0).toBe(true);
    expect(p.player!.score).toBeGreaterThan(0);
  });

  it('zumbi ataca o jogador parado', () => {
    const w = makeWorld();
    const p = player(w);
    spawnEnemy(w, 'walker', p.t.x + 2, p.t.z, 'right');
    run(w, 600);
    expect(p.health!.hp).toBeLessThan(p.health!.max);
  });

  it('matar dá XP e pontos', () => {
    const w = makeWorld();
    const p = player(w);
    const z = spawnEnemy(w, 'walker', p.t.x + 0.9, p.t.z, 'right');
    z.health!.hp = 1;
    z.fighter!.state = 'idle';
    run(w, 1, { buttons: Btn.Punch });
    run(w, 10);
    expect(z.fighter!.state).toBe('dead');
    expect(p.player!.kills).toBe(1);
    expect(p.player!.xp).toBeGreaterThan(0);
  });

  it('diretor limita atacantes simultâneos', () => {
    const w = makeWorld();
    const p = player(w);
    p.player!.god = true;
    for (let i = 0; i < 8; i++) spawnEnemy(w, 'walker', p.t.x + 2 + i * 0.5, p.t.z + (i % 3) - 1, 'right');
    let maxTokens = 0;
    for (let i = 0; i < 400; i++) {
      run(w, 1);
      maxTokens = Math.max(maxTokens, w.director.melee.get(p.id)?.length ?? 0);
    }
    expect(maxTokens).toBeLessThanOrEqual(w.diff.meleeTokens);
    expect(maxTokens).toBeGreaterThan(0);
  });

  it('giro turbo gasta mana e acerta em volta', () => {
    const w = makeWorld();
    const p = player(w);
    const a = spawnEnemy(w, 'walker', p.t.x + 1.2, p.t.z, 'right');
    const b = spawnEnemy(w, 'walker', p.t.x - 1.2, p.t.z, 'left');
    a.fighter!.state = b.fighter!.state = 'idle';
    run(w, 1, { buttons: Btn.Special });
    expect(p.player!.mana).toBeLessThan(80);
    run(w, 30);
    expect(a.health!.hp).toBeLessThan(a.health!.max);
    expect(b.health!.hp).toBeLessThan(b.health!.max);
  });
});

describe('inimigos à distância', () => {
  for (const id of ['soldier', 'drone', 'spitter', 'mech']) {
    it(`${id} causa dano à distância`, () => {
      const w = makeWorld({ seed: 11 });
      const p = player(w);
      spawnEnemy(w, id, p.t.x + 7, p.t.z, 'right');
      run(w, 900);
      expect(p.health!.hp).toBeLessThan(p.health!.max);
    });
  }
});

describe('objetos', () => {
  it('barris explosivos em cadeia não entram em recursão', () => {
    const w = makeWorld();
    const p = player(w);
    const first = spawnProp(w, { kind: 'explosiveBarrel', x: p.t.x + 1, z: p.t.z });
    for (let i = 1; i < 4; i++) spawnProp(w, { kind: 'explosiveBarrel', x: p.t.x + 1 + i * 0.8, z: p.t.z });
    const z = spawnEnemy(w, 'walker', p.t.x + 2, p.t.z, 'right');
    killEntity(w, first, 1);
    run(w, 30);
    expect(w.entities.filter((e) => e.kind === 'prop').length).toBe(0);
    expect(z.health!.hp).toBeLessThan(z.health!.max);
  });
});
