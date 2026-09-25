import type { Rng } from '../../../core/rng';
import type { HazardPlacement } from '../../../data/types';
import type { EnvCtx, Pieces } from '../builder';
import { barrel, lamppost } from '../props';

const RUST = 0x5a3a26;
const RUST_D = 0x3a2a1e;
const STEEL = 0x4a5048;
const STEEL_D = 0x2a2e2a;
const YELLOW = 0xe8c01a;
const BLACK = 0x141410;
const SLIME = 0x7dff3a;
const SICK = 0xb5ff5a;
const CONCRETE = 0x4a4a42;

function levelHazards(ctx: EnvCtx): HazardPlacement[] {
  const out: HazardPlacement[] = [...(ctx.level.hazards ?? [])];
  for (const s of ctx.level.segments) out.push(...(s.hazards ?? []));
  return out;
}

/** Poça tóxica brilhante (disco plano) com borda escura. */
function pool(ctx: EnvCtx, x: number, z: number, r: number, light: boolean): void {
  const p = ctx.p;
  p.cyl(x, 0.012, z, r * 1.12, r * 1.18, 0.02, 0x1e2a10, 14, { noShadow: true });
  p.cyl(x, 0.022, z, r, r, 0.02, 0x4ac01a, 14, { glow: ctx.rng.range(0.7, 0.95) });
  p.cyl(x + r * 0.2, 0.03, z - r * 0.15, r * 0.4, r * 0.4, 0.02, SLIME, 10, { glow: 0.9 });
  if (light) ctx.light(x, 0.8, z, SLIME, 6, 7, 0.2);
}

/** Placa de perigo amarela com listras pretas, num poste. */
function hazardSign(p: Pieces, x: number, z: number, h = 1.6): void {
  p.cyl(x, h / 2, z, 0.035, 0.04, h, STEEL_D, 5);
  p.box(x, h + 0.1, z + 0.04, 0.62, 0.62, 0.03, YELLOW, { rot: [0, 0, Math.PI / 4] });
  p.box(x, h + 0.1, z + 0.06, 0.5, 0.5, 0.02, BLACK, { rot: [0, 0, Math.PI / 4] });
  p.box(x, h + 0.1, z + 0.07, 0.42, 0.42, 0.02, YELLOW, { rot: [0, 0, Math.PI / 4] });
  // caveira estilizada
  p.box(x, h + 0.14, z + 0.085, 0.14, 0.12, 0.02, BLACK);
  p.box(x, h + 0.05, z + 0.085, 0.08, 0.05, 0.02, BLACK);
}

/** Painel de listras amarelo/preto (faixa de segurança). */
function stripes(p: Pieces, x0: number, x1: number, y: number, z: number, h = 0.1): void {
  let k = 0;
  for (let x = x0; x < x1; x += 0.45, k++)
    p.box(x + 0.22, y, z, 0.44, h, 0.04, k % 2 ? BLACK : YELLOW, { noShadow: true, jitter: 0.04 });
}

/** Cerca de tela (alambrado) com postes e arame farpado. */
function chainFence(p: Pieces, rng: Rng, x0: number, x1: number, z: number): void {
  const h = 2.1;
  for (let x = x0; x <= x1; x += 2.2) {
    p.cyl(x, h / 2, z, 0.04, 0.045, h, 0x6a6e66, 5);
    if (x + 2.2 > x1) break;
    const mx = x + 1.1;
    // tela em losango
    for (let k = -4; k <= 4; k++) {
      const off = k * 0.26;
      p.box(mx + off, h / 2, z, 0.015, h * 1.35, 0.015, 0x7a7e76, { rot: [0, 0, 0.72], noShadow: true });
      p.box(mx + off, h / 2, z, 0.015, h * 1.35, 0.015, 0x7a7e76, { rot: [0, 0, -0.72], noShadow: true });
    }
    // rasgo ocasional
    if (rng.chance(0.2)) p.box(mx, 0.6, z + 0.02, 0.7, 0.8, 0.02, 0x1a1e14);
  }
  const w = x1 - x0;
  p.box((x0 + x1) / 2, h, z, w, 0.04, 0.04, 0x6a6e66);
  p.box((x0 + x1) / 2, 0.08, z, w, 0.04, 0.04, 0x6a6e66);
  for (let x = x0; x < x1; x += 0.5)
    p.part('torus', [0.1, 0.012, 3, 6], x, h + 0.15, z, 0x8a8e86, {
      rot: [0, Math.PI / 2, 0],
      noShadow: true,
    });
}

/** Tubulação horizontal com flanges e suportes. */
function pipeRun(p: Pieces, x0: number, x1: number, y: number, z: number, r: number, color: number): void {
  for (let x = x0; x < x1; x += 6) {
    const len = Math.min(6, x1 - x);
    p.cyl(x + len / 2, y, z, r, r, len, color, 10, { rot: [0, 0, Math.PI / 2] });
    p.cyl(x, y, z, r * 1.25, r * 1.25, 0.14, STEEL_D, 10, { rot: [0, 0, Math.PI / 2] });
  }
  for (let x = x0 + 2; x < x1; x += 5) {
    p.box(x, y / 2, z, 0.14, y, 0.14, STEEL_D);
    p.box(x, y - r - 0.05, z, 0.5, 0.1, r * 2.2, STEEL_D);
  }
}

/** Tanque de armazenamento cilíndrico com cintas, visor verde e escada. */
function tank(ctx: EnvCtx, x: number, z: number, r: number, h: number): void {
  const p = ctx.p;
  const rng = ctx.rng;
  const col = rng.pick([0x5a6050, 0x4e5a48, 0x6a5a40, 0x505a58]);
  p.cyl(x, h / 2, z, r, r, h, col, 16, { jitter: 0.06 });
  p.cyl(x, 0.2, z, r + 0.15, r + 0.2, 0.4, CONCRETE, 16);
  for (let y = 1.2; y < h; y += 1.8) p.cyl(x, y, z, r + 0.04, r + 0.04, 0.12, STEEL_D, 16);
  p.part('sphere', [r, 12, 6], x, h - r * 0.35, z, col);
  // visor de nível brilhante
  p.box(x + r * 0.35, h * 0.4, z + r * 0.94, 0.22, h * 0.6, 0.06, SLIME, { glow: 1.4 });
  p.box(x + r * 0.35, h * 0.4, z + r * 0.96, 0.3, h * 0.6, 0.02, STEEL_D);
  // ferrugem e escada
  for (let i = 0; i < 4; i++)
    p.box(
      x + rng.range(-r * 0.6, r * 0.6),
      rng.range(0.6, h * 0.7),
      z + r * 0.93,
      rng.range(0.3, 0.9),
      rng.range(0.3, 1.2),
      0.04,
      RUST,
    );
  const lx = x - r * 0.5;
  const lz = z + r * 0.87;
  p.box(lx - 0.22, h / 2, lz, 0.05, h, 0.05, STEEL_D);
  p.box(lx + 0.22, h / 2, lz, 0.05, h, 0.05, STEEL_D);
  for (let y = 0.3; y < h; y += 0.4) p.box(lx, y, lz, 0.44, 0.04, 0.04, STEEL_D);
  // placa de perigo no tanque
  p.box(x - r * 0.1, h * 0.55, z + r * 0.99, 0.8, 0.8, 0.03, YELLOW, { rot: [0, 0, Math.PI / 4] });
  p.box(x - r * 0.1, h * 0.55, z + r * 1.0, 0.6, 0.6, 0.03, BLACK, { rot: [0, 0, Math.PI / 4] });
  p.box(x - r * 0.1, h * 0.55, z + r * 1.01, 0.3, 0.3, 0.03, SICK, { rot: [0, 0, Math.PI / 4], glow: 1.2 });
}

/** Passarela elevada com grade, guarda-corpo e pilares. */
function catwalk(p: Pieces, x0: number, x1: number, z: number, y: number): void {
  const w = x1 - x0;
  p.box((x0 + x1) / 2, y, z, w, 0.08, 1.2, 0x3a3e38);
  for (let x = x0; x < x1; x += 0.5) p.box(x, y + 0.045, z, 0.05, 0.02, 1.15, 0x24261f, { noShadow: true });
  p.box((x0 + x1) / 2, y + 1.0, z + 0.58, w, 0.05, 0.05, YELLOW);
  p.box((x0 + x1) / 2, y + 0.5, z + 0.58, w, 0.04, 0.04, 0x8a7a1a);
  for (let x = x0; x <= x1; x += 1.5) p.box(x, y + 0.5, z + 0.58, 0.05, 1.0, 0.05, 0x8a7a1a);
  for (let x = x0 + 0.5; x < x1; x += 4) {
    p.box(x, y / 2, z - 0.5, 0.12, y, 0.12, STEEL_D);
    p.box(x, y / 2, z + 0.5, 0.12, y, 0.12, STEEL_D);
    p.box(x, y * 0.5, z, 0.06, 0.06, 1.0, STEEL_D, { rot: [0.9, 0, 0] });
  }
}

/** Pilha de barris enferrujados (verdes e amarelos), às vezes vazando. */
function barrelStack(ctx: EnvCtx, x: number, z: number): void {
  const p = ctx.p;
  const rng = ctx.rng;
  const cols = [0x3a5a2a, 0x8a7a1a, 0x4a6a2a, 0x9a8a2a, RUST];
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 0.8 + rng.range(-0.1, 0.1);
    const bz = z + rng.range(-0.25, 0.25);
    barrel(p, bx, bz, rng.pick(cols));
    p.box(bx, 0.5, bz + 0.39, 0.3, 0.3, 0.02, YELLOW);
    p.box(bx, 0.5, bz + 0.4, 0.1, 0.1, 0.02, BLACK);
  }
  if (n >= 3 && rng.chance(0.5)) barrel(p, x + rng.range(-0.3, 0.3), z, rng.pick(cols), 1.0);
  if (rng.chance(0.4)) {
    // barril tombado vazando
    const lx = x + rng.range(1.2, 1.8);
    p.cyl(lx, 0.38, z + 0.3, 0.38, 0.38, 1.0, rng.pick(cols), 9, { rot: [Math.PI / 2, 0, 0.3] });
    p.cyl(lx + 0.2, 0.02, z + 1.0, 0.55, 0.6, 0.02, SLIME, 10, { glow: 1.3 });
  }
}

export function toxicaTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const cz = (z0 + z1) / 2;

  // passarela de chapas metálicas sobre o caminho
  for (let x = ctx.x0; x < ctx.x1; x += 2) {
    p.box(x + 1, 0.012, cz, 1.96, 0.02, z1 - z0 + 1.0, rng.pick([0x3a3e36, 0x363a32, 0x40443a]), {
      noShadow: true,
      jitter: 0.05,
    });
    // rebites/juntas
    p.box(x, 0.02, cz, 0.05, 0.01, z1 - z0 + 1.0, 0x22241e, { noShadow: true });
  }
  // manchas de ferrugem e graxa na passarela (planas, não atrapalham)
  for (let i = 0; i < ctx.dense(40); i++) {
    const r = rng.range(0.3, 0.9);
    p.cyl(
      rng.range(ctx.x0, ctx.x1),
      0.024,
      rng.range(z0, z1),
      r,
      r * 1.1,
      0.004,
      rng.pick([0x24261c, 0x3a2a1a, 0x2a3018]),
      9,
      {
        noShadow: true,
        jitter: 0.1,
      },
    );
  }
  // faixas de segurança nas bordas do caminho
  stripes(p, ctx.x0, ctx.x1, 0.03, z0 - 0.55);
  stripes(p, ctx.x0, ctx.x1, 0.03, z1 + 0.55);

  // tubulações ao fundo
  pipeRun(p, ctx.x0, ctx.x1, 0.7, -8.2, 0.45, RUST);
  pipeRun(p, ctx.x0, ctx.x1, 1.7, -8.9, 0.35, 0x4a5a48);
  pipeRun(p, ctx.x0, ctx.x1, 2.9, -8.4, 0.55, 0x5a5448);
  // canos verticais e válvulas
  for (let x = ctx.x0 + 4; x < ctx.x1; x += rng.range(7, 11)) {
    p.cyl(x, 3, -7.6, 0.25, 0.25, 6, rng.pick([RUST, STEEL, 0x4a5a48]), 8);
    p.cyl(x, 1.3, -7.3, 0.08, 0.08, 0.5, STEEL_D, 6, { rot: [Math.PI / 2, 0, 0] });
    p.part('torus', [0.22, 0.04, 4, 10], x, 1.3, -7.05, 0xb02a1a);
    if (rng.chance(0.5)) p.box(x, 2.2, -7.33, 0.3, 0.2, 0.05, SICK, { glow: 1.6 });
  }

  // cercas de tela entre o caminho e o fundo, com placas
  for (let x = ctx.x0; x < ctx.x1; x += rng.range(14, 20)) {
    const len = rng.range(7, 11);
    chainFence(p, rng, x, x + len, -5.4);
    hazardSign(p, x + len * 0.5, -5.3, 1.3);
  }
  for (let i = 0; i < ctx.dense(6); i++) hazardSign(p, rng.range(ctx.x0, ctx.x1), rng.range(-6.8, -6.2), 1.6);

  // passarelas elevadas
  for (let x = ctx.x0 + 6; x < ctx.x1; x += rng.range(26, 34))
    catwalk(p, x, x + rng.range(10, 16), -6.8, 3.3);

  // tanques gigantes ao fundo
  for (let x = ctx.x0 + 5; x < ctx.x1; x += rng.range(11, 15))
    tank(ctx, x, rng.range(-15, -12.5), rng.range(2.4, 3.4), rng.range(6, 9));
  // chaminés distantes com topo brilhante
  for (let x = ctx.x0; x < ctx.x1 + 20; x += rng.range(18, 26)) {
    const h = rng.range(12, 18);
    p.cyl(x, h / 2, -20, 0.8, 1.2, h, 0x2a3024, 8, { noShadow: true });
    p.cyl(x, h - 1.5, -20, 0.85, 0.85, 0.4, SICK, 8, { glow: 1.2 });
  }

  // barris e poças no fundo
  for (let x = ctx.x0 + 3; x < ctx.x1; x += rng.range(6, 10)) barrelStack(ctx, x, rng.range(-7.2, -6.2));
  let lit = 0;
  for (let i = 0; i < ctx.dense(18); i++) {
    const back = rng.chance(0.55);
    const x = rng.range(ctx.x0, ctx.x1);
    const z = back ? rng.range(-7.5, -5.9) : rng.range(z1 + 1.4, z1 + 2.2);
    pool(ctx, x, z, back ? rng.range(0.7, 1.6) : rng.range(0.5, 0.9), back && lit++ % 3 === 0);
  }

  // primeiro plano: canos no chão, barris tombados e cones (baixos)
  for (let i = 0; i < ctx.dense(8); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    p.cyl(x, 0.25, z1 + rng.range(2.4, 4), 0.22, 0.22, rng.range(3, 6), rng.pick([RUST, RUST_D, STEEL]), 8, {
      rot: [0, rng.range(-0.3, 0.3), Math.PI / 2],
    });
  }
  for (let i = 0; i < ctx.dense(8); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.range(z1 + 1.8, z1 + 4.5);
    p.cyl(x, 0.36, z, 0.36, 0.36, 0.95, rng.pick([0x3a5a2a, 0x8a7a1a, RUST]), 9, {
      rot: [Math.PI / 2, rng.range(0, 3), 0],
    });
  }
  for (let i = 0; i < ctx.dense(10); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(z1 + 1.5, z1 + 3) : rng.range(-4.9, z0 - 1.0);
    p.cone(x, 0.3, z, 0.18, 0.6, 0xff7a1a, 6);
    p.box(x, 0.02, z, 0.4, 0.04, 0.4, BLACK);
    p.cyl(x, 0.35, z, 0.12, 0.12, 0.08, 0xe8e8e8, 6);
  }
  // postes de luz de sódio
  for (let x = 4; x < ctx.x1; x += rng.range(14, 18)) lamppost(ctx, x, z0 - 1.5, 0xd8ff7a, 3.8, 9);

  // perigos: grade de ventilação e contorno das poças
  for (const h of levelHazards(ctx)) {
    if (h.kind === 'gasVent') {
      const r = (h.w ?? 2.4) / 2;
      p.cyl(h.x, 0.02, h.z, r * 0.6, r * 0.65, 0.04, STEEL_D, 10, { noShadow: true });
      for (let k = -2; k <= 2; k++)
        p.box(h.x + k * r * 0.2, 0.045, h.z, 0.05, 0.02, r * 1.0, 0x0e100c, { noShadow: true });
      p.box(h.x, 0.05, h.z - r * 0.62, r * 1.3, 0.06, 0.12, YELLOW, { noShadow: true });
      p.box(h.x, 0.05, h.z + r * 0.62, r * 1.3, 0.06, 0.12, YELLOW, { noShadow: true });
    } else if (h.kind === 'toxicPool') {
      const r = (h.w ?? 3) / 2;
      p.part('torus', [r + 0.05, 0.08, 4, 20], h.x, 0.03, h.z, 0x1e2a10, {
        rot: [Math.PI / 2, 0, 0],
        noShadow: true,
      });
      p.cyl(h.x, 0.018, h.z, r, r, 0.02, 0x3aa01a, 16, { glow: 0.8 });
      ctx.light(h.x, 0.9, h.z, SLIME, 6, 6, 0.25);
    }
  }

  // arena do chefe: aterro com tambores empilhados e grande tanque rompido
  const b = ctx.level.boss;
  if (b) {
    const ax = (b.lock[0] + b.lock[1]) / 2;
    tank(ctx, ax + 2, -9.5, 3.6, 7);
    p.box(ax + 2.5, 1.2, -5.9, 1.6, 2.4, 0.1, 0x0e120a, { rot: [0, 0, 0.2] });
    pool(ctx, ax + 2.5, -5.2, 2.2, true);
    for (const dx of [-7, -4, 5, 8]) barrelStack(ctx, ax + dx, -6.6);
    for (const dx of [-6, 6]) {
      p.cyl(ax + dx, 2.5, -6.0, 0.2, 0.25, 5, STEEL_D, 6);
      p.box(ax + dx, 5.0, -6.0, 0.6, 0.3, 0.6, 0x2a2e2a);
      p.box(ax + dx, 4.8, -5.7, 0.4, 0.1, 0.3, 0xff5a1a, { glow: 2.4 });
      ctx.light(ax + dx, 4.3, -5.4, 0xff7a2a, 5, 10, 0.5);
    }
  }
}
