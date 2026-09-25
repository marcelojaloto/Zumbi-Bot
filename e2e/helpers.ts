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
