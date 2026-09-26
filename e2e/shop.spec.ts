import { expect, test } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type G = {
  isReady(): boolean;
  app: {
    profile: {
      save: { profile: { scrap: number }; cosmetics: { owned: string[]; equipped: Record<string, string> } };
    };
  };
};
const save = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const s = (window as unknown as { __game: G }).__game.app.profile.save;
    return { scrap: s.profile.scrap, owned: [...s.cosmetics.owned], equipped: { ...s.cosmetics.equipped } };
  });

test('loja: escolher um item veste o boneco (prévia) e só compra depois de confirmar', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  await page.evaluate(
    () => ((window as unknown as { __game: G }).__game.app.profile.save.profile.scrap = 5000),
  );
  await page.getByRole('button', { name: 'Jogar', exact: true }).first().click();
  await page.getByRole('button', { name: 'Loja', exact: true }).click();

  // escolher: prévia, nada comprado; cancelar desfaz
  const first = page.locator('.cos-card.unowned').first();
  const name = (await first.locator('b').textContent())!;
  const id = (await first.getAttribute('data-id'))!;
  await first.click();
  await expect(page.locator('.buy-bar')).toBeVisible();
  await expect(page.locator('.buy-bar')).toContainText(name);
  expect((await save(page)).scrap).toBe(5000);
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('.buy-bar')).toBeHidden();
  expect((await save(page)).scrap).toBe(5000);

  // escolher e confirmar: compra, equipa e a mensagem some sozinha
  await first.click();
  await page.getByRole('button', { name: /Comprar por/ }).click();
  const after = await save(page);
  expect(after.scrap).toBeLessThan(5000);
  expect(after.owned).toContain(id);
  expect(Object.values(after.equipped)).toContain(id);
  await expect(page.locator('.shop-msg')).toContainText(name);
  await expect(page.locator('.shop-msg')).not.toHaveClass(/show/, { timeout: 5000 });
  await expect(page.locator('.buy-bar')).toBeHidden();
  expect(errors).toEqual([]);
});
