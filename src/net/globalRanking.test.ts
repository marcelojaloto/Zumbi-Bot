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

afterEach(() => vi.unstubAllGlobals());

describe('ranking global', () => {
  it('ordena do maior para o menor e ignora registros quebrados', () => {
    const list = parseTop({
      a: { name: 'A', score: 10, maps: 1 },
      b: { name: 'B', score: 30 },
      lixo: { score: 'muito' },
      c: null,
    });
    expect(list.map((x) => x.uid)).toEqual(['b', 'a']);
  });

  it('sem configuração fica desligado (nem aparece)', async () => {
    const g = new GlobalRanking({ apiKey: '', databaseURL: '' }, memStore());
    expect(g.configured).toBe(false);
    expect(await g.fetchTop()).toBeNull();
  });

  it('fora do ar: devolve null (a tela esconde o ranking global)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    const g = new GlobalRanking(CFG, memStore());
    expect(await g.fetchTop()).toBeNull();
  });

  it('entra com conta anônima e grava só o próprio registro', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        const body = url.includes('accounts:signUp')
          ? { idToken: 'tok', refreshToken: 'ref', expiresIn: '3600', localId: 'uid1' }
          : {};
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    const store = memStore();
    const g = new GlobalRanking(CFG, store);
    expect(await g.submit(entry())).toBe(true);
    const put = calls.find((c) => c.init?.method === 'PUT')!;
    expect(put.url).toBe('https://zb-test.firebaseio.com/ranking/uid1.json?auth=tok');
    expect(JSON.parse(put.init!.body as string)).toEqual(toRecord(entry()));
    expect(g.myUid).toBe('uid1');
    // o mesmo registro não é enviado de novo
    const n = calls.length;
    expect(await g.submit(entry())).toBe(true);
    expect(calls.length).toBe(n);
  });

  it('sem internet guarda o registro e envia depois', async () => {
    const store = memStore();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    const g = new GlobalRanking(CFG, store);
    expect(await g.submit(entry())).toBe(false);
    const puts: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'PUT') puts.push(url);
        const body = url.includes('accounts:signUp')
          ? { idToken: 'tok', refreshToken: 'ref', expiresIn: '3600', localId: 'uid9' }
          : {};
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    const g2 = new GlobalRanking(CFG, store);
    g2.retry();
    await vi.waitFor(() => expect(puts).toHaveLength(1));
  });
});
