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

/** Menu em grupos: toca em cada botão, em ordem (ex.: `openMenu(page, 'Jogar', 'Mapas')`). */
export async function openMenu(page: Page, ...path: string[]): Promise<void> {
  for (const name of path) await page.getByRole('button', { name, exact: true }).click();
}

/** Jogar > Continuar (o botão principal do submenu Jogar). */
export async function continueGame(page: Page): Promise<void> {
  await openMenu(page, 'Jogar');
  await page.locator('.menu-group .btn.primary').click();
}

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

/** Trava para pais: lê a conta na tela, responde e confirma. */
export async function solveParentGate(page: Page): Promise<void> {
  const ask = page.locator('.parent-gate .gate-q');
  await ask.waitFor({ state: 'visible' });
  const [, a, b] = (await ask.textContent())?.match(/(\d+)\s*×\s*(\d+)/) ?? [];
  await page.locator('.parent-gate .gate-input').fill(String(Number(a) * Number(b)));
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
}

/**
 * Chat de voz na sala: no site a idade de quem joga é desconhecida, então a voz começa desligada e um adulto
 * responsável diz a idade e libera neste aparelho, passando pela trava para pais. A liberação fica guardada no aparelho.
 */
export async function releaseVoice(page: Page, age = '13 anos ou mais'): Promise<void> {
  await page.getByRole('button', { name: /Liberar a voz/ }).click();
  await page.getByRole('button', { name: age, exact: true }).click();
  await solveParentGate(page);
}

/**
 * Venceu a fase: o baú aparece antes do resultado. Abre com três toques e segue (`cont` = o botão "Pegar prêmios" no
 * idioma do teste). O baú balança o tempo todo, então os cliques são forçados (o Playwright esperaria ele parar).
 */
export async function openChest(page: Page, cont = 'Pegar prêmios'): Promise<void> {
  const chest = page.locator('.chest');
  // depois do chefe final o fim da fase demora (câmera lenta e a espera até o resultado), e mais ainda no CI
  await chest.waitFor({ state: 'visible', timeout: 120_000 });
  for (let i = 0; i < 3; i++) await chest.click({ force: true });
  await page.locator('.prize').first().waitFor({ state: 'visible' });
  const go = page.getByRole('button', { name: cont, exact: true });
  await go.waitFor({ state: 'visible', timeout: 30_000 });
  await go.click({ force: true });
}
