import { expect, test } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type G = {
  isReady(): boolean;
  state(): { screen: string; finished: string | null };
  startLevel(m: string, i?: number): Promise<void>;
  step(n: number): void;
  god(on: boolean): void;
  teleportToBoss(): void;
  autopilot(on: boolean): void;
  app: { session: { world: { entities: { kind: string; health?: { hp: number } }[] } } | null };
};

test.use({ locale: 'en-US' });

test('navegador em inglês: menus, partida e vitória em inglês', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Maps' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Wardrobe' })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __game: G }).__game.startLevel('vila', 0));
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.state().screen === 'playing');
  await expect(page.getByText('1. Haunted Village')).toBeVisible();
  await page.evaluate(() => {
    const g = (window as unknown as { __game: G }).__game;
    g.god(true);
    g.teleportToBoss();
    g.step(200);
    g.autopilot(true);
  });
  // o piloto automático dá o golpe final num chefe com 1 de vida
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { __game: G }).__game;
      const b = g.app.session?.world.entities.find((e) => e.kind === 'boss');
      if (b?.health) b.health.hp = Math.min(b.health.hp, 1);
      g.step(30);
      return g.state().finished === 'victory';
    },
    null,
    { timeout: 120_000, polling: 200 },
  );
  await expect(page.getByText('MAP CLEARED!')).toBeVisible({ timeout: 20_000 });
  expect(errors).toEqual([]);
});
