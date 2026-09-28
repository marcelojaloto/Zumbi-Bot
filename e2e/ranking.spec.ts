import { expect, test, type Page, type Route } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type G = {
  isReady(): boolean;
  state(): { screen: string };
  finish(victory: boolean, score?: number): void;
};
const DB = 'https://zb-teste.firebaseio.com';
const screenIs = (page: Page, s: string) =>
  page.waitForFunction((x) => (window as unknown as { __game: G }).__game.state().screen === x, s, {
    timeout: 90_000,
  });
const finish = (page: Page, victory: boolean, score: number) =>
  page.evaluate(
    ([v, s]) => (window as unknown as { __game: G }).__game.finish(v as boolean, s as number),
    [victory, score],
  );

/** Firebase de mentira: conta anônima e o banco do ranking em memória (ou fora do ar). */
function fakeFirebase(page: Page, db: Record<string, unknown>, state: { online: boolean; puts: string[] }) {
  const deny = (r: Route) => r.abort('internetdisconnected');
  void page.route('https://identitytoolkit.googleapis.com/**', (r) =>
    state.online
      ? r.fulfill({
          json: { idToken: 'tok', refreshToken: 'ref', expiresIn: '3600', localId: 'aparelho1' },
        })
      : deny(r),
  );
  void page.route(`${DB}/**`, async (r) => {
    if (!state.online) return deny(r);
    const req = r.request();
    const url = new URL(req.url());
    if (req.method() === 'PUT') {
      const uid = url.pathname.match(/ranking\/(.+)\.json/)![1]!;
      db[uid] = req.postDataJSON();
      state.puts.push(uid);
      return r.fulfill({ json: db[uid] });
    }
    return r.fulfill({ json: db });
  });
}

test('ranking: nome só no fim da jornada, salvo sozinho, e o ranking global', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  const db: Record<string, unknown> = {
    outro: { name: 'Bia', score: 99999, maps: 7, mapId: 'centro', chars: ['cyborg'], date: 1, level: 12 },
  };
  const state = { online: true, puts: [] as string[] };
  fakeFirebase(page, db, state);
  await page.goto(`./${DEBUG_QUERY}&rankdb=${encodeURIComponent(DB)}`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());

  // instalar o jogo fica nas Configurações (só quando o navegador oferece), não no menu principal
  await page.evaluate(() => {
    const ev = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void> };
    ev.prompt = async () => {
      (window as unknown as { __prompted: boolean }).__prompted = true;
    };
    dispatchEvent(ev);
  });
  await page.getByRole('button', { name: 'Jogar' }).click();
  await expect(page.getByRole('button', { name: /Instalar o jogo/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: /Instalar o jogo/ }).click();
  expect(await page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true);
  await expect(page.getByRole('heading', { name: 'CONFIGURAÇÕES' })).toHaveCount(0);

  // joga de Maga: vencer um mapa não pede nome; a jornada soma
  await page.locator('.menu .btn.primary').click();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await screenIs(page, 'playing');
  await finish(page, true, 3000);
  await screenIs(page, 'victory');
  await expect(page.locator('.rank-run')).toContainText('Jornada');
  await expect(page.locator('.rank-name')).toHaveCount(0);
  await page.getByRole('button', { name: 'Próximo mapa' }).click();
  await screenIs(page, 'playing');
  await finish(page, false, 1000);
  await screenIs(page, 'gameover');

  // perdeu todas as vidas: já está salvo com o apelido do personagem; o teclado só abre ao tocar no nome
  await expect(page.locator('.rank-pos')).toContainText('1º lugar');
  await expect(page.locator('.rank-name')).toContainText('Maga');
  await expect(page.locator('input[type="text"]')).toHaveCount(0);
  await expect.poll(() => state.puts.length).toBe(1);
  await page.locator('.rank-name').click();
  const input = page.locator('.name-editor input');
  await expect(input).toBeFocused();
  // a caixa fica no alto da tela (acima do teclado)
  expect((await input.boundingBox())!.y).toBeLessThan(80);
  await input.fill('Marcelo');
  await page.keyboard.press('Enter');
  await expect(page.locator('.name-editor')).toHaveCount(0);
  await expect(page.locator('.rank-name')).toContainText('Marcelo');
  await expect.poll(() => (db.aparelho1 as { name?: string } | undefined)?.name).toBe('Marcelo');
  await page.getByRole('button', { name: 'Menu principal' }).click();

  // ranking abre no pessoal; o botão alterna para o global (o melhor de cada aparelho)
  await page.getByRole('button', { name: 'Ranking' }).click();
  await expect(page.getByRole('heading', { name: 'RANKING PESSOAL' })).toBeVisible();
  await expect(page.locator('.rk-table')).toContainText('Marcelo');
  await page.getByRole('button', { name: /Ranking Global/ }).click();
  await expect(page.getByRole('heading', { name: 'RANKING GLOBAL' })).toBeVisible();
  const rows = page.locator('.rk-table tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Bia');
  await expect(rows.nth(1)).toContainText('Marcelo');
  await expect(rows.nth(1)).toContainText('você');
  await page.getByRole('button', { name: /Ranking Pessoal/ }).click();
  await expect(page.getByRole('heading', { name: 'RANKING PESSOAL' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar' }).click();

  // sem comunicação com o Firebase: o ranking global some (sem atrapalhar)
  state.online = false;
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Ranking' }).click();
  await expect(page.locator('.rk-table')).toContainText('Marcelo');
  await page.waitForTimeout(1500);
  await expect(page.getByRole('button', { name: /Ranking Global/ })).toHaveCount(0);
  expect(errors.filter((e) => !/internetdisconnected|Failed to load resource/.test(e))).toEqual([]);
});
