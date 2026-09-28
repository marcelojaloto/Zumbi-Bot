import { describe, expect, it } from 'vitest';
import { CHARACTERS, CHARACTER_ORDER, RAGE } from '../data/characters';
import { MOVES } from '../data/melee';
import type { CharacterId, HitSpec } from '../data/types';
import { sanitizeSave } from '../save/migrations';
import { defaultSave } from '../save/schema';
import { spawnEnemy } from './ai/spawnEnemy';
import { applyHit } from './combat/applyHit';
import type { Entity } from './Entity';
import { Btn } from './InputFrame';
import { grantXp } from './progression';
import { makeWorld, player, run } from './test/helpers';
import type { World } from './World';

function world(character: CharacterId): World {
  return makeWorld({ loadout: { character, staffs: ['heal', 'fire'] } });
}

function walker(w: World, dx: number, dz = 0): Entity {
  const p = player(w);
  const e = spawnEnemy(w, 'walker', p.t.x + dx, p.t.z + dz, 'right');
  e.health!.max = e.health!.hp = 500;
  return e;
}

const hurt = (e: Entity) => e.health!.max - e.health!.hp;
const SLAP: HitSpec = { damage: 10, dtype: 'blunt', knockback: 0, hitstun: 5, hitstop: 0 };

/** Usa o especial e avança `ticks` quadros. */
function special(w: World, ticks: number): void {
  run(w, 1, { buttons: Btn.Special });
  run(w, ticks);
}

describe('personagens', () => {
  it('cada um tem especial próprio, marcado e com custo de mana', () => {
    const specials = new Set<string>();
    for (const id of CHARACTER_ORDER) {
      const c = CHARACTERS[id];
      const m = MOVES[c.special];
      expect(m?.special, id).toBe(true);
      expect(m?.manaCost, id).toBeGreaterThan(0);
      specials.add(c.special);
    }
    expect(specials.size).toBe(CHARACTER_ORDER.length);
  });

  it('o robô continua com os números de antes (base 100/100, sem multiplicadores)', () => {
    const r = CHARACTERS.robot.stats;
    expect([r.hp, r.mana, r.speed, r.jump, r.reload, r.manaRegen]).toEqual([100, 100, 1, 1, 1, 1]);
    expect(Object.values(r.dmg).every((v) => v === 1)).toBe(true);
    expect(CHARACTERS.robot.special).toBe('giroTurbo');
  });

  it('nascem com vida, mana, massa e modo do personagem', () => {
    for (const id of CHARACTER_ORDER) {
      const c = CHARACTERS[id];
      const p = player(world(id));
      expect(p.player!.character).toBe(id);
      expect(p.health!.max).toBe(c.stats.hp);
      expect(p.player!.manaMax).toBe(c.stats.mana);
      expect(p.body!.mass).toBe(c.stats.mass);
      expect(p.player!.mode).toBe(c.startMode);
    }
  });

  it('subir de nível mantém a vida base do personagem', () => {
    const w = world('military');
    const p = player(w);
    grantXp(w, p, 1000);
    expect(p.player!.level).toBeGreaterThan(1);
    expect(p.health!.max).toBe(140 + 5 * (p.player!.level - 1));
  });

  it('dano por origem: soco do militar ×1,3 e magia da maga ×1,35', () => {
    const base = (id: CharacterId, source: 'melee' | 'staff') => {
      const w = world(id);
      const e = walker(w, 3);
      applyHit(w, player(w), e, SLAP, { source });
      return hurt(e);
    };
    expect(base('military', 'melee')).toBe(13);
    expect(base('robot', 'melee')).toBe(10);
    expect(base('mage', 'staff')).toBe(14);
    expect(base('mage', 'melee')).toBe(9);
  });

  it('resistências: militar apanha menos de tiro; ciborgue apanha mais de choque', () => {
    const took = (id: CharacterId, dtype: HitSpec['dtype']) => {
      const w = world(id);
      const p = player(w);
      applyHit(w, undefined, p, { ...SLAP, dtype });
      return p.health!.max - p.health!.hp;
    };
    expect(took('robot', 'bullet')).toBe(10);
    expect(took('military', 'bullet')).toBe(8);
    expect(took('cyborg', 'electric')).toBe(12);
  });

  it('Nova Arcana (maga) acerta inimigos dos dois lados', () => {
    const w = world('mage');
    const a = walker(w, 2);
    const b = walker(w, -2.2, 0.4);
    special(w, 22);
    expect(hurt(a)).toBeGreaterThan(0);
    expect(hurt(b)).toBeGreaterThan(0);
  });

  it('Nova Arcana (maga) lança uma bola de fogo roxa que acerta longe, à frente', () => {
    const w = world('mage');
    const far = walker(w, 7);
    const behind = walker(w, -7);
    const booms: string[] = [];
    run(w, 1, { buttons: Btn.Special });
    for (let i = 0; i < 60; i++) {
      run(w, 1);
      for (const x of w.drainEvents()) if (x.t === 'explosion') booms.push(x.element ?? '');
    }
    expect(hurt(far)).toBeGreaterThan(20);
    expect(hurt(behind)).toBe(0);
    // explodiu no alvo, em fogo arcano (roxo)
    expect(booms).toEqual(['necro']);
  });

  it('Chuva de Granadas (militar): granadas em volta explodem dos dois lados, sem ferir o militar', () => {
    const w = world('military');
    const p = player(w);
    const ev: string[] = [];
    const right = walker(w, 3);
    const left = walker(w, -3);
    run(w, 1, { buttons: Btn.Special });
    run(w, 20);
    const grenades = w.entities.filter((e) => e.projectile?.visual === 'grenade');
    expect(grenades.length).toBe(8);
    expect(grenades.every((g) => g.projectile!.fromSpecial)).toBe(true);
    for (let i = 0; i < 150; i++) {
      run(w, 1);
      for (const x of w.drainEvents()) ev.push(x.t);
    }
    expect(ev.filter((t) => t === 'explosion').length).toBe(8);
    expect(hurt(right)).toBeGreaterThan(0);
    expect(hurt(left)).toBeGreaterThan(0);
    expect(p.health!.hp).toBe(p.health!.max);
  });

  it('especial à distância com o mouse vira para o lado da mira (raio do ciborgue e bola de fogo da maga)', () => {
    for (const id of ['cyborg', 'mage'] as const) {
      const w = world(id);
      const p = player(w);
      p.t.facing = 1;
      const left = walker(w, -5);
      run(w, 1, { buttons: Btn.Special, aimMode: 1, aimYaw: Math.PI });
      expect(p.t.facing, id).toBe(-1);
      run(w, 60);
      expect(hurt(left), id).toBeGreaterThan(0);
    }
    // sem mouse (teclado, controle, toque) continua para onde já estava virado
    const w = world('cyborg');
    const p = player(w);
    p.t.facing = 1;
    run(w, 1, { buttons: Btn.Special, aimMode: 0, aimYaw: Math.PI });
    expect(p.t.facing).toBe(1);
  });

  it('Raio Laser (ciborgue) atravessa a faixa inteira, mas não sai dela', () => {
    const w = world('cyborg');
    const a = walker(w, 3);
    const b = walker(w, 8);
    const off = walker(w, 5, 1.6);
    special(w, 30);
    expect(hurt(a)).toBeGreaterThan(0);
    expect(hurt(b)).toBeGreaterThan(0);
    expect(hurt(off)).toBe(0);
  });

  it('Fúria Mutante: dá o poder, bate mais forte, rouba vida e acaba', () => {
    const w = world('mutant');
    const p = player(w);
    walker(w, 1.5);
    special(w, 20);
    expect(p.player!.powers.rage).toBeGreaterThan(0);
    const e = walker(w, 3);
    p.health!.hp = 50;
    applyHit(w, p, e, SLAP, { source: 'melee' });
    expect(hurt(e)).toBe(Math.round(10 * 1.15 * RAGE.melee));
    run(w, 6 * 60);
    expect(p.player!.powers.rage).toBe(0);
  });

  it('mutante se regenera depois de um tempo sem apanhar (e não envenenado)', () => {
    const w = world('mutant');
    const p = player(w);
    p.health!.hp = 50;
    p.health!.sinceHit = 0;
    run(w, 60);
    expect(p.health!.hp).toBe(50);
    run(w, 3 * 60);
    expect(p.health!.hp).toBeGreaterThan(51.5);
    const robot = world('robot');
    const r = player(robot);
    r.health!.hp = 50;
    run(robot, 5 * 60);
    expect(r.health!.hp).toBe(50);
  });

  it('ciborgue recarrega mais rápido', () => {
    const tick = (id: CharacterId) => {
      const w = world(id);
      const p = player(w).player!;
      p.fire.reload = 60;
      p.fire.reloadTotal = 60;
      p.ammoMag.pistol = 0;
      run(w, 1);
      return 60 - p.fire.reload;
    };
    expect(tick('robot')).toBeCloseTo(1);
    expect(tick('cyborg')).toBeCloseTo(1.35);
  });

  it('pistola: cada personagem recarrega no seu ritmo; o ciborgue é o mais rápido', () => {
    const secs = (id: CharacterId) => {
      const w = world(id);
      const p = player(w).player!;
      p.mode = 'gun';
      p.ammoMag.pistol = 0;
      run(w, 2, { buttons: Btn.Fire });
      let t = 0;
      while (p.fire.reload > 0 && t < 600) {
        run(w, 1);
        t++;
      }
      expect(p.ammoMag.pistol, id).toBe(12);
      return t / 60;
    };
    const s = Object.fromEntries(CHARACTER_ORDER.map((id) => [id, secs(id)]));
    expect(s.cyborg).toBeLessThan(1);
    for (const id of ['robot', 'mage', 'military', 'mutant'] as const)
      expect(s[id]!, id).toBeGreaterThan(1.5);
    expect(s.military).toBeLessThan(s.robot!);
    expect(s.robot).toBeLessThan(s.mage!);
    expect(s.mage).toBeLessThan(s.mutant!);
  });

  it('save com personagem inválido volta para o robô', () => {
    const s = defaultSave();
    (s.profile as { character: string }).character = 'dragao';
    expect(sanitizeSave(s).profile.character).toBe('robot');
    s.profile.character = 'mage';
    expect(sanitizeSave(s).profile.character).toBe('mage');
  });
});
