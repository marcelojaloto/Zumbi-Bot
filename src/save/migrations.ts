import { isCharacterId } from '../data/characters';
import { PERK_BY_ID, specialsOf } from '../data/workshop';
import { COSMETICS, SELL_VALUE } from '../data/cosmetics';
import { STAFFS } from '../data/staffs';
import { FIREARMS } from '../data/weapons';
import type { CharacterId, CosmeticSlot, Difficulty, StaffId, WeaponId } from '../data/types';
import { sanitizeKeys } from '../input/keymap';
import {
  defaultRanking,
  defaultSave,
  defaultSettings,
  RANKING_VERSION,
  SAVE_VERSION,
  SETTINGS_VERSION,
  type CampaignRun,
  type RankEntry,
  type RankingV1,
  type SaveV2,
  type SettingsV2,
  type WorkshopState,
} from './schema';

type Any = Record<string, unknown>;
export type Migration = (d: Any) => Any;

/** Migrações do save: índice = versão de origem. v0 = sem versão (protótipos antigos). */
export const SAVE_MIGRATIONS: Record<number, Migration> = {
  0: (d) => {
    const s = defaultSave() as unknown as Any;
    // aproveita campos antigos soltos, se existirem
    const lvl = Number((d as Any).level ?? 1);
    (s.profile as Any).level = Number.isFinite(lvl) ? lvl : 1;
    return s;
  },
  // v1 → v2: a Oficina começa vazia na validação
  1: (d) => ({ ...d, version: 2 }),
};

export const SETTINGS_MIGRATIONS: Record<number, Migration> = {
  0: () => defaultSettings() as unknown as Any,
  // v1 → v2: o antigo Muito fácil virou o Fácil (ainda mais fácil); todos os outros vão para o novo Normal (o antigo
  // Fácil), que passou a ser o padrão
  1: (d) => {
    const gp = obj(d.gameplay);
    return {
      ...d,
      version: 2,
      gameplay: { ...gp, difficulty: gp.difficulty === 'veryEasy' ? 'easy' : 'normal' },
    };
  },
};

export const RANKING_MIGRATIONS: Record<number, Migration> = {
  0: (d) => ({ version: 1, entries: Array.isArray(d) ? d : [] }),
};

export function runMigrations(
  d: Any,
  current: number,
  migrations: Record<number, Migration>,
): { data: Any; from: number } {
  let v = typeof d.version === 'number' ? d.version : 0;
  const from = v;
  let out = d;
  while (v < current) {
    const m = migrations[v];
    if (!m) throw new Error(`sem migração a partir da versão ${v}`);
    out = m(out);
    v = typeof out.version === 'number' ? out.version : v + 1;
  }
  return { data: out, from };
}

const num = (v: unknown, def: number, min = -Infinity, max = Infinity): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : def;
  return Math.min(max, Math.max(min, n));
};
const bool = (v: unknown, def: boolean): boolean => (typeof v === 'boolean' ? v : def);
const str = (v: unknown, def: string, max = 24): string =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : def;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Any => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Any) : {});

/** Normaliza um save: completa campos, limita números e descarta ids desconhecidos (reembolsa cosméticos removidos). */
export function sanitizeSave(raw: unknown): SaveV2 {
  const d = obj(raw);
  const def = defaultSave();
  const profile = obj(d.profile);
  const progress = obj(d.progress);
  const unlocks = obj(d.unlocks);
  const cos = obj(d.cosmetics);
  const stats = obj(d.stats);
  const flags = obj(d.flags);
  let scrap = num(profile.scrap, 0, 0, 1e9);
  const owned: string[] = [];
  for (const id of arr(cos.owned)) {
    if (typeof id !== 'string') continue;
    if (COSMETICS[id]) {
      if (!owned.includes(id)) owned.push(id);
    } else scrap += SELL_VALUE.common;
  }
  const equipped: SaveV2['cosmetics']['equipped'] = {};
  for (const [slot, id] of Object.entries(obj(cos.equipped))) {
    const c = typeof id === 'string' ? COSMETICS[id] : undefined;
    if (c && c.slot === slot && owned.includes(c.id)) equipped[slot as CosmeticSlot] = c.id;
  }
  const levels: SaveV2['progress']['levels'] = {};
  for (const [id, lp] of Object.entries(obj(progress.levels))) {
    const l = obj(lp);
    levels[id] = {
      completed: bool(l.completed, false),
      bestScore: num(l.bestScore, 0, 0),
      bestTimeMs: num(l.bestTimeMs, 0, 0),
      stars: num(l.stars, 0, 0, 3),
    };
  }
  const unlockedLevels = arr(progress.unlockedLevels).filter((x): x is string => typeof x === 'string');
  if (!unlockedLevels.includes('vila-1')) unlockedLevels.unshift('vila-1');
  const firearms = arr(unlocks.firearms).filter((x): x is WeaponId => typeof x === 'string' && x in FIREARMS);
  if (!firearms.includes('pistol')) firearms.unshift('pistol');
  const staffs = arr(unlocks.staffs).filter((x): x is StaffId => typeof x === 'string' && x in STAFFS);
  if (!staffs.includes('heal')) staffs.unshift('heal');
  return {
    version: 2,
    createdAt: num(d.createdAt, def.createdAt, 0),
    updatedAt: num(d.updatedAt, def.updatedAt, 0),
    profile: {
      name: str(profile.name, def.profile.name, 16),
      level: Math.round(num(profile.level, 1, 1, 50)),
      xp: num(profile.xp, 0, 0),
      scrap,
      character: isCharacterId(profile.character) ? profile.character : 'robot',
      ...(typeof profile.rankName === 'string' && profile.rankName.trim()
        ? { rankName: str(profile.rankName, '', 16) }
        : {}),
    },
    progress: { unlockedLevels: [...new Set(unlockedLevels)], levels },
    unlocks: { firearms: [...new Set(firearms)], staffs: [...new Set(staffs)] },
    cosmetics: {
      owned,
      equipped,
      seen: arr(cos.seen).filter((x): x is string => typeof x === 'string' && !!COSMETICS[x]),
      pity: Math.round(num(cos.pity, 0, 0, 1000)),
    },
    stats: {
      kills: num(stats.kills, 0, 0),
      deaths: num(stats.deaths, 0, 0),
      bosses: num(stats.bosses, 0, 0),
      playTimeMs: num(stats.playTimeMs, 0, 0),
      runs: num(stats.runs, 0, 0),
    },
    flags: {
      ngPlus: bool(flags.ngPlus, false),
      ngPlusOn: bool(flags.ngPlus, false) && bool(flags.ngPlusOn, false),
      tutorialDone: bool(flags.tutorialDone, false),
      credits: bool(flags.credits, false),
    },
    workshop: sanitizeWorkshop(d.workshop),
    ...(sanitizeRun(d.run) ? { run: sanitizeRun(d.run) } : {}),
  };
}

/** Oficina: só melhorias que existem e são do personagem; o especial escolhido precisa estar liberado. */
function sanitizeWorkshop(raw: unknown): SaveV2['workshop'] {
  const out: SaveV2['workshop'] = {};
  for (const [c, v] of Object.entries(obj(raw))) {
    if (!isCharacterId(c)) continue;
    const ws = obj(v);
    const perks = [
      ...new Set(
        arr(ws.perks).filter((id): id is string => typeof id === 'string' && PERK_BY_ID[id]?.character === c),
      ),
    ];
    const st: WorkshopState = { perks };
    if (
      typeof ws.special === 'string' &&
      specialsOf(c as CharacterId, perks)
        .slice(1)
        .includes(ws.special)
    )
      st.special = ws.special;
    out[c as CharacterId] = st;
  }
  return out;
}

function sanitizeRun(raw: unknown): CampaignRun | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = obj(raw);
  if (typeof r.score !== 'number') return undefined;
  const chars = arr(r.chars).filter(isCharacterId).slice(0, 5);
  return {
    score: num(r.score, 0, 0),
    kills: num(r.kills, 0, 0),
    timeMs: num(r.timeMs, 0, 0),
    maps: Math.round(num(r.maps, 0, 0, 1000)),
    mapId: str(r.mapId, 'vila', 32),
    levelId: str(r.levelId, 'vila-1', 32),
    chars,
    ngPlus: bool(r.ngPlus, false),
    team: Math.round(num(r.team, 1, 1, 5)),
    startedAt: num(r.startedAt, 0, 0),
  };
}

export function sanitizeSettings(raw: unknown): SettingsV2 {
  const d = obj(raw);
  const def = defaultSettings();
  const a = obj(d.audio);
  const c = obj(d.controls);
  const g = obj(d.graphics);
  const gp = obj(d.gameplay);
  const q = g.quality;
  const diff = gp.difficulty;
  const aim = c.aimAssist;
  const tc = obj(c.touch);
  return {
    version: 2,
    audio: {
      master: num(a.master, def.audio.master, 0, 1),
      music: num(a.music, def.audio.music, 0, 1),
      sfx: num(a.sfx, def.audio.sfx, 0, 1),
      voice: num(a.voice, def.audio.voice, 0, 1),
      muted: bool(a.muted, false),
    },
    controls: {
      mouseSensitivity: num(c.mouseSensitivity, 1, 0.2, 3),
      pointerLock: bool(c.pointerLock, true),
      aimAssist: aim === 'off' || aim === 'low' || aim === 'high' ? aim : def.controls.aimAssist,
      hints: bool(c.hints, true),
      touch: {
        mode: tc.mode === 'on' || tc.mode === 'off' ? tc.mode : 'auto',
        size: num(tc.size, 1, 0.7, 1.4),
        opacity: num(tc.opacity, 0.35, 0.15, 0.8),
        haptics: bool(tc.haptics, true),
      },
      ...(sanitizeKeys(c.keys) ? { keys: sanitizeKeys(c.keys) } : {}),
    },
    graphics: {
      quality: q === 'auto' || q === 'low' || q === 'medium' || q === 'high' ? q : 'auto',
      renderScale: num(g.renderScale, 1, 0.5, 1),
      screenShake: num(g.screenShake, 1, 0, 1.5),
      damageNumbers: bool(g.damageNumbers, true),
      showFps: bool(g.showFps, false),
      reduceFlashes: bool(g.reduceFlashes, false),
    },
    gameplay: {
      difficulty: (diff === 'easy' || diff === 'normal' || diff === 'hard' || diff === 'insane'
        ? diff
        : 'normal') as Difficulty,
    },
    language: d.language === 'pt' || d.language === 'en' ? d.language : 'auto',
  };
}

export function sanitizeRanking(raw: unknown): RankingV1 {
  const d = obj(raw);
  const entries: RankEntry[] = [];
  for (const e of arr(d.entries)) {
    const r = obj(e);
    if (typeof r.score !== 'number') continue;
    entries.push({
      name: str(r.name, 'Anônimo', 16),
      score: num(r.score, 0, 0),
      mapId: str(r.mapId, 'vila', 32),
      levelId: str(r.levelId, 'vila-1', 32),
      timeMs: num(r.timeMs, 0, 0),
      kills: num(r.kills, 0, 0),
      playerLevel: num(r.playerLevel, 1, 1, 50),
      date: num(r.date, 0, 0),
      victory: bool(r.victory, false),
      ...(r.ngPlus === true ? { ngPlus: true } : {}),
      ...(Array.isArray(r.chars) && r.chars.length > 0 && r.chars.every(isCharacterId)
        ? { chars: r.chars.slice(0, 5) }
        : {}),
      ...(typeof r.maps === 'number' ? { maps: Math.round(num(r.maps, 0, 0, 1000)) } : {}),
    });
  }
  return { version: 1, entries: entries.sort((a, b) => b.score - a.score).slice(0, 20) };
}

export const VERSIONS = { save: SAVE_VERSION, settings: SETTINGS_VERSION, ranking: RANKING_VERSION };
export { defaultRanking };
