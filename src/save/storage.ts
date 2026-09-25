import {
  defaultRanking,
  defaultSave,
  defaultSettings,
  type RankingV1,
  type SaveV1,
  type SettingsV1,
} from './schema';
import {
  RANKING_MIGRATIONS,
  runMigrations,
  sanitizeRanking,
  sanitizeSave,
  sanitizeSettings,
  SAVE_MIGRATIONS,
  SETTINGS_MIGRATIONS,
  VERSIONS,
  type Migration,
} from './migrations';

/** Interface mínima de armazenamento chave-valor (localStorage ou memória). */
export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export class MemoryKV implements KV {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

/** localStorage se disponível (e gravável); senão memória (modo privado). */
export function defaultKV(): KV {
  try {
    const ls = (globalThis as { localStorage?: KV }).localStorage;
    if (!ls) return new MemoryKV();
    const k = '__zb_test__';
    ls.setItem(k, '1');
    ls.removeItem(k);
    return ls;
  } catch {
    return new MemoryKV();
  }
}

export const KEYS = {
  save: 'zumbi-bot:save',
  settings: 'zumbi-bot:settings',
  ranking: 'zumbi-bot:ranking',
} as const;

export interface LoadResult<T> {
  data: T;
  /** Save corrompido: backup restaurado ou padrão. */
  recovered: boolean;
  migratedFrom: number | null;
  /** Versão mais nova que este build: não sobrescrever. */
  readOnly: boolean;
}

function loadVersioned<T>(
  kv: KV,
  key: string,
  current: number,
  migrations: Record<number, Migration>,
  sanitize: (d: unknown) => T,
  defaults: () => T,
): LoadResult<T> {
  const parse = (raw: string | null): unknown => (raw ? JSON.parse(raw) : null);
  let raw: string | null = null;
  try {
    raw = kv.getItem(key);
  } catch {
    raw = null;
  }
  if (!raw) return { data: defaults(), recovered: false, migratedFrom: null, readOnly: false };
  try {
    const d = parse(raw) as Record<string, unknown>;
    if (!d || typeof d !== 'object') throw new Error('formato inválido');
    const v = typeof d.version === 'number' ? d.version : 0;
    if (v > current) return { data: sanitize(d), recovered: false, migratedFrom: null, readOnly: true };
    if (v < current) {
      try {
        kv.setItem(`${key}:bak`, raw);
      } catch {
        /* sem espaço */
      }
      const m = runMigrations(d, current, migrations);
      return { data: sanitize(m.data), recovered: false, migratedFrom: m.from, readOnly: false };
    }
    return { data: sanitize(d), recovered: false, migratedFrom: null, readOnly: false };
  } catch {
    // corrompido: tenta o backup
    try {
      const bak = parse(kv.getItem(`${key}:bak`));
      if (bak && typeof bak === 'object') {
        const m = runMigrations(bak as Record<string, unknown>, current, migrations);
        return { data: sanitize(m.data), recovered: true, migratedFrom: null, readOnly: false };
      }
    } catch {
      /* backup também inválido */
    }
    return { data: defaults(), recovered: true, migratedFrom: null, readOnly: false };
  }
}

/** Persistência do progresso, configurações e ranking (chaves e versões independentes). */
export class Storage {
  saveReadOnly = false;
  settingsReadOnly = false;

  constructor(readonly kv: KV = defaultKV()) {}

  loadSave(now = Date.now()): LoadResult<SaveV1> {
    const r = loadVersioned(kv(this), KEYS.save, VERSIONS.save, SAVE_MIGRATIONS, sanitizeSave, () =>
      defaultSave(now),
    );
    this.saveReadOnly = r.readOnly;
    return r;
  }

  writeSave(s: SaveV1, now = Date.now()): boolean {
    if (this.saveReadOnly) return false;
    s.updatedAt = now;
    return write(this.kv, KEYS.save, s);
  }

  loadSettings(): LoadResult<SettingsV1> {
    const r = loadVersioned(
      kv(this),
      KEYS.settings,
      VERSIONS.settings,
      SETTINGS_MIGRATIONS,
      sanitizeSettings,
      defaultSettings,
    );
    this.settingsReadOnly = r.readOnly;
    return r;
  }

  writeSettings(s: SettingsV1): boolean {
    if (this.settingsReadOnly) return false;
    return write(this.kv, KEYS.settings, s);
  }

  loadRanking(): LoadResult<RankingV1> {
    return loadVersioned(
      kv(this),
      KEYS.ranking,
      VERSIONS.ranking,
      RANKING_MIGRATIONS,
      sanitizeRanking,
      defaultRanking,
    );
  }

  writeRanking(r: RankingV1): boolean {
    return write(this.kv, KEYS.ranking, r);
  }

  wipeProgress(): void {
    try {
      this.kv.removeItem(KEYS.save);
      this.kv.removeItem(`${KEYS.save}:bak`);
    } catch {
      /* ignora */
    }
  }
}

function kv(s: Storage): KV {
  return s.kv;
}

function write(kv: KV, key: string, v: unknown): boolean {
  try {
    kv.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
