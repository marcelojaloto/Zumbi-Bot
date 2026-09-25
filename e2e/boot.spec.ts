import { expect, test } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

test('carrega o jogo e mostra o botão Jogar', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await expect(page.getByRole('button', { name: /Jogar/i }).first()).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/boot.png' });
  expect(errors).toEqual([]);
});
