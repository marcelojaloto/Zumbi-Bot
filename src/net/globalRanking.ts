import type { CharacterId } from '../data/types';
import { isCharacterId } from '../data/characters';
import type { RankEntry } from '../save/schema';

/** Um jogador (aparelho) no ranking global: o melhor resultado do ranking pessoal dele. */
export interface GlobalEntry {
  uid: string;
  name: string;
  score: number;
  maps: number;
  mapId: string;
  chars: CharacterId[];
  victory: boolean;
  ngPlus: boolean;
  level: number;
  date: number;
}

/** O que vai para o banco (validado pelas regras em firebase/database.rules.json). */
export interface GlobalRecord {
  name: string;
  score: number;
  maps: number;
  mapId: string;
  chars: CharacterId[];
  victory: boolean;
  ngPlus: boolean;
  level: number;
  date: number;
}

export const GLOBAL_TOP = 100;
/** Sem resposta nesse tempo, o ranking global é tratado como fora do ar (e some da tela). */
const TIMEOUT_MS = 6000;
const STORE = 'zumbibot.global.v1';

interface Session {
  uid: string;
  refreshToken: string;
  idToken: string;
  /** Validade do idToken (ms desde 1970). */
  exp: number;
  /** Último registro enviado (para não reenviar o mesmo). */
  sent?: string;
  /** Registro esperando a internet voltar. */
  pending?: GlobalRecord;
}

/** Registro do ranking pessoal → o que vai para o ranking global. */
export function toRecord(e: RankEntry): GlobalRecord {
  return {
    name: e.name.trim().slice(0, 16) || 'Anônimo',
    score: Math.max(0, Math.min(1e8, Math.round(e.score))),
    maps: Math.max(0, Math.min(1000, Math.round(e.maps ?? 0))),
    mapId: e.mapId.slice(0, 32),
    chars: (e.chars ?? []).slice(0, 5),
    victory: !!e.victory,
    ngPlus: !!e.ngPlus,
    level: Math.max(1, Math.min(99, Math.round(e.playerLevel))),
    date: Math.round(e.date),
  };
}

/** Resposta do banco (objeto uid → registro) → lista ordenada, maior pontuação primeiro. Ignora lixo. */
export function parseTop(raw: unknown, limit = GLOBAL_TOP): GlobalEntry[] {
  if (!raw || typeof raw !== 'object') return [];
  const out: GlobalEntry[] = [];
  for (const [uid, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    if (typeof r.name !== 'string' || typeof r.score !== 'number' || !Number.isFinite(r.score)) continue;
    out.push({
      uid,
      name: r.name.slice(0, 16),
      score: r.score,
      maps: typeof r.maps === 'number' ? r.maps : 0,
      mapId: typeof r.mapId === 'string' ? r.mapId : '',
      chars: Array.isArray(r.chars) ? r.chars.filter(isCharacterId).slice(0, 5) : [],
      victory: r.victory === true,
      ngPlus: r.ngPlus === true,
      level: typeof r.level === 'number' ? r.level : 1,
      date: typeof r.date === 'number' ? r.date : 0,
    });
  }
  return out.sort((a, b) => b.score - a.score || a.date - b.date).slice(0, limit);
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ranking global no Firebase (Realtime Database pela API REST, sem biblioteca): cada aparelho entra com uma conta
 * anônima e só pode escrever o próprio registro — o melhor do seu ranking pessoal. Qualquer falha (sem internet,
 * banco fora do ar, projeto não configurado) deixa o ranking global escondido, sem atrapalhar o jogo.
 */
export class GlobalRanking {
  private top: { at: number; list: GlobalEntry[] } | null = null;
  private loading: Promise<GlobalEntry[] | null> | null = null;
  private sending = false;

  constructor(
    private cfg: { apiKey: string; databaseURL: string },
    private store: Pick<globalThis.Storage, 'getItem' | 'setItem'> | null = safeStorage(),
  ) {}

  get configured(): boolean {
    return !!(this.cfg.apiKey && /^https:\/\/[^/]+/.test(this.cfg.databaseURL));
  }

  /** Último resultado bom (para mostrar na hora enquanto atualiza). */
  get cached(): GlobalEntry[] | null {
    return this.top?.list ?? null;
  }

  /** Id deste aparelho no ranking global (depois do primeiro envio). */
  get myUid(): string | null {
    return this.session()?.uid ?? null;
  }

  private get db(): string {
    return this.cfg.databaseURL.replace(/\/+$/, '');
  }

  /** Os melhores do mundo; null = fora do ar (a tela não mostra o ranking global). Guarda por 1 min. */
  fetchTop(force = false): Promise<GlobalEntry[] | null> {
    if (!this.configured) return Promise.resolve(null);
    if (!force && this.top && Date.now() - this.top.at < 60_000) return Promise.resolve(this.top.list);
    this.loading ??= fetchJson(`${this.db}/ranking.json?orderBy=%22score%22&limitToLast=${GLOBAL_TOP}`)
      .then((raw) => {
        const list = parseTop(raw);
        this.top = { at: Date.now(), list };
        return list;
      })
      .catch(() => null)
      .finally(() => (this.loading = null));
    return this.loading;
  }

  /**
   * Envia o melhor resultado do aparelho (o 1º do ranking pessoal). Sem internet, guarda e tenta de novo depois
   * ({@link retry}). Nunca lança erro.
   */
  async submit(best: RankEntry | undefined): Promise<boolean> {
    if (!this.configured || !best || best.score <= 0) return false;
    const rec = toRecord(best);
    const s = this.session();
    const key = JSON.stringify([rec.name, rec.score, rec.date]);
    if (s?.sent === key) return true;
    this.save({ ...(s ?? { uid: '', refreshToken: '', idToken: '', exp: 0 }), pending: rec });
    return this.flush();
  }

  /** Tenta mandar o que ficou pendente (na abertura do jogo). */
  retry(): void {
    if (this.configured && this.session()?.pending) void this.flush();
  }

  private async flush(): Promise<boolean> {
    if (this.sending) return false;
    this.sending = true;
    try {
      const s = await this.auth();
      const rec = s?.pending;
      if (!s || !rec) return false;
      await fetchJson(
        `${this.db}/ranking/${encodeURIComponent(s.uid)}.json?auth=${encodeURIComponent(s.idToken)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rec),
        },
      );
      const cur = this.session() ?? s;
      const sent = JSON.stringify([rec.name, rec.score, rec.date]);
      // (se chegou outro melhor enquanto enviava, ele fica pendente)
      this.save({
        ...cur,
        sent,
        pending: cur.pending === rec || sameRecord(cur.pending, rec) ? undefined : cur.pending,
      });
      if (this.top) this.top.at = 0;
      return true;
    } catch {
      return false;
    } finally {
      this.sending = false;
    }
  }

  /** Conta anônima do aparelho (cria na primeira vez; renova o token vencido). */
  private async auth(): Promise<Session | null> {
    const s = this.session();
    const key = encodeURIComponent(this.cfg.apiKey);
    if (s?.uid && s.idToken && s.exp - 60_000 > Date.now()) return s;
    if (s?.uid && s.refreshToken) {
      const r = (await fetchJson(`https://securetoken.googleapis.com/v1/token?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(s.refreshToken)}`,
      })) as { id_token?: string; refresh_token?: string; expires_in?: string; user_id?: string };
      if (!r.id_token) return null;
      const next = {
        ...s,
        uid: r.user_id || s.uid,
        idToken: r.id_token,
        refreshToken: r.refresh_token || s.refreshToken,
        exp: Date.now() + Number(r.expires_in || 3600) * 1000,
      };
      this.save(next);
      return next;
    }
    const r = (await fetchJson(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    })) as { idToken?: string; refreshToken?: string; expiresIn?: string; localId?: string };
    if (!r.idToken || !r.localId || !r.refreshToken) return null;
    const next: Session = {
      ...(s ?? {}),
      uid: r.localId,
      idToken: r.idToken,
      refreshToken: r.refreshToken,
      exp: Date.now() + Number(r.expiresIn || 3600) * 1000,
    };
    this.save(next);
    return next;
  }

  private session(): Session | null {
    try {
      const raw = this.store?.getItem(STORE);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }

  private save(s: Session): void {
    try {
      this.store?.setItem(STORE, JSON.stringify(s));
    } catch {
      /* sem armazenamento: tenta de novo na próxima vez */
    }
  }
}

function sameRecord(a: GlobalRecord | undefined, b: GlobalRecord): boolean {
  return !!a && JSON.stringify(a) === JSON.stringify(b);
}

function safeStorage(): Pick<globalThis.Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
