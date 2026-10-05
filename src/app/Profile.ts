import { t } from '../i18n';
import { PLAYER, totalXp, xpForLevel, xpToNext } from '../data/balance';
import { FIREARM_PRICES, MELEE_PRICES, REVIVE_PRICE } from '../data/shop';
import { WEAPON_ORDER } from '../data/weapons';
import { PERK_BY_ID, specialsOf } from '../data/workshop';
import { getMap, MAPS } from '../data/maps';
import { STAFFS } from '../data/staffs';
import { getCharacter, playableCharacters } from '../data/characters';
import type { CharacterId, CosmeticId, CosmeticSlot, MeleeId, StaffId, WeaponId } from '../data/types';
import { COSMETICS, SECRET_GIFTS, SELL_VALUE } from '../data/cosmetics';
import { Rng } from '../core/rng';
import { insertRank } from '../save/ranking';
import type { CampaignRun, RankEntry, RankingV1, SaveV2, SettingsV2 } from '../save/schema';
import { Storage } from '../save/storage';
import type { RunStats } from '../sim/events';
import type { PlayerLoadout } from '../sim/World';

/** Estado persistente do jogador (progresso, configurações e ranking) e regras de desbloqueio. */
export class Profile {
  readonly storage: Storage;
  save: SaveV2;
  settings: SettingsV2;
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
    if (s.recovered) this.notices.push('Save corrompido, backup restaurado');
    if (s.readOnly) this.notices.push('Save de uma versão mais nova: progresso não será gravado');
    if (s.migratedFrom !== null) this.persist();
    // quem já terminou o jogo antes desta versão também ganha o disfarce do personagem secreto
    if (this.secretUnlocked && this.grantSecretGifts()) this.persist();
  }

  /** Personagem secreto liberado (o jogo já foi terminado uma vez). */
  get secretUnlocked(): boolean {
    return this.save.flags.credits;
  }

  /** Personagens que dá para escolher agora. */
  get roster(): CharacterId[] {
    return playableCharacters(this.secretUnlocked);
  }

  /** Terminou o jogo pela primeira vez: libera o personagem secreto e o disfarce dele. */
  unlockSecret(): void {
    this.save.flags.credits = true;
    this.grantSecretGifts();
    this.persist();
  }

  private grantSecretGifts(): boolean {
    const owned = this.save.cosmetics.owned;
    const add = SECRET_GIFTS.filter((id) => !owned.includes(id));
    owned.push(...add);
    return add.length > 0;
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

  /**
   * Equipamento para a partida: o personagem escolhido (ou `character`, no multijogador local), com a Oficina
   * dele, o item de reviver se ele tiver e a arma branca da Loja.
   */
  loadout(character?: CharacterId): PlayerLoadout {
    const s = this.save;
    // o secreto só entra depois de liberado
    const ch = character ?? (this.roster.includes(s.profile.character) ? s.profile.character : 'robot');
    const ws = s.workshop[ch];
    return {
      slot: 0,
      name: s.profile.name,
      character: ch,
      level: s.profile.level,
      xp: s.profile.xp,
      guns: [...s.unlocks.firearms] as WeaponId[],
      staffs: [...s.unlocks.staffs] as StaffId[],
      cosmetics: { ...s.cosmetics.equipped },
      pity: s.cosmetics.pity,
      ownedCosmetics: [...s.cosmetics.owned],
      melee: s.profile.melee ?? null,
      revive: s.revive.includes(ch),
      perks: [...(ws?.perks ?? [])],
      ...(ws?.special ? { special: ws.special } : {}),
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
    final: {
      level: number;
      xp: number;
      guns: WeaponId[];
      loot: string[];
      scrap: number;
      pity: number;
      reviveUsed?: CharacterId[];
    },
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
    this.consumeRevive(final.reviveUsed ?? []);
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

  /**
   * Soma o mapa que acabou (vencido ou o da derrota) à jornada em andamento, ou a uma nova se não houver.
   * A jornada só vai para o ranking quando o jogador perde todas as vidas ou termina o jogo ({@link closeRun}).
   */
  addToRun(stats: RunStats): CampaignRun {
    const s = this.save;
    const r: CampaignRun = s.run ?? {
      score: 0,
      kills: 0,
      timeMs: 0,
      maps: 0,
      mapId: stats.mapId,
      levelId: stats.levelId,
      chars: [],
      ngPlus: false,
      team: 1,
      startedAt: Date.now(),
    };
    r.score += stats.score;
    r.kills += stats.kills;
    r.timeMs += stats.timeMs;
    if (stats.victory) r.maps++;
    r.mapId = stats.mapId;
    r.levelId = stats.levelId;
    for (const c of stats.chars ?? []) if (!r.chars.includes(c) && r.chars.length < 5) r.chars.push(c);
    r.ngPlus ||= !!stats.ngPlus;
    r.team = Math.max(r.team, stats.players?.length ?? 1);
    s.run = r;
    this.persist();
    return r;
  }

  /** Nome sugerido para o ranking: o último salvo; sem nenhum ainda, o apelido do personagem. */
  suggestedRankName(): string {
    return this.save.profile.rankName ?? t(getCharacter(this.save.profile.character).name);
  }

  /**
   * Fim da jornada (perdeu todas as vidas ou terminou o jogo): registra no ranking na hora, com o nome sugerido
   * (o jogador pode trocar o nome depois com {@link renameRank}) e começa uma jornada nova. `pos` = -1 se não
   * entrou no top 20.
   */
  closeRun(
    playerLevel: number,
    finished: boolean,
  ): { entry: RankEntry; pos: number; run: CampaignRun } | null {
    const r = this.save.run;
    if (!r) return null;
    delete this.save.run;
    this.persist();
    const entry: RankEntry = {
      name: (r.team > 1 ? t('Equipe de {n}', { n: r.team }) : this.suggestedRankName()).slice(0, 16),
      score: r.score,
      mapId: r.mapId,
      levelId: r.levelId,
      timeMs: r.timeMs,
      kills: r.kills,
      playerLevel,
      date: Date.now(),
      victory: finished,
      maps: r.maps,
      ...(r.ngPlus ? { ngPlus: true } : {}),
      ...(r.chars.length ? { chars: [...r.chars] } : {}),
    };
    const pos = insertRank(this.ranking, entry);
    if (pos >= 0) this.storage.writeRanking(this.ranking);
    return { entry, pos, run: r };
  }

  /**
   * O jogador escreveu o nome: troca no registro do ranking e guarda para sugerir da próxima vez (a equipe não muda
   * o nome do perfil).
   */
  renameRank(entry: RankEntry, name: string, team: boolean): void {
    const n = name.trim().slice(0, 16) || t('Anônimo');
    if (n !== entry.name) {
      entry.name = n;
      if (this.ranking.entries.includes(entry)) this.storage.writeRanking(this.ranking);
    }
    if (!team) {
      this.save.profile.rankName = n;
      this.save.profile.name = n;
      this.persist();
    }
  }

  /** Personagem escolhido pelo jogador 1 (fica para a próxima partida). */
  setCharacter(id: CharacterId): void {
    if (this.save.profile.character === id) return;
    this.save.profile.character = id;
    this.persistSoon();
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
    // o disfarce do personagem secreto vem com ele: não se vende
    if (!c || !this.owns(id) || c.set === 'secret') return false;
    const eq = this.save.cosmetics.equipped;
    if (eq[c.slot] === id) delete eq[c.slot];
    this.save.cosmetics.owned = this.save.cosmetics.owned.filter((x) => x !== id);
    this.save.profile.scrap += SELL_VALUE[c.rarity];
    this.persist();
    return true;
  }

  // ------------------------------------------------------------ loja: armas e item de reviver
  /** Gasta sucata (false se não tem o bastante). */
  private spend(price: number): boolean {
    if (this.save.profile.scrap < price) return false;
    this.save.profile.scrap -= price;
    return true;
  }

  /** Compra uma arma de fogo: fica no arsenal para sempre, como as achadas nos mapas. */
  buyFirearm(id: WeaponId): boolean {
    const price = FIREARM_PRICES[id];
    const owned = this.save.unlocks.firearms;
    if (price === undefined || owned.includes(id) || !this.spend(price)) return false;
    owned.push(id);
    owned.sort((a, b) => WEAPON_ORDER.indexOf(a) - WEAPON_ORDER.indexOf(b));
    this.persist();
    return true;
  }

  ownsMelee(id: MeleeId): boolean {
    return this.save.unlocks.melee.includes(id);
  }

  /** Compra uma arma branca e já leva ela para as próximas fases. */
  buyMelee(id: MeleeId): boolean {
    if (this.ownsMelee(id) || !this.spend(MELEE_PRICES[id])) return false;
    this.save.unlocks.melee.push(id);
    this.save.profile.melee = id;
    this.persist();
    return true;
  }

  /** Arma branca que começa cada fase na mão (null = nenhuma). */
  setMelee(id: MeleeId | null): void {
    if (id === null) delete this.save.profile.melee;
    else if (this.ownsMelee(id)) this.save.profile.melee = id;
    this.persistSoon();
  }

  hasRevive(c: CharacterId): boolean {
    return this.save.revive.includes(c);
  }

  /** Compra o item de reviver de um personagem (cada um carrega no máximo um). */
  buyRevive(c: CharacterId): boolean {
    if (this.hasRevive(c) || !this.spend(REVIVE_PRICE)) return false;
    this.save.revive.push(c);
    this.persist();
    return true;
  }

  /** Itens de reviver gastos na partida saem do save. */
  consumeRevive(chars: readonly CharacterId[]): void {
    if (chars.length) this.save.revive = this.save.revive.filter((c) => !chars.includes(c));
  }

  // ------------------------------------------------------------ Oficina
  /** XP total já ganho (libera as melhorias). */
  get totalXp(): number {
    return totalXp(this.save.profile.level, this.save.profile.xp);
  }

  perksOf(c: CharacterId): string[] {
    return this.save.workshop[c]?.perks ?? [];
  }

  /**
   * Situação de uma melhoria: comprada, disponível (dá para comprar, se houver sucata), sem XP suficiente ou
   * esperando a anterior do mesmo ramo.
   */
  perkStatus(id: string): 'owned' | 'available' | 'xp' | 'requires' {
    const p = PERK_BY_ID[id];
    if (!p) return 'requires';
    const mine = this.perksOf(p.character);
    if (mine.includes(id)) return 'owned';
    if (p.requires && !mine.includes(p.requires)) return 'requires';
    if (this.totalXp < xpForLevel(p.level)) return 'xp';
    return 'available';
  }

  /** Compra uma melhoria da Oficina (XP suficiente, a anterior comprada e sucata). Especial novo já fica em uso. */
  buyPerk(id: string): boolean {
    const p = PERK_BY_ID[id];
    if (!p || this.perkStatus(id) !== 'available' || !this.spend(p.price)) return false;
    const ws = (this.save.workshop[p.character] ??= { perks: [] });
    ws.perks.push(id);
    if (p.special) ws.special = p.special;
    this.persist();
    return true;
  }

  /** Especial em uso do personagem (null ou o original = o original). */
  chooseSpecial(c: CharacterId, move: string | null): void {
    const ws = (this.save.workshop[c] ??= { perks: [] });
    if (move && specialsOf(c, ws.perks).slice(1).includes(move)) ws.special = move;
    else delete ws.special;
    this.persistSoon();
  }

  specialOf(c: CharacterId): string {
    return this.save.workshop[c]?.special ?? getCharacter(c).special;
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
