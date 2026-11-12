import type { Rng } from '../../../core/rng';
import type { EnvCtx, Pieces } from '../builder';
import { lamppost, silhouetteRow } from '../props';

const H = Math.PI / 2;
const CONCRETE = 0x6a6a72;
const CONCRETE_D = 0x4a4a52;
const STEEL = 0x9aa0aa;
const STEEL_D = 0x3a3e48;
const WOOD = 0x6a4a2a;
const WOOD_D = 0x54381e;
const WATER = 0x0c2a44;
const CONE = 0xff6a1a;
const GRASS = [0x1e3a22, 0x24442a, 0x1a3020];
const TAGS = [0x3affc8, 0xff3ad7, 0xffd23a, 0x7a5aff, 0xff6a1a];

type Module = 'halfpipe' | 'wall' | 'ramps' | 'trees';

/** Praça à noite: gramado, half-pipes, muros grafitados, rampas, árvores e, na arena do chefe, a ponte sobre o lago. */
export function pracaTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;
  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const inArena = (x: number, pad = 2) => !!arena && x > arena[0] - pad && x < arena[1] + pad;

  // gramado atrás e na frente (o lago da arena fica sem grama) e as guias da pista
  for (let x = ctx.x0; x < ctx.x1; x += 4) {
    if (inArena(x + 2, 3)) continue;
    p.box(x + 2, 0.02, -8, 4, 0.04, 6.4, rng.pick(GRASS), { noShadow: true, jitter: 0.05 });
    p.box(x + 2, 0.02, z1 + 2.7, 4, 0.04, 2.8, rng.pick(GRASS), { noShadow: true, jitter: 0.05 });
  }
  p.box(mid, 0.03, z0 - 1.2, len, 0.06, 0.16, CONCRETE_D, { noShadow: true });
  p.box(mid, 0.03, z1 + 1.2, len, 0.06, 0.16, CONCRETE_D, { noShadow: true });

  // perigos do nível
  const hazards = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of hazards) {
    if (h.kind === 'hurdle') {
      const w = h.w ?? 0.4;
      const d = h.d ?? 1.6;
      if (d >= w) cones(p, h.x, h.z, d);
      else if (w >= 2.4) rail(p, h.x, h.z, w);
      else slab(p, h.x, h.z, w, d);
    } else if (h.kind === 'fire') trashFire(ctx, h.x, h.z);
    else if (h.kind === 'swamp') {
      const r = (h.w ?? 4) / 2;
      puddle(ctx, h.x, h.z, r);
      fountain(ctx, h.x, -6.6);
      // a água escorre do chafariz até a poça
      p.box(h.x, 0.012, (h.z - r - 4.7) / 2, 0.9, 0.012, Math.abs(-4.7 - (h.z - r)), WATER, { glow: 0.6 });
    }
  }
  const fountains = hazards.filter((h) => h.kind === 'swamp').map((h) => h.x);

  // módulos do fundo
  const kinds: Module[] = ['wall', 'halfpipe', 'trees', 'ramps', 'wall', 'trees', 'halfpipe', 'ramps'];
  let k = 0;
  for (let cx = ctx.x0 + 6; cx < ctx.x1; cx += 12, k++) {
    if (inArena(cx, 6) || fountains.some((fx) => Math.abs(fx - cx) < 6)) continue;
    switch (kinds[(k + rng.int(0, 1)) % kinds.length]!) {
      case 'halfpipe':
        halfPipe(ctx, cx);
        break;
      case 'wall':
        graffitiWall(ctx, cx, rng.range(6, 9));
        break;
      case 'ramps':
        ramps(ctx, cx);
        break;
      case 'trees':
        tree(p, rng, cx - 2.6, -6.8);
        tree(p, rng, cx + 2.3, -8.2);
        parkBench(p, cx, -5.5);
        break;
    }
  }

  // postes
  for (let lx = ctx.x0 + 4; lx < ctx.x1; lx += rng.range(14, 18))
    if (!inArena(lx)) lamppost(ctx, lx, z0 - 1.5, 0xffd8a0, 4, 13);

  // skates, latas e cones largados
  for (let i = 0; i < ctx.dense(46); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    if (inArena(x, 3)) continue;
    const z = rng.chance(0.65) ? rng.range(-5.6, z0 - 0.9) : rng.range(z1 + 0.9, z1 + 2.6);
    const yaw = rng.range(0, Math.PI);
    switch (rng.int(0, 2)) {
      case 0:
        p.box(x, 0.09, z, 0.8, 0.035, 0.2, rng.pick(TAGS), { rot: [0, yaw, 0] });
        break;
      case 1:
        p.cyl(x, 0.04, z, 0.035, 0.035, 0.12, rng.pick([0xc8ccd4, 0xb02a2a, 0x2a6ab0]), 6, {
          rot: [H, yaw, 0],
          noShadow: true,
        });
        break;
      default:
        p.cone(x, 0.16, z, 0.16, 0.6, CONE, 6, { rot: [0, yaw, H] });
        break;
    }
  }
  // moitas baixas na frente
  for (let i = 0; i < ctx.dense(26); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    if (inArena(x, 3)) continue;
    p.ico(x, 0.25, rng.range(z1 + 1.7, z1 + 3), rng.range(0.3, 0.5), rng.pick(GRASS), { jitter: 0.15 });
  }

  silhouetteRow(ctx, -14, 0x101a16, 5, 9, 3.4, 'trees');
  silhouetteRow(ctx, -26, 0x12162c, 10, 22, 8, 'city');
  silhouetteRow(ctx, -40, 0x0d1022, 16, 32, 11, 'city');

  if (arena) bridge(ctx, arena[0], arena[1], ctx.level.boss?.zBand ?? ctx.zBand);
}

// ---------------------------------------------------------------------------
// obstáculos e perigos
// ---------------------------------------------------------------------------

function cones(p: Pieces, x: number, z: number, d: number): void {
  const n = Math.max(2, Math.round(d / 0.5));
  for (let i = 0; i < n; i++) {
    const zc = z - d / 2 + ((i + 0.5) * d) / n;
    p.box(x, 0.02, zc, 0.36, 0.04, 0.36, CONE);
    p.cone(x, 0.32, zc, 0.15, 0.6, CONE, 6);
    p.cyl(x, 0.34, zc, 0.075, 0.095, 0.1, 0xf0f0f0, 6, { noShadow: true });
  }
}

function rail(p: Pieces, x: number, z: number, w: number): void {
  p.cyl(x, 0.55, z, 0.045, 0.045, w, STEEL, 6, { rot: [0, 0, H] });
  for (const dx of [-0.45, 0, 0.45]) p.box(x + dx * w, 0.27, z, 0.06, 0.55, 0.06, STEEL_D);
}

/** Banco de concreto, sem encosto. */
function slab(p: Pieces, x: number, z: number, w: number, d: number): void {
  p.box(x, 0.22, z, w * 0.8, 0.44, d * 0.7, CONCRETE_D);
  p.box(x, 0.48, z, w, 0.08, d, CONCRETE);
}

function trashFire(ctx: EnvCtx, x: number, z: number): void {
  const { p } = ctx;
  p.cyl(x, 0.45, z, 0.32, 0.3, 0.9, 0x3a3e46, 9);
  p.cyl(x, 0.9, z, 0.3, 0.3, 0.04, 0xff5a10, 9, { glow: 2.4 });
  p.cone(x, 1.2, z, 0.2, 0.6, 0xff6a1a, 5, { glow: 3 });
  p.cone(x + 0.1, 1.1, z + 0.05, 0.11, 0.4, 0xffd07a, 5, { glow: 4 });
  ctx.light(x, 1.2, z + 0.4, 0xff8a3c, 9, 7, 0.8);
}

function puddle(ctx: EnvCtx, x: number, z: number, r: number): void {
  const { p, rng } = ctx;
  p.cyl(x, 0.01, z, r, r, 0.014, WATER, 16, { glow: 0.65 });
  for (let i = 0; i < 5; i++)
    p.box(
      x + rng.range(-r, r) * 0.6,
      0.02,
      z + rng.range(-r, r) * 0.6,
      rng.range(0.4, 1),
      0.006,
      0.05,
      0x8ab8e8,
      {
        glow: 0.6,
      },
    );
}

function fountain(ctx: EnvCtx, x: number, z: number): void {
  const { p } = ctx;
  p.cyl(x, 0.25, z, 1.9, 2, 0.5, CONCRETE, 14);
  p.cyl(x, 0.52, z, 1.7, 1.7, 0.03, 0x1a5a8a, 14, { glow: 0.9 });
  p.cyl(x, 1, z, 0.22, 0.3, 1.1, CONCRETE_D, 8);
  p.cyl(x, 1.6, z, 0.8, 0.3, 0.2, CONCRETE, 10);
  p.cyl(x, 1.72, z, 0.7, 0.7, 0.03, 0x1a5a8a, 10, { glow: 0.9 });
  for (const [dx, dz] of [
    [0.6, 0],
    [-0.6, 0],
    [0, 0.6],
  ] as const)
    p.box(x + dx, 1.15, z + dz, 0.05, 1.1, 0.05, 0x9ad8ff, { glow: 1.4 });
  ctx.light(x, 1.4, z + 1.4, 0x6ac8ff, 6, 9, 0.25);
}

// ---------------------------------------------------------------------------
// módulos do fundo
// ---------------------------------------------------------------------------

/** Half-pipe visto de lado: o fundo reto e duas curvas de quatro placas cada. */
function halfPipe(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = -7.2;
  const depth = 3.2;
  const R = 2;
  const flat = 1.5;
  p.box(x, 0.06, z, flat * 2, 0.12, depth, CONCRETE);
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const a = ((k + 0.5) * H) / 4;
      p.box(
        x + dir * (flat + R * Math.sin(a)),
        R - R * Math.cos(a) + 0.06,
        z,
        R * 0.42,
        0.12,
        depth,
        k % 2 ? CONCRETE : CONCRETE_D,
        { rot: [0, 0, dir * a] },
      );
    }
    const px = x + dir * (flat + R + 0.6);
    p.box(px, R / 2, z, 1.1, R, depth - 0.2, 0x3a3a42);
    p.box(px, R + 0.06, z, 1.2, 0.12, depth, CONCRETE_D);
    p.cyl(x + dir * (flat + R), R + 0.14, z, 0.045, 0.045, depth, STEEL, 6, { rot: [H, 0, 0] });
    p.box(px, R * 0.55, z + depth / 2 - 0.08, 0.8, 0.5, 0.03, rng.pick(TAGS), { glow: 1.4 });
  }
}

function graffitiWall(ctx: EnvCtx, x: number, w: number): void {
  const { p, rng } = ctx;
  const z = -6.6;
  p.box(x, 1.3, z, w, 2.6, 0.3, CONCRETE, { jitter: 0.1 });
  p.box(x, 2.65, z, w + 0.2, 0.12, 0.4, CONCRETE_D);
  let c = rng.pick(TAGS);
  for (let tx = x - w / 2 + 0.8; tx < x + w / 2 - 0.6; tx += rng.range(0.9, 1.6)) {
    const tw = rng.range(0.5, 1.1);
    const th = rng.range(0.4, 1.1);
    const ty = rng.range(0.8, 1.9);
    if (rng.chance(0.4)) c = rng.pick(TAGS);
    p.box(tx, ty, z + 0.16, tw, th, 0.02, c, { glow: rng.range(1, 1.8), rot: [0, 0, rng.range(-0.3, 0.3)] });
    if (rng.chance(0.5)) p.box(tx, ty - th / 2 - 0.2, z + 0.16, 0.05, 0.4, 0.02, c, { glow: 1 });
  }
  ctx.light(x, 1.5, z + 1.4, c, 4, 7, 0.15);
}

function ramps(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  // rampa de salto
  p.box(x - 2.6, 0.42, -6.4, 2.3, 0.1, 1.8, CONCRETE, { rot: [0, 0, 0.32] });
  p.box(x - 1.62, 0.36, -6.4, 0.16, 0.72, 1.8, CONCRETE_D);
  // caixote com corrimão
  p.box(x + 1.4, 0.3, -6.7, 2.6, 0.6, 1.6, CONCRETE_D);
  p.cyl(x + 1.4, 0.95, -6.7, 0.045, 0.045, 2.4, STEEL, 6, { rot: [0, 0, H] });
  for (const dx of [-1, 1]) p.box(x + 1.4 + dx, 0.78, -6.7, 0.06, 0.36, 0.06, STEEL_D);
  p.box(x + 1.4, 0.35, -5.88, 1.2, 0.4, 0.03, rng.pick(TAGS), { glow: 1.3 });
  p.cone(x - 0.4, 0.32, -5.6, 0.15, 0.6, CONE, 6);
}

function tree(p: Pieces, rng: Rng, x: number, z: number): void {
  const h = rng.range(2.2, 3);
  p.cyl(x, h / 2, z, 0.12, 0.18, h, 0x3a2a1c, 6);
  p.ico(x, h + 0.7, z, rng.range(1.1, 1.4), rng.pick(GRASS), { jitter: 0.12 });
  p.ico(x + 0.5, h + 1.4, z - 0.2, rng.range(0.7, 0.95), rng.pick(GRASS), { jitter: 0.12 });
}

function parkBench(p: Pieces, x: number, z: number): void {
  p.box(x, 0.45, z, 1.6, 0.07, 0.45, WOOD);
  p.box(x, 0.8, z - 0.22, 1.6, 0.4, 0.06, WOOD);
  for (const dx of [-0.65, 0.65]) p.box(x + dx, 0.22, z, 0.08, 0.44, 0.4, STEEL_D);
}

// ---------------------------------------------------------------------------
// arena do chefe
// ---------------------------------------------------------------------------

/** Ponte de madeira sobre o lago: o tabuleiro cobre a faixa da luta; guarda-corpo alto atrás e baixo na frente. */
function bridge(ctx: EnvCtx, x0: number, x1: number, band: [number, number]): void {
  const { p, rng } = ctx;
  const len = x1 - x0;
  const mid = (x0 + x1) / 2;
  const dz0 = band[0] - 0.25;
  const dz1 = band[1] + 0.25;
  const zc = (dz0 + dz1) / 2;
  const depth = dz1 - dz0;

  // lago, reflexos e vitórias-régias (tudo rente ao chão, abaixo dos avisos de golpe)
  p.box(mid, 0.004, -2, len + 4, 0.008, 22, WATER, { glow: 0.5 });
  for (let i = 0; i < ctx.dense(50); i++) {
    const x = rng.range(x0 - 1.5, x1 + 1.5);
    const z = rng.chance(0.5) ? rng.range(-12, dz0 - 0.4) : rng.range(dz1 + 0.4, 8);
    if (rng.chance(0.7)) p.box(x, 0.012, z, rng.range(0.4, 1.4), 0.004, 0.05, 0x8ab8e8, { glow: 0.6 });
    else p.cyl(x, 0.012, z, 0.22, 0.22, 0.008, rng.pick(GRASS), 7, { noShadow: true });
  }
  // margens
  for (const sx of [x0 - 2.2, x1 + 2.2]) p.box(sx, 0.05, -2, 0.5, 0.1, 22, CONCRETE_D, { jitter: 0.1 });

  // tabuleiro
  for (let x = x0 - 2, i = 0; x < x1 + 2; x += 0.5, i++)
    p.box(x + 0.25, 0.014, zc, 0.47, 0.02, depth, i % 2 ? WOOD : WOOD_D, { noShadow: true });
  // estacas dentro d'água
  for (let x = x0; x <= x1; x += 5.5) p.cyl(x, 0.01, dz1 + 0.35, 0.16, 0.16, 0.1, WOOD_D, 7);

  // guarda-corpos e cordão de lâmpadas
  const zb = dz0 - 0.06;
  const zf = dz1 + 0.06;
  p.box(mid, 1, zb, len + 4, 0.08, 0.08, WOOD);
  p.box(mid, 0.55, zb, len + 4, 0.06, 0.06, WOOD_D);
  p.box(mid, 0.42, zf, len + 4, 0.07, 0.07, WOOD);
  for (let x = x0 - 2; x <= x1 + 2; x += 2) {
    p.box(x, 0.5, zb, 0.1, 1, 0.1, WOOD_D);
    p.box(x, 0.21, zf, 0.09, 0.42, 0.09, WOOD_D);
  }
  for (let x = x0 - 1.5, i = 0; x < x1 + 1.5; x += 1, i++)
    p.sphere(x, 1.12, zb, 0.07, TAGS[i % TAGS.length]!, { glow: 2.6 });

  // pórticos das cabeceiras
  for (const sx of [x0 - 1.2, x1 + 1.2]) {
    p.box(sx, 2.3, zb - 0.3, 0.45, 4.6, 0.45, CONCRETE_D);
    p.box(sx, 4.7, zb - 0.3, 0.7, 0.2, 0.7, CONCRETE);
    p.sphere(sx, 4.95, zb - 0.3, 0.2, 0xffe8c0, { glow: 3 });
  }
  ctx.light(mid - 6, 2.4, zc - 0.5, 0x3affc8, 8, 12, 0.2);
  ctx.light(mid + 6, 2.4, zc - 0.5, 0xff3ad7, 8, 12, 0.2);
  ctx.light(mid, 3.2, zc + 1, 0xdfe6ff, 9, 14, 0.1);
}
