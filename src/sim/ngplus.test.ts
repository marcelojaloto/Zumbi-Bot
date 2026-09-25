import { describe, expect, it } from 'vitest';
import { DIFFICULTY, NG_PLUS } from '../data/balance';
import { getMap } from '../data/maps';
import { spawnEnemy } from './ai/spawnEnemy';
import { spawnBoss } from './systems/boss';
import { getBoss } from '../data/bosses';
import { finishRun } from './level/LevelRunner';
import { makeWorld, run } from './test/helpers';

describe('Novo Jogo+', () => {
  it('inimigos e chefes ficam mais resistentes', () => {
    const a = makeWorld();
    const b = makeWorld({ ngPlus: true });
    const ea = spawnEnemy(a, 'walker', 5, 0, 'right');
    const eb = spawnEnemy(b, 'walker', 5, 0, 'right');
    expect(eb.health!.max).toBe(Math.round(ea.health!.max * NG_PLUS.enemyHp));
    expect(b.diff.enemyDmg).toBeCloseTo(a.diff.enemyDmg * NG_PLUS.enemyDmg);
    const ba = spawnBoss(a, getBoss('omega'), 8, 0);
    const bb = spawnBoss(b, getBoss('omega'), 8, 0);
    expect(bb.health!.max).toBe(Math.round(ba.health!.max * NG_PLUS.enemyHp));
  });

  it('pontuação e sucata multiplicadas no fim da partida', () => {
    const w = makeWorld({ ngPlus: true });
    const p = w.get(1)!.player!;
    p.score = 1000;
    p.scrap = 40;
    finishRun(w, false);
    const ev = w.drainEvents().find((e) => e.t === 'gameOver');
    expect(ev && ev.t === 'gameOver' && ev.stats.ngPlus).toBe(true);
    expect(p.scrap).toBe(60);
    expect(p.score).toBeGreaterThanOrEqual(1500);
  });
});

describe('OMEGA-Z', () => {
  it('fase 2 gira o elemento e muda o tipo de dano dos ataques', () => {
    const w = makeWorld({ map: getMap('arena') });
    const boss = spawnBoss(w, getBoss('omega'), 8, 0);
    boss.health!.hp = boss.health!.max * 0.7;
    const seen = new Set<string>();
    const dtypes = new Set<string>();
    for (let i = 0; i < 60 * 40; i++) {
      run(w, 1);
      seen.add(boss.boss!.element);
      for (const e of w.entities) {
        if (e.projectile && e.team === 'enemies') dtypes.add(e.projectile.hit.dtype);
        if (e.hazard && e.hazard.owner === boss.id && e.hazard.hit) dtypes.add(e.hazard.hit.dtype);
      }
    }
    expect(boss.boss!.phase).toBe(1);
    expect(seen.size).toBeGreaterThanOrEqual(4);
    expect([...dtypes].some((d) => d === 'ice' || d === 'electric' || d === 'toxic' || d === 'necro')).toBe(
      true,
    );
  });

  it('fase 3 cresce e aperta a arena', () => {
    const w = makeWorld({ map: getMap('arena') });
    const boss = spawnBoss(w, getBoss('omega'), 8, 0);
    boss.health!.hp = boss.health!.max * 0.4;
    run(w, 400);
    expect(boss.boss!.phase).toBe(2);
    expect(boss.scale).toBeCloseTo(2.5 * 1.3);
    expect(w.zBand).toEqual([-2, 1.2]);
  });
});

describe('dificuldade', () => {
  it('Muito fácil: chefe com metade da vida e mais tempo entre ataques', () => {
    const a = makeWorld();
    const b = makeWorld({ difficulty: 'veryEasy' });
    const ba = spawnBoss(a, getBoss('omega'), 8, 0);
    const bb = spawnBoss(b, getBoss('omega'), 8, 0);
    expect(bb.health!.max).toBe(Math.round(ba.health!.max * DIFFICULTY.veryEasy.bossHp));
    expect(DIFFICULTY.veryEasy.bossHp).toBeLessThan(DIFFICULTY.easy.bossHp);
    expect(DIFFICULTY.veryEasy.bossPace).toBeGreaterThan(DIFFICULTY.easy.bossPace);
    expect(DIFFICULTY.normal).toMatchObject({ enemyDmg: 1, enemyHp: 1, bossHp: 1, bossPace: 1 });
  });
});
