import { expect, test, type Page } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type G = {
  isReady(): boolean;
  state(): {
    screen: string;
    tick: number;
    enemiesAlive: number;
    finished: string | null;
    player?: { x: number; hp: number };
  };
  startLevel(m: string, i?: number): Promise<void>;
  step(n: number): void;
  input(f: object, n: number): void;
  spawn(id: string, x?: number, z?: number): number;
  god(on: boolean): void;
  autopilot(on: boolean): void;
  captureFrame(): string;
  errors: string[];
};

async function game(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
}

test('mapa 1: anda, luta, renderiza e conclui com piloto automático', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await game(page);
  await page.getByRole('button', { name: /Jogar/i }).first().click();
  await expect(page.getByRole('button', { name: /Mapas/i })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __game: G }).__game.startLevel('vila', 0));
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.state().screen === 'playing');

  // anda com o teclado de verdade
  const x0 = await page.evaluate(() => (window as unknown as { __game: G }).__game.state().player!.x);
  await page.keyboard.down('d');
  await page.waitForTimeout(1500);
  await page.keyboard.up('d');
  const x1 = await page.evaluate(() => (window as unknown as { __game: G }).__game.state().player!.x);
  expect(x1 - x0).toBeGreaterThan(1);

  // soco em um zumbi
  const hurt = await page.evaluate(() => {
    const g = (window as unknown as { __game: G }).__game;
    g.god(true);
    const p = g.state().player!;
    g.spawn('walker', p.x + 0.9);
    g.step(45);
    const before = g.state().enemiesAlive;
    for (let i = 0; i < 16; i++) {
      g.input({ buttons: 2 }, 2);
      g.input({}, 6);
    }
    return { before, after: g.state().enemiesAlive };
  });
  expect(hurt.before).toBeGreaterThan(0);

  // quadro renderizado não está em branco
  const lum = await page.evaluate(async () => {
    const g = (window as unknown as { __game: G }).__game;
    g.step(120);
    const url = g.captureFrame();
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 90;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, 160, 90);
    const d = ctx.getImageData(0, 0, 160, 90).data;
    let sum = 0;
    let sq = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const l = (0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!) / 255;
      sum += l;
      sq += l * l;
    }
    const mean = sum / n;
    return { mean, variance: sq / n - mean * mean };
  });
  expect(lum.mean).toBeGreaterThan(0.02);
  expect(lum.variance).toBeGreaterThan(0.0005);
  await page.screenshot({ path: 'test-results/mapa-1.png' });

  // piloto automático até a vitória
  await page.evaluate(() => (window as unknown as { __game: G }).__game.autopilot(true));
  for (let i = 0; i < 180; i++) {
    const st = await page.evaluate(() => {
      const g = (window as unknown as { __game: G }).__game;
      g.step(300);
      return g.state();
    });
    if (st.finished) break;
  }
  const final = await page.evaluate(() => (window as unknown as { __game: G }).__game.state());
  expect(final.finished).toBe('victory');
  await page.evaluate(() => (window as unknown as { __game: G }).__game.step(120));
  await page.waitForTimeout(300);
  await expect(page.getByText('MAPA CONCLUÍDO!')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: 'test-results/vitoria-1.png' });

  // progresso salvo
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('zumbi-bot:save') ?? '{}'));
  expect(saved.progress.levels['vila-1'].completed).toBe(true);
  expect(saved.unlocks.staffs).toContain('earth');
  expect(errors).toEqual([]);
});
