import { expect, test, type Page } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type P = { slot: number; character: string; x: number; lives: number };
type G = {
  isReady(): boolean;
  state(): { screen: string; finished: string | null };
  players(): P[];
  step(n: number): void;
  god(on: boolean): void;
  autopilot(on: boolean): void;
  teleportToBoss(): void;
  app: { session: { world: { entities: { kind: string; health?: { hp: number } }[] } } | null };
};
type Pad = { axes: number[]; buttons: { pressed: boolean; value: number }[] };
type Win = { __game: G; __pads: (Pad | null)[]; __mkPad(i: number): void; __frames: number };

/** Controles falsos (a API de gamepad do navegador é substituída antes de a página carregar). */
async function fakePads(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as Win;
    const pads: (Pad | null)[] = [null, null, null, null];
    w.__pads = pads;
    Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => pads, configurable: true });
    w.__mkPad = (i: number) => {
      pads[i] = {
        index: i,
        id: `Controle falso ${i}`,
        connected: true,
        mapping: 'standard',
        timestamp: 0,
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      } as unknown as Pad;
    };
    w.__frames = 0;
    const f = () => {
      w.__frames++;
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}

/** Espera N quadros (o navegador de teste roda devagar; apertos precisam durar alguns quadros). */
async function frames(page: Page, n: number): Promise<void> {
  const f0 = await page.evaluate(() => (window as unknown as Win).__frames);
  await page.waitForFunction((t) => (window as unknown as Win).__frames >= t, f0 + n, { polling: 30 });
}

async function press(page: Page, pad: number, button: number): Promise<void> {
  const set = (v: boolean) =>
    page.evaluate(
      ([i, b, v]) => {
        const btn = (window as unknown as Win).__pads[i as number]!.buttons[b as number]!;
        btn.pressed = v as boolean;
        btn.value = v ? 1 : 0;
      },
      [pad, button, v],
    );
  await set(true);
  await frames(page, 3);
  await set(false);
  await frames(page, 3);
}

const g = (page: Page) => page.evaluate(() => (window as unknown as Win).__game.players());

test('multijogador local: controles e teclado dividido entram, jogam e veem o resultado da equipe', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  await fakePads(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await page.waitForFunction(() => (window as unknown as Win).__game?.isReady());
  await page.getByRole('button', { name: 'Jogar' }).click();
  await page.locator('.menu .btn.primary').click();
  await expect(page.locator('.lobby-card')).toHaveCount(5);

  // dois controles entram (A e Start) e uma segunda pessoa no teclado (J)
  await page.evaluate(() => {
    (window as unknown as Win).__mkPad(0);
    (window as unknown as Win).__mkPad(1);
  });
  await press(page, 0, 0);
  await press(page, 1, 9);
  await page.keyboard.press('KeyJ');
  await expect(page.locator('.lobby-card[data-slot="3"]')).toBeVisible();
  await expect(page.locator('.lobby-card[data-slot="0"] .lc-dev')).toContainText('esquerda');
  await expect(page.locator('.lobby-card[data-slot="3"] .lc-dev')).toContainText('direita');

  // cada um escolhe: P2 → próximo no D-pad; P4 (setas) → próximo
  const before = await page.locator('.lobby-card[data-slot="1"]').getAttribute('data-char');
  await press(page, 0, 15);
  await expect(page.locator('.lobby-card[data-slot="1"]')).not.toHaveAttribute('data-char', before!);
  await page.keyboard.press('ArrowRight');

  // todos prontos → contagem → partida com 4 jogadores
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await press(page, 0, 0);
  await press(page, 1, 0);
  await page.waitForFunction(() => (window as unknown as Win).__game.state().screen === 'playing', null, {
    timeout: 60_000,
  });
  const ps = await g(page);
  expect(ps.map((p) => p.slot)).toEqual([0, 1, 2, 3]);
  await expect(page.locator('.party-hud .ph')).toHaveCount(4);

  // o analógico do controle 1 move só o P2
  const x0 = (await g(page))[1]!.x;
  const other0 = (await g(page))[2]!.x;
  await page.evaluate(() => ((window as unknown as Win).__pads[0]!.axes[0] = 1));
  await frames(page, 8);
  await page.evaluate(() => ((window as unknown as Win).__pads[0]!.axes[0] = 0));
  const after = await g(page);
  expect(after[1]!.x).toBeGreaterThan(x0 + 0.3);
  expect(Math.abs(after[2]!.x - other0)).toBeLessThan(0.3);

  // piloto automático em todos até vencer o chefe → resultado com uma linha por jogador
  await page.evaluate(() => {
    const game = (window as unknown as Win).__game;
    game.god(true);
    game.teleportToBoss();
    game.step(200);
    game.autopilot(true);
  });
  await page.waitForFunction(
    () => {
      const game = (window as unknown as Win).__game;
      const b = game.app.session?.world.entities.find((e) => e.kind === 'boss');
      if (b?.health) b.health.hp = Math.min(b.health.hp, 1);
      game.step(30);
      return game.state().finished === 'victory';
    },
    null,
    { timeout: 150_000, polling: 200 },
  );
  await expect(page.locator('.party-table tr')).toHaveCount(5, { timeout: 30_000 });
  expect(errors).toEqual([]);
});
