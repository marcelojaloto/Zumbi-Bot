import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { collectErrors, createRoom } from './helpers';

// Chat de voz com o PeerJS de verdade (servidor local) e o microfone falso do Chromium (um bipe).
test.use({
  launchOptions: {
    args: [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

const Q = '?debug=1&quality=low&mute=1&nopointerlock=1&peer=127.0.0.1:9000/zb';

type Voice = {
  allowed: boolean;
  available: boolean;
  mic: boolean;
  permission: string;
  problem: string | null;
  peers: number;
  speaking: number[];
  blocked: boolean;
};
type G = {
  isReady(): boolean;
  state(): { screen: string };
  voice(): Voice;
  online(): { difficulty: string; voice: boolean; players: { slot: number; mic?: boolean }[] } | null;
  app: { session: { world: { difficulty: string } } | null };
};
const voice = (p: Page) => p.evaluate(() => (window as unknown as { __game: G }).__game.voice());

async function device(browser: import('@playwright/test').Browser): Promise<[BrowserContext, Page]> {
  const ctx = await browser.newContext({
    baseURL: 'http://localhost:4173/Zumbi-Bot/',
    locale: 'pt-BR',
    viewport: { width: 1280, height: 720 },
    permissions: ['microphone'],
  });
  return [ctx, await ctx.newPage()];
}

async function open(page: Page): Promise<void> {
  await page.goto(Q);
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  await page.getByRole('button', { name: 'Jogar', exact: true }).first().click();
  await page.getByRole('button', { name: /Jogar online/ }).click();
}

async function join(page: Page, code: string): Promise<void> {
  await open(page);
  await page.getByRole('button', { name: /Entrar numa sala/ }).click();
  await page.locator('.code-input').fill(code);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('.room-ok')).toBeVisible({ timeout: 30_000 });
}

test('chat de voz: opções da sala, todos ouvem todos (3 aparelhos), microfone, mudo, tecla V e voz desligada pelo anfitrião', async ({
  browser,
}) => {
  const [hostCtx, host] = await device(browser);
  const [guestCtx, guest] = await device(browser);
  const errors = [...collectErrors(host), ...collectErrors(guest)];

  // anfitrião cria a sala em Difícil, com voz permitida
  await open(host);
  await createRoom(host, { difficulty: 'Difícil', voice: 'Permitido' });
  await expect(host.locator('.room-code')).toHaveText(/^[A-Z]{4}$/, { timeout: 30_000 });
  const code = (await host.locator('.room-code').textContent())!.trim();
  await expect(host.locator('.room-diff')).toContainText('Difícil');
  await expect(host.locator('.room-voice-opt')).toContainText('Permitido');
  await expect(host.locator('.room-voice')).toContainText('Todos da sala se ouvem');
  expect((await voice(host)).permission).toBe('granted');

  // convidado entra: vê as opções e a voz conecta (todos ouvem todos, microfone começa desligado)
  await join(guest, code);
  await expect(guest.locator('.room-diff')).toContainText('Difícil');
  await expect(guest.locator('.room-voice-opt')).toContainText('Permitido');
  await expect.poll(async () => (await voice(host)).peers, { timeout: 30_000 }).toBe(1);
  await expect.poll(async () => (await voice(guest)).peers, { timeout: 30_000 }).toBe(1);
  expect((await voice(guest)).mic).toBe(false);
  await expect(host.locator('.rp[data-slot="1"] .rp-mic')).toHaveText('🔇');

  // convidado liga o microfone: o anfitrião vê 🎤 e ouve a voz (o bipe do microfone falso)
  await guest.getByRole('button', { name: /Ligar microfone/ }).click();
  await expect.poll(async () => (await voice(guest)).mic).toBe(true);
  await expect(guest.locator('.room-voice')).toContainText('todos da sala ouvem você');
  await expect(host.locator('.rp[data-slot="1"] .rp-mic')).toHaveText(/🎤|🔊/);
  await expect
    .poll(async () => (await voice(host)).speaking, { timeout: 20_000, intervals: [100] })
    .toContain(1);

  // um terceiro aparelho entra: a malha liga todos com todos (convidado ↔ convidado também)
  const [thirdCtx, third] = await device(browser);
  errors.push(...collectErrors(third));
  await join(third, code);
  for (const p of [host, guest, third])
    await expect.poll(async () => (await voice(p)).peers, { timeout: 30_000 }).toBe(2);
  await expect
    .poll(async () => (await voice(third)).speaking, { timeout: 20_000, intervals: [100] })
    .toContain(1);
  // e quando ele sai da sala, as chamadas dele são desfeitas
  await third.getByRole('button', { name: 'Sair da sala' }).click();
  await thirdCtx.close();
  await expect.poll(async () => (await voice(host)).peers, { timeout: 30_000 }).toBe(1);
  await expect.poll(async () => (await voice(guest)).peers, { timeout: 30_000 }).toBe(1);

  // tecla V deixa mudo de novo
  await guest.keyboard.press('KeyV');
  await expect.poll(async () => (await voice(guest)).mic).toBe(false);
  await expect(host.locator('.rp[data-slot="1"] .rp-mic')).toHaveText('🔇');

  // anfitrião desliga a voz da sala: o convidado fica sem botão e sem conexão; religa e volta
  await host.getByRole('button', { name: /Permitido/ }).click();
  await expect(guest.locator('.room-voice')).toContainText('Chat de voz desligado pelo anfitrião');
  await expect(guest.getByRole('button', { name: /Ligar microfone/ })).toBeHidden();
  expect((await voice(guest)).available).toBe(false);
  await host.getByRole('button', { name: /Desligado/ }).click();
  await expect.poll(async () => (await voice(guest)).peers, { timeout: 30_000 }).toBe(1);

  // a partida usa a dificuldade da sala; no jogo, o botão e a tecla V ligam o microfone
  await guest.getByRole('button', { name: 'Pronto?' }).click();
  await host.getByRole('button', { name: /Começar/ }).click();
  for (const p of [host, guest])
    await p.waitForFunction(
      () => (window as unknown as { __game: G }).__game.state().screen === 'playing',
      null,
      {
        timeout: 90_000,
      },
    );
  expect(
    await guest.evaluate(() => (window as unknown as { __game: G }).__game.app.session!.world.difficulty),
  ).toBe('hard');
  await expect(host.locator('.hud-voice')).toContainText('Microfone mudo');
  await host.bringToFront();
  await host.keyboard.press('KeyV');
  await expect(host.locator('.hud-voice')).toContainText('Microfone ligado');
  await expect(guest.locator('.ph').first().locator('.ph-mic')).toHaveText(/🎤|🔊/);
  await expect
    .poll(async () => (await voice(guest)).speaking, { timeout: 20_000, intervals: [100] })
    .toContain(0);
  expect(errors).toEqual([]);
  await guestCtx.close();
  await hostCtx.close();
});

test('chat de voz: sala sem voz não liga nada; microfone bloqueado explica como liberar', async ({
  browser,
}) => {
  const [ctx, host] = await device(browser);
  const errors = collectErrors(host);
  // o aparelho nega o microfone
  await host.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(Object.assign(new Error('negado'), { name: 'NotAllowedError' }));
  });
  await open(host);
  await createRoom(host, { voice: 'Desligado' });
  await expect(host.locator('.room-code')).toHaveText(/^[A-Z]{4}$/, { timeout: 30_000 });
  await expect(host.locator('.room-voice')).toContainText('Chat de voz desligado nesta sala');
  await expect(host.getByRole('button', { name: /Ligar microfone/ })).toBeHidden();
  expect((await voice(host)).available).toBe(false);

  await host.getByRole('button', { name: /Desligado/ }).click();
  await host.getByRole('button', { name: /Ligar microfone/ }).click();
  await expect(host.locator('.room-voice')).toContainText('O microfone está bloqueado');
  await expect(host.locator('.room-voice')).toContainText('Microfone → Permitir');
  expect((await voice(host)).problem).toBe('denied');
  expect((await voice(host)).mic).toBe(false);
  expect(errors).toEqual([]);
  await ctx.close();
});
