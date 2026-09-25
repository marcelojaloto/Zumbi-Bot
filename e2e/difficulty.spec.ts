import { expect, test } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type Ent = {
  id: number;
  kind: string;
  t: { x: number; z: number };
  health?: { hp: number };
  player?: { lives: number };
};
type G = {
  isReady(): boolean;
  state(): { screen: string; finished: string | null };
  startLevel(m: string, i?: number): Promise<void>;
  step(n: number): void;
  god(on: boolean): void;
  spawn(id: string, x?: number, z?: number): number;
  app: {
    profile: { settings: { gameplay: { difficulty: string } } };
    session: { world: { entities: Ent[]; diff: { bossHp: number } } } | null;
  };
};

test('dificuldade: escolha no mapa e "tentar mais fácil" após a derrota', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  const diff = () =>
    page.evaluate(() => (window as unknown as { __game: G }).__game.app.profile.settings.gameplay.difficulty);

  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.getByRole('button', { name: 'Mapas' }).click();
  const row = page.locator('.diff-row');
  await expect(row.locator('button')).toHaveCount(4);
  await expect(row.getByRole('button', { name: 'Normal' })).toHaveClass(/\bon\b/);
  await row.getByRole('button', { name: 'Muito fácil' }).click();
  await expect(row.getByRole('button', { name: 'Muito fácil' })).toHaveClass(/\bon\b/);
  expect(await diff()).toBe('veryEasy');
  await row.getByRole('button', { name: 'Normal' }).click();
  expect(await diff()).toBe('normal');

  // derrota no Normal → botão "Tentar no Fácil" reinicia a fase com chefe mais fraco
  await page.evaluate(() => (window as unknown as { __game: G }).__game.startLevel('vila', 0));
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.state().screen === 'playing');
  await page.waitForFunction(
    () => {
      const g = (window as unknown as { __game: G }).__game;
      g.god(false);
      const p = g.app.session?.world.entities.find((e) => e.player);
      if (p?.player && p.health) {
        p.player.lives = Math.min(p.player.lives, 1);
        p.health.hp = Math.min(p.health.hp, 1);
        if (g.app.session!.world.entities.filter((e) => e.kind === 'enemy').length < 4)
          g.spawn('walker', p.t.x + 1.2, p.t.z);
      }
      g.step(30);
      return g.state().finished === 'gameOver';
    },
    null,
    { timeout: 120_000, polling: 200 },
  );
  const retry = page.getByRole('button', { name: 'Tentar no Fácil' });
  await expect(retry).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Difícil demais? Tente de novo numa dificuldade menor.')).toBeVisible();
  await retry.click();
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.state().screen === 'playing');
  expect(await diff()).toBe('easy');
  expect(
    await page.evaluate(() => (window as unknown as { __game: G }).__game.app.session!.world.diff.bossHp),
  ).toBe(0.75);
  expect(errors).toEqual([]);
});
