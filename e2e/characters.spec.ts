import { expect, test } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type Ent = { t: { x: number; z: number }; health?: { hp: number } };
type G = {
  isReady(): boolean;
  state(): { screen: string; player?: { character: string } };
  startLevel(m: string, i?: number): Promise<void>;
  setCharacter(id: string): void;
  step(n: number): void;
  god(on: boolean): void;
  input(f: { buttons: number }, ticks: number): void;
  spawn(id: string, x?: number, z?: number): number;
  app: { session: { world: { get(id: number): Ent | undefined } } | null };
};

test('seleção de personagem antes da partida e o especial de cada um', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());

  // menu → Jogar abre a seleção; → troca para a Maga; Enter (pronto) começa com ela
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.locator('.menu .btn.primary').click();
  await expect(page.getByText('ESCOLHA SEU PERSONAGEM')).toBeVisible();
  await expect(page.locator('.lobby-card')).toHaveCount(5);
  const p1 = page.locator('.lobby-card[data-slot="0"]');
  await expect(p1.locator('.lc-name')).toHaveText('Zumbi Bot');
  await page.keyboard.press('ArrowRight');
  await expect(p1.locator('.lc-name')).toHaveText('Maga');
  await expect(p1.getByText('Nova Arcana')).toBeVisible();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.state().screen === 'playing');
  expect(
    await page.evaluate(() => (window as unknown as { __game: G }).__game.state().player?.character),
  ).toBe('mage');

  // cada personagem: o especial acerta os zumbis em volta
  for (const c of ['robot', 'mage', 'military', 'cyborg', 'mutant']) {
    await page.evaluate((c) => (window as unknown as { __game: G }).__game.setCharacter(c), c);
    await page.evaluate(() => (window as unknown as { __game: G }).__game.startLevel('sandbox'));
    await page.waitForFunction(
      () => (window as unknown as { __game: G }).__game.state().screen === 'playing',
    );
    const damage = await page.evaluate(() => {
      const g = (window as unknown as { __game: G }).__game;
      g.god(true);
      const w = g.app.session!.world;
      const p = w.get(1)!;
      const ids = [g.spawn('walker', p.t.x + 2.2, p.t.z), g.spawn('walker', p.t.x + 5, p.t.z)];
      g.step(20);
      const before = ids.map((i) => w.get(i)?.health?.hp ?? 0);
      g.input({ buttons: 8 }, 1);
      g.step(45);
      const after = ids.map((i) => w.get(i)?.health?.hp ?? 0);
      return before[0]! - after[0]!;
    });
    expect(damage, c).toBeGreaterThan(0);
    expect(
      await page.evaluate(() => (window as unknown as { __game: G }).__game.state().player?.character),
    ).toBe(c);
  }
  expect(errors).toEqual([]);
});
