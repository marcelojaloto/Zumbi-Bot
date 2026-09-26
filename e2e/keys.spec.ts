import { expect, test, type Page } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type P = { t: { x: number; y: number }; player: { mana: number; manaMax: number; running: boolean } };
type G = {
  isReady(): boolean;
  state(): { screen: string };
  startLevel(map: string, idx?: number): Promise<void>;
  app: {
    session: { world: { get(id: number): P } } | null;
    input: { bindings: Record<string, string[]> };
    profile: { settings: { controls: { keys?: Record<string, string[]> } } };
  };
};
const me = (p: Page) =>
  p.evaluate(() => {
    const e = (window as unknown as { __game: G }).__game.app.session!.world.get(1);
    return { x: e.t.x, y: e.t.y, mana: e.player.mana, manaMax: e.player.manaMax, running: e.player.running };
  });

async function boot(page: Page): Promise<void> {
  await page.goto(DEBUG_QUERY);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
}

async function play(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __game: G }).__game.startLevel('sandbox'));
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.state().screen === 'playing');
}

test('teclas configuráveis: troca o pulo, joga com a tecla nova, guarda e restaura', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await page.getByRole('button', { name: 'Jogar', exact: true }).first().click();
  await page.getByRole('button', { name: 'Controles' }).click();
  await page.getByRole('button', { name: /Trocar teclas/ }).click();
  await page.locator('.kb-key[data-action="jump"][data-slot="0"]').click();
  await expect(page.locator('.kb-key.listening')).toHaveText('Aperte uma tecla…');
  await page.keyboard.press('KeyH');
  await expect(page.locator('.kb-key[data-action="jump"][data-slot="0"]')).toHaveText('H');
  await expect(page.locator('.kb-status')).toContainText('H agora é');
  // Esc cancela sem mudar nada
  await page.locator('.kb-key[data-action="punch"][data-slot="0"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.kb-key[data-action="punch"][data-slot="0"]')).toHaveText('J');
  await page.getByRole('button', { name: 'Voltar' }).click();
  // a tabela de controles mostra a tecla nova
  await expect(page.locator('.keys:not(.touch-keys)')).toContainText('H');

  // na partida, H pula
  await play(page);
  await page.keyboard.down('KeyH');
  await expect.poll(async () => (await me(page)).y, { timeout: 15_000 }).toBeGreaterThan(0.3);
  await page.keyboard.up('KeyH');

  // guardado: continua depois de recarregar
  await boot(page);
  expect(
    await page.evaluate(() => (window as unknown as { __game: G }).__game.app.input.bindings.jump),
  ).toEqual(['KeyH']);

  // restaurar padrão
  await page.getByRole('button', { name: 'Jogar', exact: true }).first().click();
  await page.getByRole('button', { name: 'Controles' }).click();
  await page.getByRole('button', { name: /Trocar teclas/ }).click();
  await page.getByRole('button', { name: 'Restaurar padrão' }).click();
  await expect(page.locator('.kb-key[data-action="jump"][data-slot="0"]')).toHaveText('Espaço');
  expect(
    await page.evaluate(
      () => (window as unknown as { __game: G }).__game.app.profile.settings.controls.keys ?? null,
    ),
  ).toBeNull();
  expect(errors).toEqual([]);
});

test('mouse: botão direito solta o especial e a rodinha liga a corrida', async ({ page }) => {
  const errors = collectErrors(page);
  await boot(page);
  await page.getByRole('button', { name: 'Jogar', exact: true }).first().click();
  await play(page);
  const cx = 640;
  const cy = 420;
  await page.mouse.move(cx, cy);
  const m0 = await me(page);
  await page.mouse.down({ button: 'right' });
  await expect.poll(async () => (await me(page)).mana, { timeout: 15_000 }).toBeLessThan(m0.mana);
  await page.mouse.up({ button: 'right' });

  // rodinha + andar = correndo (até parar)
  await page.mouse.wheel(0, 120);
  await page.keyboard.down('KeyD');
  await expect.poll(async () => (await me(page)).running, { timeout: 15_000 }).toBe(true);
  await page.keyboard.up('KeyD');
  await expect.poll(async () => (await me(page)).running, { timeout: 15_000 }).toBe(false);
  expect(errors).toEqual([]);
});
