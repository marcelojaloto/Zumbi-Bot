import { expect, test, type Page } from '@playwright/test';
import { collectErrors, createRoom } from './helpers';

// Jogo online com duas abas do mesmo navegador: o canal local (?net=local) faz o papel do PeerJS.
const Q = '?debug=1&quality=low&mute=1&nopointerlock=1&net=local';

type Online = {
  role: string;
  code: string;
  slot: number;
  host: number;
  phase: string;
  players: { slot: number; ready: boolean }[];
};
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

/** Avisos (somem em 3 s): cada aba guarda todos os que apareceram, para o teste não depender do momento. */
function recordToasts(): void {
  const w = window as unknown as { __toasts: string[] };
  w.__toasts = [];
  new MutationObserver((ms) => {
    for (const m of ms)
      for (const n of m.addedNodes)
        if (n instanceof HTMLElement && n.classList.contains('toast')) w.__toasts.push(n.textContent ?? '');
  }).observe(document, { childList: true, subtree: true });
}
const toasts = (p: Page) =>
  p.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts.join(' | '));

async function open(page: Page, query = Q): Promise<void> {
  await page.addInitScript(recordToasts);
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

/** Jogadores na partida deste aparelho (número de cada um). */
const slotsIn = (p: Page) =>
  p.evaluate(() =>
    (window as unknown as { __game: G }).__game
      .players()
      .map((x) => x.slot)
      .sort(),
  );

test('jogo online: criar sala, entrar pelo link, jogar, resultado, jogar de novo; o anfitrião sai e outro assume', async ({
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

  // o anfitrião sai da sala: o convidado assume (mesma sala, mesmo código) e é avisado
  host.once('dialog', (d) => void d.accept());
  await host.getByRole('button', { name: 'Sair da sala' }).click();
  await expect.poll(() => toasts(guest)).toContain('P1 (Jogador 1) saiu da sala');
  await expect.poll(() => toasts(guest)).toContain('Você agora é o anfitrião');
  await expect(guest.locator('.room-top h2')).toHaveText('SUA SALA');
  await expect(guest.locator('.room-code')).toHaveText(code);
  expect(await online(guest)).toMatchObject({ role: 'host', slot: 1, host: 1, code });
  await expect(guest.locator('.rp[data-slot="1"]')).toContainText('Anfitrião');
  await expect(guest.locator('.rp').first()).toHaveClass(/empty/);

  // quem chega depois entra pelo mesmo código, agora no aparelho de quem assumiu (vaga do P1 livre)
  await open(host, `${Q}&sala=${code}`);
  await expect(host.locator('.room-ok')).toBeVisible();
  expect(await online(host)).toMatchObject({ role: 'guest', slot: 0, host: 1 });
  await expect.poll(() => toasts(guest)).toContain('P1 (Jogador 1) entrou na sala');
  await expect(host.locator('.rp[data-slot="1"]')).toContainText('Anfitrião');
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
  // na sala, o botão "Personagem" (e o nome no quadro) abre a escolha como a loja; "Escolher" volta com o novo
  await expect(guest.locator('.room-me-title')).toHaveText('Personagem');
  await guest.getByRole('button', { name: /Personagem$/ }).click();
  await expect(guest.locator('.char-select .cs-head')).toBeVisible();
  await guest.keyboard.press('ArrowDown');
  await expect(guest.locator('.cs-head .cs-nav-name')).toHaveText('Maga');
  await guest.getByRole('button', { name: 'Voltar' }).click();
  await guest.locator('.room-me .lc-name-btn').click();
  await guest.locator('.cs-stage .lc-arrow').nth(1).click();
  await guest.locator('.cs-stage .lc-arrow').nth(1).click();
  await guest.locator('.cs-stage .lc-arrow').nth(1).click();
  await expect(guest.locator('.cs-stage .cs-nav-name')).toHaveText('Ciborgue');
  await guest.getByRole('button', { name: 'Escolher' }).click();
  await expect(guest.locator('.room-me .lc-name')).toHaveText('Ciborgue');
  await expect(host.locator('.rp[data-slot="1"]')).toContainText('Ciborgue');
  await guest.getByRole('button', { name: 'Pronto?' }).click();
  await host.getByRole('button', { name: /Começar/ }).click();
  await screenOf(guest, 'playing');
  await screenOf(host, 'playing');

  // convidado sai pelo menu: o anfitrião é avisado, o P2 sai do jogo e a partida segue
  await expect(host.locator('.ph')).toHaveCount(2);
  await guest.bringToFront();
  await guest.keyboard.press('Escape');
  await guest.getByRole('button', { name: 'Sair da sala' }).click();
  await expect(guest.locator('.menu-screen')).toBeVisible();
  await expect.poll(() => slotsIn(host)).toEqual([0]);
  await expect.poll(() => toasts(host)).toContain('P2 (Jogador 2) saiu da partida');
  await expect(host.locator('.ph')).toHaveCount(1);
  await expect(host.locator('.ptag')).toHaveCount(0);
  expect((await game(host)).screen).toBe('playing');
  expect(errors).toEqual([]);
});

test('jogo online: o anfitrião sai no meio da fase, outro assume e a partida continua para quem ficou', async ({
  context,
}) => {
  const host = await context.newPage();
  const p2 = await context.newPage();
  const p3 = await context.newPage();
  const errors = [...collectErrors(host), ...collectErrors(p2), ...collectErrors(p3)];

  await open(host);
  await host.getByRole('button', { name: /Jogar online/ }).click();
  await createRoom(host);
  const code = (await host.locator('.room-code').textContent())!.trim();
  for (const g of [p2, p3]) {
    await open(g, `${Q}&sala=${code}`);
    await expect(g.locator('.room-ok')).toBeVisible();
    await g.getByRole('button', { name: 'Pronto?' }).click();
  }
  await expect(host.getByRole('button', { name: /Começar/ })).toBeEnabled();
  await host.getByRole('button', { name: /Começar/ }).click();
  for (const pg of [host, p2, p3]) await screenOf(pg, 'playing');
  for (const pg of [p2, p3]) await expect.poll(() => slotsIn(pg)).toEqual([0, 1, 2]);

  // o anfitrião sai pelo menu (a aba continua aberta, no menu principal)
  await host.bringToFront();
  await host.keyboard.press('Escape');
  host.once('dialog', (d) => void d.accept());
  await host.getByRole('button', { name: 'Sair da sala' }).click();
  await expect(host.locator('.menu-screen')).toBeVisible();

  // o P2 (menor número) assume; o P3 se reconecta nele; o P1 sai do jogo dos dois; ninguém sai da fase
  await expect.poll(async () => (await online(p2))?.role, { timeout: 20_000 }).toBe('host');
  await expect.poll(async () => (await online(p3))?.host, { timeout: 20_000 }).toBe(1);
  await expect.poll(() => toasts(p2)).toContain('Você agora é o anfitrião');
  await expect.poll(() => toasts(p3)).toContain('P2 é o novo anfitrião');
  await expect.poll(() => toasts(p3)).toContain('P1 (Jogador 1) saiu da partida');
  await expect.poll(() => slotsIn(p2)).toEqual([1, 2]);
  await expect.poll(() => slotsIn(p3), { timeout: 20_000 }).toEqual([1, 2]);
  await expect(p3.locator('.ph')).toHaveCount(2);
  expect((await game(p2)).screen).toBe('playing');
  expect((await game(p3)).screen).toBe('playing');

  // a partida anda no novo anfitrião e o P3 continua controlando o boneco dele
  const t0 = (await game(p3)).tick;
  await expect.poll(async () => (await game(p3)).tick, { timeout: 20_000 }).toBeGreaterThan(t0 + 30);
  const x3 = async () =>
    (await p2.evaluate(() => (window as unknown as { __game: G }).__game.players())).find(
      (x) => x.slot === 2,
    )!.x;
  const x0 = await x3();
  await p3.bringToFront();
  await p3.keyboard.down('KeyD');
  await expect.poll(x3, { timeout: 30_000 }).toBeGreaterThan(x0 + 1);
  await p3.keyboard.up('KeyD');

  // o novo anfitrião leva todos para a sala: a sala é a mesma, com o código de antes
  await p2.bringToFront();
  await p2.keyboard.press('Escape');
  await p2.getByRole('button', { name: /Voltar para a sala/ }).click();
  await expect(p2.locator('.room-code')).toHaveText(code);
  await expect(p3.locator('.room-code')).toHaveText(code);
  await expect(p3.locator('.rp[data-slot="1"]')).toContainText('Anfitrião');
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
  await expect.poll(() => slotsIn(host), { timeout: 30_000 }).toEqual([0]);
  expect((await game(host)).screen).toBe('playing');
  expect(errors).toEqual([]);
  await hostCtx.close();
});

test('jogo online com PeerJS de verdade: a aba do anfitrião fecha, outro assume e o código da sala continua valendo', async ({
  browser,
}) => {
  const peer = '?debug=1&quality=low&mute=1&nopointerlock=1&peer=127.0.0.1:9000/zb';
  const opts = {
    baseURL: 'http://localhost:4173/Zumbi-Bot/',
    locale: 'pt-BR',
    viewport: { width: 1280, height: 720 },
  };
  const ctxs = await Promise.all([0, 1, 2].map(() => browser.newContext(opts)));
  const [host, p2, p3] = await Promise.all(ctxs.map((c) => c.newPage()));
  const errors = [host!, p2!, p3!].flatMap((pg) => collectErrors(pg));

  await open(host!, peer);
  await host!.getByRole('button', { name: /Jogar online/ }).click();
  await createRoom(host!);
  await expect(host!.locator('.room-code')).toHaveText(/^[A-Z]{4}$/, { timeout: 30_000 });
  const code = (await host!.locator('.room-code').textContent())!.trim();
  for (const g of [p2!, p3!]) {
    await open(g, `${peer}&sala=${code}`);
    await expect(g.locator('.room-ok')).toBeVisible({ timeout: 30_000 });
    await g.getByRole('button', { name: 'Pronto?' }).click();
  }
  await expect(host!.getByRole('button', { name: /Começar/ })).toBeEnabled();
  await host!.getByRole('button', { name: /Começar/ }).click();
  for (const pg of [host!, p2!, p3!]) await screenOf(pg, 'playing');
  await expect.poll(() => slotsIn(p3!), { timeout: 30_000 }).toEqual([0, 1, 2]);

  // a aba do anfitrião fecha de repente
  await ctxs[0]!.close();
  await expect.poll(async () => (await online(p2!))?.role, { timeout: 40_000 }).toBe('host');
  await expect.poll(async () => (await online(p3!))?.host, { timeout: 40_000 }).toBe(1);
  await expect.poll(() => slotsIn(p3!), { timeout: 30_000 }).toEqual([1, 2]);
  const t0 = (await game(p3!)).tick;
  await expect.poll(async () => (await game(p3!)).tick, { timeout: 20_000 }).toBeGreaterThan(t0 + 30);
  expect((await game(p2!)).screen).toBe('playing');

  // de volta à sala, alguém novo entra pelo mesmo código (a "porta" da sala passou para o novo anfitrião)
  await p2!.keyboard.press('Escape');
  await p2!.getByRole('button', { name: /Voltar para a sala/ }).click();
  await expect(p2!.locator('.room-code')).toHaveText(code);
  const ctx4 = await browser.newContext(opts);
  const p4 = await ctx4.newPage();
  errors.push(...collectErrors(p4));
  await open(p4, `${peer}&sala=${code}`);
  await expect(p4.locator('.room-ok')).toBeVisible({ timeout: 60_000 });
  expect(await online(p4)).toMatchObject({ role: 'guest', slot: 0, host: 1 });
  expect(errors).toEqual([]);
  for (const c of [ctxs[1]!, ctxs[2]!, ctx4]) await c.close();
});
