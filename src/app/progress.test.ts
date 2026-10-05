import { describe, expect, it } from 'vitest';
import { Profile } from './Profile';
import { CHEST_ODDS, chestScrap, openChest } from './chest';
import { MemoryKV, Storage } from '../save/storage';
import { KEYS } from '../save/storage';
import { defaultSave } from '../save/schema';
import { FIREARM_PRICES, MELEE_PRICES, REVIVE_PRICE } from '../data/shop';
import { xpForLevel } from '../data/balance';
import { PERK_BY_ID } from '../data/workshop';
import type { RunStats } from '../sim/events';

const fresh = (scrap = 0) => {
  const p = new Profile(new Storage(new MemoryKV()));
  p.save.profile.scrap = scrap;
  return p;
};

function stats(over: Partial<RunStats> = {}): RunStats {
  return {
    mapId: 'vila',
    levelId: 'vila-1',
    score: 100,
    kills: 1,
    maxCombo: 1,
    timeMs: 1000,
    livesLost: 0,
    damageTaken: 0,
    xpGained: 0,
    bossKills: 0,
    stars: 2,
    loot: [],
    scrap: 0,
    unlockedGuns: [],
    victory: true,
    ...over,
  };
}
const final = { level: 1, xp: 0, guns: [], loot: [], scrap: 0, pity: 0 };

describe('loja: armas e item de reviver', () => {
  it('arma de fogo comprada vai para o arsenal (em ordem) e não se compra duas vezes', () => {
    const p = fresh(5000);
    expect(p.buyFirearm('rifle')).toBe(true);
    expect(p.buyFirearm('shotgun')).toBe(true);
    expect(p.save.unlocks.firearms).toEqual(['pistol', 'shotgun', 'rifle']);
    expect(p.buyFirearm('rifle')).toBe(false);
    expect(p.buyFirearm('pistol')).toBe(false);
    expect(p.save.profile.scrap).toBe(5000 - FIREARM_PRICES.rifle! - FIREARM_PRICES.shotgun!);
  });

  it('arma branca comprada começa a fase na mão; dá para guardar', () => {
    const p = fresh(MELEE_PRICES.katana);
    expect(p.buyMelee('katana')).toBe(true);
    expect(p.loadout().melee).toBe('katana');
    p.setMelee(null);
    expect(p.loadout().melee).toBeNull();
    expect(p.buyMelee('sledge')).toBe(false);
  });

  it('item de reviver: um por personagem, só do personagem dele', () => {
    const p = fresh(REVIVE_PRICE * 2);
    expect(p.buyRevive('mage')).toBe(true);
    expect(p.buyRevive('mage')).toBe(false);
    expect(p.loadout('mage').revive).toBe(true);
    expect(p.loadout('robot').revive).toBe(false);
    // gasto na partida: sai do save
    p.applyRun(stats(), { ...final, reviveUsed: ['mage'] });
    expect(p.hasRevive('mage')).toBe(false);
  });
});

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
    delete v1.revive;
    delete v1.workshop;
    kv.setItem(KEYS.save, JSON.stringify(v1));
    const r = new Storage(kv).loadSave();
    expect(r.migratedFrom).toBe(1);
    expect(r.data.version).toBe(2);
    expect(r.data.revive).toEqual([]);
    expect(r.data.workshop).toEqual({});
    expect(r.data.unlocks.melee).toEqual([]);
  });
});

describe('baú do fim de fase', () => {
  it('mostra o que a fase deu e soma o bônus de sucata ao perfil', () => {
    const p = fresh(0);
    // sem item extra (sorteio no fim da tabela): sucata a mais
    const prizes = openChest(
      p,
      stats({ unlockedStaff: 'earth', unlockedGuns: ['shotgun'], stars: 3 }),
      { character: 'robot', loot: ['cap_torn'], scrap: 40 },
      () => 0.99,
    );
    const bonus = chestScrap(0, 3, false) + 50;
    expect(prizes[0]).toEqual({ k: 'scrap', n: 40 + bonus });
    expect(prizes.map((x) => x.k)).toEqual(['scrap', 'staff', 'gun', 'cosmetic']);
    expect(p.save.profile.scrap).toBe(bonus);
  });

  it('às vezes dá o item de reviver do personagem (se ele ainda não tem)', () => {
    const p = fresh(0);
    const prizes = openChest(p, stats(), { character: 'military', loot: [], scrap: 0 }, () => 0);
    expect(prizes.at(-1)).toEqual({ k: 'revive', c: 'military' });
    expect(p.hasRevive('military')).toBe(true);
    // já tem: vira sucata a mais
    const again = openChest(p, stats(), { character: 'military', loot: [], scrap: 0 }, () => 0);
    expect(again.map((x) => x.k)).toEqual(['scrap']);
    expect(CHEST_ODDS.revive).toBeGreaterThan(0);
  });

  it('peça nova, arma branca ou arma de fogo que ainda não tinha', () => {
    const p = fresh(0);
    const o = CHEST_ODDS;
    const cos = openChest(p, stats(), { character: 'robot', loot: [], scrap: 0 }, () => o.revive + 0.01);
    expect(cos.at(-1)!.k).toBe('cosmetic');
    const mel = openChest(
      p,
      stats(),
      { character: 'robot', loot: [], scrap: 0 },
      () => o.revive + o.cosmetic + 0.01,
    );
    expect(mel.at(-1)!.k).toBe('melee');
    expect(p.save.unlocks.melee.length).toBe(1);
    const gun = openChest(
      p,
      stats(),
      { character: 'robot', loot: [], scrap: 0 },
      () => o.revive + o.cosmetic + o.melee + 0.01,
    );
    expect(gun.at(-1)!.k).toBe('gun');
  });
});
