// Capturas de tela da Play Store (celular deitado, 1920×1080), em português e inglês.
// Uso: npm run store:shots  (gera o build do app e grava em store/android/screenshots/)
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const OUT = 'store/android/screenshots';
const PORT = 4174;
const URL = `http://localhost:${PORT}/?debug=1&quality=medium&mute=1&seed=7&nopointerlock=1&net=local`;
const NAMES = {
  pt: ['1-menu', '2-equipe', '3-personagens', '4-online', '5-magia', '6-chefe', '7-robos'],
  en: ['1-menu', '2-team', '3-characters', '4-online', '5-magic', '6-boss', '7-robots'],
};
const HIDE = '.fps, .hint, .t-fs, .toast { display: none !important }';

mkdirSync(OUT, { recursive: true });
const server = await preview({ mode: 'app', preview: { port: PORT, strictPort: true } });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

/** Celular deitado: 864×486 × 20/9 = 1920×1080. Controles falsos para a seleção com vários jogadores. */
async function phone(locale) {
  const ctx = await browser.newContext({
    viewport: { width: 864, height: 486 },
    deviceScaleFactor: 20 / 9,
    isMobile: true,
    hasTouch: true,
    locale,
  });
  await ctx.addInitScript(() => {
    const pads = [null, null, null, null];
    window.__pads = pads;
    Object.defineProperty(Navigator.prototype, 'getGamepads', { value: () => pads, configurable: true });
    window.__mkPad = (i) => {
      pads[i] = {
        index: i,
        id: `Controle ${i}`,
        connected: true,
        mapping: 'standard',
        timestamp: 0,
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      };
    };
    window.__frames = 0;
    const f = () => {
      window.__frames++;
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  return ctx;
}

async function open(ctx, quality = 'medium') {
  const pg = await ctx.newPage();
  await pg.goto(URL.replace('quality=medium', `quality=${quality}`), { timeout: 180_000 });
  await pg.waitForFunction(() => window.__game?.isReady(), null, { timeout: 180_000 });
  await pg.addStyleTag({ content: HIDE });
  return pg;
}

/** Espera alguns quadros (o navegador sem placa de vídeo é lento: um aperto precisa durar uns quadros). */
async function frames(pg, n) {
  const f0 = await pg.evaluate(() => window.__frames);
  await pg.waitForFunction((t) => window.__frames >= t, f0 + n, { polling: 30, timeout: 60_000 });
}

async function press(pg, pad, button) {
  const set = (v) =>
    pg.evaluate(
      ([i, b, on]) => {
        const btn = window.__pads[i].buttons[b];
        btn.pressed = on;
        btn.value = on ? 1 : 0;
      },
      [pad, button, v],
    );
  await set(true);
  await frames(pg, 3);
  await set(false);
  await frames(pg, 3);
}

async function play(pg, map) {
  await pg.evaluate((m) => window.__game.startLevel(m, 0), map);
  await pg.waitForFunction(() => window.__game.state().screen === 'playing');
  await pg.evaluate(() => window.__game.god(true));
}

async function shots(locale) {
  const tag = locale.startsWith('pt') ? 'pt' : 'en';
  const names = NAMES[tag];
  const ctx = await phone(locale);
  const pg = await open(ctx);
  const shot = async (i, page = pg) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${tag}-${names[i]}.jpg`, type: 'jpeg', quality: 88 });
  };
  // perfil de quem já jogou um pouco
  await pg.evaluate(() => {
    const s = window.__game.app.profile.save;
    s.profile.level = 14;
    s.profile.xp = 1900;
    s.profile.scrap = 2350;
  });

  // 1. menu
  await pg.locator('.screen button').first().click();
  await pg.waitForTimeout(1500);
  await shot(0);

  // 2. equipe de 5 personagens
  await pg.evaluate(() => window.__game.setParty(['robot', 'mage', 'military', 'cyborg', 'mutant']));
  await play(pg, 'vila');
  await pg.evaluate(() => {
    const g = window.__game;
    const x = g.app.session.world.get(1).t.x;
    g.teleport(x + 14);
    g.step(20);
    const w = g.app.session.world;
    const x2 = w.get(1).t.x;
    // a equipe toda junto do P1
    w.playerEntities().forEach((p, i) => {
      p.t.x = p.t.px = x2 - 2.6 + i * 1.2;
      p.t.z = p.t.pz = -2.6 + ((i * 1.3) % 4);
      p.t.facing = 1;
    });
    g.spawn('walker', x2 + 3, 0.6);
    g.spawn('walker', x2 + 4.5, -1.2);
    g.spawn('runner', x2 + 5.5, 0.2);
    g.spawn('brute', x2 + 6.5, -0.4);
    g.step(40);
    g.input({ buttons: 8 }, 2, 1);
    g.input({ buttons: 2 }, 3, 2);
    g.input({ buttons: 16 }, 4, 3);
    g.input({ buttons: 8 }, 2, 4);
    g.input({ buttons: 2 }, 4, 0);
  });
  await shot(1);
  await pg.evaluate(() => window.__game.setParty(['robot']));

  // 3. seleção de personagem: quatro amigos entram com controles (cada um com um personagem)
  await pg.evaluate(() => {
    const app = window.__game.app;
    app.quitToMenu();
    app.profile.setCharacter('robot');
    app.openLobby('vila', 0);
    for (let i = 0; i < 4; i++) window.__mkPad(i);
  });
  await frames(pg, 4);
  for (let i = 0; i < 4; i++) await press(pg, i, 0);
  // três ficam prontos (o P1 ainda escolhendo: a partida não começa)
  for (const i of [0, 1, 3]) await press(pg, i, 0);
  await pg.waitForTimeout(2500);
  await shot(2);
  await pg.evaluate(() => {
    for (let i = 0; i < 4; i++) window.__pads[i] = null;
  });

  // 4. sala online: anfitrião com dois amigos (abas no mesmo navegador)
  await pg.evaluate(() => {
    const app = window.__game.app;
    app.quitToMenu();
    app.profile.save.profile.name = 'Ana';
    app.profile.setCharacter('mage');
  });
  await pg.locator('.menu .btn', { hasText: /online/i }).click();
  await pg.locator('.online-choice').first().click();
  await pg.waitForFunction(() => window.__game.online()?.code);
  const code = await pg.evaluate(() => window.__game.online().code);
  const guests = [];
  for (const [name, char] of [
    ['Bia', 'mutant'],
    ['Leo', 'cyborg'],
  ]) {
    const gp = await open(ctx, 'low');
    await gp.evaluate(
      async ([c, n, ch]) => {
        const app = window.__game.app;
        app.profile.save.profile.name = n;
        app.profile.save.profile.level = 9;
        await app.joinRoom(c);
        app.online.pick(ch, true);
      },
      [code, name, char],
    );
    guests.push(gp);
  }
  await pg.waitForFunction(() => window.__game.online()?.players.length === 3);
  await pg.bringToFront();
  await shot(3);
  for (const gp of guests) await gp.close();
  await pg.evaluate(() => window.__game.app.leaveRoom());

  // 5. magia (a maga com o cajado de fogo)
  await pg.evaluate(() => window.__game.app.profile.setCharacter('mage'));
  await play(pg, 'vila');
  await pg.evaluate(() => {
    const g = window.__game;
    g.unlockAll();
    g.setStaff('fire');
    const x = g.app.session.world.get(1).t.x;
    g.teleport(x + 12);
    g.step(20);
    const x2 = g.app.session.world.get(1).t.x;
    g.spawn('walker', x2 + 4, 0);
    g.spawn('walker', x2 + 5, 0.5);
    g.spawn('runner', x2 + 6, -0.5);
    g.step(20);
    g.input({ buttons: 2048 }, 1);
    g.input({ buttons: 16 }, 14);
  });
  await shot(4);

  // 6. chefe
  await pg.evaluate(() => {
    const g = window.__game;
    g.app.profile.setCharacter('military');
  });
  await play(pg, 'vila');
  await pg.evaluate(() => {
    const g = window.__game;
    g.killAll();
    g.teleportToBoss();
    g.step(240);
    // o militar de frente para o chefe: tiros e o Soco Sísmico
    const w = g.app.session.world;
    const boss = w.entities.find((e) => e.kind === 'boss');
    const p = w.get(1);
    if (boss) {
      p.t.x = p.t.px = boss.t.x - 5.5;
      p.t.z = p.t.pz = boss.t.z;
      p.t.facing = 1;
    }
    g.input({ buttons: 16 }, 8);
    g.input({ buttons: 8 }, 1);
    g.step(8);
  });
  // o nome do chefe some com o tempo real (a simulação foi adiantada): esconde para a foto
  await pg.addStyleTag({ content: '.banner { display: none !important }' });
  await shot(5);

  // 7. robôs (o ciborgue de escopeta)
  await pg.evaluate(() => window.__game.app.profile.setCharacter('cyborg'));
  await play(pg, 'guerra');
  await pg.evaluate(() => {
    const g = window.__game;
    const x = g.app.session.world.get(1).t.x;
    g.teleport(x + 10);
    g.step(20);
    const x2 = g.app.session.world.get(1).t.x;
    g.spawn('soldier', x2 + 6, 0.4);
    g.spawn('drone', x2 + 4, -0.6);
    g.spawn('mech', x2 + 8, 0);
    g.unlockAll();
    g.setGun('shotgun');
    g.step(40);
    g.input({ buttons: 1024 }, 1);
    g.input({ buttons: 16 }, 8);
  });
  await shot(6);
  await ctx.close();
}

try {
  await shots('pt-BR');
  await shots('en-US');
} finally {
  await browser.close();
  await server.close();
}
console.log(`capturas em ${OUT}/`);
