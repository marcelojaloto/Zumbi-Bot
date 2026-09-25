import type { EnvCtx } from '../builder';
import { pine, rock, silhouetteRow } from '../props';

const BARK = 0x3a2a1c;
const BARK_DARK = 0x2a1e14;
const MOSS = 0x2e4a22;
const FERN = [0x1e3a20, 0x24442a, 0x1a3020];
const PINES: [number, number][] = [
  [0x1f3c2a, 0x15291d],
  [0x24422e, 0x1a3222],
  [0x1a3426, 0x112419],
];
const SHROOMS = [0x5affe0, 0x9aff5a, 0x7ad8ff];
const WATER = 0x0b2a26;

/** Tufo de cogumelos luminosos (com luz ocasional). */
function mushrooms(ctx: EnvCtx, x: number, z: number, n: number, light: boolean): void {
  const { p, rng } = ctx;
  const c = rng.pick(SHROOMS);
  for (let i = 0; i < n; i++) {
    const mx = x + rng.range(-0.45, 0.45);
    const mz = z + rng.range(-0.3, 0.3);
    const h = rng.range(0.1, 0.26);
    p.cyl(mx, h / 2, mz, 0.018, 0.028, h, 0xcad8c0, 4, { noShadow: true });
    p.part('cone', [h * 0.6, h * 0.32, 7], mx, h + h * 0.1, mz, c, { glow: rng.range(1.6, 2.6) });
  }
  if (light) ctx.light(x, 0.6, z + 0.4, c, 3.2, 5, 0.12);
}

/** Tronco caído com musgo e ponta cortada. */
function log(ctx: EnvCtx, x: number, z: number, len: number, r: number): void {
  const { p, rng } = ctx;
  const yaw = rng.range(-0.35, 0.35);
  p.cyl(x, r, z, r, r * 1.08, len, BARK, 8, { rot: [0, yaw, Math.PI / 2], jitter: 0.1 });
  const cx = Math.cos(yaw) * len * 0.5;
  const cz = -Math.sin(yaw) * len * 0.5;
  p.cyl(x + cx, r, z + cz, r * 0.85, r * 0.85, 0.03, 0x8a6a44, 8, { rot: [0, yaw, Math.PI / 2] });
  p.box(x - cx * 0.2, r * 1.9, z - cz * 0.2, len * 0.45, 0.06, r * 1.1, MOSS, {
    rot: [0, yaw, 0],
    noShadow: true,
  });
  if (rng.chance(0.5))
    p.cyl(x - cx * 0.6, r * 1.6, z - cz * 0.6, 0.03, 0.05, r * 1.6, BARK_DARK, 4, { rot: [0.4, 0, 0.5] });
}

function fern(ctx: EnvCtx, x: number, z: number, s = 1): void {
  const { p, rng } = ctx;
  const c = rng.pick(FERN);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng.range(-0.3, 0.3);
    p.part(
      'cone',
      [0.1 * s, 0.7 * s, 4],
      x + Math.cos(a) * 0.18 * s,
      0.25 * s,
      z + Math.sin(a) * 0.18 * s,
      c,
      {
        rot: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9],
        noShadow: true,
      },
    );
  }
}

/** Poça de pântano escura e brilhante, com juncos e vitórias-régias. */
function pool(ctx: EnvCtx, x: number, z: number, r: number, reeds = true): void {
  const { p, rng } = ctx;
  p.cyl(x, 0.012, z, r, r, 0.02, WATER, 14, { glow: 0.55 });
  p.cyl(x + r * 0.15, 0.018, z - r * 0.1, r * 0.6, r * 0.6, 0.012, 0x123a34, 12, { glow: 0.5 });
  p.box(x - r * 0.2, 0.026, z + r * 0.15, r * 0.9, 0.01, 0.05, 0x5ac8b0, { glow: 0.4 });
  for (let i = 0; i < Math.round(r * 2); i++)
    p.cyl(
      x + rng.range(-r, r) * 0.6,
      0.03,
      z + rng.range(-r, r) * 0.5,
      0.14,
      0.14,
      0.015,
      rng.pick([0x2e5a2a, 0x3a6a30]),
      7,
      { noShadow: true },
    );
  if (!reeds) return;
  for (let i = 0; i < Math.round(r * 5); i++) {
    const a = rng.range(0, Math.PI * 2);
    const h = rng.range(0.5, 1.2);
    p.box(x + Math.cos(a) * r * 0.95, h / 2, z + Math.sin(a) * r * 0.8, 0.03, h, 0.03, 0x4a5a2a, {
      rot: [rng.range(-0.15, 0.15), 0, rng.range(-0.2, 0.2)],
      noShadow: true,
    });
  }
}

/** Floresta escura: pinheiros densos, troncos caídos, rochas, cogumelos luminosos e poças de pântano. */
export function florestaTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;

  // folhas e agulhas espalhadas
  for (let i = 0; i < ctx.dense(260); i++) {
    const lx = rng.range(ctx.x0, ctx.x1);
    p.box(lx, 0.01, rng.range(z0 - 1, z1 + 2), 0.12, 0.01, 0.07, rng.pick([0x4a3a1e, 0x3a4a22, 0x5a4424]), {
      rot: [0, rng.range(0, 3), 0],
      noShadow: true,
    });
  }

  // poças nos perigos de pântano do nível
  for (const s of ctx.level.segments)
    for (const h of s.hazards ?? []) if (h.kind === 'swamp') pool(ctx, h.x, h.z, (h.w ?? 4) / 2, false);

  // borda de trás: samambaias, pedras, cogumelos
  for (let i = 0; i < ctx.dense(70); i++)
    fern(ctx, rng.range(ctx.x0, ctx.x1), rng.range(z0 - 2.2, z0 - 0.7), rng.range(0.8, 1.4));
  for (let i = 0; i < ctx.dense(26); i++)
    rock(
      p,
      rng,
      rng.range(ctx.x0, ctx.x1),
      rng.range(z0 - 3, z0 - 1),
      rng.range(0.7, 1.4),
      rng.pick([0x3a403a, 0x444a40, 0x34382f]),
    );

  // rochas grandes e troncos caídos
  for (let x = ctx.x0 + rng.range(0, 6); x < ctx.x1; x += rng.range(9, 16)) {
    const z = rng.range(-7.5, -5.8);
    if (rng.chance(0.55)) {
      rock(p, rng, x, z, rng.range(1.6, 2.6), rng.pick([0x3e443c, 0x4a4e44]));
      p.box(x, rng.range(0.9, 1.3), z, 1.2, 0.1, 1.0, MOSS, {
        rot: [0.2, rng.range(0, 3), 0.1],
        noShadow: true,
      });
    } else log(ctx, x, z, rng.range(3, 5.5), rng.range(0.28, 0.42));
    if (rng.chance(0.7)) mushrooms(ctx, x + rng.range(-1.5, 1.5), z + 1.2, rng.int(3, 6), rng.chance(0.55));
  }

  // cogumelos luminosos perto do caminho (com luz)
  for (let x = ctx.x0 + 4; x < ctx.x1; x += rng.range(7, 12)) {
    const back = rng.chance(0.6);
    mushrooms(
      ctx,
      x,
      back ? rng.range(z0 - 1.6, z0 - 0.7) : rng.range(z1 + 0.8, z1 + 2),
      rng.int(3, 7),
      true,
    );
  }

  // poças de pântano fora do caminho
  for (let x = ctx.x0 + rng.range(0, 10); x < ctx.x1; x += rng.range(14, 24)) {
    if (rng.chance(0.6)) pool(ctx, x, rng.range(-8.5, -6.5), rng.range(1.4, 2.4));
    else pool(ctx, x, rng.range(z1 + 1.4, z1 + 2), rng.range(0.8, 1.1), false);
  }

  // pinheiros: fileira próxima, meio e fundo denso
  for (let x = ctx.x0; x < ctx.x1; x += rng.range(3.5, 6.5)) {
    const [c1, c2] = rng.pick(PINES);
    pine(p, rng, x, rng.range(-8.2, -6.6), rng.range(0.9, 1.25), c1, c2);
  }
  for (let x = ctx.x0; x < ctx.x1; x += rng.range(2.4, 4)) {
    const [c1, c2] = rng.pick(PINES);
    pine(p, rng, x, rng.range(-13, -9), rng.range(1.2, 1.7), c1, c2);
  }
  for (let x = ctx.x0; x < ctx.x1; x += rng.range(2.6, 4.2)) {
    pine(p, rng, x, rng.range(-20, -14), rng.range(1.5, 2.1), 0x183022, 0x10221a);
  }
  // troncos altos sem copa à vista (dão profundidade entre os pinheiros)
  for (let i = 0; i < ctx.dense(40); i++) {
    const tx = rng.range(ctx.x0, ctx.x1);
    const tz = rng.range(-12, -7.5);
    p.cyl(tx, 6, tz, 0.18, 0.3, 12, BARK_DARK, 6);
  }

  // feixes de luar entre as árvores (tênues, ao fundo)
  for (let x = ctx.x0 + rng.range(4, 12); x < ctx.x1; x += rng.range(16, 28)) {
    const tilt = rng.range(0.22, 0.34);
    const z = rng.range(-15, -12.5);
    for (let k = 0; k < 3; k++)
      p.box(x + k * rng.range(0.7, 1.3), 7, z - k * 0.3, rng.range(0.12, 0.35), 16, 0.03, 0xa0ffd8, {
        glow: rng.range(0.07, 0.12),
        rot: [0, 0, tilt],
      });
    ctx.light(x - 2, 1.2, z + 5, 0xa0ffd8, 3, 9, 0);
  }

  // vaga-lumes parados em volta dos arbustos
  for (let i = 0; i < ctx.dense(60); i++) {
    const fx = rng.range(ctx.x0, ctx.x1);
    const fz = rng.chance(0.75) ? rng.range(-9, z0 - 0.8) : rng.range(z1 + 1, z1 + 3.5);
    p.sphere(fx, rng.range(0.6, 2.6), fz, 0.035, 0xe8ff7a, { glow: 3 });
  }

  // silhuetas distantes
  silhouetteRow(ctx, -26, 0x0d1a13, 7, 13, 2.6, 'trees');
  silhouetteRow(ctx, -36, 0x0b1611, 9, 16, 3.2, 'trees');
  silhouetteRow(ctx, -52, 0x09120e, 10, 22, 18, 'hills');

  // frente: samambaias, pedrinhas, troncos baixos
  for (let i = 0; i < ctx.dense(40); i++)
    fern(ctx, rng.range(ctx.x0, ctx.x1), rng.range(z1 + 0.7, z1 + 2), rng.range(0.6, 0.95));
  for (let i = 0; i < ctx.dense(18); i++)
    rock(p, rng, rng.range(ctx.x0, ctx.x1), rng.range(z1 + 0.9, z1 + 1.8), rng.range(0.3, 0.45), 0x3a3e38);
  for (let x = ctx.x0 + rng.range(5, 15); x < ctx.x1; x += rng.range(40, 60))
    log(ctx, x, rng.range(z1 + 0.9, z1 + 1.2), rng.range(1.8, 2.6), rng.range(0.13, 0.17));

  // primeiro plano distante: troncos que passam rente à câmera (sem sombra)
  for (let x = ctx.x0 + rng.range(8, 16); x < ctx.x1; x += rng.range(36, 50)) {
    const r = rng.range(0.1, 0.13);
    p.cyl(x, 6, rng.range(6.4, 7), r * 0.8, r, 12, 0x140f0a, 6, { noShadow: true });
  }
}
