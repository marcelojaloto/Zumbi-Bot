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

// pt-BR: o país sai do idioma, e o Brasil mostra a caixa do ClassInd na entrada
test('mostra a caixa do ClassInd na entrada', async ({ page }) => {
  await page.goto(`./${DEBUG_QUERY}`);
  const box = page.locator('.classind-notice');
  await expect(box).toContainText('CLASSIFICAÇÃO INDICATIVA: LIVRE');
  await expect(box).toContainText('Interação de usuários');
  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toBeVisible();
});
