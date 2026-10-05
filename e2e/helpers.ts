import type { ConsoleMessage, Page } from '@playwright/test';

// Mensagens benignas do SwiftShader / WebGL em ambiente headless.
const BENIGN = [
  /GL Driver Message/i,
  /GPU stall due to ReadPixels/i,
  /WebGL.*performance/i,
  /Automatic fallback to software WebGL/i,
];

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (BENIGN.some((r) => r.test(text))) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

export const DEBUG_QUERY = '?debug=1&quality=low&mute=1&seed=1&nopointerlock=1';

/** Jogo online: "Criar sala" abre as opções da sala (dificuldade e chat de voz); o botão de lá cria. */
export async function createRoom(
  page: Page,
  opts: { difficulty?: string; voice?: 'Permitido' | 'Desligado' } = {},
): Promise<void> {
  await page.getByRole('button', { name: /Criar sala/ }).click();
  const box = page.locator('.create-room');
  if (opts.difficulty) await box.getByRole('button', { name: opts.difficulty, exact: true }).click();
  if (opts.voice) await box.getByRole('button', { name: new RegExp(opts.voice) }).click();
  await box.getByRole('button', { name: /Criar sala/ }).click();
}

/**
 * Chat de voz na sala: no site a idade de quem joga é desconhecida, então a voz começa desligada e um adulto
 * responsável libera neste aparelho (com confirmação). A liberação fica guardada no aparelho.
 */
export async function releaseVoice(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Liberar a voz/ }).click();
  await page.getByRole('button', { name: 'Sim, liberar', exact: true }).click();
}

/**
 * Venceu a fase: o baú aparece antes do resultado. Abre com três toques e segue (`cont` = o botão "Pegar prêmios" no
 * idioma do teste). O baú balança o tempo todo, então os cliques são forçados (o Playwright esperaria ele parar).
 */
export async function openChest(page: Page, cont = 'Pegar prêmios'): Promise<void> {
  const chest = page.locator('.chest');
  await chest.waitFor({ state: 'visible', timeout: 30_000 });
  for (let i = 0; i < 3; i++) await chest.click({ force: true });
  await page.locator('.prize').first().waitFor({ state: 'visible' });
  const go = page.getByRole('button', { name: cont, exact: true });
  await go.waitFor({ state: 'visible', timeout: 30_000 });
  await go.click({ force: true });
}
