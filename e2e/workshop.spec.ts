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

test('Oficina e loja: melhoria com XP e sucata, especial em uso, arma e item de reviver', async ({
  page,
}) => {
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

  // loja: arma de fogo e item de reviver
  await page.getByRole('button', { name: 'Loja', exact: true }).click();
  await page.getByRole('button', { name: 'Armas', exact: true }).click();
  await page.locator('.cos-card', { hasText: 'Escopeta' }).click();
  await page.getByRole('button', { name: /Comprar por/ }).click();
  await page.locator('.cos-card', { hasText: 'Katana' }).click();
  await page.getByRole('button', { name: /Comprar por/ }).click();
  await page.getByRole('button', { name: 'Itens especiais', exact: true }).click();
  await page.locator('.cos-card', { hasText: 'Bateria de Reserva' }).click();
  await expect(page.locator('.buy-bar')).toContainText('Zeca Engrenagem');
  await page.getByRole('button', { name: /Comprar por/ }).click();
  const s = await save(page);
  expect(s.unlocks.firearms).toContain('shotgun');
  expect(s.unlocks.melee).toEqual(['katana']);
  expect(s.profile.melee).toBe('katana');
  expect(s.revive).toEqual(['robot']);
  expect(errors).toEqual([]);
});
