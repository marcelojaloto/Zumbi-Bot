import { describe, expect, it } from 'vitest';
import { Profile } from './Profile';
import { MemoryKV, Storage } from '../save/storage';
import { KEYS } from '../save/storage';
import { defaultSave } from '../save/schema';
import { xpForLevel } from '../data/balance';
import { PERK_BY_ID } from '../data/workshop';

const fresh = (scrap = 0) => {
  const p = new Profile(new Storage(new MemoryKV()));
  p.save.profile.scrap = scrap;
  return p;
};

describe('Oficina no perfil', () => {
  it('libera com XP, pede a anterior do ramo e custa sucata; especial novo já fica em uso', () => {
    const p = fresh(10_000);
    const s1 = PERK_BY_ID['robot.special1']!;
    expect(p.perkStatus('robot.special1')).toBe('xp');
    expect(p.buyPerk('robot.special1')).toBe(false);
    // XP suficiente (nível do jogador)
    p.save.profile.level = s1.level;
    expect(p.totalXp).toBe(xpForLevel(s1.level));
    expect(p.perkStatus('robot.special1')).toBe('available');
    expect(p.perkStatus('robot.special2')).toBe('requires');
    expect(p.buyPerk('robot.special1')).toBe(true);
    expect(p.save.profile.scrap).toBe(10_000 - s1.price);
    expect(p.specialOf('robot')).toBe('pulsoEMP');
    expect(p.loadout().special).toBe('pulsoEMP');
    expect(p.loadout().perks).toEqual(['robot.special1']);
    // volta para o original
    p.chooseSpecial('robot', null);
    expect(p.specialOf('robot')).toBe('giroTurbo');
    // sem sucata
    const q = fresh(0);
    q.save.profile.level = 50;
    expect(q.buyPerk('robot.vigor1')).toBe(false);
  });

  it('save com melhorias e especial inválidos fica só com o que vale', () => {
    const kv = new MemoryKV();
    const save = {
      ...defaultSave(1),
      workshop: {
        robot: { perks: ['robot.vigor1', 'mage.vigor1', 'nada'], special: 'pulsoEMP' },
        dragon: { perks: ['x'] },
      },
    };
    kv.setItem(KEYS.save, JSON.stringify(save));
    const p = new Profile(new Storage(kv));
    expect(p.save.workshop).toEqual({ robot: { perks: ['robot.vigor1'] } });
  });

  it('save da versão 1 vira a 2 com os campos novos vazios', () => {
    const kv = new MemoryKV();
    const v1 = { ...defaultSave(1), version: 1 } as Record<string, unknown>;
    delete v1.workshop;
    kv.setItem(KEYS.save, JSON.stringify(v1));
    const r = new Storage(kv).loadSave();
    expect(r.migratedFrom).toBe(1);
    expect(r.data.version).toBe(2);
    expect(r.data.workshop).toEqual({});
  });
});
