import { COSMETICS, SELL_VALUE } from '../data/cosmetics';
import { STAFFS } from '../data/staffs';
import { FIREARMS } from '../data/weapons';
import type { CosmeticSlot, Difficulty, StaffId, WeaponId } from '../data/types';
import {
  defaultRanking,
  defaultSave,
  defaultSettings,
  RANKING_VERSION,
  SAVE_VERSION,
  SETTINGS_VERSION,
  type RankEntry,
  type RankingV1,
  type SaveV1,
  type SettingsV1,
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
};

export const SETTINGS_MIGRATIONS: Record<number, Migration> = {
  0: () => defaultSettings() as unknown as Any,
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
export function sanitizeSave(raw: unknown): SaveV1 {
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
  const equipped: SaveV1['cosmetics']['equipped'] = {};
  for (const [slot, id] of Object.entries(obj(cos.equipped))) {
    const c = typeof id === 'string' ? COSMETICS[id] : undefined;
    if (c && c.slot === slot && owned.includes(c.id)) equipped[slot as CosmeticSlot] = c.id;
  }
  const levels: SaveV1['progress']['levels'] = {};
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
    version: 1,
    createdAt: num(d.createdAt, def.createdAt, 0),
    updatedAt: num(d.updatedAt, def.updatedAt, 0),
    profile: {
      name: str(profile.name, def.profile.name, 16),
      level: Math.round(num(profile.level, 1, 1, 50)),
      xp: num(profile.xp, 0, 0),
      scrap,
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
    flags: { ngPlus: bool(flags.ngPlus, false), tutorialDone: bool(flags.tutorialDone, false) },
  };
}

export function sanitizeSettings(raw: unknown): SettingsV1 {
  const d = obj(raw);
  const def = defaultSettings();
  const a = obj(d.audio);
  const c = obj(d.controls);
  const g = obj(d.graphics);
  const gp = obj(d.gameplay);
  const q = g.quality;
  const diff = gp.difficulty;
  const aim = c.aimAssist;
  return {
    version: 1,
    audio: {
      master: num(a.master, def.audio.master, 0, 1),
      music: num(a.music, def.audio.music, 0, 1),
      sfx: num(a.sfx, def.audio.sfx, 0, 1),
      muted: bool(a.muted, false),
    },
    controls: {
      mouseSensitivity: num(c.mouseSensitivity, 1, 0.2, 3),
      pointerLock: bool(c.pointerLock, true),
      aimAssist: aim === 'off' || aim === 'low' || aim === 'high' ? aim : def.controls.aimAssist,
      hints: bool(c.hints, true),
    },
    graphics: {
      quality: q === 'auto' || q === 'low' || q === 'medium' || q === 'high' ? q : 'auto',
      renderScale: num(g.renderScale, 1, 0.5, 1),
      screenShake: num(g.screenShake, 1, 0, 1.5),
      damageNumbers: bool(g.damageNumbers, true),
      showFps: bool(g.showFps, false),
    },
    gameplay: {
      difficulty: (diff === 'easy' || diff === 'normal' || diff === 'hard' ? diff : 'normal') as Difficulty,
    },
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
    });
  }
  return { version: 1, entries: entries.sort((a, b) => b.score - a.score).slice(0, 20) };
}

export const VERSIONS = { save: SAVE_VERSION, settings: SETTINGS_VERSION, ranking: RANKING_VERSION };
export { defaultRanking };
