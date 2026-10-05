import { afterEach, describe, expect, it } from 'vitest';
import { CHARACTERS } from '../data/characters';
import { MOVES } from '../data/melee';
import { REVIVE } from '../data/revive';
import { DEFENSE, PERKS, perkEffects, perksOf, specialsOf } from '../data/workshop';
import { spawnEnemy } from './ai/spawnEnemy';
import { applyHit } from './combat/applyHit';
import { Btn } from './InputFrame';
import { makeWorld, player, run } from './test/helpers';
import type { HitSpec } from '../data/types';

const PUNCH: HitSpec = { damage: 20, dtype: 'blunt', knockback: 2, hitstun: 10, hitstop: 0 };
const saved = { ...DEFENSE.guard };
afterEach(() => Object.assign(DEFENSE.guard, saved));

describe('Oficina: a árvore de cada personagem', () => {
  it('todo personagem tem atributos em 3 níveis, 2 combos, 2 especiais e 2 defesas; os golpes existem', () => {
    for (const c of Object.keys(CHARACTERS) as (keyof typeof CHARACTERS)[]) {
      const list = perksOf(c);
      const attrs = list.filter((p) => p.branch === 'attr');
      // quem atira e conjura tem 6 atributos; os outros, 5
      const both = CHARACTERS[c].arms.guns && CHARACTERS[c].arms.staff;
      expect(attrs.length, c).toBe(both ? 18 : 15);
      for (const b of ['combo', 'special', 'defense'] as const)
        expect(list.filter((p) => p.branch === b).length, `${c} ${b}`).toBe(2);
      for (const p of list) {
        if (p.special) expect(MOVES[p.special]?.special, p.id).toBe(true);
        if (p.combo) expect(MOVES[p.combo.to], p.id).toBeDefined();
        if (p.requires)
          expect(
            list.some((x) => x.id === p.requires),
            p.id,
          ).toBe(true);
      }
    }
    expect(new Set(PERKS.map((p) => p.id)).size).toBe(PERKS.length);
  });

  it('atributos ponderados: a Maga ganha pouca vida e muita magia; o Militar, o contrário', () => {
    const vigor = (c: 'mage' | 'military') => perkEffects(c, [`${c}.vigor1`]).hp;
    expect(vigor('mage')).toBeLessThan(vigor('military'));
    expect(perkEffects('mage', ['mage.magia1']).dmg.staff).toBeGreaterThan(0.08);
    expect(perksOf('mage').some((p) => p.attr?.id === 'pontaria')).toBe(false);
    expect(perksOf('military').some((p) => p.attr?.id === 'magia')).toBe(false);
    // melhorias de outro personagem não valem
    expect(perkEffects('robot', ['military.vigor1']).hp).toBe(0);
  });

  it('Vigor aumenta a vida máxima ao nascer e ao subir de nível', () => {
    const plain = makeWorld({ loadout: { level: 5 } });
    const strong = makeWorld({ loadout: { level: 5, perks: ['robot.vigor1', 'robot.vigor2'] } });
    expect(player(strong).health!.max).toBe(player(plain).health!.max + 30);
  });

  it('especial escolhido na Oficina sai no botão do especial; sem a melhoria, o original', () => {
    const w = makeWorld({ loadout: { perks: ['robot.special1'], special: 'pulsoEMP' } });
    run(w, 1, { buttons: Btn.Special });
    expect(player(w).fighter!.moveId).toBe('pulsoEMP');
    const w2 = makeWorld({ loadout: { special: 'pulsoEMP' } });
    run(w2, 1, { buttons: Btn.Special });
    expect(player(w2).fighter!.moveId).toBe(CHARACTERS.robot.special);
    expect(specialsOf('robot', ['robot.special1', 'robot.special2'])).toEqual([
      'giroTurbo',
      'pulsoEMP',
      'misselTeleguiado',
    ]);
  });

  it('combo novo: J depois do uppercut sai o golpe da Oficina', () => {
    const w = makeWorld({ loadout: { perks: ['robot.combo1'] } });
    const p = player(w);
    spawnEnemy(w, 'brute', p.t.x + 1, p.t.z, 'right');
    p.fighter!.state = 'idle';
    // jab, cross, gancho e uppercut
    for (let i = 0; i < 4; i++) {
      run(w, 1, { buttons: Btn.Punch });
      run(w, 12);
    }
    expect(p.fighter!.moveId).toBe('uppercut');
    let seen = false;
    for (let i = 0; i < 40 && !seen; i++) {
      run(w, 1, { buttons: i % 2 ? Btn.Punch : 0 });
      seen = p.fighter!.moveId === 'pistaoTurbo';
    }
    expect(seen).toBe(true);
  });
});

describe('defesas da Oficina', () => {
  it('Couraça: leva 15% menos dano', () => {
    const a = makeWorld({ loadout: { character: 'military' } });
    const b = makeWorld({
      loadout: { character: 'military', perks: ['military.defense1', 'military.defense2'] },
    });
    // militar: defesa 1 = Guarda (sem chance aqui), defesa 2 = Couraça
    DEFENSE.guard.chance = 0;
    const hurt = (w: typeof a) => {
      const p = player(w);
      const before = p.health!.hp;
      applyHit(w, undefined, p, PUNCH);
      return before - p.health!.hp;
    };
    expect(hurt(b)).toBeCloseTo(hurt(a) * DEFENSE.armor.mult, 0);
  });

  it('Guarda: de frente e sem atacar, bloqueia (pouco dano, não cai) e avisa', () => {
    DEFENSE.guard.chance = 1;
    const w = makeWorld({ loadout: { character: 'military', perks: ['military.defense1'] } });
    const p = player(w);
    p.t.facing = 1;
    const e = spawnEnemy(w, 'walker', p.t.x + 1, p.t.z, 'right');
    const before = p.health!.hp;
    applyHit(w, e, p, { ...PUNCH, knockdown: true });
    expect(before - p.health!.hp).toBeLessThanOrEqual(PUNCH.damage * DEFENSE.guard.mult + 1);
    expect(p.fighter!.state).not.toBe('knockdown');
    expect(w.drainEvents().some((ev) => ev.t === 'guard')).toBe(true);
    // pelas costas não bloqueia
    p.t.facing = -1;
    p.health!.invuln = 0;
    const mid = p.health!.hp;
    applyHit(w, e, p, PUNCH);
    expect(mid - p.health!.hp).toBeGreaterThan(PUNCH.damage * DEFENSE.guard.mult + 1);
  });

  it('Esquiva: toque duplo para cima desliza em profundidade sem levar dano', () => {
    const w = makeWorld({ loadout: { character: 'mage', perks: ['mage.defense1'] } });
    const p = player(w);
    const z0 = p.t.z;
    run(w, 2, { moveZ: -1 });
    run(w, 2);
    run(w, 1, { moveZ: -1 });
    expect(p.player!.dodge).toBeGreaterThan(0);
    expect(p.health!.invuln).toBeGreaterThan(0);
    expect(w.drainEvents().some((ev) => ev.t === 'dodge')).toBe(true);
    run(w, 10);
    expect(Math.abs(p.t.z - z0)).toBeGreaterThan(0.8);
    // sem a defesa, o toque duplo só anda
    const w2 = makeWorld({ loadout: { character: 'mage' } });
    run(w2, 2, { moveZ: -1 });
    run(w2, 2);
    run(w2, 1, { moveZ: -1 });
    expect(player(w2).player!.dodge).toBe(0);
  });

  it('Escudo de energia: começa cheio e recarrega depois de um tempo sem apanhar', () => {
    const w = makeWorld({ loadout: { perks: ['robot.defense1', 'robot.defense2'] } });
    const h = player(w).health!;
    expect(h.shield).toBe(DEFENSE.shield.max);
    h.shield = 0;
    h.sinceHit = 0;
    run(w, 60);
    expect(h.shield).toBe(0);
    run(w, 60 * (DEFENSE.shield.delayS + 2));
    expect(h.shield).toBeGreaterThan(5);
  });
});

describe('item especial de reviver', () => {
  it('caiu com o item: levanta ali mesmo com metade da vida, sem gastar vida, e o item se gasta', () => {
    const w = makeWorld({ loadout: { revive: true } });
    const p = player(w);
    const lives = p.player!.lives;
    const x = p.t.x;
    applyHit(w, undefined, p, { ...PUNCH, damage: 9999 });
    expect(p.fighter!.state).toBe('dead');
    expect(p.player!.revive).toBe(false);
    expect(p.player!.reviveUsed).toBe(true);
    run(w, REVIVE.delayTicks + 2);
    expect(p.player!.lives).toBe(lives);
    expect(p.fighter!.state).not.toBe('dead');
    expect(p.health!.hp).toBe(Math.round(p.health!.max * REVIVE.hpFrac));
    expect(Math.abs(p.t.x - x)).toBeLessThan(2);
    expect(
      w
        .drainEvents()
        .filter((ev) => ev.t === 'revive')
        .map((ev) => ev.t === 'revive' && ev.phase),
    ).toEqual(['down', 'up']);
    // na próxima queda já não tem: perde uma vida como sempre
    p.health!.invuln = 0;
    applyHit(w, undefined, p, { ...PUNCH, damage: 9999 });
    expect(p.player!.lives).toBe(lives - 1);
  });
});

describe('especiais novos', () => {
  it('Chuva de Meteoros: avisa no chão e os meteoros caem do céu e explodem à frente', () => {
    const w = makeWorld({
      loadout: { character: 'mage', perks: ['mage.special1'], special: 'chuvaMeteoros' },
    });
    const p = player(w);
    p.t.facing = 1;
    run(w, 1, { buttons: Btn.Special });
    run(w, MOVES.chuvaMeteoros!.startup + 1);
    const falling = w.entities.filter((e) => e.projectile && e.t.y > 5);
    expect(falling.length).toBe(7);
    for (const m of falling) expect(m.t.x).toBeGreaterThan(p.t.x);
    expect(w.entities.some((e) => e.hazard?.telegraph)).toBe(true);
    run(w, 120);
    expect(w.entities.filter((e) => e.projectile && e.projectile.visual === 'fireball')).toEqual([]);
  });
});
