import type { EnvCtx } from '../builder';
import {
  Spots,
  bunting,
  crate,
  fence,
  flowerBed,
  house,
  lamppost,
  leafyTree,
  rock,
  silhouetteRow,
} from '../props';

/** Vila do Entardecer: casas coloridas, jardins floridos, cercas brancas, árvores frondosas e bandeirinhas. */
export function vilaTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const spots = new Spots();
  /** Tenta algumas posições até achar uma livre. */
  const place = (
    tries: number,
    pick: () => [number, number],
    hw: number,
    hd: number,
    put: (x: number, z: number) => void,
  ) => {
    for (let k = 0; k < tries; k++) {
      const [x, z] = pick();
      if (spots.take(x, z, hw, hd)) return put(x, z);
    }
  };

  // calçada de pedras ao fundo e meio-fio na frente
  for (let x = ctx.x0; x < ctx.x1; x += 1.1) {
    p.box(x, 0.04, z0 - 0.9, 1.0, 0.08, 0.8, rng.pick([0xb8a890, 0xc4b49a, 0xaa9a84]), {
      noShadow: true,
      jitter: 0.12,
    });
    p.box(x, 0.06, z1 + 0.7, 1.05, 0.12, 0.25, 0xc8bca8, { noShadow: true });
  }

  // gramado atrás da calçada e na frente
  for (let x = ctx.x0; x < ctx.x1; x += 4) {
    p.box(x + 2, 0.012, -7.5, 4.02, 0.02, 4.6, 0x5aa04a, { noShadow: true, jitter: 0.06 });
    p.box(x + 2, 0.012, z1 + 3.4, 4.02, 0.02, 4.6, 0x62a852, { noShadow: true, jitter: 0.06 });
  }

  // fileira de casas coloridas, com jardins nos terrenos vagos
  let x = ctx.x0;
  const palettes: [number, number][] = [
    [0xf2d08a, 0xc0503a],
    [0xa8d8f0, 0x3a6ab0],
    [0xf4b0b8, 0x8a3a5a],
    [0xc8e6a0, 0x5a7a3a],
    [0xf8e8c8, 0xd06a3a],
  ];
  while (x < ctx.x1) {
    const w = rng.range(5, 8);
    const h = rng.range(3.2, 5.5);
    const d = rng.range(4, 5.5);
    const [wall, roof] = rng.pick(palettes);
    const zc = -8.5 - rng.range(0, 2.5);
    if (rng.chance(0.82)) {
      house(ctx, x + w / 2, zc, w, h, d, wall, roof, 0xffe2a0, 0.7);
      spots.block(x + w / 2, zc, w / 2 + 0.2, d / 2 + 0.2);
    } else {
      spots.block(x + w / 2, -8.6, 1.4, 1.4);
      leafyTree(p, rng, x + w / 2, -8.6, 1.1);
      for (let i = 0; i < ctx.dense(3); i++) {
        const bw = rng.range(1.2, 2);
        place(
          4,
          () => [x + rng.range(0.8, w - 0.8), rng.range(-9.2, -6.6)],
          bw / 2,
          0.35,
          (bx, bz) => flowerBed(p, rng, bx, bz, bw, 0.7),
        );
      }
    }
    x += w + rng.range(1, 3.5);
  }

  // cercas brancas na frente das casas
  for (let fx = ctx.x0; fx < ctx.x1; fx += 12) {
    if (!rng.chance(0.75)) continue;
    const len = rng.range(6, 10);
    fence(p, fx, fx + len, -5.6, 0xf4f0e8);
    spots.block(fx + len / 2, -5.6, len / 2 + 0.1, 0.12);
  }

  // postes com lanternas e varais de bandeirinhas entre eles
  let prev = -1;
  for (let lx = 6; lx < ctx.x1; lx += rng.range(13, 18)) {
    lamppost(ctx, lx, z0 - 1.6, 0xffd08a, 3.6, 8);
    spots.block(lx + 0.3, z0 - 1.6, 0.5, 0.2);
    if (prev > 0) bunting(p, rng, prev + 0.7, lx - 0.1, 3.35, z0 - 1.6);
    prev = lx;
  }

  // canteiros de flores perto do caminho
  for (let i = 0; i < ctx.dense(22); i++) {
    const bw = rng.range(0.8, 1.6);
    const bd = rng.range(0.4, 0.6);
    place(
      4,
      () => [
        rng.range(ctx.x0, ctx.x1),
        rng.chance(0.7) ? rng.range(-5.2, z0 - 1.5) : rng.range(z1 + 1.6, z1 + 3.5),
      ],
      bw / 2,
      bd / 2,
      (gx, gz) => flowerBed(p, rng, gx, gz, bw, bd),
    );
  }

  // árvores frondosas (a copa não pode entrar nas casas)
  for (let i = 0; i < ctx.dense(16); i++) {
    const s = rng.range(0.8, 1.2);
    place(
      4,
      () => [
        rng.range(ctx.x0, ctx.x1),
        rng.chance(0.75) ? rng.range(-13, -6.8) : rng.range(z1 + 3.2, z1 + 5.5),
      ],
      1.3 * s,
      1.3 * s,
      (tx, tz) => leafyTree(p, rng, tx, tz, s),
    );
  }

  // poço, caixas e pedras
  for (let i = 0; i < ctx.dense(4); i++)
    place(
      8,
      () => [rng.range(10, ctx.x1 - 10), -6.6],
      1,
      0.8,
      (wx, wz) => {
        p.cyl(wx, 0.45, wz, 0.7, 0.75, 0.9, 0xb8b0a0, 10);
        p.box(wx - 0.6, 1.2, wz, 0.08, 1.6, 0.08, 0x8a5a32);
        p.box(wx + 0.6, 1.2, wz, 0.08, 1.6, 0.08, 0x8a5a32);
        p.part('cone', [0.95, 0.5, 4], wx, 2.2, wz, 0xc0503a, { rot: [0, Math.PI / 4, 0] });
      },
    );
  for (let i = 0; i < ctx.dense(10); i++) {
    const cs = rng.range(0.6, 0.9);
    place(
      4,
      () => [rng.range(ctx.x0, ctx.x1), rng.chance(0.5) ? -5 : rng.range(-7.2, -6.2)],
      cs / 2,
      cs / 2,
      (cx, czz) => crate(p, cx, 0, czz, cs, 0xa87a48),
    );
  }
  for (let i = 0; i < ctx.dense(14); i++)
    rock(
      p,
      rng,
      rng.range(ctx.x0, ctx.x1),
      rng.chance(0.5) ? rng.range(z1 + 1.2, z1 + 4) : rng.range(-6, z0 - 1.3),
      0.6,
      0x9a9488,
    );

  // capela com torre do relógio ao fundo
  for (let cx = 40; cx < ctx.x1; cx += 70) {
    const cz = -17;
    p.box(cx, 4, cz, 8, 8, 6, 0xf4ead8, { jitter: 0.06 });
    p.part('cone', [6, 4, 4], cx, 10, cz, 0x3a6ab0, { rot: [0, Math.PI / 4, 0] });
    p.box(cx + 5, 7, cz, 3, 14, 3, 0xf8f0e0);
    p.part('cone', [2.4, 6, 4], cx + 5, 17, cz, 0x3a6ab0, { rot: [0, Math.PI / 4, 0] });
    p.cyl(cx + 5, 11, cz + 1.52, 0.7, 0.7, 0.05, 0xfff4d0, 12, { rot: [Math.PI / 2, 0, 0] });
    p.box(cx + 5, 11.2, cz + 1.56, 0.06, 0.5, 0.03, 0x2a2a2a);
    p.box(cx + 5.15, 11, cz + 1.56, 0.36, 0.06, 0.03, 0x2a2a2a);
  }

  // morros verdes e arvoredo ao longe
  silhouetteRow(ctx, -30, 0x6a9a5a, 6, 14, 12, 'hills');
  silhouetteRow(ctx, -45, 0x8aa0b8, 10, 20, 18, 'hills');
  silhouetteRow(ctx, -26, 0x4e8a48, 4, 9, 3.5, 'trees');

  // primeiro plano: moitas floridas baixas (não bloqueiam a visão)
  for (let i = 0; i < ctx.dense(10); i++) {
    const gx = rng.range(ctx.x0, ctx.x1);
    const gz = z1 + rng.range(3.5, 5);
    p.sphere(gx, 0.2, gz, rng.range(0.3, 0.5), 0x4e9a44, { noShadow: true });
    p.sphere(gx + 0.15, 0.45, gz + 0.1, 0.08, rng.pick([0xff6b9a, 0xffd23a, 0xffffff]), { noShadow: true });
  }
}
