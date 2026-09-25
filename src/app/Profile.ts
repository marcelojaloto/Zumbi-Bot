import { t } from '../i18n';
import { PLAYER, xpToNext } from '../data/balance';
import { getMap, MAPS } from '../data/maps';
import { STAFFS } from '../data/staffs';
import type { CosmeticId, CosmeticSlot, StaffId, WeaponId } from '../data/types';
import { COSMETICS, SELL_VALUE } from '../data/cosmetics';
import { Rng } from '../core/rng';
import { insertRank } from '../save/ranking';
import type { RankingV1, SaveV1, SettingsV1 } from '../save/schema';
import { Storage } from '../save/storage';
import type { RunStats } from '../sim/events';
import type { PlayerLoadout } from '../sim/World';

/** Estado persistente do jogador (progresso, configurações e ranking) e regras de desbloqueio. */
export class Profile {
  readonly storage: Storage;
  save: SaveV1;
  settings: SettingsV1;
  ranking: RankingV1;
  notices: string[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(storage = new Storage()) {
    this.storage = storage;
    const s = storage.loadSave();
    const st = storage.loadSettings();
    const r = storage.loadRanking();
    this.save = s.data;
    this.settings = st.data;
    this.ranking = r.data;
    if (s.recovered) this.notices.push('Save corrompido — backup restaurado');
    if (s.readOnly) this.notices.push('Save de uma versão mais nova: progresso não será gravado');
    if (s.migratedFrom !== null) this.persist();
  }

  persist(): void {
    this.storage.writeSave(this.save);
  }

  /** Grava com atraso (várias mudanças seguidas viram uma escrita). */
  persistSoon(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.persist();
    }, 500);
  }

  persistSettings(): void {
    this.storage.writeSettings(this.settings);
  }

  loadout(): PlayerLoadout {
    const s = this.save;
    return {
      slot: 0,
      name: s.profile.name,
      level: s.profile.level,
      xp: s.profile.xp,
      guns: [...s.unlocks.firearms] as WeaponId[],
      staffs: [...s.unlocks.staffs] as StaffId[],
      cosmetics: { ...s.cosmetics.equipped },
      pity: s.cosmetics.pity,
      ownedCosmetics: [...s.cosmetics.owned],
    };
  }

  isLevelUnlocked(levelId: string): boolean {
    return this.save.progress.unlockedLevels.includes(levelId);
  }

  isMapUnlocked(mapId: string): boolean {
    const m = getMap(mapId);
    return m.levels.some((l) => this.isLevelUnlocked(l.id));
  }

  /** Próximo nível (mesmo mapa ou primeiro do mapa seguinte). */
  nextLevel(mapId: string, levelIdx: number): { mapId: string; levelIdx: number } | null {
    const m = getMap(mapId);
    if (levelIdx + 1 < m.levels.length) return { mapId, levelIdx: levelIdx + 1 };
    const next = MAPS.find((x) => x.index === m.index + 1);
    return next ? { mapId: next.id, levelIdx: 0 } : null;
  }

  /** Aplica o resultado de uma partida ao save. Retorna informações para a tela de resultado. */
  applyRun(
    stats: RunStats,
    final: { level: number; xp: number; guns: WeaponId[]; loot: string[]; scrap: number; pity: number },
  ): {
    newRecord: boolean;
    unlockedNext: string | null;
    /** Novo Jogo+ acabou de ser desbloqueado. */
    ngPlusUnlocked: boolean;
    /** Venceu o último nível da campanha. */
    finalBoss: boolean;
  } {
    const s = this.save;
    s.profile.level = Math.max(1, Math.min(PLAYER.maxLevel, final.level));
    s.profile.xp = Math.min(final.xp, xpToNext(s.profile.level));
    s.profile.scrap += final.scrap;
    s.cosmetics.pity = final.pity;
    for (const g of final.guns) if (!s.unlocks.firearms.includes(g)) s.unlocks.firearms.push(g);
    for (const c of final.loot) if (!s.cosmetics.owned.includes(c)) s.cosmetics.owned.push(c);
    if (stats.unlockedStaff && STAFFS[stats.unlockedStaff] && !s.unlocks.staffs.includes(stats.unlockedStaff))
      s.unlocks.staffs.push(stats.unlockedStaff);
    s.stats.kills += stats.kills;
    s.stats.deaths += stats.livesLost;
    s.stats.bosses += stats.bossKills;
    s.stats.playTimeMs += stats.timeMs;
    s.stats.runs++;
    let newRecord = false;
    let unlockedNext: string | null = null;
    let ngPlusUnlocked = false;
    let finalBoss = false;
    if (stats.victory) {
      const lp = (s.progress.levels[stats.levelId] ??= {
        completed: false,
        bestScore: 0,
        bestTimeMs: 0,
        stars: 0,
      });
      lp.completed = true;
      if (stats.score > lp.bestScore) {
        lp.bestScore = stats.score;
        newRecord = true;
      }
      if (!lp.bestTimeMs || stats.timeMs < lp.bestTimeMs) lp.bestTimeMs = stats.timeMs;
      lp.stars = Math.max(lp.stars, stats.stars);
      const map = getMap(stats.mapId);
      const idx = map.levels.findIndex((l) => l.id === stats.levelId);
      const nx = this.nextLevel(stats.mapId, idx);
      if (nx) {
        const id = getMap(nx.mapId).levels[nx.levelIdx]!.id;
        if (!s.progress.unlockedLevels.includes(id)) {
          s.progress.unlockedLevels.push(id);
          unlockedNext = id;
        }
      } else {
        finalBoss = true;
        ngPlusUnlocked = !s.flags.ngPlus;
        s.flags.ngPlus = true;
      }
    }
    this.persist();
    return { newRecord, unlockedNext, ngPlusUnlocked, finalBoss };
  }

  /** Posição no ranking (0-based) se entrar. */
  addRank(name: string, stats: RunStats, playerLevel: number): number {
    const pos = insertRank(this.ranking, {
      name: name.slice(0, 16) || t('Anônimo'),
      score: stats.score,
      mapId: stats.mapId,
      levelId: stats.levelId,
      timeMs: stats.timeMs,
      kills: stats.kills,
      playerLevel,
      date: Date.now(),
      victory: stats.victory,
      ...(stats.ngPlus ? { ngPlus: true } : {}),
    });
    if (pos >= 0) this.storage.writeRanking(this.ranking);
    return pos;
  }

  // ------------------------------------------------------------ cosméticos
  equip(slot: CosmeticSlot, id: CosmeticId | null): void {
    const eq = this.save.cosmetics.equipped;
    if (id === null) delete eq[slot];
    else if (this.save.cosmetics.owned.includes(id) && COSMETICS[id]?.slot === slot) eq[slot] = id;
    this.persistSoon();
  }

  owns(id: CosmeticId): boolean {
    return this.save.cosmetics.owned.includes(id);
  }

  /** Preço atual (ofertas do dia têm 20% de desconto). */
  priceOf(id: CosmeticId): number | null {
    const c = COSMETICS[id];
    if (!c || c.price === null) return null;
    return dailyDeals().includes(id) ? Math.round(c.price * 0.8) : c.price;
  }

  buy(id: CosmeticId): boolean {
    const price = this.priceOf(id);
    if (price === null || this.owns(id) || this.save.profile.scrap < price) return false;
    this.save.profile.scrap -= price;
    this.save.cosmetics.owned.push(id);
    this.persist();
    return true;
  }

  sell(id: CosmeticId): boolean {
    const c = COSMETICS[id];
    if (!c || !this.owns(id)) return false;
    const eq = this.save.cosmetics.equipped;
    if (eq[c.slot] === id) delete eq[c.slot];
    this.save.cosmetics.owned = this.save.cosmetics.owned.filter((x) => x !== id);
    this.save.profile.scrap += SELL_VALUE[c.rarity];
    this.persist();
    return true;
  }

  wipe(): void {
    this.storage.wipeProgress();
    this.save = this.storage.loadSave().data;
    this.persist();
  }
}

/** Ofertas do dia: 6 itens sorteados pela data (mesmas para o dia inteiro). */
export function dailyDeals(day = Math.floor(Date.now() / 864e5)): CosmeticId[] {
  const rng = new Rng(day * 7919 + 13);
  const pool = Object.values(COSMETICS)
    .filter((c) => c.price !== null)
    .map((c) => c.id)
    .sort();
  const out: CosmeticId[] = [];
  while (out.length < 6 && pool.length) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]!);
  return out;
}
