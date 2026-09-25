import { expect, test, type Page } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type G = {
  isReady(): boolean;
  state(): { screen: string; player?: { x: number } };
  startLevel(m: string, i?: number): Promise<void>;
  step(n: number): void;
  god(on: boolean): void;
  spawn(id: string, x?: number): number;
  app: {
    device: string;
    touchOn: boolean;
    session: { world: { entities: { kind: string; health?: { hp: number } }[] } } | null;
  };
};

test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });

const g = (page: Page) => page.evaluate(() => (window as unknown as { __game: G }).__game.state());

/** Toque sintético (Pointer Events) num elemento, no ponto (x, y) da tela. */
async function pointer(page: Page, sel: string, type: string, x: number, y: number, id: number) {
  await page.evaluate(
    ({ sel, type, x, y, id }) =>
      document.querySelector(sel)!.dispatchEvent(
        new PointerEvent(type, {
          pointerId: id,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
          bubbles: true,
        }),
      ),
    { sel, type, x, y, id },
  );
}

test('celular deitado: controles de toque andam, socam e pausam; retrato pede para girar', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  const info = await page.evaluate(() => {
    const a = (window as unknown as { __game: G }).__game.app;
    return { device: a.device, touch: a.touchOn };
  });
  expect(info).toEqual({ device: 'phone', touch: true });

  await page.getByRole('button', { name: /Jogar/i }).tap();
  await expect(page.getByRole('button', { name: 'Mapas' })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __game: G }).__game.startLevel('vila', 0));
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.state().screen === 'playing');
  await expect(page.locator('div.touch')).toBeVisible();
  await expect(page.locator('.b-punch')).toBeVisible();
  await page.evaluate(() => (window as unknown as { __game: G }).__game.god(true));

  // direcional: arrasta para a direita e segura
  const zone = (await page.locator('.t-zone').boundingBox())!;
  const sx = zone.x + 110;
  const sy = zone.y + zone.height - 90;
  const x0 = (await g(page)).player!.x;
  await pointer(page, '.t-zone', 'pointerdown', sx, sy, 7);
  await pointer(page, '.t-zone', 'pointermove', sx + 55, sy, 7);
  await page.waitForFunction(
    (x) => (window as unknown as { __game: G }).__game.state().player!.x > x + 1.5,
    x0,
  );
  await pointer(page, '.t-zone', 'pointerup', sx + 55, sy, 7);

  // botão SOCO acerta um zumbi à frente
  const hurt = await page.evaluate(() => {
    const game = (window as unknown as { __game: G }).__game;
    game.spawn('walker', game.state().player!.x + 1);
    game.step(40);
    const e = game.app.session!.world.entities.find((o) => o.kind === 'enemy')!;
    return e.health!.hp;
  });
  const btn = (await page.locator('.b-punch').boundingBox())!;
  const bx = btn.x + btn.width / 2;
  const by = btn.y + btn.height / 2;
  let hp = hurt;
  for (let i = 0; i < 12 && hp >= hurt; i++) {
    await pointer(page, '.t-pad', 'pointerdown', bx, by, 9);
    await page.waitForTimeout(120);
    await pointer(page, '.t-pad', 'pointerup', bx, by, 9);
    await page.waitForTimeout(120);
    hp = await page.evaluate(
      () =>
        (window as unknown as { __game: G }).__game.app.session!.world.entities.find(
          (o) => o.kind === 'enemy',
        )?.health?.hp ?? 0,
    );
  }
  expect(hp).toBeLessThan(hurt);

  // pausa pelo botão da tela
  await page.locator('.t-pause').tap();
  await expect(page.getByText('PAUSA')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('celular-pausa.png') });

  // retrato: aviso para girar
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.rotate')).toBeVisible();
  expect(errors).toEqual([]);
});
