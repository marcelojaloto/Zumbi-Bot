import { expect, test, type Page } from '@playwright/test';
import { DEBUG_QUERY, collectErrors } from './helpers';

type G = {
  isReady(): boolean;
  state(): {
    screen: string;
    mapId: string;
    tick: number;
    finished: string | null;
    geometries: number;
    textures: number;
  };
  startLevel(m: string, i?: number): Promise<void>;
  step(n: number): void;
  god(on: boolean): void;
  autopilot(on: boolean): void;
  teleportToBoss(): void;
  captureFrame(): string;
  app: {
    session: { world: { entities: { kind: string; health?: { hp: number; max: number } }[] } } | null;
  };
};

const MAP_IDS = [
  'vila',
  'torre',
  'banco',
  'castelo',
  'toxica',
  'floresta',
  'centro',
  'chamas',
  'guerra',
  'arena',
];

async function ready(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __game?: G }).__game?.isReady());
}

/** Luminância média e variância de um quadro (detecta tela preta/branca). */
async function frameStats(page: Page) {
  return page.evaluate(async () => {
    const g = (window as unknown as { __game: G }).__game;
    const img = new Image();
    img.src = g.captureFrame();
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 54;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, 96, 54);
    const d = ctx.getImageData(0, 0, 96, 54).data;
    let sum = 0;
    let sq = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const l = (0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!) / 255;
      sum += l;
      sq += l * l;
    }
    const mean = sum / n;
    return { mean, variance: sq / n - mean * mean };
  });
}

test('todos os mapas carregam, renderizam e liberam recursos', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await ready(page);
  let baseGeo = 0;
  for (const id of MAP_IDS) {
    await page.evaluate((m) => (window as unknown as { __game: G }).__game.startLevel(m, 0), id);
    await page.waitForFunction((m) => {
      const s = (window as unknown as { __game: G }).__game.state();
      return s.screen === 'playing' && s.mapId === m;
    }, id);
    const st = await page.evaluate(() => {
      const g = (window as unknown as { __game: G }).__game;
      g.god(true);
      g.step(240);
      return g.state();
    });
    expect(st.finished, id).toBeNull();
    const f = await frameStats(page);
    expect(f.mean, `${id}: quadro não pode ser preto`).toBeGreaterThan(0.02);
    expect(f.variance, `${id}: quadro precisa ter detalhe`).toBeGreaterThan(0.0005);
    await page.screenshot({ path: test.info().outputPath(`mapa-${id}.png`) });
    // vazamento: geometrias vivas não podem crescer sem parar entre mapas
    if (!baseGeo) baseGeo = st.geometries;
    else expect(st.geometries, `${id}: geometrias`).toBeLessThan(baseGeo * 3 + 200);
  }
  expect(errors).toEqual([]);
});

test('chefe final: vitória mostra créditos e libera o Novo Jogo+', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  await page.goto(`./${DEBUG_QUERY}`);
  await ready(page);
  await page.evaluate(() => (window as unknown as { __game: G }).__game.startLevel('arena', 0));
  await page.waitForFunction(() => (window as unknown as { __game: G }).__game.state().screen === 'playing');
  await page.evaluate(() => {
    const g = (window as unknown as { __game: G }).__game;
    g.god(true);
    g.teleportToBoss();
    g.step(240);
    g.autopilot(true);
    const boss = g.app.session!.world.entities.find((e) => e.kind === 'boss')!;
    // atalho: pula direto para o fim da última fase
    for (let i = 0; i < 4000 && boss.health!.hp > 0; i++) {
      if (boss.health!.hp > 60) boss.health!.hp = Math.max(60, boss.health!.hp - boss.health!.max * 0.01);
      g.step(5);
    }
  });
  await page.waitForFunction(() => document.querySelector('.screen.credits') !== null, null, {
    timeout: 120_000,
  });
  await expect(page.getByText('Obrigado por jogar!')).toBeAttached();
  await page.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByText('MAPA CONCLUÍDO!')).toBeVisible();
  await expect(page.getByText('Novo Jogo+ desbloqueado!')).toBeVisible();
  const flags = await page.evaluate(() => JSON.parse(localStorage.getItem('zumbi-bot:save') ?? '{}').flags);
  expect(flags.ngPlus).toBe(true);
  expect(flags.credits).toBe(true);
  expect(errors).toEqual([]);
});
