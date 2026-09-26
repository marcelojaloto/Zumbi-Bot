import { describe, expect, it } from 'vitest';
import { Storage, MemoryKV, KEYS } from './storage';
import { defaultSave } from './schema';
import { insertRank, rankPosition } from './ranking';
import { sanitizeSave, sanitizeSettings } from './migrations';

describe('save', () => {
  it('sem dados retorna o padrão', () => {
    const s = new Storage(new MemoryKV());
    const r = s.loadSave(1);
    expect(r.data.profile.level).toBe(1);
    expect(r.data.progress.unlockedLevels).toContain('vila-1');
    expect(r.recovered).toBe(false);
  });

  it('grava e carrega', () => {
    const kv = new MemoryKV();
    const s = new Storage(kv);
    const d = defaultSave(1);
    d.profile.scrap = 123;
    d.progress.unlockedLevels.push('torre-1');
    s.writeSave(d, 2);
    const r = new Storage(kv).loadSave();
    expect(r.data.profile.scrap).toBe(123);
    expect(r.data.progress.unlockedLevels).toContain('torre-1');
  });

  it('migra save sem versão (v0) e guarda backup', () => {
    const kv = new MemoryKV();
    kv.setItem(KEYS.save, JSON.stringify({ level: 7 }));
    const r = new Storage(kv).loadSave();
    expect(r.migratedFrom).toBe(0);
    expect(r.data.version).toBe(1);
    expect(r.data.profile.level).toBe(7);
    expect(kv.getItem(`${KEYS.save}:bak`)).not.toBeNull();
  });

  it('JSON corrompido restaura o backup', () => {
    const kv = new MemoryKV();
    const good = defaultSave(1);
    good.profile.scrap = 55;
    kv.setItem(`${KEYS.save}:bak`, JSON.stringify(good));
    kv.setItem(KEYS.save, '{isto não é json');
    const r = new Storage(kv).loadSave();
    expect(r.recovered).toBe(true);
    expect(r.data.profile.scrap).toBe(55);
  });

  it('versão futura fica somente-leitura', () => {
    const kv = new MemoryKV();
    kv.setItem(KEYS.save, JSON.stringify({ ...defaultSave(1), version: 99 }));
    const s = new Storage(kv);
    expect(s.loadSave().readOnly).toBe(true);
    expect(s.writeSave(defaultSave(2))).toBe(false);
  });

  it('sanitiza números e ids inválidos', () => {
    const d = sanitizeSave({
      version: 1,
      profile: { name: '', level: 999, xp: -5, scrap: 'x' },
      unlocks: { firearms: ['bazuca', 'smg'], staffs: ['fogo'] },
      cosmetics: { owned: ['nao-existe'], equipped: { head: 'nao-existe' } },
    });
    expect(d.profile.level).toBe(50);
    expect(d.profile.xp).toBe(0);
    expect(d.profile.name).toBe('Zumbi Bot');
    expect(d.unlocks.firearms).toEqual(['pistol', 'smg']);
    expect(d.unlocks.staffs).toEqual(['heal']);
    expect(d.cosmetics.owned).toEqual([]);
    expect(d.profile.scrap).toBeGreaterThan(0);
  });

  it('configurações são limitadas', () => {
    const s = sanitizeSettings({
      controls: { mouseSensitivity: 99 },
      graphics: { quality: 'ultra' },
      audio: { master: -1 },
    });
    expect(s.controls.mouseSensitivity).toBe(3);
    expect(s.graphics.quality).toBe('auto');
    expect(s.audio.master).toBe(0);
    expect(s.controls.keys).toBeUndefined();
  });

  it('teclas salvas são validadas', () => {
    const s = sanitizeSettings({
      controls: {
        keys: {
          jump: ['KeyH', 'KeyH', 'Space', 'KeyZ'],
          punch: ['KeyH', 'Escape', '<script>', 7, 'KeyY'],
          voar: ['KeyV'],
        },
      },
    });
    // até 2 por ação, sem repetir entre ações, sem Esc, só códigos válidos e ações conhecidas
    expect(s.controls.keys).toEqual({ jump: ['KeyH', 'Space'], punch: ['KeyY'] });
    expect(sanitizeSettings({ controls: { keys: 'x' } }).controls.keys).toBeUndefined();
  });
});

describe('ranking', () => {
  it('insere ordenado e limita a 20', () => {
    const r = { version: 1 as const, entries: [] as ReturnType<typeof entry>[] };
    for (let i = 0; i < 25; i++) insertRank(r, entry(i * 100));
    expect(r.entries.length).toBe(20);
    expect(r.entries[0]!.score).toBe(2400);
    expect(rankPosition(r, 10)).toBe(-1);
    expect(rankPosition(r, 99999)).toBe(0);
  });
});

function entry(score: number) {
  return {
    name: 'x',
    score,
    mapId: 'vila',
    levelId: 'vila-1',
    timeMs: 0,
    kills: 0,
    playerLevel: 1,
    date: 0,
    victory: true,
  };
}
