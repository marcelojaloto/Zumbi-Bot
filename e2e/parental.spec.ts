import { expect, test, type Page } from '@playwright/test';
import { DEBUG_QUERY, collectErrors, solveParentGate } from './helpers';

type G = { isReady(): boolean };

async function settingsGame(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('button', { name: 'Jogo', exact: true }).click();
}

test('pais: o jogo online se bloqueia nas Configurações e só volta com a trava para pais', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();

  // bloquear é na hora
  await settingsGame(page);
  await page.getByRole('button', { name: /Bloquear o jogo online/ }).click();
  await expect(page.getByRole('button', { name: /Liberar o jogo online/ })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar' }).click();

  // bloqueado: "Jogar online" só explica onde liberar
  await page.getByRole('button', { name: /Jogar online/ }).click();
  await expect(page.locator('.online-status')).toContainText('bloqueado neste aparelho');
  await expect(page.getByRole('button', { name: /Criar sala/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar' }).click();

  // liberar pede a conta; errar não libera
  await settingsGame(page);
  await page.getByRole('button', { name: /Liberar o jogo online/ }).click();
  await page.locator('.parent-gate .gate-input').fill('1');
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('.parent-gate .gate-msg')).toContainText('Resposta errada');
  await solveParentGate(page);
  await expect(page.getByRole('button', { name: /Bloquear o jogo online/ })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar' }).click();

  await page.getByRole('button', { name: /Jogar online/ }).click();
  await expect(page.getByRole('button', { name: /Criar sala/ })).toBeVisible();
  expect(errors).toEqual([]);
});
