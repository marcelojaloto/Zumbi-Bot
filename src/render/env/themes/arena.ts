import type { EnvCtx } from '../builder';
import {
  barrel,
  carWreck,
  column,
  crate,
  deadTree,
  grave,
  lamppost,
  pine,
  rock,
  sandbags,
  silhouetteRow,
  torch,
} from '../props';

const CYAN = 0x40e0ff;
const RED = 0xff2a3a;

/**
 * Arena Final: o ninho do OMEGA-Z. Um coliseu biomecânico erguido sobre a cidade em chamas, com
 * trechos que misturam restos de todos os mapas (vila, torre/banco, castelo/tóxica, floresta/centro,
 * chamas/guerra) até a arena circular do chefe, cercada de pilares com cabos pulsantes.
 */
export function arenaTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const L = ctx.level.length;
  const bossX = ctx.level.boss?.triggerX ?? L - 24;

  // placas de piso chamuscadas e faixa de segurança vermelha
  for (let x = ctx.x0; x < ctx.x1; x += 2.4) {
    if (rng.chance(0.25))
      p.box(x, 0.012, rng.range(z0, z1), rng.range(0.8, 1.6), 0.02, rng.range(0.5, 1.1), 0x2c282c, {
        noShadow: true,
        jitter: 0.1,
      });
    p.box(x, 0.02, z0 - 0.5, 1.2, 0.03, 0.14, RED, { glow: 0.9 });
  }
  // meio-fio de metal na frente
  for (let x = ctx.x0; x < ctx.x1; x += 3)
    p.box(x, 0.08, z1 + 0.8, 2.9, 0.16, 0.3, 0x2e2a2e, { noShadow: true });

  // muralha do coliseu ao fundo: arcos com luzes vermelhas
  for (let x = ctx.x0; x < ctx.x1; x += 6) {
    const zc = -12.5;
    p.box(x, 3.6, zc, 1.4, 7.2, 1.6, 0x3a3034, { jitter: 0.06 });
    p.box(x + 3, 6.6, zc, 4.8, 1.2, 1.4, 0x342c30);
    p.box(x + 3, 7.6, zc - 0.2, 6, 0.6, 1.8, 0x2a2428);
    if (rng.chance(0.5)) p.box(x + 3, 3, zc - 0.6, 4.4, 6, 0.2, 0x120c10, { noShadow: true });
    p.box(x, 6.2, zc + 0.82, 0.3, 0.3, 0.05, rng.chance(0.3) ? CYAN : RED, { glow: 2.4 });
    // correntes e cabos pendurados
    if (rng.chance(0.4)) p.cyl(x + 3, 5.4, zc + 0.5, 0.03, 0.03, 2.2, 0x1a1a1e, 4);
  }
  // arquibancadas acima da muralha
  for (let x = ctx.x0; x < ctx.x1; x += 10) {
    p.box(x, 9.2, -15, 10, 1.4, 3, 0x2a2226, { noShadow: true });
    p.box(x, 10.6, -17, 10, 1.4, 3, 0x241e22, { noShadow: true });
  }

  // cidade em chamas e morros ao longe
  silhouetteRow(ctx, -34, 0x1a0e14, 10, 24, 9, 'city');
  silhouetteRow(ctx, -50, 0x120a10, 14, 26, 18, 'hills');

  // ---------------------------------------------------------------- trechos temáticos
  const zone = (a: number, b: number, fn: (x: number) => void, step = 4) => {
    for (let x = a; x < b; x += step * rng.range(0.7, 1.3)) fn(x);
  };
  const back = () => rng.range(-9.5, z0 - 1.6);
  const front = () => rng.range(z1 + 1.6, z1 + 4.5);

  // Vila: túmulos, árvores mortas e postes
  zone(
    ctx.x0,
    32,
    (x) => {
      grave(p, rng, x, rng.chance(0.7) ? back() : front());
      if (rng.chance(0.35)) deadTree(p, rng, x + 1, rng.range(-10, -6.5), rng.range(0.8, 1.3));
    },
    2.5,
  );
  lamppost(ctx, 8, z0 - 1.8, 0xffb35c, 3.6, 12);
  lamppost(ctx, 24, z0 - 1.8, 0xffb35c, 3.6, 12);

  // Torre/Banco: colunas de mármore quebradas, tochas, porta de cofre e caixas eletrônicos
  zone(
    32,
    62,
    (x) => {
      const h = rng.chance(0.5) ? rng.range(1.2, 2.6) : rng.range(3.5, 5);
      column(p, x, rng.range(-8.5, -6), h, 0xc8c2b8, 0.32);
      if (rng.chance(0.4))
        p.box(x + 1, 0.2, rng.range(-7, -5), 1.2, 0.4, 0.5, 0xb8b2a8, { rot: [0, rng.range(0, 3), 0] });
    },
    4.5,
  );
  torch(ctx, 36, 2.2, -5.7);
  torch(ctx, 56, 2.2, -5.7);
  // porta de cofre caída
  p.cyl(47, 1.6, -8.4, 1.6, 1.6, 0.4, 0x7a7e86, 16, { rot: [Math.PI / 2, 0, 0.2] });
  p.cyl(47, 1.6, -8.15, 0.5, 0.5, 0.2, 0x4a4e56, 10, { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const ax = 40 + i * 6;
    p.box(ax, 0.9, -6.2, 0.9, 1.8, 0.6, 0x3a3e46);
    p.box(ax, 1.3, -5.88, 0.6, 0.35, 0.02, 0x5aff9a, { glow: 1.4 });
  }

  // Castelo/Tóxica: muros de pedra, barris tóxicos e poças verdes
  zone(
    62,
    92,
    (x) => {
      if (rng.chance(0.6)) {
        const h = rng.range(2.5, 5);
        p.box(x, h / 2, rng.range(-9.5, -7.5), rng.range(2, 3.5), h, 1, 0x4a4650, { jitter: 0.12 });
        p.box(x, h + 0.3, -8.5, 0.6, 0.6, 0.8, 0x4a4650);
      }
      if (rng.chance(0.5)) {
        barrel(p, x + 1.2, rng.range(-6.5, -5.2), 0x3a5a2a);
        p.box(x + 1.2, 1.02, -5.8, 0.4, 0.04, 0.4, 0x7aff3a, { glow: 1.8 });
      }
      if (rng.chance(0.5))
        p.cyl(x + 2, 0.02, back() + 2, rng.range(0.6, 1.2), rng.range(0.6, 1.2), 0.03, 0x5aff2a, 10, {
          glow: 1.1,
        });
    },
    3.5,
  );
  ctx.light(70, 0.6, -5.5, 0x7aff3a, 6, 8, 0.4);
  ctx.light(86, 0.6, -5.5, 0x7aff3a, 6, 8, 0.4);
  torch(ctx, 76, 2.4, -6.8, 0x9a6aff);

  // Floresta/Centro: pinheiros, carros destruídos e letreiros de neon
  zone(
    92,
    122,
    (x) => {
      if (rng.chance(0.55)) pine(p, rng, x, rng.range(-11, -7), rng.range(0.8, 1.2));
      else carWreck(p, rng, x, rng.range(-8, -6.5), rng.pick([0x5a2a2a, 0x2a3a5a, 0x4a4a4a]));
    },
    4.5,
  );
  for (const nx of [98, 110, 118]) {
    const col = rng.pick([0xff3ab0, CYAN, 0xffe03a]);
    p.box(nx, 3.2, -9.6, 0.12, 6.4, 0.12, 0x1a1a1e);
    p.box(nx, 5.2, -9.4, 2.4, 0.9, 0.08, col, { glow: 1.5 });
    ctx.light(nx, 5, -8.4, col, 7, 9, 0.2);
  }

  // Chamas/Guerra: sacos de areia, tanque destruído, vigas carbonizadas e braseiros
  zone(
    122,
    152,
    (x) => {
      if (rng.chance(0.5)) sandbags(p, x, rng.range(-6.6, -5.4), rng.int(3, 6));
      if (rng.chance(0.4)) {
        const bz = back();
        p.box(x + 1, 0.8, bz, 0.25, 1.6, 0.25, 0x14100e, { rot: [0, 0, rng.range(-0.6, 0.6)] });
      }
    },
    4,
  );
  // tanque
  p.box(138, 0.8, -9, 5.4, 1.2, 2.6, 0x3a3e2a);
  p.box(137.6, 1.8, -9, 2.6, 0.9, 2, 0x34381e);
  p.cyl(140.8, 1.8, -9, 0.14, 0.14, 3.4, 0x2a2e1a, 7, { rot: [0, 0, Math.PI / 2 - 0.15] });
  for (const bx of [126, 146]) {
    p.cyl(bx, 0.45, -5.6, 0.35, 0.25, 0.9, 0x2a2426, 8);
    p.cone(bx, 1.1, -5.6, 0.3, 0.7, 0xff7a2a, 5, { glow: 3.5 });
    ctx.light(bx, 1.4, -5, 0xff7a2a, 9, 8, 0.9);
  }

  // Corredor da morte: pilhas de crânios, espigões e cabos
  zone(
    152,
    bossX - 2,
    (x) => {
      for (let i = 0; i < 4; i++)
        p.sphere(x + rng.range(-0.4, 0.4), 0.12 + i * 0.08, back() * 0.6 - 2.5, 0.13, 0xd8d0b8);
      p.cone(x + 1.2, 0.9, rng.range(-7.5, -5.5), 0.14, 1.8, 0x5a5e66, 4);
    },
    3.5,
  );

  // ---------------------------------------------------------------- arena do chefe
  const cx = bossX + (L - bossX) / 2;
  // faixas de luz no piso da arena e portões nas pontas
  for (let x = bossX - 3; x < L; x += 1.6) {
    p.box(x, 0.02, z0 - 0.15, 1.1, 0.02, 0.12, CYAN, { glow: 1.2, noShadow: true });
    p.box(x, 0.02, z1 + 0.25, 1.1, 0.02, 0.12, CYAN, { glow: 1.2, noShadow: true });
  }
  for (const gx of [bossX - 3, L - 1]) {
    p.box(gx, 0.02, (z0 + z1) / 2, 0.16, 0.02, z1 - z0 + 0.6, RED, { glow: 1.6, noShadow: true });
  }
  // pilares com cabos pulsantes
  for (let i = 0; i < 6; i++) {
    const px = bossX - 2 + i * ((L - bossX + 4) / 5);
    const pz = -6.5 - (i % 2) * 1.5;
    p.cyl(px, 3.5, pz, 0.45, 0.6, 7, 0x2a2c32, 8);
    p.box(px, 7.2, pz, 1.2, 0.5, 1.2, 0x3a3e48);
    p.cyl(px, 4, pz + 0.48, 0.08, 0.08, 5, i % 2 ? RED : CYAN, 5, { glow: 2.2 });
    ctx.light(px, 6, pz + 1.2, i % 2 ? RED : CYAN, 10, 10, 0.5);
  }
  // cabos grossos no chão ligando os pilares ao fundo
  for (let i = 0; i < 5; i++)
    p.cyl(bossX + 2 + i * 4, 0.12, -7.8, 0.12, 0.12, 5, 0x141418, 6, {
      rot: [Math.PI / 2, 0, rng.range(-0.4, 0.4)],
    });

  // torre-colmeia do OMEGA ao fundo, com veias brilhantes
  const tx = cx + 6;
  const tz = -30;
  p.cyl(tx, 12, tz, 3.5, 6, 24, 0x241c22, 9, { noShadow: true });
  p.cyl(tx, 27, tz, 1.5, 3.5, 8, 0x2a2026, 9, { noShadow: true });
  p.sphere(tx, 31.5, tz, 2.2, 0x2a1a22, { noShadow: true });
  p.sphere(tx, 31.5, tz + 1.4, 1.1, RED, { glow: 3 });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    p.box(tx + Math.cos(a) * 4.4, 10, tz + Math.sin(a) * 4.4 + 1, 0.25, 18, 0.25, i % 2 ? CYAN : RED, {
      glow: 1.6,
      rot: [0, 0, rng.range(-0.1, 0.1)],
    });
  }
  ctx.light(tx, 18, tz + 8, RED, 20, 30, 0.2);

  // caixas e destroços espalhados
  for (let i = 0; i < ctx.dense(14); i++)
    crate(p, rng.range(ctx.x0, ctx.x1), 0, rng.range(-6.2, -5), rng.range(0.6, 0.9), 0x4a3a2e);
  for (let i = 0; i < ctx.dense(18); i++)
    rock(p, rng, rng.range(ctx.x0, ctx.x1), rng.chance(0.5) ? front() : back(), 0.6, 0x3a3236);
}
