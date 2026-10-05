import { expect, test } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type G = {
  isReady(): boolean;
  app: {
    profile: {
      save: {
        profile: { scrap: number; level: number; melee?: string };
        unlocks: { firearms: string[]; melee: string[] };
        revive: string[];
        workshop: Record<string, { perks: string[]; special?: string }>;
      };
    };
  };
};
const save = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    JSON.parse(JSON.stringify((window as unknown as { __game: G }).__game.app.profile.save)),
  );

test('Oficina: melhoria com XP e sucata, especial em uso', async ({ page }) => {
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  await page.evaluate(() => {
    const s = (window as unknown as { __game: G }).__game.app.profile.save;
    s.profile.scrap = 20000;
    s.profile.level = 1;
  });
  await page.getByRole('button', { name: 'Jogar', exact: true }).first().click();
  await page.getByRole('button', { name: /Oficina/ }).click();
  await expect(page.getByRole('heading', { name: 'OFICINA' })).toBeVisible();

  // Vigor I precisa de XP: nível 1 ainda não libera
  await page.locator('.ws-node').first().click();
  await expect(page.locator('.buy-bar')).toContainText('Libera com');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();

  // com XP, compra o Vigor I
  await page.evaluate(
    () => ((window as unknown as { __game: G }).__game.app.profile.save.profile.level = 12),
  );
  await page.getByRole('button', { name: 'Especiais', exact: true }).click();
  await page.getByRole('button', { name: 'Atributos', exact: true }).click();
  await page.locator('.ws-node').first().click();
  await page.getByRole('button', { name: /Comprar por/ }).click();
  expect((await save(page)).workshop.robot.perks).toEqual(['robot.vigor1']);

  // especial novo: comprado já fica em uso; dá para voltar ao original
  await page.getByRole('button', { name: 'Especiais', exact: true }).click();
  await page.locator('.ws-node[data-id="robot.special1"]').click();
  await page.getByRole('button', { name: /Comprar por/ }).click();
  expect((await save(page)).workshop.robot.special).toBe('pulsoEMP');
  await expect(page.locator('.ws-node[data-id="robot.special1"]')).toContainText('Em uso');
  await page.locator('.ws-node[data-id="base"]').click();
  await page.getByRole('button', { name: 'Usar este especial' }).click();
  expect((await save(page)).workshop.robot.special).toBeUndefined();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  expect(errors).toEqual([]);
});
