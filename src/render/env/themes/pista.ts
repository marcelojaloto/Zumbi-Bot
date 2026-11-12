import type { EnvCtx, Pieces } from '../builder';
import { silhouetteRow } from '../props';

const H = Math.PI / 2;
const WHITE = 0xf2efe6;
const GRASS = 0x3f7a3a;
const GRASS_D = 0x2f6230;
const SAND = 0xd8c08a;
const CONCRETE = 0x8a8a90;
const CONCRETE_D = 0x5a5c64;
const STEEL = 0x8a909a;
const STEEL_D = 0x33363e;
const LAMP = 0xfff0c0;
const SEATS = [0xd8302a, 0x2a6ad8, 0xffd23a, 0x3ac85a];
const FLAGS = [0xd8302a, 0x2a6ad8, 0xffd23a, 0x3ac85a, 0xf2efe6, 0xff7a3a];
const MOD = 12;

type Module = 'stands' | 'board' | 'sandpit' | 'highjump' | 'throws' | 'arena';

/** Estádio de atletismo ao entardecer: raias, gramado, arquibancadas, refletores, placar e, no fim, o pódio. */
export function pistaTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;

  // raias e gramados
  const lanes = 4;
  for (let i = 0; i <= lanes; i++) {
    const z = z0 - 0.15 + ((z1 - z0 + 0.3) * i) / lanes;
    p.box(mid, 0.006, z, len, 0.012, i === 0 || i === lanes ? 0.1 : 0.06, WHITE, { noShadow: true });
  }
  p.box(mid, 0.004, z0 - 4.4, len, 0.008, 8, GRASS, { noShadow: true });
  p.box(mid, 0.004, z1 + 2.4, len, 0.008, 3.6, GRASS_D, { noShadow: true });
  p.box(mid, 0.1, z0 - 0.45, len, 0.2, 0.12, CONCRETE, { noShadow: true });
  // marcas de distância
  for (let x = 10; x < ctx.level.length; x += 10)
    p.box(x, 0.007, (z0 + z1) / 2, 0.08, 0.012, z1 - z0, WHITE, { noShadow: true });

  const hazards = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of hazards) {
    if (h.kind === 'hurdle') hurdleRow(p, h.x, h.z, h.d ?? 1.6);
    else if (h.kind === 'gust') windsock(p, h.x, z0 - 1.1);
  }

  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const arenaMid = arena ? (arena[0] + arena[1]) / 2 : Infinity;
  const kinds: Module[] = ['stands', 'sandpit', 'stands', 'board', 'highjump', 'stands', 'throws', 'board'];
  let k = 0;
  for (let cx = ctx.x0; cx < ctx.x1; cx += MOD, k++) {
    const mx = cx + MOD / 2;
    let kind: Module = kinds[(k + rng.int(0, 1)) % kinds.length]!;
    if (arena && mx > arena[0] - 5 && mx < arena[1] + 6) kind = 'arena';
    stands(ctx, mx, MOD - 0.4);
    switch (kind) {
      case 'board':
        scoreboard(ctx, mx, -9.6, 5.2);
        break;
      case 'sandpit':
        sandpit(ctx, mx);
        break;
      case 'highjump':
        highJump(ctx, mx);
        break;
      case 'throws':
        throwsArea(ctx, mx);
        break;
      default:
        break;
    }
    if (k % 3 === 0) floodlight(ctx, cx, -10.2);
    flag(p, cx + 3, z0 - 1.6, FLAGS[k % FLAGS.length]!);
    flag(p, cx + 9, z0 - 1.6, FLAGS[(k + 2) % FLAGS.length]!);
  }
  if (arena) podium(ctx, arenaMid, arena[0]);

  // linha de largada e blocos de partida
  p.box(6, 0.008, (z0 + z1) / 2, 0.3, 0.012, z1 - z0, WHITE, { noShadow: true });
  for (let i = 0; i < lanes; i++) {
    const z = z0 + ((z1 - z0) * (i + 0.5)) / lanes;
    p.box(5.2, 0.08, z, 0.5, 0.16, 0.3, STEEL_D, { rot: [0, 0, 0.3] });
  }

  // cones, garrafas e números de peito perdidos
  for (let i = 0; i < ctx.dense(30); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.6) ? rng.range(z0 - 3.4, z0 - 0.8) : rng.range(z1 + 0.7, z1 + 2.4);
    p.cone(x, 0.16, z, 0.11, 0.32, 0xff7a1a, 6);
    p.box(x, 0.012, z, 0.26, 0.024, 0.26, 0xff7a1a, { noShadow: true });
  }
  for (let i = 0; i < ctx.dense(110); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(z0 - 3, z0 - 0.6) : rng.range(z0, z1 + 2.2);
    p.box(x, 0.008 + rng.next() * 0.004, z, 0.2, 0.006, 0.16, rng.chance(0.7) ? WHITE : rng.pick(FLAGS), {
      noShadow: true,
      rot: [0, rng.range(0, Math.PI), 0],
    });
  }
  // manchas de sangue na pista
  for (let i = 0; i < ctx.dense(14); i++) {
    const r = rng.range(0.25, 0.5);
    p.cyl(rng.range(ctx.x0, ctx.x1), 0.009, rng.range(z0, z1), r, r, 0.006, 0x5a0c0c, 8, { noShadow: true });
  }

  silhouetteRow(ctx, -34, 0x2a1e34, 8, 18, 9, 'city');
  silhouetteRow(ctx, -48, 0x221830, 12, 26, 14, 'hills');

  // primeiro plano: placas de publicidade baixas
  for (let x = ctx.x0 + 4; x < ctx.x1; x += rng.range(7, 11)) {
    const w = rng.range(2.4, 3.6);
    p.box(x, 0.35, z1 + 3.1, w, 0.7, 0.08, rng.pick(FLAGS));
    p.box(x, 0.35, z1 + 3.15, w * 0.6, 0.18, 0.02, WHITE, { noShadow: true });
  }
}

/** Barreiras lado a lado cobrindo `d` metros de profundidade. */
function hurdleRow(p: Pieces, x: number, z: number, d: number): void {
  const n = Math.max(1, Math.round(d / 1.1));
  const w = d / n;
  for (let i = 0; i < n; i++) {
    const hz = z - d / 2 + (i + 0.5) * w;
    for (const s of [-1, 1]) {
      p.box(x, 0.36, hz + s * (w / 2 - 0.08), 0.05, 0.72, 0.05, STEEL);
      p.box(x - 0.18, 0.025, hz + s * (w / 2 - 0.08), 0.5, 0.05, 0.05, STEEL);
    }
    p.box(x, 0.68, hz, 0.04, 0.12, w - 0.12, WHITE);
    p.box(x + 0.022, 0.68, hz, 0.01, 0.12, (w - 0.12) * 0.3, 0x16161e, { noShadow: true });
  }
}

/** Biruta marcando onde o vento sopra. */
function windsock(p: Pieces, x: number, z: number): void {
  p.cyl(x, 1.7, z, 0.04, 0.05, 3.4, STEEL, 6);
  p.cone(x + 0.55, 3.25, z, 0.2, 1, 0xff7a1a, 8, { rot: [0, 0, H] });
  p.cyl(x + 0.4, 3.25, z, 0.19, 0.19, 0.2, WHITE, 8, { rot: [0, 0, H] });
}

function flag(p: Pieces, x: number, z: number, color: number): void {
  p.cyl(x, 1.6, z, 0.03, 0.04, 3.2, STEEL, 5);
  p.box(x + 0.45, 2.85, z, 0.9, 0.55, 0.03, color, { noShadow: true });
}

/** Arquibancada: degraus de concreto com assentos coloridos e alguns torcedores caídos. */
function stands(ctx: EnvCtx, x: number, w: number): void {
  const { p, rng } = ctx;
  p.box(x, 0.8, -8.6, w + 0.4, 1.6, 0.25, CONCRETE_D);
  p.box(x, 1.55, -8.5, w + 0.4, 0.1, 0.12, STEEL, { noShadow: true });
  for (let r = 0; r < 6; r++) {
    const y = 1.2 + r * 0.75;
    const z = -9.6 - r * 1.1;
    p.box(x, y / 2, z, w + 0.4, y, 1.1, r % 2 ? CONCRETE : CONCRETE_D);
    const c = SEATS[(r + Math.round(x / MOD)) % SEATS.length]!;
    for (let sx = x - w / 2 + 0.4; sx < x + w / 2; sx += 0.8) {
      if (rng.chance(0.12)) continue;
      p.box(sx, y + 0.18, z - 0.1, 0.6, 0.36, 0.5, c);
      if (rng.chance(0.07)) {
        p.box(sx, y + 0.6, z - 0.1, 0.34, 0.5, 0.24, rng.pick([0x4a4038, 0x3a4250, 0x5a2a2a]));
        p.sphere(sx, y + 0.98, z - 0.1, 0.13, 0x6f7f5a);
      }
    }
  }
  p.box(x, 6.4, -16.2, w + 0.4, 2.2, 0.3, CONCRETE_D);
}

/** Torre de refletores. */
function floodlight(ctx: EnvCtx, x: number, z: number): void {
  const p = ctx.p;
  p.cyl(x, 5, z, 0.14, 0.22, 10, STEEL_D, 6);
  p.box(x, 10.2, z + 0.1, 2.4, 1.4, 0.2, STEEL_D);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 2; j++)
      p.box(x - 0.85 + i * 0.57, 9.9 + j * 0.6, z + 0.22, 0.42, 0.42, 0.04, LAMP, { glow: 2.6 });
  ctx.light(x, 5.5, z + 5, LAMP, 16, 22, 0.05);
}

/** Placar eletrônico com dígitos acesos. */
function scoreboard(ctx: EnvCtx, x: number, z: number, y: number): void {
  const { p, rng } = ctx;
  p.box(x, y, z, 4.6, 2.2, 0.3, 0x14161c);
  p.box(x, y - 1.9, z, 0.3, 1.8, 0.3, STEEL_D);
  for (let i = 0; i < 4; i++) {
    const dx = x - 1.5 + i;
    const c = i < 2 ? 0xff5a2a : 0xffd23a;
    for (let s = 0; s < 3; s++)
      if (rng.chance(0.8)) p.box(dx, y + 0.5 - s * 0.5, z + 0.17, 0.5, 0.1, 0.02, c, { glow: 2.4 });
    for (const sx of [-0.24, 0.24])
      for (const sy of [0.25, -0.25])
        if (rng.chance(0.7)) p.box(dx + sx, y + sy, z + 0.17, 0.1, 0.4, 0.02, c, { glow: 2.4 });
  }
  ctx.light(x, y - 0.6, z + 2, 0xff8a4a, 5, 9, 0.4);
}

/** Caixa de areia do salto em distância, com a pista de impulso. */
function sandpit(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = -5.6;
  p.box(x - 4, 0.01, z, 5, 0.014, 1.2, 0x9a3c2c, { noShadow: true });
  p.box(x - 1.6, 0.014, z, 0.2, 0.014, 1.2, WHITE, { noShadow: true });
  p.box(x + 1.4, 0.03, z, 5.6, 0.06, 2.6, SAND, { jitter: 0.12 });
  for (let i = 0; i < 6; i++)
    p.ico(x + rng.range(-0.8, 3.6), 0.07, z + rng.range(-1, 1), rng.range(0.1, 0.2), SAND, { jitter: 0.15 });
  p.box(x + 4.5, 0.2, z - 1.6, 0.9, 0.4, 0.05, 0x7a5a32);
}

/** Colchão do salto em altura com os postes e o sarrafo. */
function highJump(ctx: EnvCtx, x: number): void {
  const p = ctx.p;
  const z = -6;
  p.box(x, 0.3, z - 0.6, 4, 0.6, 2.4, 0x2a6ad8);
  p.box(x, 0.62, z - 0.6, 4.04, 0.04, 2.44, 0x1a4aa8, { noShadow: true });
  for (const s of [-1, 1]) {
    p.cyl(x + s * 2, 1.1, z + 0.9, 0.04, 0.04, 2.2, STEEL, 5);
    p.box(x + s * 2, 0.03, z + 0.9, 0.5, 0.06, 0.5, STEEL_D);
  }
  p.cyl(x, 1.8, z + 0.9, 0.025, 0.025, 4, 0xffd23a, 5, { rot: [0, 0, H] });
}

/** Setor de arremessos: círculo de concreto, pesos e dardos espetados no gramado. */
function throwsArea(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  p.cyl(x - 3, 0.012, -5, 1.1, 1.1, 0.02, CONCRETE, 14, { noShadow: true });
  p.part('torus', [1.1, 0.04], x - 3, 0.03, -5, WHITE, { rot: [H, 0, 0], noShadow: true });
  for (let i = 0; i < 4; i++)
    p.sphere(x - 3 + rng.range(-0.8, 2.5), 0.11, -5 + rng.range(-1, 1), 0.11, 0x2a2c32);
  for (let i = 0; i < 5; i++) {
    const jx = x + rng.range(0, 4.5);
    const jz = rng.range(-7, -4.2);
    p.cyl(jx, 0.7, jz, 0.018, 0.018, 1.7, 0xd8d0c0, 5, { rot: [0, 0, rng.range(0.35, 0.7)] });
  }
}

/** Arena do chefe: linha de chegada quadriculada, arco, pódio e o placar do recorde. */
function podium(ctx: EnvCtx, cx: number, x0: number): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  // linha de chegada
  for (let i = 0; i < 12; i++)
    for (let j = 0; j < 2; j++)
      p.box(
        x0 + 1 + j * 0.4,
        0.009,
        z0 + ((z1 - z0) * (i + 0.5)) / 12,
        0.4,
        0.012,
        (z1 - z0) / 12,
        (i + j) % 2 ? WHITE : 0x16161e,
        {
          noShadow: true,
        },
      );
  for (const z of [z0 - 0.9, z1 + 1]) p.cyl(x0 + 1.2, 2.3, z, 0.1, 0.12, 4.6, STEEL_D, 6);
  p.box(x0 + 1.2, 4.5, (z0 + z1) / 2, 0.3, 0.7, z1 - z0 + 2.2, 0xd8302a);
  p.box(x0 + 1.37, 4.5, (z0 + z1) / 2, 0.02, 0.3, (z1 - z0) * 0.7, WHITE, { noShadow: true });
  // pódio
  const z = -5.6;
  p.box(cx, 0.6, z, 1.8, 1.2, 1.6, WHITE);
  p.box(cx - 1.8, 0.4, z, 1.8, 0.8, 1.6, WHITE);
  p.box(cx + 1.8, 0.25, z, 1.8, 0.5, 1.6, WHITE);
  p.box(cx, 0.7, z + 0.81, 0.5, 0.6, 0.02, 0xffd23a, { glow: 1.2 });
  p.box(cx - 1.8, 0.45, z + 0.81, 0.5, 0.45, 0.02, 0xc8ccd4);
  p.box(cx + 1.8, 0.28, z + 0.81, 0.5, 0.3, 0.02, 0xb8743a);
  // troféu no degrau mais alto
  p.cyl(cx, 1.3, z, 0.16, 0.22, 0.2, 0x7a5a32, 8);
  p.cyl(cx, 1.6, z, 0.2, 0.08, 0.4, 0xffd23a, 8);
  p.part('torus', [0.16, 0.03], cx, 1.66, z, 0xffd23a);
  scoreboard(ctx, cx, -9.4, 5.6);
  for (let i = 0; i < 8; i++) flag(p, cx - 8 + i * 2.3, z0 - 1.5, FLAGS[i % FLAGS.length]!);
  ctx.light(cx, 3, z + 2, 0xffd23a, 9, 12, 0.1);
  ctx.light(cx - 6, 4, -4, LAMP, 10, 14, 0.05);
  ctx.light(cx + 6, 4, -4, LAMP, 10, 14, 0.05);
  void rng;
}
