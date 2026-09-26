import { devices, expect, test, type Page } from '@playwright/test';
import { collectErrors, createRoom } from './helpers';

// iPhone deitado (tela, toque, user agent) no Chromium; sem a API de tela cheia, como no Safari do iPhone.
// O Safari de verdade (WebKit) não roda aqui: ver a lista de testes em aparelho no PR.
const iphone = devices['iPhone 13 landscape'];
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

type G = {
  isReady(): boolean;
  state(): { screen: string };
  voice(): { mic: boolean; peers: number; speaking: number[] };
  app: { device: string; touchOn: boolean };
};
const voice = (p: Page) => p.evaluate(() => (window as unknown as { __game: G }).__game.voice());

test('iPhone: dica da Tela de Início, sala online com voz e controles de toque (microfone e tela cheia)', async ({
  browser,
}) => {
  const phoneCtx = await browser.newContext({
    viewport: iphone.viewport,
    userAgent: iphone.userAgent,
    deviceScaleFactor: iphone.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
    baseURL: 'http://localhost:4173/Zumbi-Bot/',
    locale: 'pt-BR',
    permissions: ['microphone'],
  });
  const phone = await phoneCtx.newPage();
  await phone.addInitScript(() => {
    // Safari do iPhone: a página não entra em tela cheia
    const p = Element.prototype as unknown as Record<string, unknown>;
    delete p.requestFullscreen;
    delete p.webkitRequestFullscreen;
  });
  const deskCtx = await browser.newContext({
    baseURL: 'http://localhost:4173/Zumbi-Bot/',
    locale: 'pt-BR',
    viewport: { width: 1280, height: 720 },
    isMobile: false,
    hasTouch: false,
    permissions: ['microphone'],
  });
  const desk = await deskCtx.newPage();
  const errors = [...collectErrors(phone), ...collectErrors(desk)];

  await phone.goto(Q);
  await phone.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  expect(
    await phone.evaluate(() => {
      const a = (window as unknown as { __game: G }).__game.app;
      return { device: a.device, touch: a.touchOn };
    }),
  ).toEqual({ device: 'phone', touch: true });
  await expect(phone.locator('.ios-tip')).toContainText('Adicionar à Tela de Início');

  // o iPhone cria a sala; o computador entra
  await phone.getByRole('button', { name: 'Jogar', exact: true }).first().tap();
  await phone.getByRole('button', { name: /Jogar online/ }).tap();
  await createRoom(phone);
  await expect(phone.locator('.room-code')).toHaveText(/^[A-Z]{4}$/, { timeout: 30_000 });
  const code = (await phone.locator('.room-code').textContent())!.trim();
  await desk.goto(`${Q}&sala=${code}`);
  await desk.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
  await desk.getByRole('button', { name: 'Jogar', exact: true }).first().click();
  await expect(desk.locator('.room-ok')).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await voice(phone)).peers, { timeout: 30_000 }).toBe(1);

  // voz do iPhone chega no computador
  await phone.getByRole('button', { name: /Ligar microfone/ }).tap();
  await expect.poll(async () => (await voice(phone)).mic).toBe(true);
  await expect
    .poll(async () => (await voice(desk)).speaking, { timeout: 20_000, intervals: [100] })
    .toContain(0);

  // partida: botões de toque do microfone e da tela cheia (que explica a Tela de Início)
  await desk.getByRole('button', { name: 'Pronto?' }).click();
  await phone.getByRole('button', { name: /Começar/ }).tap();
  await phone.waitForFunction(
    () => (window as unknown as { __game: G }).__game.state().screen === 'playing',
    null,
    { timeout: 90_000 },
  );
  await expect(phone.locator('.t-mic')).toBeVisible();
  await expect(phone.locator('.t-mic')).toHaveClass(/on/);
  await phone.locator('.t-mic').tap();
  await expect.poll(async () => (await voice(phone)).mic).toBe(false);
  await expect(phone.locator('.t-mic')).not.toHaveClass(/on/);
  await phone.locator('.t-fs').tap();
  await expect(phone.locator('.toast').last()).toContainText('Tela cheia no iPhone');
  expect(errors).toEqual([]);
  await phoneCtx.close();
  await deskCtx.close();
});
