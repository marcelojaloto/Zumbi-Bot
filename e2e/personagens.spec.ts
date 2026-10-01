import { expect, test, type Page } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type G = {
  isReady(): boolean;
  state(): { screen: string; player?: { character: string } };
  app: { profile: { save: { profile: { character: string } } } };
};
const game = (p: Page) => p.evaluate(() => (window as unknown as { __game: G }).__game);
const turned = (p: Page) =>
  p.evaluate(
    () =>
      ((window as unknown as { __game: G }).__game.app as unknown as { menuScene: { turned: number } })
        .menuScene.turned,
  );

async function menu(page: Page): Promise<void> {
  await page.goto(`./${DEBUG_QUERY}`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
}

test('menu Personagens: rostos, apelido, nome e título; a ficha abre com Voltar, Mapas e Começar', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await menu(page);
  await page.getByRole('button', { name: 'Personagens', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'PERSONAGENS' })).toBeVisible();
  const cards = page.locator('.char-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(1)).toContainText('Maga');
  await expect(cards.nth(1)).toContainText('Lívia Vesper');
  await expect(cards.nth(1)).toContainText('Feiticeira arcana');
  // o personagem secreto fica trancado até terminar o jogo
  await expect(cards.nth(5)).toHaveClass(/locked/);
  await expect(cards.nth(5)).toContainText('???');
  await expect(cards.nth(5)).not.toContainText('Prodígio');
  // os rostos são fotografados em 3D, um por quadro
  await expect(page.locator('.char-face img')).toHaveCount(5, { timeout: 60_000 });
  // no computador cabem todos numa linha: sem as setas do carrossel
  await expect(page.locator('.chars-arrow:visible')).toHaveCount(0);

  await cards.nth(1).click();
  await expect(page.getByRole('heading', { name: 'FICHA DE PERSONAGEM' })).toBeVisible();
  await expect(page.getByText('ESCOLHA SEU PERSONAGEM')).toHaveCount(0);
  await expect(page.locator('.cs-full')).toHaveText('Lívia Vesper');
  await expect(page.locator('.cs-story')).toContainText('Academia Arcana');
  for (const b of ['Voltar', 'Mapas', 'Começar'])
    await expect(page.getByRole('button', { name: b, exact: true })).toBeVisible();
  // setas trocam; Mapas abre os mapas já com o personagem da ficha
  await page.locator('.cs-head .lc-arrow').nth(1).click();
  await expect(page.locator('.cs-full')).toHaveText('Bruno Trovão');
  await page.getByRole('button', { name: 'Mapas', exact: true }).click();
  await expect(page.locator('.screen.maps, .map-select, .screen').last()).toBeVisible();
  expect((await game(page)).app.profile.save.profile.character).toBe('military');
  await page.keyboard.press('Escape');

  // Começar: joga com o personagem da ficha
  await page.locator('.cs-head .lc-arrow').nth(1).click();
  await expect(page.locator('.cs-full')).toHaveText('Ícaro Neon');
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.state().screen === 'playing');
  expect(
    await page.evaluate(() => (window as unknown as { __game: G }).__game.state().player?.character),
  ).toBe('cyborg');
  expect(errors).toEqual([]);
});

test('Manual dentro das Configurações (sem sair do jogo) e o boneco gira na loja', async ({ page }) => {
  const errors = collectErrors(page);
  await menu(page);
  // o Manual saiu do menu principal e fica nas Configurações
  await expect(page.locator('.menu-screen').getByRole('link', { name: 'Manual' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('button', { name: /Manual/ }).click();
  const frame = page.frameLocator('.manual-frame');
  await expect(frame.locator('h1').first()).toContainText('Manual');
  // "Jogar agora" do manual só fecha a moldura (continua no jogo)
  await frame.getByRole('link', { name: 'Jogar agora no navegador' }).click();
  await expect(page.locator('.manual-frame')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'CONFIGURAÇÕES' })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar' }).click();

  // loja: Q/E (ou arrastar) giram o boneco; as setas continuam andando pela lista
  await page.getByRole('button', { name: 'Loja', exact: true }).click();
  await expect(page.locator('.shop-tip')).toContainText('Q/E');
  await page.keyboard.down('KeyE');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyE');
  expect(await turned(page)).toBeGreaterThan(0.8);
  await page.mouse.move(300, 400);
  await page.mouse.down();
  await page.mouse.move(80, 400, { steps: 5 });
  await page.mouse.up();
  expect(await turned(page)).toBeLessThan(0);
  expect(errors).toEqual([]);
});

test('menu Personagens no celular: carrossel com setas e o Prodígio liberado depois do fim do jogo', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 740, height: 360 });
  // ?char=prodigy (testes) já vem com o jogo terminado
  await page.goto(`./${DEBUG_QUERY}&char=prodigy`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.getByRole('button', { name: 'Personagens', exact: true }).click();
  const grid = page.locator('.chars-grid');
  const left = page.locator('.chars-arrow.left');
  const right = page.locator('.chars-arrow.right');
  await expect(left).toBeVisible();
  await expect(right).toBeVisible();
  await expect(left).toBeDisabled();
  // as setas ficam nas pontas, na altura do Voltar
  const back = (await page.getByRole('button', { name: 'Voltar' }).boundingBox())!;
  const lb = (await left.boundingBox())!;
  const rb = (await right.boundingBox())!;
  expect(lb.x).toBeLessThan(40);
  expect(rb.x + rb.width).toBeGreaterThan(700);
  expect(Math.abs(lb.y + lb.height / 2 - (back.y + back.height / 2))).toBeLessThan(4);
  await right.click();
  await expect.poll(() => grid.evaluate((g) => g.scrollLeft)).toBeGreaterThan(50);
  await expect(left).toBeEnabled();
  // arrastar com o dedo também anda (rolagem nativa): vai até o fim
  await grid.evaluate((g) => g.scrollTo({ left: g.scrollWidth }));
  await expect(right).toBeDisabled();
  const secret = page.locator('.char-card[data-char="prodigy"]');
  await expect(secret).toContainText('Prodígio');
  await expect(secret).toContainText('Jacobb Amici');
  await secret.click();
  await expect(page.locator('.cs-full')).toHaveText('Jacobb Amici');
  await expect(page.locator('.cs-body')).toContainText('Tornado Arcano');
  await expect(page.locator('.stat-bar.none')).toHaveCount(1);
  expect(errors).toEqual([]);
});
