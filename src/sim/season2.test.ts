import { describe, expect, it } from 'vitest';
import { Profile } from '../app/Profile';
import { UNDERWATER_GRAVITY } from '../data/balance';
import { CHARACTERS } from '../data/characters';
import { getMap } from '../data/maps';
import { MELEE_WEAPONS, MOVES } from '../data/melee';
import { MemoryKV, Storage } from '../save/storage';
import { spawnEnemy } from './ai/spawnEnemy';
import { Btn } from './InputFrame';
import { makeWorld, player, run } from './test/helpers';

describe('personagens da 2ª temporada', () => {
  it('o Ninja conjura gelo e fogo sem cajado e começa com a katana', () => {
    const p = player(makeWorld({ loadout: { character: 'ninja', staffs: ['heal', 'earth'] } }));
    expect(p.player!.staffs).toEqual(['ice', 'fire']);
    expect(p.player!.mode).toBe('staff');
    expect(p.player!.melee?.id).toBe('katana');
  });

  it('a katana do Ninja e a da Elfa não se desgastam', () => {
    for (const id of ['ninja', 'elf'] as const) {
      const w = makeWorld({ loadout: { character: id } });
      const p = player(w);
      const e = spawnEnemy(w, 'brute', p.t.x + 0.9, p.t.z, 'right');
      e.ai = undefined;
      e.health!.max = e.health!.hp = 5000;
      for (let i = 0; i < 40; i++) {
        run(w, 1, { buttons: Btn.Punch });
        run(w, 14);
      }
      expect(e.health!.hp, id).toBeLessThan(5000);
      expect(p.player!.melee?.durability, id).toBe(MELEE_WEAPONS.katana.durability);
    }
  });

  it('a Elfa usa os cajados do perfil e a Nova Arcana da Maga', () => {
    const p = player(makeWorld({ loadout: { character: 'elf', staffs: ['heal', 'wind'] } }));
    expect(p.player!.staffs).toEqual(['heal', 'wind']);
    expect(CHARACTERS.elf.special).toBe(CHARACTERS.mage.special);
  });

  it('a cápsula do Faísca põe um inimigo comum do lado do jogador', () => {
    const w = makeWorld({ loadout: { character: 'spark' } });
    const p = player(w);
    const e = spawnEnemy(w, 'walker', p.t.x + 3, p.t.z, 'right');
    e.ai = undefined;
    e.health!.max = e.health!.hp = 500;
    run(w, 1, { buttons: Btn.Special });
    run(w, 60);
    expect(e.team).toBe('players');
    expect(e.control?.kind).toBe('hacked');
  });

  it('todo golpe da Oficina dos três existe', () => {
    for (const id of ['cortesGemeos', 'capsulaRaio', 'corteGlacial', 'estocadaElfica', 'caudaRelampago'])
      expect(MOVES[id], id).toBeDefined();
  });

  it('cada um é liberado ao vencer o mapa dele', () => {
    const p = new Profile(new Storage(new MemoryKV()));
    expect(p.roster).not.toContain('ninja');
    for (const [id, mapId] of [
      ['ninja', 'praca'],
      ['elf', 'shopping'],
      ['spark', 'campo'],
    ] as const) {
      expect(CHARACTERS[id].unlockMap).toBe(mapId);
      const m = getMap(mapId);
      p.save.progress.levels[m.levels[m.levels.length - 1]!.id] = {
        completed: true,
        bestScore: 1,
        bestTimeMs: 1,
        stars: 1,
      };
      expect(p.roster).toContain(id);
    }
    // quem não liberou não entra na partida com ele
    const q = new Profile(new Storage(new MemoryKV()));
    q.save.profile.character = 'spark';
    expect(q.loadout().character).toBe('robot');
  });
});

describe('fundo do mar', () => {
  it("debaixo d'água o jogador e os inimigos caem mais devagar", () => {
    const w = makeWorld({ map: getMap('mar') });
    expect(player(w).body!.gravityScale).toBe(UNDERWATER_GRAVITY);
    expect(spawnEnemy(w, 'mar_swimmer', 8, 0, 'right').body!.gravityScale).toBe(UNDERWATER_GRAVITY);
    expect(player(makeWorld()).body!.gravityScale).toBe(1);
  });
});
