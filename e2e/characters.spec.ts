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

  // menu → Jogar abre a seleção, como a loja: o boneco em 3D, a lista e os detalhes à direita
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.locator('.menu .btn.primary').click();
  await expect(page.getByText('ESCOLHA SEU PERSONAGEM')).toBeVisible();
  const name = page.locator('.cs-head .cs-nav-name');
  await expect(name).toHaveText('Zumbi Bot');
  // sem a seleção repetida embaixo do boneco; o título fica centralizado na ficha
  await expect(page.locator('.cs-stage')).toHaveCount(0);
  await expect(page.locator('.cs-sheet h2')).toHaveCSS('text-align', 'center');
  // ficha: nome e sobrenome, especial e história
  await expect(page.locator('.cs-full')).toHaveText('Zeca Engrenagem');
  await expect(page.locator('.cs-body')).toContainText('Giro Turbo');
  await expect(page.locator('.cs-story')).toContainText('Zeca Engrenagem');

  // segurar → gira o boneco; arrastar para a esquerda no espaço livre gira de volta
  const turned = () =>
    page.evaluate(
      () =>
        ((window as unknown as { __game: G }).__game.app as unknown as { menuScene: { turned: number } })
          .menuScene.turned,
    );
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  const a = await turned();
  // o giro acompanha o tempo segurado (~2,8 rad/s)
  expect(a).toBeGreaterThan(1);
  await page.waitForTimeout(300);
  expect(await turned()).toBe(a);
  await page.mouse.move(400, 380);
  await page.mouse.down();
  await page.mouse.move(150, 380, { steps: 6 });
  await page.mouse.up();
  expect(await turned()).toBeLessThan(a - 2);
  // ←/→ não trocam de personagem
  await expect(name).toHaveText('Zumbi Bot');

  // ↓ troca para a Maga; as setas ◀ ▶ da ficha também trocam; Enter começa com ela
  await page.keyboard.press('ArrowDown');
  await expect(name).toHaveText('Maga');
  await expect(page.locator('.cs-body').getByText('Nova Arcana')).toBeVisible();
  await expect(page.locator('.cs-full')).toHaveText('Lívia Vesper');
  await page.locator('.cs-head .lc-arrow').nth(1).click();
  await page.locator('.cs-head .lc-arrow').nth(1).click();
  await expect(name).toHaveText('Ciborgue');
  await page.locator('.cs-head .lc-arrow').first().click();
  await page.locator('.cs-head .lc-arrow').first().click();
  await expect(name).toHaveText('Maga');
  // janela baixa: a ficha não cabe e rola até a história (Page Down)
  await page.setViewportSize({ width: 1280, height: 480 });
  await expect
    .poll(() => page.evaluate(() => document.querySelector('.cs-body')!.scrollHeight))
    .toBeGreaterThan(await page.evaluate(() => document.querySelector('.cs-body')!.clientHeight));
  await page.keyboard.press('PageDown');
  await expect
    .poll(() => page.evaluate(() => document.querySelector('.cs-body')!.scrollTop))
    .toBeGreaterThan(0);
  await page.setViewportSize({ width: 1280, height: 720 });
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
