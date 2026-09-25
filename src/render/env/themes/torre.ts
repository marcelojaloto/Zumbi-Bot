import type { EnvCtx, Pieces } from '../builder';
import { barrel, crate, rock, torch } from '../props';

const H = Math.PI / 2;
const STONE = 0x5e5449;
const STONE_L = 0x6e6356;
const STONE_D = 0x40382f;
const WOOD = 0x5a3d24;
const WOOD_D = 0x33231a;
const BRONZE = 0x8a6434;
const BRONZE_D = 0x5e4426;
const BELL = 0x7a5a2c;
const BELL_L = 0xa8803e;
const IRON = 0x2e2a28;
const MOON = 0x9fb4ff;
const GLASS = 0x7f98e0;
const TORCH = 0xff8a3c;
const WALL_Z = -6.5;
const BAY = 8;

type Bay = 'window' | 'cogs' | 'stairs' | 'gallery' | 'hearth' | 'arena';

/**
 * Interior da torre: salões de pedra com pilastras, vitrais góticos com fachos de luar,
 * engrenagens gigantes, escadaria em caracol, galerias de madeira, correntes, tochas e,
 * na arena do chefe, o mostrador do relógio iluminado por trás e os sinos.
 */
export function torreTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  ctx.wall = { kind: 'stone', c1: 0x564c42, c2: 0x3a332c, z: WALL_Z, h: 10 };

  // perigos do nível → janelas abertas (rajadas) e teto rachado (destroços)
  const gusts: number[] = [];
  const debris: number[] = [];
  for (const s of ctx.level.segments)
    for (const h of s.hazards ?? []) {
      if (h.kind === 'gust') gusts.push(h.x);
      if (h.kind === 'debris') debris.push(h.x);
    }
  const arena = ctx.level.boss ? ctx.level.boss.lock : null;

  // rodapé de pedra junto à parede e meio-fio na frente
  for (let x = ctx.x0; x < ctx.x1; x += 1.2) {
    p.box(x, 0.18, WALL_Z + 0.2, 1.15, 0.36, 0.4, rng.pick([STONE_D, 0x463d34]), { jitter: 0.1 });
    p.box(x, 0.03, z0 - 0.75, 1.15, 0.06, 0.7, rng.pick([0x3a332c, 0x352f29, 0x40382f]), {
      noShadow: true,
      jitter: 0.12,
    });
    p.box(x, 0.05, z1 + 0.75, 1.15, 0.1, 0.3, 0x3a332c, { noShadow: true });
  }

  // cornija no alto da parede
  p.box((ctx.x0 + ctx.x1) / 2, 4.95, WALL_Z + 0.25, ctx.x1 - ctx.x0, 0.3, 0.5, STONE_D, { noShadow: true });

  // baias entre pilastras
  let k = 0;
  let prev: Bay | null = null;
  const kinds: Bay[] = ['window', 'cogs', 'gallery', 'window', 'stairs', 'hearth', 'window', 'cogs'];
  for (let px = ctx.x0; px < ctx.x1; px += BAY, k++) {
    pillar(ctx, px);
    const cx = px + BAY / 2;
    let kind: Bay = kinds[(k + rng.int(0, 1)) % kinds.length]!;
    if (kind === prev) kind = kinds[(k + 2) % kinds.length]!;
    if (gusts.some((g) => Math.abs(g - cx) < BAY / 2)) kind = 'window';
    if (arena && cx > arena[0] - 1 && cx < arena[1] + 3) kind = 'arena';
    prev = kind;
    switch (kind) {
      case 'window':
        lancet(ctx, cx - 1.35, 1.25);
        lancet(ctx, cx + 1.35, 1.25);
        if (rng.chance(0.5)) chain(p, cx + rng.range(-3, 3), -4.6, 6, rng.range(2.6, 3.4), rng.int(0, 2));
        break;
      case 'cogs':
        clockwork(ctx, cx);
        break;
      case 'stairs':
        spiralStairs(p, cx);
        break;
      case 'gallery':
        gallery(ctx, cx, BAY - 1);
        banner(p, cx, 0x6e1c1c);
        break;
      case 'hearth':
        hearth(ctx, cx);
        break;
      case 'arena':
        break;
    }
    // entulho e objetos junto à parede (fora das janelas, para não cobrir o luar)
    if (kind !== 'window' && kind !== 'arena' && kind !== 'stairs') {
      for (let i = 0; i < ctx.dense(2); i++) {
        const bx = cx + rng.range(-3, 3);
        if (rng.chance(0.55)) crate(p, bx, 0, rng.range(-5.6, -4.4), rng.range(0.6, 0.9), 0x5a4028);
        else barrel(p, bx, rng.range(-5.4, -4.3), 0x4a3a2a);
      }
    }
  }

  if (arena) bossArena(ctx, (arena[0] + arena[1]) / 2);

  // teto rachado: pilhas de entulho e poeira de pedra onde caem destroços
  for (const dx of debris) {
    for (let i = 0; i < ctx.dense(7); i++)
      rock(
        p,
        rng,
        dx + rng.range(-6, 6),
        rng.chance(0.6) ? rng.range(-5.4, z0 - 0.9) : rng.range(z1 + 1, z1 + 2.6),
        0.55,
        STONE,
      );
    chain(p, dx + rng.range(-2, 2), -4.3, 6, 3.2, 1);
  }

  // correntes penduradas pelo salão
  for (let i = 0; i < ctx.dense(10); i++) {
    const cx = rng.range(ctx.x0, ctx.x1);
    if (arena && cx > arena[0] - 2 && cx < arena[1] + 2) continue;
    chain(p, cx, rng.range(-5.2, -4.2), 6, rng.range(2.4, 3.8), rng.int(0, 2));
  }

  // velas no chão junto à parede
  for (let i = 0; i < ctx.dense(16); i++)
    candles(p, rng.range(ctx.x0, ctx.x1), rng.range(-5.9, -4.2), rng.int(2, 4), rng.next());

  // pedras soltas e entulho baixo nas bordas da pista
  for (let i = 0; i < ctx.dense(26); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.55) ? rng.range(-5.8, z0 - 0.8) : rng.range(z1 + 1.1, z1 + 3.2);
    rock(p, rng, x, z, rng.range(0.25, 0.5), rng.pick([STONE, STONE_D, 0x4e463c]));
  }

  // primeiro plano: balaustrada baixa de pedra com vãos (não cobre os pés dos personagens)
  for (let bx = ctx.x0; bx < ctx.x1;) {
    const len = rng.range(4, 9);
    if (rng.chance(0.6)) balustrade(p, bx, bx + len, z1 + 1.7);
    bx += len + rng.range(3, 7);
  }
}

// ---------------------------------------------------------------------------
// peças
// ---------------------------------------------------------------------------

function pillar(ctx: EnvCtx, x: number): void {
  const p = ctx.p;
  p.box(x, 5, WALL_Z + 0.35, 0.95, 10, 0.75, STONE, { jitter: 0.06 });
  p.box(x, 0.35, WALL_Z + 0.5, 1.25, 0.7, 1.05, STONE_D);
  p.box(x, 3.7, WALL_Z + 0.55, 1.12, 0.22, 0.95, STONE_L);
  torch(ctx, x, 2.5, WALL_Z + 0.95, TORCH);
}

/** Vitral gótico (lanceta) com caixilhos, moldura de pedra e fachos de luar no chão. */
function lancet(ctx: EnvCtx, x: number, w: number): void {
  const p = ctx.p;
  const y0 = 1.55;
  const y1 = 3.85;
  const h = y1 - y0;
  const gz = WALL_Z + 0.05;
  const d = w / Math.SQRT2;
  p.box(x, (y0 + y1) / 2, gz, w, h, 0.04, GLASS, { glow: 0.5 });
  p.box(x, y1, gz, d, d, 0.04, GLASS, { glow: 0.5, rot: [0, 0, Math.PI / 4] });
  // caixilhos de chumbo
  p.box(x, (y0 + y1 + w / 2) / 2, gz + 0.03, 0.05, h + w / 2, 0.05, IRON, { noShadow: true });
  for (const yy of [y0 + 0.75, y0 + 1.5]) p.box(x, yy, gz + 0.03, w, 0.04, 0.05, IRON, { noShadow: true });
  p.part('torus', [0.2, 0.035, 4, 10], x, y1 + 0.2, gz + 0.03, IRON, { noShadow: true });
  // moldura
  for (const sx of [-1, 1]) {
    p.box(x + sx * (w / 2 + 0.13), (y0 + y1) / 2, gz + 0.12, 0.26, h, 0.3, STONE_L);
    p.box(x + sx * (w / 4 + 0.09), y1 + w / 4 + 0.09, gz + 0.12, d + 0.36, 0.24, 0.3, STONE_L, {
      rot: [0, 0, -sx * (Math.PI / 4)],
    });
  }
  p.box(x, y0 - 0.1, gz + 0.22, w + 0.6, 0.2, 0.5, STONE_D);
  // luar: mancha no chão e raios inclinados
  p.box(x + 0.35, 0.012, -3.4, w * 0.95, 0.012, 3.3, MOON, { glow: 0.11, rot: [0, 0.16, 0] });
  // poeira cintilando no facho (sugere o raio de luz sem cobrir o fundo)
  for (let i = 0; i < 14; i++) {
    const t = ctx.rng.next();
    p.ico(
      x + ctx.rng.range(-w / 2, w / 2) + t * 0.3,
      3.3 - t * 3.0,
      -6.2 + t * 2.9 + ctx.rng.range(-0.3, 0.3),
      ctx.rng.range(0.012, 0.028),
      0xd8e4ff,
      { glow: 2.2 },
    );
  }
  ctx.light(x, 2.4, -4.6, MOON, 4, 8, 0);
}

function gear(p: Pieces, cx: number, cy: number, z: number, r: number, color: number): void {
  p.part('torus', [r, 0.15, 5, Math.max(12, Math.round(r * 16))], cx, cy, z, color);
  const n = Math.max(8, Math.round(r * 9));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    p.box(cx + Math.cos(a) * (r + 0.17), cy + Math.sin(a) * (r + 0.17), z, 0.24, 0.2, 0.2, color, {
      rot: [0, 0, a],
    });
  }
  for (let i = 0; i < 3; i++)
    p.box(cx, cy, z - 0.02, 0.12, r * 2, 0.1, BRONZE_D, { rot: [0, 0, (i * Math.PI) / 3 + 0.3] });
  p.cyl(cx, cy, z + 0.06, 0.24, 0.24, 0.32, IRON, 8, { rot: [H, 0, 0] });
}

/** Mecanismo do relógio: engrenagens encaixadas e pêndulo. */
function clockwork(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const bx = x - 1.3;
  const by = 3.1;
  gear(p, bx, by, WALL_Z + 0.25, 1.7, BRONZE);
  const a1 = -0.6;
  const sx = bx + Math.cos(a1) * 2.8;
  const sy = by + Math.sin(a1) * 2.8;
  gear(p, sx, sy, WALL_Z + 0.45, 0.9, 0x7a5a36);
  const a2 = 0.9;
  gear(p, sx + Math.cos(a2) * 1.7, sy + Math.sin(a2) * 1.7, WALL_Z + 0.3, 0.6, BRONZE_D);
  // pêndulo
  const tilt = rng.range(-0.25, 0.25);
  p.box(x + 2.9, 3.4, -5.6, 0.06, 2.8, 0.06, IRON, { rot: [0, 0, tilt] });
  p.cyl(x + 2.9 + Math.sin(tilt) * 1.4, 2.0, -5.6, 0.34, 0.34, 0.08, BRONZE, 12, { rot: [H, 0, tilt] });
  // eixo horizontal
  p.cyl(x, 4.55, WALL_Z + 0.6, 0.08, 0.08, BAY - 1, IRON, 6, { rot: [0, 0, H] });
}

/** Escadaria em caracol ao fundo. */
function spiralStairs(p: Pieces, x: number): void {
  const cz = -5.15;
  p.cyl(x, 5, cz, 0.26, 0.3, 10, STONE_L, 8);
  for (let i = 0; i < 34; i++) {
    const a = i * 0.46 + 0.4;
    const y = 0.15 + i * 0.16;
    const c = i % 2 ? STONE : 0x6a5e50;
    p.box(x + Math.cos(a) * 0.72, y, cz + Math.sin(a) * 0.72, 1.05, 0.1, 0.42, c, { rot: [0, -a, 0] });
    if (i % 2 === 0)
      p.cyl(x + Math.cos(a) * 1.2, y + 0.45, cz + Math.sin(a) * 1.2, 0.025, 0.025, 0.9, IRON, 4);
  }
}

/** Galeria de madeira apoiada em mãos-francesas. */
function gallery(ctx: EnvCtx, x: number, w: number): void {
  const { p, rng } = ctx;
  const y = 3.25;
  p.box(x, y, -5.85, w, 0.18, 1.1, WOOD);
  p.box(x, y - 0.18, -5.35, w, 0.2, 0.2, WOOD_D);
  for (let bx = x - w / 2 + 0.6; bx < x + w / 2; bx += 2.2)
    p.box(bx, y - 0.65, -5.95, 0.12, 1.2, 0.12, WOOD_D, { rot: [-0.62, 0, 0] });
  for (let px = x - w / 2 + 0.15; px <= x + w / 2; px += 0.45)
    p.box(px, y + 0.42, -5.35, 0.06, 0.7, 0.06, WOOD_D, { noShadow: true });
  p.box(x, y + 0.8, -5.35, w, 0.08, 0.1, WOOD);
  p.box(x, y + 0.3, -5.35, w, 0.05, 0.08, WOOD);
  for (const sx of [-1, 1]) p.box(x + sx * (w / 2 - 0.3), y / 2, -5.4, 0.22, y, 0.22, WOOD_D);
  // barris e caixas na galeria
  for (let i = 0; i < 2; i++) {
    const gx = x + rng.range(-w / 2 + 0.8, w / 2 - 0.8);
    if (rng.chance(0.5)) barrel(p, gx, -6.0, 0x4a3a2a, y + 0.09);
    else crate(p, gx, y + 0.09, -6.0, 0.6, 0x5a4028);
  }
}

function banner(p: Pieces, x: number, color: number): void {
  const z = WALL_Z + 0.08;
  p.box(x, 4.35, z + 0.05, 1.2, 0.06, 0.06, IRON);
  p.box(x, 3.15, z, 0.95, 2.35, 0.03, color);
  p.box(x, 4.2, z + 0.02, 0.95, 0.08, 0.03, 0xc8a040);
  p.box(x, 2.0, z + 0.02, 0.95, 0.08, 0.03, 0xc8a040);
  p.cyl(x, 3.3, z + 0.03, 0.22, 0.22, 0.02, 0xc8a040, 10, { rot: [H, 0, 0] });
  p.box(x - 0.24, 1.85, z, 0.47, 0.3, 0.03, color, { rot: [0, 0, 0.5] });
  p.box(x + 0.24, 1.85, z, 0.47, 0.3, 0.03, color, { rot: [0, 0, -0.5] });
}

/** Lareira de pedra com brasas. */
function hearth(ctx: EnvCtx, x: number): void {
  const p = ctx.p;
  const z = WALL_Z + 0.55;
  p.box(x, 1.2, z, 3.2, 2.4, 1.1, STONE_L, { jitter: 0.06 });
  p.box(x, 0.95, z + 0.3, 2.2, 1.6, 0.6, 0x120c08);
  p.box(x, 2.5, z + 0.1, 3.6, 0.25, 1.3, STONE_D);
  p.box(x, 3.6, z - 0.1, 2.4, 2.2, 0.8, STONE, { jitter: 0.06 });
  for (let i = 0; i < 3; i++) {
    p.box(x - 0.5 + i * 0.5, 0.12, z + 0.45, 0.6, 0.12, 0.14, WOOD_D, { rot: [0, 0.4 * (i - 1), 0] });
    p.cone(x - 0.4 + i * 0.4, 0.45, z + 0.45, 0.16, 0.6, 0xff7a2a, 5, { glow: 3 });
  }
  p.box(x, 0.1, z + 0.45, 1.5, 0.08, 0.4, 0xff4a1a, { glow: 2 });
  ctx.light(x, 0.8, z + 1.4, TORCH, 10, 9, 0.9);
  banner(p, x - 3.2 + 1.1, 0x2a3a6a);
}

/** Corrente pendurada (elos alternados) com gancho, contrapeso ou gaiola. */
function chain(p: Pieces, x: number, z: number, yTop: number, yBot: number, end: number): void {
  let i = 0;
  for (let y = yTop; y > yBot; y -= 0.12, i++)
    p.part('torus', [0.065, 0.018, 4, 8], x, y, z, IRON, { rot: [0, i % 2 ? H : 0, 0], noShadow: true });
  if (end === 0) {
    p.part('torus', [0.14, 0.03, 4, 10], x, yBot - 0.12, z, IRON, { rot: [0, 0, 0] });
  } else if (end === 1) {
    p.box(x, yBot - 0.3, z, 0.45, 0.5, 0.45, STONE_D);
  } else {
    // gaiola com lanterna
    p.cyl(x, yBot - 0.45, z, 0.28, 0.28, 0.04, IRON, 8);
    p.cyl(x, yBot - 1.1, z, 0.3, 0.3, 0.05, IRON, 8);
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      p.box(x + Math.cos(ang) * 0.28, yBot - 0.78, z + Math.sin(ang) * 0.28, 0.03, 0.66, 0.03, IRON);
    }
    p.sphere(x, yBot - 0.8, z, 0.12, 0xffb050, { glow: 2.5 });
  }
}

function candles(p: Pieces, x: number, z: number, n: number, seed: number): void {
  for (let i = 0; i < n; i++) {
    const cx = x + Math.cos(seed * 9 + i * 2.1) * 0.18;
    const cz = z + Math.sin(seed * 7 + i * 2.1) * 0.12;
    const h = 0.1 + ((seed * 13 + i * 0.37) % 1) * 0.18;
    p.cyl(cx, h / 2, cz, 0.035, 0.04, h, 0xe8dcc0, 5, { noShadow: true });
    p.sphere(cx, h + 0.04, cz, 0.025, 0xffc870, { glow: 3 });
  }
}

function balustrade(p: Pieces, x0: number, x1: number, z: number): void {
  const h = 0.46;
  p.box((x0 + x1) / 2, 0.06, z, x1 - x0, 0.12, 0.34, STONE_D, { noShadow: true });
  p.box((x0 + x1) / 2, h, z, x1 - x0, 0.09, 0.3, STONE_L, { noShadow: true });
  for (let x = x0 + 0.2; x < x1; x += 0.36)
    p.cyl(x, h / 2 + 0.04, z, 0.06, 0.085, h - 0.1, STONE, 6, { noShadow: true });
  for (const x of [x0, x1]) p.box(x, 0.28, z, 0.3, 0.56, 0.36, STONE_L, { noShadow: true });
}

/** Arena do chefe: mostrador do relógio aceso por trás, sinos de bronze e vigas. */
function bossArena(ctx: EnvCtx, cx: number): void {
  const { p } = ctx;
  const z = WALL_Z + 0.1;
  const cy = 2.9;
  const r = 2.25;
  // vidro do mostrador (visto por dentro: ponteiros invertidos)
  p.cyl(cx, cy, z, r, r, 0.04, 0xffc98a, 36, { glow: 0.65, rot: [H, 0, 0] });
  p.part('torus', [r + 0.08, 0.17, 6, 40], cx, cy, z + 0.08, IRON);
  p.part('torus', [r * 0.72, 0.035, 4, 32], cx, cy, z + 0.06, IRON, { noShadow: true });
  for (let i = 0; i < 6; i++)
    p.box(cx, cy, z + 0.05, 0.04, r * 2, 0.04, IRON, { rot: [0, 0, (i * Math.PI) / 6], noShadow: true });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.box(cx + Math.cos(a) * (r - 0.3), cy + Math.sin(a) * (r - 0.3), z + 0.07, 0.1, 0.34, 0.05, IRON, {
      rot: [0, 0, a + H],
      noShadow: true,
    });
  }
  const hand = (len: number, wdt: number, a: number) =>
    p.box(cx + Math.cos(a) * len * 0.45, cy + Math.sin(a) * len * 0.45, z + 0.09, len, wdt, 0.05, IRON, {
      rot: [0, 0, a],
      noShadow: true,
    });
  hand(1.25, 0.14, 0.6);
  hand(1.8, 0.08, 1.95);
  p.cyl(cx, cy, z + 0.1, 0.16, 0.16, 0.1, BRONZE, 10, { rot: [H, 0, 0] });
  ctx.light(cx, cy - 0.6, z + 1.8, 0xffc98a, 9, 13, 0.08);

  // sinos pendurados em vigas nas laterais
  for (const sx of [-1, 1]) {
    const bx = cx + sx * 6.6;
    const bz = -5.0;
    p.box(bx, 4.75, bz, 3.2, 0.3, 0.3, WOOD_D);
    p.box(bx - 1.5, 2.4, bz, 0.26, 4.8, 0.26, WOOD_D);
    p.box(bx + 1.5, 2.4, bz, 0.26, 4.8, 0.26, WOOD_D);
    // jugo de madeira e sino alargado na boca
    p.box(bx, 4.45, bz, 1.1, 0.35, 0.4, WOOD);
    p.sphere(bx, 4.02, bz, 0.4, BELL, { rot: [0, 0, 0] });
    p.cyl(bx, 3.62, bz, 0.4, 0.52, 0.8, BELL, 14);
    p.cyl(bx, 3.08, bz, 0.52, 0.86, 0.34, BELL, 14);
    p.cyl(bx, 3.5, bz, 0.47, 0.47, 0.08, BELL_L, 14);
    p.part('torus', [0.84, 0.06, 5, 20], bx, 2.92, bz, BELL_L, { rot: [H, 0, 0] });
    p.sphere(bx, 2.8, bz, 0.15, IRON);
    // corda curta com nó
    p.cyl(bx + 0.55, 3.9, bz + 0.2, 0.025, 0.025, 1.1, 0x8a7050, 4);
    p.sphere(bx + 0.55, 3.32, bz + 0.2, 0.06, 0x8a7050);
  }

  // pilhas de engrenagens caídas e velas
  for (const sx of [-1, 1]) {
    gear(p, cx + sx * 3.7, 0.5, -4.6, 0.45, BRONZE_D);
    candles(p, cx + sx * 2.8, -5.4, 4, 0.3 + sx * 0.2);
  }
}
