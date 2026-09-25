import type { EnvCtx } from '../builder';
import { crate, deadTree, fence, grave, house, lamppost, rock, silhouetteRow } from '../props';

/** Vila assombrada: casas com janelas acesas, cercas, cemitério, árvores mortas e postes. */
export function vilaTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;

  // calçada de pedras ao fundo e meio-fio na frente
  for (let x = ctx.x0; x < ctx.x1; x += 1.1) {
    p.box(x, 0.04, z0 - 0.9, 1.0, 0.08, 0.8, rng.pick([0x3a3834, 0x34322e, 0x403c36]), {
      noShadow: true,
      jitter: 0.12,
    });
    p.box(x, 0.06, z1 + 0.7, 1.05, 0.12, 0.25, 0x3a3834, { noShadow: true });
  }

  // fileira de casas
  let x = ctx.x0;
  const palettes: [number, number][] = [
    [0x4a4038, 0x2a1e1a],
    [0x3a4048, 0x221c1c],
    [0x4e4436, 0x3a1a18],
    [0x3e3a42, 0x1e1a24],
    [0x524a3e, 0x2e2420],
  ];
  while (x < ctx.x1) {
    const w = rng.range(5, 8);
    const h = rng.range(3.2, 5.5);
    const d = rng.range(4, 5.5);
    const [wall, roof] = rng.pick(palettes);
    const zc = -8.5 - rng.range(0, 2.5);
    if (rng.chance(0.82)) house(ctx, x + w / 2, zc, w, h, d, wall, roof, 0xffb35c, 0.55);
    else {
      // terreno baldio com cemitério
      for (let i = 0; i < ctx.dense(6); i++) grave(p, rng, x + rng.range(0.5, w), rng.range(-9.5, -6.2));
      deadTree(p, rng, x + w / 2, -8, 1.2);
    }
    x += w + rng.range(1, 3.5);
  }

  // cercas quebradas na frente das casas
  for (let fx = ctx.x0; fx < ctx.x1; fx += 12) {
    if (rng.chance(0.75)) fence(p, fx, fx + rng.range(6, 10), -5.6, 0x3a2e24, rng);
  }

  // túmulos e cruzes perto do caminho
  for (let i = 0; i < ctx.dense(26); i++) {
    const gx = rng.range(ctx.x0, ctx.x1);
    grave(p, rng, gx, rng.chance(0.7) ? rng.range(-5.3, z0 - 1.4) : rng.range(z1 + 1.5, z1 + 3.5));
  }

  // árvores mortas
  for (let i = 0; i < ctx.dense(18); i++) {
    const tx = rng.range(ctx.x0, ctx.x1);
    const tz = rng.chance(0.75) ? rng.range(-13, -6.5) : rng.range(z1 + 2.5, z1 + 5);
    deadTree(p, rng, tx, tz, rng.range(0.8, 1.4));
  }

  // postes com lanternas
  for (let lx = 6; lx < ctx.x1; lx += rng.range(13, 18)) lamppost(ctx, lx, z0 - 1.6, 0xffb35c, 3.6, 16);

  // poço, carroças e caixas
  for (let i = 0; i < ctx.dense(4); i++) {
    const wx = rng.range(10, ctx.x1 - 10);
    p.cyl(wx, 0.45, -6.2, 0.7, 0.75, 0.9, 0x5a5650, 10);
    p.box(wx - 0.6, 1.2, -6.2, 0.08, 1.6, 0.08, 0x3a2a1a);
    p.box(wx + 0.6, 1.2, -6.2, 0.08, 1.6, 0.08, 0x3a2a1a);
    p.part('cone', [0.95, 0.5, 4], wx, 2.2, -6.2, 0x2a1e1a, { rot: [0, Math.PI / 4, 0] });
  }
  for (let i = 0; i < ctx.dense(10); i++)
    crate(p, rng.range(ctx.x0, ctx.x1), 0, rng.range(-6, -5), rng.range(0.6, 0.9), 0x5a4428);
  for (let i = 0; i < ctx.dense(14); i++)
    rock(
      p,
      rng,
      rng.range(ctx.x0, ctx.x1),
      rng.chance(0.5) ? rng.range(z1 + 1.2, z1 + 4) : rng.range(-6, z0 - 1.3),
      0.6,
      0x4a4844,
    );

  // igreja com torre ao fundo
  for (let cx = 40; cx < ctx.x1; cx += 70) {
    const cz = -17;
    p.box(cx, 4, cz, 8, 8, 6, 0x3a3634, { jitter: 0.06 });
    p.part('cone', [6, 4, 4], cx, 10, cz, 0x221c1c, { rot: [0, Math.PI / 4, 0] });
    p.box(cx + 5, 7, cz, 3, 14, 3, 0x3e3a38);
    p.part('cone', [2.4, 6, 4], cx + 5, 17, cz, 0x221c1c, { rot: [0, Math.PI / 4, 0] });
    p.box(cx + 5, 11, cz + 1.52, 0.9, 1.6, 0.05, 0xffc86a, { glow: 2 });
    p.box(cx + 5, 17.2, cz, 0.12, 1.4, 0.12, 0x8a8a8a);
    p.box(cx + 5, 17.5, cz, 0.7, 0.12, 0.12, 0x8a8a8a);
  }

  // silhuetas distantes
  silhouetteRow(ctx, -30, 0x151a26, 6, 14, 12, 'hills');
  silhouetteRow(ctx, -45, 0x10141e, 10, 20, 18, 'hills');
  silhouetteRow(ctx, -26, 0x121620, 4, 9, 3.5, 'trees');

  // primeiro plano: galhos e lápides baixas (não bloqueiam a visão)
  for (let i = 0; i < ctx.dense(10); i++) {
    const gx = rng.range(ctx.x0, ctx.x1);
    p.part('ico', [rng.range(0.25, 0.5), 0], gx, 0.15, z1 + rng.range(3.5, 5), 0x3a3834, { noShadow: true });
  }
}
