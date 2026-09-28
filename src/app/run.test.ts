import { describe, expect, it } from 'vitest';
import { Profile } from './Profile';
import { Storage, MemoryKV } from '../save/storage';
import type { RunStats } from '../sim/events';

function stats(over: Partial<RunStats>): RunStats {
  return {
    mapId: 'vila',
    levelId: 'vila-1',
    score: 1000,
    kills: 10,
    maxCombo: 3,
    timeMs: 60_000,
    livesLost: 0,
    damageTaken: 0,
    xpGained: 0,
    bossKills: 1,
    stars: 3,
    loot: [],
    scrap: 0,
    unlockedGuns: [],
    victory: true,
    chars: ['mage'],
    ...over,
  };
}

describe('jornada e ranking', () => {
  it('os pontos de cada mapa se somam; só entra no ranking ao perder todas as vidas', () => {
    const kv = new MemoryKV();
    const p = new Profile(new Storage(kv));
    p.save.profile.character = 'mage';
    p.addToRun(stats({ score: 1000 }));
    p.addToRun(stats({ mapId: 'torre', levelId: 'torre-1', score: 2500, chars: ['mage'] }));
    expect(p.ranking.entries).toHaveLength(0);
    const run = p.addToRun(stats({ mapId: 'banco', levelId: 'banco-1', score: 700, victory: false }));
    expect(run).toMatchObject({ score: 4200, maps: 2, mapId: 'banco', kills: 30 });
    // a jornada fica salva (fechar o jogo no meio não perde os pontos)
    expect(new Profile(new Storage(kv)).save.run?.score).toBe(4200);
    const c = p.closeRun(4, false)!;
    expect(c.pos).toBe(0);
    // sem nome salvo ainda: sugere o apelido do personagem
    expect(c.entry).toMatchObject({ name: 'Maga', score: 4200, maps: 2, victory: false, mapId: 'banco' });
    expect(p.ranking.entries[0]).toBe(c.entry);
    expect(p.save.run).toBeUndefined();
  });

  it('o nome escrito fica no registro e é o sugerido da próxima vez', () => {
    const kv = new MemoryKV();
    const p = new Profile(new Storage(kv));
    p.addToRun(stats({ victory: false }));
    const c = p.closeRun(2, false)!;
    p.renameRank(c.entry, '  Marcelo  ', false);
    expect(new Profile(new Storage(kv)).ranking.entries[0]!.name).toBe('Marcelo');
    expect(p.suggestedRankName()).toBe('Marcelo');
    p.addToRun(stats({ score: 50, victory: true }));
    const fim = p.closeRun(3, true)!;
    expect(fim.entry).toMatchObject({ name: 'Marcelo', victory: true, maps: 1 });
  });

  it('equipe registra "Equipe de N" e não troca o nome do perfil', () => {
    const p = new Profile(new Storage(new MemoryKV()));
    p.addToRun(stats({ victory: false, players: [{}, {}, {}] as RunStats['players'] }));
    const c = p.closeRun(2, false)!;
    expect(c.entry.name).toBe('Equipe de 3');
    p.renameRank(c.entry, 'Os Três', true);
    expect(c.entry.name).toBe('Os Três');
    expect(p.save.profile.rankName).toBeUndefined();
  });
});
