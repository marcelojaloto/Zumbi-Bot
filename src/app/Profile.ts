import { PLAYER, xpToNext } from '../data/balance';
import { getMap, MAPS } from '../data/maps';
import { STAFFS } from '../data/staffs';
import type { StaffId, WeaponId } from '../data/types';
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
      } else s.flags.ngPlus = true;
    }
    this.persist();
    return { newRecord, unlockedNext };
  }

  /** Posição no ranking (0-based) se entrar. */
  addRank(name: string, stats: RunStats, playerLevel: number): number {
    const pos = insertRank(this.ranking, {
      name: name.slice(0, 16) || 'Anônimo',
      score: stats.score,
      mapId: stats.mapId,
      levelId: stats.levelId,
      timeMs: stats.timeMs,
      kills: stats.kills,
      playerLevel,
      date: Date.now(),
      victory: stats.victory,
    });
    if (pos >= 0) this.storage.writeRanking(this.ranking);
    return pos;
  }

  wipe(): void {
    this.storage.wipeProgress();
    this.save = this.storage.loadSave().data;
    this.persist();
  }
}
