import { afterEach, describe, expect, it, vi } from 'vitest';
import { GlobalRanking, parseTop, toRecord } from './globalRanking';
import type { RankEntry } from '../save/schema';

const entry = (over: Partial<RankEntry> = {}): RankEntry => ({
  name: 'Marcelo',
  score: 12345,
  mapId: 'torre',
  levelId: 'torre-1',
  timeMs: 1,
  kills: 1,
  playerLevel: 7,
  date: 1000,
  victory: false,
  maps: 3,
  chars: ['robot'],
  ...over,
});

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

const CFG = { apiKey: 'k', databaseURL: 'https://zb-test.firebaseio.com/' };

type Call = { url: string; init?: RequestInit };

/** Firebase de mentira: registra as chamadas e responde como o de verdade. */
function firebase(calls: Call[], opts: { expiresIn?: string; refresh?: number } = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.includes('accounts:signUp'))
      return Response.json({
        idToken: 'tok',
        refreshToken: 'ref',
        expiresIn: opts.expiresIn ?? '3600',
        localId: 'uid1',
      });
    if (url.includes('securetoken'))
      return opts.refresh
        ? new Response('{}', { status: opts.refresh })
        : Response.json({ id_token: 'tok2', refresh_token: 'ref', expires_in: '3600', user_id: 'uid1' });
    return Response.json(null);
  });
}

const offline = () => vi.fn(() => Promise.reject(new TypeError('offline')));

afterEach(() => vi.unstubAllGlobals());

describe('ranking global', () => {
  it('ordena do maior para o menor e ignora registros quebrados', () => {
    const list = parseTop({
      a: { score: 10, maps: 1 },
      b: { score: 30 },
      lixo: { score: 'muito' },
      c: null,
    });
    expect(list.map((x) => x.uid)).toEqual(['b', 'a']);
  });

  it('nenhum texto do banco aparece na tela: só mapas e personagens do jogo', () => {
    const [x] = parseTop({
      x: { score: 1, mapId: 'qualquer coisa', chars: ['robot', 'xingamento'], name: 'Fulano' },
    });
    expect(x!.mapId).toBe('');
    expect(x!.chars).toEqual(['robot']);
    expect(x).not.toHaveProperty('name');
  });

  it('o nome do ranking pessoal não vai para o banco', () => {
    expect(toRecord(entry())).not.toHaveProperty('name');
  });

  it('sem configuração fica desligado (nem aparece)', async () => {
    const g = new GlobalRanking({ apiKey: '', databaseURL: '' }, memStore());
    expect(g.configured).toBe(false);
    expect(await g.fetchTop()).toBeNull();
  });

  it('fora do ar: devolve null (a tela esconde o ranking global)', async () => {
    vi.stubGlobal('fetch', offline());
    const g = new GlobalRanking(CFG, memStore());
    expect(await g.fetchTop()).toBeNull();
  });

  it('só participa quem escolhe: sem Participar, nada vai para o banco', async () => {
    const calls: Call[] = [];
    vi.stubGlobal('fetch', firebase(calls));
    const g = new GlobalRanking(CFG, memStore());
    expect(g.joined).toBe(false);
    expect(await g.submit(entry())).toBe(false);
    expect(calls).toEqual([]);
  });

  it('ao participar, entra com conta anônima e grava só o próprio registro', async () => {
    const calls: Call[] = [];
    vi.stubGlobal('fetch', firebase(calls));
    const g = new GlobalRanking(CFG, memStore());
    expect(await g.join(entry())).toBe(true);
    expect(g.joined).toBe(true);
    const put = calls.find((c) => c.init?.method === 'PUT')!;
    expect(put.url).toBe('https://zb-test.firebaseio.com/ranking/uid1.json?auth=tok');
    expect(JSON.parse(put.init!.body as string)).toEqual(toRecord(entry()));
    expect(g.myUid).toBe('uid1');
    // o mesmo registro não é enviado de novo, nem quando só o nome muda
    const n = calls.length;
    expect(await g.submit(entry())).toBe(true);
    expect(await g.submit(entry({ name: 'Outro nome' }))).toBe(true);
    expect(calls.length).toBe(n);
  });

  it('sem internet guarda o registro e envia depois', async () => {
    const store = memStore();
    vi.stubGlobal('fetch', offline());
    const g = new GlobalRanking(CFG, store);
    expect(await g.join(entry())).toBe(false);
    const calls: Call[] = [];
    vi.stubGlobal('fetch', firebase(calls));
    const g2 = new GlobalRanking(CFG, store);
    expect(g2.joined).toBe(true);
    g2.retry();
    await vi.waitFor(() => expect(calls.filter((c) => c.init?.method === 'PUT')).toHaveLength(1));
  });

  it('sair apaga o registro e a conta anônima, e nada mais é enviado', async () => {
    const calls: Call[] = [];
    vi.stubGlobal('fetch', firebase(calls));
    const g = new GlobalRanking(CFG, memStore());
    await g.join(entry());
    calls.length = 0;
    expect(await g.leave()).toBe(true);
    expect(calls.map((c) => [c.init?.method, c.url])).toEqual([
      ['DELETE', 'https://zb-test.firebaseio.com/ranking/uid1.json?auth=tok'],
      ['POST', 'https://identitytoolkit.googleapis.com/v1/accounts:delete?key=k'],
    ]);
    expect(JSON.parse(calls[1]!.init!.body as string)).toEqual({ idToken: 'tok' });
    expect(g.joined).toBe(false);
    expect(g.myUid).toBeNull();
    expect(await g.submit(entry({ score: 99999 }))).toBe(false);
    expect(calls).toHaveLength(2);
  });

  it('saiu sem internet: a exclusão termina na próxima abertura', async () => {
    const store = memStore();
    vi.stubGlobal('fetch', firebase([]));
    await new GlobalRanking(CFG, store).join(entry());
    vi.stubGlobal('fetch', offline());
    const g = new GlobalRanking(CFG, store);
    expect(await g.leave()).toBe(false);
    expect(g.joined).toBe(false);
    const calls: Call[] = [];
    vi.stubGlobal('fetch', firebase(calls));
    const g2 = new GlobalRanking(CFG, store);
    g2.retry();
    await vi.waitFor(() => expect(g2.myUid).toBeNull());
    expect(calls.map((c) => c.init?.method)).toEqual(['DELETE', 'POST']);
    expect(g2.joined).toBe(false);
  });

  it('conta que já não existe no Firebase: sair só esquece a sessão', async () => {
    const calls: Call[] = [];
    vi.stubGlobal('fetch', firebase(calls, { expiresIn: '0', refresh: 400 }));
    const g = new GlobalRanking(CFG, memStore());
    await g.join(entry());
    calls.length = 0;
    expect(await g.leave()).toBe(true);
    expect(calls.map((c) => c.url)).toEqual(['https://securetoken.googleapis.com/v1/token?key=k']);
    expect(g.myUid).toBeNull();
  });
});
