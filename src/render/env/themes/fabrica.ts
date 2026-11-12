import type { EnvCtx, Pieces } from '../builder';

const H = Math.PI / 2;
const RED = 0xe8402a;
const BLUE = 0x2a7ae8;
const YELLOW = 0xffd23a;
const GREEN = 0x3ac85a;
const PINK = 0xff5ac8;
const PURPLE = 0x8a5ae8;
const CYAN = 0x3ad8e8;
const CREAM = 0xf4f0e8;
const TOY = [RED, BLUE, YELLOW, GREEN, PINK, PURPLE];
const FURS = [0xa8733c, 0xc89858, 0x7a5230];
const STEEL = 0x8a909a;
const STEEL_D = 0x3a3e48;
const BELT = 0x1e2026;
const WOOD = 0x6a4a6e;
const WARM = 0xffe8c8;
const WALL_Z = -6.5;
const MOD = 10;

type Module = 'shelves' | 'assembly' | 'blocks' | 'vats' | 'train' | 'gears' | 'arena';

/** Fábrica de brinquedos. */
export function fabricaTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  ctx.wall = { kind: 'plaster', c1: 0x5a6a8c, c2: 0x3e4a68, z: WALL_Z, h: 10 };
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;

  // rodapé listrado, friso e canos coloridos no alto da parede
  for (let x = ctx.x0, i = 0; x < ctx.x1; x += 1.2, i++)
    p.box(x + 0.6, 0.55, WALL_Z + 0.06, 1.2, 1.1, 0.12, i % 2 ? CREAM : RED, { noShadow: true });
  p.box(mid, 1.14, WALL_Z + 0.1, len, 0.08, 0.2, YELLOW, { noShadow: true });
  p.cyl(mid, 4.7, WALL_Z + 0.3, 0.14, 0.14, len, CYAN, 8, { rot: [0, 0, H], noShadow: true });
  p.cyl(mid, 5.05, WALL_Z + 0.25, 0.09, 0.09, len, PINK, 8, { rot: [0, 0, H], noShadow: true });

  // piso: faixas amarelas de segurança nas bordas da pista
  p.box(mid, 0.006, z0 - 0.35, len, 0.012, 0.12, YELLOW, { noShadow: true });
  p.box(mid, 0.006, z1 + 0.35, len, 0.012, 0.12, YELLOW, { noShadow: true });

  // perigos do nível
  const hazards = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of hazards) {
    if (h.kind === 'conveyor') beltBed(p, h.x, h.z, h.w ?? 6, h.d ?? 1.6);
    else if (h.kind === 'press') pressFrame(p, h.x, h.z, h.w ?? 1.8, h.d ?? 1.8);
  }

  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const arenaMid = arena ? (arena[0] + arena[1]) / 2 : Infinity;
  const kinds: Module[] = ['shelves', 'assembly', 'blocks', 'vats', 'shelves', 'train', 'assembly', 'gears'];
  let k = 0;
  for (let cx = ctx.x0; cx < ctx.x1; cx += MOD, k++) {
    pillar(p, cx);
    const mx = cx + MOD / 2;
    let kind: Module = kinds[(k + rng.int(0, 1)) % kinds.length]!;
    if (arena && mx > arena[0] - 4 && mx < arena[1] + 6) kind = 'arena';
    switch (kind) {
      case 'shelves':
        shelves(ctx, mx, MOD - 2);
        break;
      case 'assembly':
        assembly(ctx, mx, MOD - 2.4);
        break;
      case 'blocks':
        blockStack(ctx, mx);
        break;
      case 'vats':
        vats(ctx, mx);
        break;
      case 'train':
        train(ctx, mx, MOD - 1.4);
        break;
      case 'gears':
        gears(ctx, mx);
        break;
      case 'arena':
        break;
    }
    // luminárias de cúpula colorida
    lamp(ctx, cx + 2.5, 4.2, -4, TOY[k % TOY.length]!, true);
    lamp(ctx, cx + 7.5, 4.6, -1, TOY[(k + 3) % TOY.length]!, false);
  }
  if (arena) vitrine(ctx, arenaMid);

  // trilho no teto com brinquedos pendurados, indo para a embalagem
  p.box(mid, 5, -3.5, len, 0.12, 0.2, STEEL_D, { noShadow: true });
  for (let x = ctx.x0 + 3; x < ctx.x1; x += rng.range(5, 8)) {
    p.box(x, 4.6, -3.5, 0.03, 0.8, 0.03, STEEL, { noShadow: true });
    if (rng.chance(0.6)) teddy(p, x, 3.55, -3.5, 0.9, rng.pick(FURS));
    else gift(p, x, 3.7, -3.5, 0.5, rng.pick(TOY), CREAM);
  }

  // brinquedos espalhados pelo chão, fora da pista
  for (let i = 0; i < ctx.dense(70); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const back = rng.chance(0.6);
    const z = back ? rng.range(-4.5, z0 - 0.7) : rng.range(z1 + 0.8, z1 + 2.6);
    toy(ctx, x, 0, z, back ? rng.range(0.7, 1) : rng.range(0.5, 0.8));
  }

  // papel de presente rasgado, confete e poças de tinta
  for (let i = 0; i < ctx.dense(160); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(-5, z0 - 0.2) : rng.range(z0, z1 + 2.4);
    p.box(
      x,
      0.005 + rng.next() * 0.004,
      z,
      rng.range(0.06, 0.2),
      0.006,
      rng.range(0.05, 0.12),
      rng.pick(TOY),
      {
        noShadow: true,
        rot: [0, rng.range(0, Math.PI), 0],
      },
    );
  }
  for (let i = 0; i < ctx.dense(14); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(-4.6, z0 - 0.6) : rng.range(z1 + 0.7, z1 + 2.2);
    const r = rng.range(0.3, 0.6);
    p.cyl(x, 0.004, z, r, r, 0.006, rng.pick(TOY), 9, { noShadow: true });
  }

  // primeiro plano
  for (let x = ctx.x0 + 6; x < ctx.x1; x += rng.range(12, 20)) {
    gift(p, x, 0, z1 + 2.9, rng.range(0.5, 0.75), rng.pick(TOY), CREAM);
    if (rng.chance(0.5)) gift(p, x + 0.75, 0, z1 + 3.1, 0.4, rng.pick(TOY), YELLOW);
  }
}

// ---------------------------------------------------------------------------
// perigos
// ---------------------------------------------------------------------------

/** Leito da esteira no chão. */
function beltBed(p: Pieces, x: number, z: number, w: number, d: number): void {
  p.box(x, 0.008, z, w, 0.014, d, BELT, { noShadow: true });
  for (let bx = x - w / 2 + 0.6; bx < x + w / 2; bx += 1.2)
    p.box(bx, 0.017, z, 0.03, 0.006, d * 0.96, 0x2e3038, { noShadow: true });
  for (const s of [-1, 1]) {
    p.box(x, 0.03, z + (s * d) / 2, w + 0.3, 0.06, 0.07, STEEL, { noShadow: true });
    p.cyl(x + (s * w) / 2, 0.02, z, 0.13, 0.13, d, STEEL_D, 8, { rot: [H, 0, 0], noShadow: true });
  }
}

/** Mesa da prensa no chão, com a borda amarela, e o pórtico atrás dela, de onde o pistão desce. */
function pressFrame(p: Pieces, x: number, z: number, w: number, d: number): void {
  p.box(x, 0.01, z, w, 0.016, d, 0x2e3238, { noShadow: true });
  const zb = z - d / 2 - 0.16;
  for (const s of [-1, 1]) {
    p.box(x, 0.02, z + (s * d) / 2, w + 0.12, 0.014, 0.1, YELLOW, { noShadow: true });
    p.box(x + (s * w) / 2, 0.02, z, 0.1, 0.014, d + 0.12, YELLOW, { noShadow: true });
    p.box(x + s * (w / 2 + 0.16), 2.7, zb, 0.16, 5.4, 0.16, STEEL_D);
  }
  p.box(x, 5.3, zb, w + 0.7, 0.3, 0.3, STEEL_D);
  p.box(x, 5.3, z - 0.1, 0.5, 0.36, d + 0.4, STEEL_D);
}

// ---------------------------------------------------------------------------
// brinquedos
// ---------------------------------------------------------------------------

/** Caixa de presente com a fita em cruz e o laço. */
function gift(p: Pieces, x: number, y: number, z: number, s: number, c: number, ribbon: number): void {
  p.box(x, y + s / 2, z, s, s, s, c);
  p.box(x, y + s / 2, z, s * 0.16, s * 1.02, s * 1.02, ribbon);
  p.box(x, y + s / 2, z, s * 1.02, s * 1.02, s * 0.16, ribbon);
  p.sphere(x, y + s * 1.08, z, s * 0.14, ribbon);
}

/** Bola com uma faixa no meio. */
function ball(p: Pieces, x: number, y: number, z: number, r: number, c: number, band: number): void {
  p.sphere(x, y + r, z, r, c);
  p.cyl(x, y + r, z, r * 1.01, r * 1.01, r * 0.3, band, 10);
}

/** Bloco de montar com o rótulo claro na frente. */
function block(p: Pieces, x: number, y: number, z: number, s: number, c: number): void {
  p.box(x, y + s / 2, z, s, s, s, c);
  p.box(x, y + s / 2, z + s / 2 + 0.005, s * 0.55, s * 0.55, 0.01, CREAM);
}

/** Urso de pelúcia sentado, de frente para a pista. */
function teddy(p: Pieces, x: number, y: number, z: number, s: number, fur: number): void {
  const light = 0xe8c898;
  p.sphere(x, y + 0.22 * s, z, 0.2 * s, fur);
  p.sphere(x, y + 0.5 * s, z, 0.16 * s, fur);
  for (const d of [-1, 1]) {
    p.sphere(x + d * 0.12 * s, y + 0.64 * s, z, 0.06 * s, fur);
    p.sphere(x + d * 0.2 * s, y + 0.26 * s, z + 0.04 * s, 0.07 * s, fur);
    p.sphere(x + d * 0.12 * s, y + 0.07 * s, z + 0.16 * s, 0.08 * s, fur);
  }
  p.sphere(x, y + 0.47 * s, z + 0.13 * s, 0.07 * s, light);
  p.sphere(x, y + 0.22 * s, z + 0.15 * s, 0.1 * s, light);
}

/** Um brinquedo qualquer. */
function toy(ctx: EnvCtx, x: number, y: number, z: number, s = 1): void {
  const { p, rng } = ctx;
  const c = rng.pick(TOY);
  switch (rng.int(0, 5)) {
    case 0:
      gift(p, x, y, z, 0.5 * s, c, rng.pick(TOY));
      break;
    case 1:
      ball(p, x, y, z, 0.24 * s, c, CREAM);
      break;
    case 2:
      block(p, x, y, z, 0.42 * s, c);
      break;
    case 3:
      teddy(p, x, y, z, 0.8 * s, rng.pick(FURS));
      break;
    case 4:
      // foguete
      p.cyl(x, y + 0.3 * s, z, 0.1 * s, 0.12 * s, 0.5 * s, CREAM, 7);
      p.cone(x, y + 0.67 * s, z, 0.12 * s, 0.24 * s, c, 7);
      p.box(x, y + 0.1 * s, z, 0.4 * s, 0.16 * s, 0.04, c);
      break;
    default:
      // robozinho de lata
      p.box(x, y + 0.22 * s, z, 0.3 * s, 0.3 * s, 0.22 * s, STEEL);
      p.box(x, y + 0.48 * s, z, 0.22 * s, 0.2 * s, 0.2 * s, c);
      p.box(x, y + 0.5 * s, z + 0.11 * s, 0.14 * s, 0.04 * s, 0.02, 0xfff15a, { glow: 2.2 });
      break;
  }
}

// ---------------------------------------------------------------------------
// módulos do fundo
// ---------------------------------------------------------------------------

/** Pilar de bengala doce. */
function pillar(p: Pieces, x: number): void {
  for (let i = 0; i < 6; i++) p.box(x, 0.5 + i, -4.9, 0.5, 1, 0.5, i % 2 ? CREAM : RED);
  p.box(x, 6.15, -4.9, 0.8, 0.3, 0.8, STEEL_D);
}

/** Luminária pendente de cúpula colorida. */
function lamp(ctx: EnvCtx, x: number, y: number, z: number, color: number, lit: boolean): void {
  const p = ctx.p;
  p.box(x, y + 1.3, z, 0.02, 2.2, 0.02, 0x22262a, { noShadow: true });
  p.cone(x, y + 0.12, z, 0.34, 0.3, color, 10, { noShadow: true });
  p.sphere(x, y - 0.06, z, 0.12, 0xfff4d8, { glow: 2.6 });
  if (lit) ctx.light(x, y - 0.5, z + 0.6, WARM, 7, 10, 0.1);
}

/** Estante de madeira roxa com quatro prateleiras de brinquedos. */
function shelves(ctx: EnvCtx, x: number, w: number): void {
  const { p, rng } = ctx;
  const z = -5.7;
  p.box(x, 2.1, z - 0.3, w, 4.2, 0.1, 0x4a3a4e);
  for (const s of [-1, 1]) p.box(x + (s * w) / 2, 2.1, z, 0.12, 4.2, 0.7, WOOD);
  for (let r = 0; r < 4; r++) {
    const y = 0.5 + r * 1.05;
    p.box(x, y, z, w, 0.08, 0.7, WOOD);
    for (let tx = x - w / 2 + 0.5; tx < x + w / 2 - 0.3; tx += rng.range(0.7, 1.1))
      toy(ctx, tx, y + 0.04, z + 0.05);
  }
}

/** Linha de montagem do fundo. */
function assembly(ctx: EnvCtx, x: number, w: number): void {
  const { p, rng } = ctx;
  const z = -5.5;
  p.box(x, 0.95, z, w, 0.14, 0.9, BELT);
  p.box(x, 0.86, z + 0.47, w, 0.2, 0.06, STEEL);
  for (const s of [-1, 1]) {
    p.cyl(x + (s * w) / 2, 0.95, z, 0.16, 0.16, 0.92, STEEL_D, 8, { rot: [H, 0, 0] });
    p.box(x + s * (w / 2 - 0.4), 0.45, z, 0.12, 0.9, 0.7, STEEL_D);
  }
  for (let tx = x - w / 2 + 0.8; tx < x + w / 2 - 0.5; tx += rng.range(1.1, 1.8)) toy(ctx, tx, 1.02, z, 0.9);
  const ax = x + rng.range(-1, 1);
  const az = z - 0.75;
  p.cyl(ax, 0.3, az, 0.22, 0.28, 0.6, STEEL_D, 8);
  p.box(ax, 1.5, az, 0.2, 1.9, 0.2, YELLOW);
  p.sphere(ax, 2.5, az, 0.17, STEEL);
  p.box(ax, 2.36, az + 0.42, 0.18, 0.18, 0.95, YELLOW, { rot: [0.35, 0, 0] });
  p.box(ax, 2.12, az + 0.86, 0.34, 0.12, 0.3, STEEL_D);
  p.box(ax, 2.72, az, 0.08, 0.08, 0.08, RED, { glow: 2.5 });
}

/** Pirâmide de blocos de montar gigantes, com um urso. */
function blockStack(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = -5.5;
  const s = 1.1;
  const step = s + 0.06;
  for (let i = -1; i <= 1; i++) block(p, x + i * step, 0, z, s, rng.pick(TOY));
  for (const i of [-0.5, 0.5]) block(p, x + i * step, s, z, s, rng.pick(TOY));
  if (rng.chance(0.6)) teddy(p, x, s * 2, z, 1.6, rng.pick(FURS));
  else block(p, x, s * 2, z, s, rng.pick(TOY));
  ball(p, x + 2.5, 0, z + 0.4, 0.45, rng.pick(TOY), CREAM);
}

/** Tonéis de tinta. */
function vats(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  for (const dx of [-2.2, 0, 2.2]) {
    const c = rng.pick(TOY);
    const vx = x + dx;
    p.cyl(vx, 0.8, -5.5, 0.85, 0.75, 1.6, STEEL, 12);
    p.cyl(vx, 1.6, -5.5, 0.9, 0.9, 0.1, STEEL_D, 12);
    p.cyl(vx, 1.63, -5.5, 0.76, 0.76, 0.06, c, 12, { glow: 1.6 });
    p.cyl(vx, 3.3, -5.95, 0.1, 0.1, 3.2, STEEL_D, 6);
    p.box(vx + 0.3, 1.15, -4.66, 0.14, 0.7, 0.02, c, { noShadow: true });
    p.cyl(vx + 0.5, 0.008, -4.3, 0.45, 0.45, 0.012, c, 10, { noShadow: true });
    if (dx === 0) ctx.light(vx, 2.2, -4.6, c, 6, 8, 0.2);
  }
}

/** Trenzinho no trilho alto. */
function train(ctx: EnvCtx, x: number, w: number): void {
  const p = ctx.p;
  const z = -5.9;
  const y = 2.4;
  p.box(x, y, z, w, 0.1, 0.7, 0x6a4a3a);
  for (let tx = x - w / 2 + 0.3; tx < x + w / 2; tx += 0.5)
    p.box(tx, y + 0.07, z, 0.12, 0.05, 0.8, 0x4a3226, { noShadow: true });
  for (const s of [-1, 1]) {
    p.box(x, y + 0.11, z + s * 0.25, w, 0.05, 0.05, STEEL, { noShadow: true });
    p.box(x + s * (w / 2 - 0.6), y / 2, z, 0.16, y, 0.16, STEEL_D);
  }
  const lx = x - 1.6;
  const cy = y + 0.14;
  p.box(lx, cy + 0.3, z, 1.1, 0.5, 0.55, RED);
  p.box(lx - 0.35, cy + 0.72, z, 0.45, 0.5, 0.55, RED);
  p.cyl(lx + 0.3, cy + 0.72, z, 0.09, 0.12, 0.4, 0x14161c, 7);
  p.cyl(lx + 0.6, cy + 0.3, z, 0.2, 0.2, 0.1, YELLOW, 8, { rot: [0, 0, H] });
  p.sphere(lx + 0.67, cy + 0.3, z, 0.07, 0xfff4c0, { glow: 3 });
  for (let i = 1; i <= 2; i++) {
    const wx = lx + i * 1.35;
    p.box(wx, cy + 0.22, z, 1, 0.34, 0.55, i % 2 ? BLUE : GREEN);
    toy(ctx, wx, cy + 0.4, z, 0.7);
  }
  for (let i = 0; i < 6; i++)
    p.cyl(lx - 0.4 + i * 0.62, cy + 0.06, z + 0.29, 0.11, 0.11, 0.05, 0x14161c, 8, { rot: [H, 0, 0] });
}

/** Engrenagem de parede. */
function gear(p: Pieces, cx: number, cy: number, z: number, r: number, color: number): void {
  p.cyl(cx, cy, z, r, r, 0.14, color, 14, { rot: [H, 0, 0] });
  p.cyl(cx, cy, z + 0.05, r * 0.3, r * 0.3, 0.2, STEEL_D, 8, { rot: [H, 0, 0] });
  const teeth = Math.round(r * 9);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    p.box(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z, r * 0.24, r * 0.2, 0.14, color, { rot: [0, 0, a] });
  }
}

/** Três engrenagens coloridas na parede e caixotes de brinquedos embaixo. */
function gears(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  gear(p, x - 1.4, 2.7, WALL_Z + 0.3, 1.3, YELLOW);
  gear(p, x + 0.65, 3.6, WALL_Z + 0.26, 0.8, PINK);
  gear(p, x + 1.95, 2.4, WALL_Z + 0.3, 0.95, CYAN);
  for (const dx of [-2.6, -1.3, 0.2]) {
    p.box(x + dx, 0.45, -5.6, 1.1, 0.9, 0.9, 0x7a5a32);
    toy(ctx, x + dx, 0.9, -5.6, rng.range(0.8, 1));
  }
}

/** Arena do chefe. */
function vitrine(ctx: EnvCtx, cx: number): void {
  const { p, rng } = ctx;
  const w = 16;
  const z = WALL_Z + 0.2;
  p.box(cx, 3, z, w, 5, 0.1, 0x3a2a4e, { noShadow: true });
  p.box(cx, 5.7, z + 0.1, w + 0.8, 0.4, 0.4, YELLOW);
  p.box(cx, 0.4, z + 0.4, w + 0.8, 0.8, 0.9, WOOD);
  for (const s of [-1, 1]) p.box(cx + s * (w / 2 + 0.2), 3, z + 0.1, 0.4, 5.8, 0.4, YELLOW);
  for (let i = 0; i <= 20; i++) {
    const lx = cx - w / 2 + (i / 20) * w;
    const sag = Math.sin((i / 20) * Math.PI) * 0.35;
    p.sphere(lx, 5.3 - sag, z + 0.35, 0.09, TOY[i % TOY.length]!, { glow: 2.6 });
  }
  // prateleira
  for (let i = 0; i < 7; i++) {
    if (i === 3) continue;
    const gx = cx - 6.75 + i * 2.25;
    if (i === 1 || i === 5) gift(p, gx, 0.8, z + 0.65, 1.2, rng.pick(TOY), YELLOW);
    else block(p, gx, 0.8, z + 0.65, rng.range(0.9, 1.2), rng.pick(TOY));
  }
  teddy(p, cx - 4.5, 2, z + 0.65, 2.2, FURS[0]!);
  teddy(p, cx + 4.5, 2, z + 0.65, 2.2, FURS[1]!);
  // o trono
  p.box(cx, 1.05, z + 0.7, 2.6, 0.5, 1.1, RED);
  p.box(cx, 1.9, z + 0.25, 2.6, 1.6, 0.2, 0xa02a1e);
  p.cyl(cx, 3.2, z + 0.3, 0.12, 0.12, 1, YELLOW, 8);
  p.part('torus', [0.6, 0.15], cx - 0.66, 4.2, z + 0.3, YELLOW);
  p.part('torus', [0.6, 0.15], cx + 0.66, 4.2, z + 0.3, YELLOW);
  ctx.light(cx - 4.5, 3.2, -4.2, PINK, 9, 12, 0.2);
  ctx.light(cx + 4.5, 3.2, -4.2, CYAN, 9, 12, 0.2);
  ctx.light(cx, 4, -3.5, WARM, 10, 14, 0.1);
}
