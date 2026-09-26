import { expect, test, type Page } from '@playwright/test';
import { collectErrors, createRoom } from './helpers';

// Jogo online com duas abas do mesmo navegador: o canal local (?net=local) faz o papel do PeerJS.
const Q = '?debug=1&quality=low&mute=1&nopointerlock=1&net=local';

type Online = { role: string; code: string; slot: number; phase: string; players: { ready: boolean }[] };
type G = {
  isReady(): boolean;
  state(): {
    screen: string;
    tick: number;
    finished: string | null;
    player?: { x: number; character: string };
  };
  players(): { slot: number; character: string; x: number }[];
  online(): Online | null;
  god(on: boolean): void;
  teleportToBoss(): void;
  killAll(): void;
  app: { profile: { save: { stats: { runs: number } } } };
};
const game = (p: Page) => p.evaluate(() => (window as unknown as { __game: G }).__game.state());
const online = (p: Page) => p.evaluate(() => (window as unknown as { __game: G }).__game.online());

async function open(page: Page, query = Q): Promise<void> {
  await page.goto(query);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  await page.getByRole('button', { name: 'Jogar', exact: true }).first().click();
}

async function screenOf(page: Page, screen: string): Promise<void> {
  await page.waitForFunction(
    (s) => (window as unknown as { __game: G }).__game.state().screen === s,
    screen,
    { timeout: 90_000, polling: 200 },
  );
}

test('jogo online: criar sala, entrar pelo link, jogar, resultado, jogar de novo e fechar a sala', async ({
  context,
}) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const errors = [...collectErrors(host), ...collectErrors(guest)];

  // anfitrião cria a sala
  await open(host);
  await host.getByRole('button', { name: /Jogar online/ }).click();
  await createRoom(host);
  const code = (await host.locator('.room-code').textContent())!.trim();
  expect(code).toMatch(/^[A-Z]{4}$/);
  await expect(host.locator('.room-status')).toContainText(code);
  await expect(host.getByRole('button', { name: /Começar/ })).toBeDisabled();

  // convidado abre o link da sala: já entra
  await open(guest, `${Q}&sala=${code}`);
  await expect(guest.locator('.room-ok')).toBeVisible();
  await expect(guest.locator('.rp.you')).toContainText('P2');
  await expect(host.locator('.rp[data-slot="1"]')).toContainText('Escolhendo');

  // escolhe a maga e fica pronto
  await guest.locator('.room-me .lc-arrow').nth(1).click();
  await expect(guest.locator('.room-me .lc-name')).toHaveText('Maga');
  await guest.getByRole('button', { name: 'Pronto?' }).click();
  await expect(host.locator('.rp[data-slot="1"]')).toContainText('Maga');
  await expect(host.locator('.rp[data-slot="1"]')).toContainText('Pronto');
  await host.getByRole('button', { name: /Começar/ }).click();

  await screenOf(host, 'playing');
  await screenOf(guest, 'playing');
  expect((await online(host))!.phase).toBe('playing');
  // o convidado vê os dois jogadores e controla a maga (P2)
  await expect
    .poll(
      async () => (await guest.evaluate(() => (window as unknown as { __game: G }).__game.players())).length,
    )
    .toBe(2);
  expect((await game(guest)).player?.character).toBe('mage');
  const x0 = (await host.evaluate(() => (window as unknown as { __game: G }).__game.players()))[1]!.x;
  await guest.bringToFront();
  await guest.keyboard.down('KeyD');
  await expect
    .poll(
      async () => (await host.evaluate(() => (window as unknown as { __game: G }).__game.players()))[1]!.x,
      {
        timeout: 30_000,
      },
    )
    .toBeGreaterThan(x0 + 1);
  await guest.keyboard.up('KeyD');

  // vence a fase (chefe derrotado no anfitrião): os dois veem o resultado
  const runs0 = await guest.evaluate(
    () => (window as unknown as { __game: G }).__game.app.profile.save.stats.runs,
  );
  await host.evaluate(() => {
    const g = (window as unknown as { __game: G }).__game;
    g.god(true);
    g.teleportToBoss();
  });
  await host.waitForFunction(
    () => {
      const g = (window as unknown as { __game: G }).__game;
      g.killAll();
      return g.state().screen === 'victory';
    },
    null,
    { timeout: 120_000, polling: 500 },
  );
  await screenOf(guest, 'victory');
  await expect(guest.locator('.online-wait')).toBeVisible();
  await expect(guest.getByRole('button', { name: 'Próximo mapa' })).toHaveCount(0);
  // o progresso do convidado foi guardado no aparelho dele
  expect(
    await guest.evaluate(() => (window as unknown as { __game: G }).__game.app.profile.save.stats.runs),
  ).toBe(runs0 + 1);

  // anfitrião joga de novo: o convidado entra junto
  await host.getByRole('button', { name: 'Jogar de novo' }).click();
  await screenOf(host, 'playing');
  await screenOf(guest, 'playing');

  // anfitrião volta todos para a sala
  await host.bringToFront();
  await host.keyboard.press('Escape');
  await expect(host.getByRole('button', { name: /Voltar para a sala/ })).toBeVisible();
  // online a partida não para com o menu aberto
  const t0 = (await game(host)).tick;
  await expect.poll(async () => (await game(host)).tick, { timeout: 20_000 }).toBeGreaterThan(t0 + 10);
  await host.getByRole('button', { name: /Voltar para a sala/ }).click();
  await expect(host.locator('.room-code')).toHaveText(code);
  await expect(guest.locator('.room-code')).toHaveText(code);
  await expect(guest.getByRole('button', { name: 'Pronto?' })).toBeVisible();

  // anfitrião fecha a sala: o convidado volta para "Jogar online" com o aviso
  host.once('dialog', (d) => void d.accept());
  await host.getByRole('button', { name: 'Fechar sala' }).click();
  await expect(guest.locator('.online-status.error')).toContainText('O anfitrião fechou a sala');
  expect(await online(guest)).toBeNull();
  expect(errors).toEqual([]);
});

test('jogo online: código errado avisa e quem sai no meio fica fora da partida', async ({ context }) => {
  const host = await context.newPage();
  const guest = await context.newPage();
  const errors = [...collectErrors(host), ...collectErrors(guest)];

  await open(guest);
  await guest.getByRole('button', { name: /Jogar online/ }).click();
  await guest.getByRole('button', { name: /Entrar numa sala/ }).click();
  await guest.locator('.code-input').fill('zzzz');
  await guest.keyboard.press('Enter');
  await expect(guest.locator('.online-status.error')).toContainText('Não existe sala com esse código');

  await open(host);
  await host.getByRole('button', { name: /Jogar online/ }).click();
  await createRoom(host);
  const code = (await host.locator('.room-code').textContent())!.trim();
  await guest.locator('.code-input').fill(code);
  await guest.getByRole('button', { name: 'Entrar', exact: true }).click();
  await guest.getByRole('button', { name: 'Pronto?' }).click();
  await host.getByRole('button', { name: /Começar/ }).click();
  await screenOf(guest, 'playing');
  await screenOf(host, 'playing');

  // convidado sai pelo menu: no anfitrião o P2 fica fora e o jogo segue
  await guest.bringToFront();
  await guest.keyboard.press('Escape');
  await guest.getByRole('button', { name: 'Sair da sala' }).click();
  await expect(guest.locator('.menu-screen')).toBeVisible();
  await host.waitForFunction(
    () =>
      (
        (window as unknown as { __game: G }).__game.app as unknown as {
          session: { world: { get(id: number): { player: { gone?: boolean } } | undefined } };
        }
      ).session.world.get(2)?.player.gone === true,
  );
  await expect(host.locator('.ph').nth(1)).toContainText('Saiu da partida');
  expect((await game(host)).screen).toBe('playing');
  expect(errors).toEqual([]);
});

test('jogo online com PeerJS de verdade (WebRTC): cada um no seu navegador; aba fechada derruba o jogador', async ({
  browser,
}) => {
  // aparelhos diferentes = contextos diferentes (cada um com o seu save)
  const peer = '?debug=1&quality=low&mute=1&nopointerlock=1&peer=127.0.0.1:9000/zb';
  const opts = {
    baseURL: 'http://localhost:4173/Zumbi-Bot/',
    locale: 'pt-BR',
    viewport: { width: 1280, height: 720 },
  };
  const hostCtx = await browser.newContext(opts);
  const guestCtx = await browser.newContext(opts);
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  const errors = [...collectErrors(host), ...collectErrors(guest)];

  await open(host, peer);
  await host.getByRole('button', { name: /Jogar online/ }).click();
  await createRoom(host);
  await expect(host.locator('.room-code')).toHaveText(/^[A-Z]{4}$/, { timeout: 30_000 });
  const code = (await host.locator('.room-code').textContent())!.trim();

  await open(guest, peer);
  await guest.getByRole('button', { name: /Jogar online/ }).click();
  await guest.getByRole('button', { name: /Entrar numa sala/ }).click();
  await guest.locator('.code-input').fill(code);
  await guest.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(guest.locator('.room-ok')).toBeVisible({ timeout: 30_000 });
  await guest.getByRole('button', { name: 'Pronto?' }).click();
  await host.getByRole('button', { name: /Começar/ }).click();
  await screenOf(host, 'playing');
  await screenOf(guest, 'playing');

  const x0 = (await host.evaluate(() => (window as unknown as { __game: G }).__game.players()))[1]!.x;
  await guest.keyboard.down('KeyD');
  await expect
    .poll(
      async () => (await host.evaluate(() => (window as unknown as { __game: G }).__game.players()))[1]!.x,
      {
        timeout: 30_000,
      },
    )
    .toBeGreaterThan(x0 + 1);
  await guest.keyboard.up('KeyD');
  // o convidado vê o mundo andando (estado chegando do anfitrião)
  const t0 = (await game(guest)).tick;
  await expect.poll(async () => (await game(guest)).tick, { timeout: 20_000 }).toBeGreaterThan(t0 + 30);

  // a aba do convidado fecha de repente: o anfitrião percebe e o P2 sai da partida
  await guestCtx.close();
  await host.waitForFunction(
    () =>
      (
        (window as unknown as { __game: G }).__game.app as unknown as {
          session: { world: { get(id: number): { player: { gone?: boolean } } | undefined } };
        }
      ).session.world.get(2)?.player.gone === true,
    null,
    { timeout: 30_000 },
  );
  expect((await game(host)).screen).toBe('playing');
  expect(errors).toEqual([]);
  await hostCtx.close();
});
