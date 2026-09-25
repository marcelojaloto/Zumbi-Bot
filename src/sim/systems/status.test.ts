import { describe, expect, it } from 'vitest';
import { Btn } from '../InputFrame';
import { makeWorld, player, run } from '../test/helpers';
import { spawnEnemy } from '../ai/spawnEnemy';
import { applyStatus } from './status';
import type { Entity } from '../Entity';

function idle(e: Entity): Entity {
  (e.fighter as { state: string }).state = 'idle';
  return e;
}

describe('status', () => {
  it('queimar causa 4/s por 3 s (x1,3 em zumbis)', () => {
    const w = makeWorld();
    const z = idle(spawnEnemy(w, 'walker', 30, 0, 'right'));
    z.ai!.aggro = false;
    const hp0 = z.health!.hp;
    applyStatus(w, z, { id: 'burn' }, 0);
    run(w, 200);
    expect(hp0 - z.health!.hp).toBe(15);
    expect(z.statuses!.length).toBe(0);
  });

  it('3 acúmulos de resfriado congelam', () => {
    const w = makeWorld();
    const z = idle(spawnEnemy(w, 'walker', 30, 0, 'right'));
    applyStatus(w, z, { id: 'chill' }, 0);
    applyStatus(w, z, { id: 'chill' }, 0);
    expect(z.statuses!.find((s) => s.id === 'chill')!.stacks).toBe(2);
    applyStatus(w, z, { id: 'chill' }, 0);
    expect(z.statuses!.some((s) => s.id === 'freeze')).toBe(true);
    expect(z.fighter!.state).toBe('frozen');
  });

  it('imunidade (cuspidor não é envenenado)', () => {
    const w = makeWorld();
    const z = spawnEnemy(w, 'spitter', 30, 0, 'right');
    expect(applyStatus(w, z, { id: 'poison' }, 0)).toBe(false);
  });

  it('hackear troca o time e reverte ao fim', () => {
    const w = makeWorld();
    const r = spawnEnemy(w, 'soldier', 30, 0, 'right');
    applyStatus(w, r, { id: 'hacked', durationS: 1 }, 1);
    expect(r.team).toBe('players');
    run(w, 70);
    expect(r.team).toBe('enemies');
  });

  it('controlado pela necromancia desmorona ao fim', () => {
    const w = makeWorld();
    const z = spawnEnemy(w, 'walker', 30, 0, 'right');
    applyStatus(w, z, { id: 'raised', durationS: 0.5 }, 1);
    expect(z.team).toBe('players');
    run(w, 40);
    expect(z.fighter!.state).toBe('dead');
  });

  it('molhado + elétrico conduz (x1,6 e remove molhado)', () => {
    const w = makeWorld();
    const p = player(w);
    const z = idle(spawnEnemy(w, 'soldier', p.t.x + 3, p.t.z, 'right'));
    applyStatus(w, z, { id: 'wet' }, 0);
    p.player!.staffs = ['electric'];
    p.player!.mode = 'staff';
    const hp0 = z.health!.hp;
    run(w, 1, { buttons: Btn.Fire });
    run(w, 12);
    // 16 * 1,5 (robô) * 1,6 (conduz) = 38,4
    expect(hp0 - z.health!.hp).toBe(38);
    expect(z.statuses!.some((s) => s.id === 'wet')).toBe(false);
  });
});

describe('cajados', () => {
  it('gasta mana e respeita cooldown', () => {
    const w = makeWorld();
    const p = player(w);
    const pc = p.player!;
    pc.staffs = ['fire'];
    pc.mode = 'staff';
    run(w, 1, { buttons: Btn.Fire });
    expect(pc.mana).toBe(100 - 12);
    run(w, 20);
    run(w, 1, { buttons: Btn.Fire });
    expect(pc.mana).toBe(100 - 12);
    run(w, 30);
    run(w, 1, { buttons: Btn.Fire });
    expect(pc.mana).toBe(100 - 24);
  });

  it('cura recupera vida', () => {
    const w = makeWorld();
    const p = player(w);
    p.health!.hp = 40;
    p.player!.mode = 'staff';
    run(w, 1, { buttons: Btn.Fire });
    run(w, 20);
    expect(p.health!.hp).toBeGreaterThanOrEqual(75);
  });

  for (const staff of ['fire', 'water', 'ice', 'electric', 'toxic', 'wind', 'earth'] as const) {
    it(`${staff} causa dano`, () => {
      const w = makeWorld();
      const p = player(w);
      const z = idle(spawnEnemy(w, 'walker', p.t.x + 3, p.t.z, 'right'));
      p.player!.staffs = [staff];
      p.player!.mode = 'staff';
      const hp0 = z.health!.hp;
      run(w, 1, { buttons: Btn.Fire });
      run(w, 90);
      expect(z.health!.hp).toBeLessThan(hp0);
    });
  }

  it('cibernético hackeia robô', () => {
    const w = makeWorld();
    const p = player(w);
    const r = idle(spawnEnemy(w, 'soldier', p.t.x + 3, p.t.z, 'right'));
    p.player!.staffs = ['cyber'];
    p.player!.mode = 'staff';
    run(w, 1, { buttons: Btn.Fire });
    run(w, 40);
    expect(r.team).toBe('players');
  });

  it('necromante controla zumbi', () => {
    const w = makeWorld();
    const p = player(w);
    const z = idle(spawnEnemy(w, 'walker', p.t.x + 3, p.t.z, 'right'));
    p.player!.staffs = ['necro'];
    p.player!.mode = 'staff';
    run(w, 1, { buttons: Btn.Fire });
    run(w, 60);
    expect(z.team).toBe('players');
  });
});
