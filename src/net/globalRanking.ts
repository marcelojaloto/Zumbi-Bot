import type { CharacterId } from '../data/types';
import { isCharacterId } from '../data/characters';
import { MAPS } from '../data/maps';
import type { RankEntry } from '../save/schema';

/**
 * O que vai para o banco (validado pelas regras em firebase/database.rules.json). Não tem nome nem texto livre:
 * os outros jogadores veem os apelidos dos personagens, e o nome escrito no ranking pessoal fica só no aparelho.
 */
export interface GlobalRecord {
  score: number;
  maps: number;
  mapId: string;
  chars: CharacterId[];
  victory: boolean;
  ngPlus: boolean;
  level: number;
  date: number;
}

/** Um jogador (aparelho) no ranking global: o melhor resultado do ranking pessoal dele. */
export interface GlobalEntry extends GlobalRecord {
  uid: string;
}

export const GLOBAL_TOP = 100;
/** Sem resposta nesse tempo, o ranking global é tratado como fora do ar (e some da tela). */
const TIMEOUT_MS = 6000;
const STORE = 'zumbibot.global.v1';
/** Ninguém entra no ranking global sem escolher: o jogador toca em Participar na tela do ranking. */
const JOIN_DEFAULT = false;
const MAP_IDS = new Set<string>(MAPS.map((m) => m.id));

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
  /** Escolha do jogador: participar ou não do ranking global. */
  joined?: boolean;
  /** Saiu do ranking sem internet: o registro e a conta anônima ainda precisam ser apagados. */
  leaving?: boolean;
}

const NO_ACCOUNT: Session = { uid: '', refreshToken: '', idToken: '', exp: 0 };

/** Registro do ranking pessoal → o que vai para o ranking global (sem o nome). */
export function toRecord(e: RankEntry): GlobalRecord {
  return {
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

/**
 * Resposta do banco (objeto uid → registro) → lista ordenada, maior pontuação primeiro. Ignora lixo e só aceita
 * mapas e personagens do jogo: nenhum texto vindo do banco aparece na tela.
 */
export function parseTop(raw: unknown, limit = GLOBAL_TOP): GlobalEntry[] {
  if (!raw || typeof raw !== 'object') return [];
  const out: GlobalEntry[] = [];
  for (const [uid, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const r = v as Record<string, unknown>;
    if (typeof r.score !== 'number' || !Number.isFinite(r.score)) continue;
    out.push({
      uid,
      score: r.score,
      maps: typeof r.maps === 'number' ? r.maps : 0,
      mapId: typeof r.mapId === 'string' && MAP_IDS.has(r.mapId) ? r.mapId : '',
      chars: Array.isArray(r.chars) ? r.chars.filter(isCharacterId).slice(0, 5) : [],
      victory: r.victory === true,
      ngPlus: r.ngPlus === true,
      level: typeof r.level === 'number' ? r.level : 1,
      date: typeof r.date === 'number' ? r.date : 0,
    });
  }
  return out.sort((a, b) => b.score - a.score || a.date - b.date).slice(0, limit);
}

/** Resposta de erro do Firebase (o código diz se adianta tentar de novo). */
class HttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) throw new HttpError(res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Ranking global no Firebase (Realtime Database pela API REST, sem biblioteca). Só participa quem escolhe: aí o
 * aparelho entra com uma conta anônima e só pode escrever o próprio registro, o melhor do seu ranking pessoal. Sair
 * apaga o registro e a conta. Qualquer falha (sem internet, banco fora do ar, projeto não configurado) deixa o
 * ranking global escondido, sem atrapalhar o jogo.
 */
export class GlobalRanking {
  private top: { at: number; list: GlobalEntry[] } | null = null;
  private loading: Promise<GlobalEntry[] | null> | null = null;
  /** Envios e exclusões, um de cada vez, na ordem em que foram pedidos. */
  private queue: Promise<unknown> = Promise.resolve();

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
    return this.session()?.uid || null;
  }

  /** O jogador escolheu participar do ranking global. */
  get joined(): boolean {
    const s = this.session();
    return !s?.leaving && (s?.joined ?? JOIN_DEFAULT);
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

  /** Passa a participar do ranking global e envia o melhor resultado do aparelho. */
  join(best: RankEntry | undefined): Promise<boolean> {
    this.save({ ...(this.session() ?? NO_ACCOUNT), joined: true, leaving: false });
    return this.submit(best);
  }

  /**
   * Sai do ranking global: apaga o registro do aparelho e a conta anônima. Sem internet, a exclusão fica para
   * depois ({@link retry}). Nunca lança erro.
   */
  leave(): Promise<boolean> {
    const s = this.session();
    const remote = !!s?.uid;
    this.save({ ...(s ?? NO_ACCOUNT), joined: false, pending: undefined, sent: undefined, leaving: remote });
    if (this.top) this.top.at = 0;
    return remote ? this.flush() : Promise.resolve(true);
  }

  /**
   * Envia o melhor resultado do aparelho (o 1º do ranking pessoal), se o jogador participa. Sem internet, guarda e
   * tenta de novo depois ({@link retry}). Nunca lança erro.
   */
  async submit(best: RankEntry | undefined): Promise<boolean> {
    if (!this.configured || !this.joined || !best || best.score <= 0) return false;
    const rec = toRecord(best);
    const s = this.session();
    if (s?.sent === JSON.stringify(rec)) return true;
    this.save({ ...(s ?? NO_ACCOUNT), pending: rec });
    return this.flush();
  }

  /** Termina o que ficou pendente (na abertura do jogo): um envio ou a saída do ranking. */
  retry(): void {
    const s = this.configured ? this.session() : null;
    if (s?.leaving || (s?.pending && this.joined)) void this.flush();
  }

  private flush(): Promise<boolean> {
    const run = this.queue.then(() => this.step());
    this.queue = run;
    return run;
  }

  /** Faz o que estiver pendente: apagar (saiu do ranking) ou enviar o melhor resultado. */
  private async step(): Promise<boolean> {
    try {
      if (this.session()?.leaving) return await this.erase();
      if (!this.joined) return false;
      const rec = this.session()?.pending;
      if (!rec) return true;
      const s = await this.auth();
      if (!s) return false;
      await fetchJson(
        `${this.db}/ranking/${encodeURIComponent(s.uid)}.json?auth=${encodeURIComponent(s.idToken)}`,
        { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(rec) },
      );
      const cur = this.session() ?? s;
      // (se chegou outro melhor enquanto enviava, ele fica pendente)
      this.save({
        ...cur,
        sent: JSON.stringify(rec),
        pending: sameRecord(cur.pending, rec) ? undefined : cur.pending,
      });
      if (this.top) this.top.at = 0;
      return true;
    } catch {
      return false;
    }
  }

  /** Apaga o registro e a conta anônima do aparelho. */
  private async erase(): Promise<boolean> {
    const s0 = this.session();
    let s: Session | null = null;
    if (s0?.uid && s0.refreshToken) {
      try {
        s = await this.auth();
      } catch (e) {
        // conta que não existe mais no Firebase (apagada pela moderação): daqui não sobra nada para apagar
        if (!(e instanceof HttpError && e.status === 400)) throw e;
      }
    }
    if (s) {
      await fetchJson(
        `${this.db}/ranking/${encodeURIComponent(s.uid)}.json?auth=${encodeURIComponent(s.idToken)}`,
        { method: 'DELETE' },
      );
      await fetchJson(
        `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(this.cfg.apiKey)}`,
        { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ idToken: s.idToken }) },
      );
    }
    // voltou a participar enquanto apagava: o próximo envio cria outra conta
    const cur = this.session();
    this.save(
      cur && !cur.leaving
        ? { ...NO_ACCOUNT, joined: cur.joined, pending: cur.pending }
        : { ...NO_ACCOUNT, joined: false },
    );
    if (this.top) this.top.at = 0;
    return true;
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
      return this.update({
        uid: r.user_id || s.uid,
        idToken: r.id_token,
        refreshToken: r.refresh_token || s.refreshToken,
        exp: Date.now() + Number(r.expires_in || 3600) * 1000,
      });
    }
    const r = (await fetchJson(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ returnSecureToken: true }),
    })) as { idToken?: string; refreshToken?: string; expiresIn?: string; localId?: string };
    if (!r.idToken || !r.localId || !r.refreshToken) return null;
    return this.update({
      uid: r.localId,
      idToken: r.idToken,
      refreshToken: r.refreshToken,
      exp: Date.now() + Number(r.expiresIn || 3600) * 1000,
    });
  }

  /** Grava a conta nova por cima da sessão atual (que pode ter mudado enquanto esperava o Firebase). */
  private update(account: Pick<Session, 'uid' | 'idToken' | 'refreshToken' | 'exp'>): Session {
    const next = { ...(this.session() ?? NO_ACCOUNT), ...account };
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
