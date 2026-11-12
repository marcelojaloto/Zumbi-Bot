import type { EnvCtx, Pieces } from '../builder';

const H = Math.PI / 2;
const FOAM = 0x2a2238;
const FOAM_L = 0x3c3252;
const BLACK = 0x121216;
const CASE = 0x1c1c22;
const STEEL = 0x8a909a;
const STEEL_D = 0x34363e;
const WOOD = 0x5a3c2a;
const GOLD = 0xc8a040;
const CREAM = 0xe8e0d8;
const PINK = 0xff3ad8;
const CYAN = 0x3ad8ff;
const PURPLE = 0x8a5ae8;
const AMBER = 0xffb02a;
const RED = 0xff2a2a;
const GREEN = 0x3aff7a;
const WARM = 0xffe8c8;
const NEON = [PINK, CYAN, PURPLE, AMBER];
const GUITARS = [0xc8202a, 0x2a7ae8, 0xe8e0d8, 0x1a1a20, 0xffb02a];
const WALL_Z = -6.5;
const MOD = 10;

type Module = 'console' | 'booth' | 'drums' | 'amps' | 'keys' | 'arena';

/** Estúdio de gravação: espuma acústica, salas de ensaio, treliça de refletores e, na arena, o palco do DJ. */
export function estudioTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const zc = (z0 + z1) / 2;
  ctx.wall = { kind: 'panel', c1: 0x2a2236, c2: 0x1a1524, z: WALL_Z, h: 10 };
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;

  // rodapé de madeira, fita de LED e o tapete da pista
  p.box(mid, 0.5, WALL_Z + 0.06, len, 1, 0.12, WOOD, { noShadow: true });
  p.box(mid, 1.04, WALL_Z + 0.1, len, 0.05, 0.08, PINK, { glow: 1.4 });
  p.box(mid, 0.004, zc, len, 0.008, z1 - z0 + 0.7, 0x3a1626, { noShadow: true });
  for (const s of [-1, 1])
    p.box(mid, 0.007, zc + s * ((z1 - z0) / 2 + 0.35), len, 0.008, 0.06, GOLD, { noShadow: true });

  const hazards = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of hazards) {
    if (h.kind === 'gust') {
      // a caixa fica do lado de onde a rajada sai
      const back = h.z < zc;
      const w = (h.w ?? 4) / 2;
      for (const s of [-0.5, 0.5])
        if (back) speaker(p, h.x + s * w, 0, -4.5, w - 0.1, 2.8, 0.9, 1, CYAN);
        else speaker(p, h.x + s * w, 0, z1 + 2.8, w - 0.1, 1.1, 0.8, -1, CYAN);
    } else if (h.kind === 'electricTile') {
      const w = h.w ?? 2;
      const d = h.d ?? 2;
      p.box(h.x, 0.012, h.z, w, 0.014, d, 0x24262c, { noShadow: true });
      for (const s of [-1, 1]) {
        p.box(h.x, 0.022, h.z + (s * d) / 2, w + 0.1, 0.012, 0.08, AMBER, { noShadow: true });
        p.box(h.x + (s * w) / 2, 0.022, h.z, 0.08, 0.012, d + 0.1, AMBER, { noShadow: true });
      }
      // o cabo solto que vem da parede
      p.box(h.x + 0.3, 0.02, (h.z + WALL_Z) / 2, 0.05, 0.03, h.z - WALL_Z, BLACK, { noShadow: true });
      p.part('torus', [0.22, 0.03], h.x - 0.4, 0.03, h.z + 0.2, BLACK, { rot: [H, 0, 0], noShadow: true });
    } else if (h.kind === 'fireJet') {
      p.cyl(h.x, 0.06, h.z, 0.2, 0.26, 0.12, STEEL_D, 10, { noShadow: true });
      p.cyl(h.x, 0.125, h.z, 0.12, 0.12, 0.02, AMBER, 10, { glow: 1.6 });
    } else if (h.kind === 'laserTrip') {
      laserPost(p, h.x, z0 - 0.7, 1.4);
      laserPost(p, h.x, z1 + 0.9, 0.8);
    }
  }

  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const arenaMid = arena ? (arena[0] + arena[1]) / 2 : Infinity;
  const kinds: Module[] = ['amps', 'console', 'drums', 'booth', 'keys', 'amps', 'booth', 'console'];
  let k = 0;
  for (let cx = ctx.x0; cx < ctx.x1; cx += MOD, k++) {
    const mx = cx + MOD / 2;
    let kind: Module = kinds[(k + rng.int(0, 1)) % kinds.length]!;
    if (arena && mx > arena[0] - 4 && mx < arena[1] + 6) kind = 'arena';
    // divisória entre as salas
    p.box(cx, 2.6, -5.6, 0.3, 5.2, 1.6, 0x241c30);
    p.box(cx, 2.6, -4.78, 0.34, 5.2, 0.06, NEON[k % NEON.length]!, { glow: 1.1 });
    if (kind !== 'arena') foam(p, mx, MOD - 1.2, k);
    switch (kind) {
      case 'console':
        mixingDesk(ctx, mx);
        break;
      case 'booth':
        booth(ctx, mx);
        break;
      case 'drums':
        drums(p, mx);
        break;
      case 'amps':
        amps(ctx, mx);
        break;
      case 'keys':
        keys(ctx, mx);
        break;
      case 'arena':
        break;
    }
    ctx.light(mx, 3.6, -2.4, WARM, 7, 10, 0.1);
  }
  if (arena) stage(ctx, arenaMid);

  // treliça com refletores e os fachos de luz
  for (const z of [-3.4, -3.9]) p.box(mid, 5.2, z, len, 0.07, 0.07, STEEL_D, { noShadow: true });
  for (let x = ctx.x0; x < ctx.x1; x += 2) p.box(x, 5.2, -3.65, 0.06, 0.06, 0.5, STEEL_D, { noShadow: true });
  let si = 0;
  for (let x = ctx.x0 + 2.5; x < ctx.x1; x += rng.range(4.5, 6.5), si++) {
    const c = NEON[si % NEON.length]!;
    p.cyl(x, 4.85, -3.65, 0.16, 0.22, 0.4, BLACK, 8, { rot: [0.35, 0, 0], noShadow: true });
    p.cyl(x, 4.64, -3.56, 0.2, 0.2, 0.03, c, 8, { rot: [0.35, 0, 0], glow: 2.4 });
    if (Math.abs(x - arenaMid) > 11)
      p.box(x + 0.4, 2.5, -4.6, 0.45, 4.6, 0.03, c, { glow: 0.09, rot: [0, 0, rng.range(-0.18, 0.18)] });
    if (si % 2 === 0) ctx.light(x, 3.4, -3, c, 5, 8, 0.25);
  }

  // cabos, folhas de repertório e copos pelo chão
  for (let i = 0; i < ctx.dense(40); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.6) ? rng.range(-4.6, z0 - 0.6) : rng.range(z1 + 0.7, z1 + 2.4);
    p.box(x, 0.012, z, rng.range(1.2, 3.6), 0.024, 0.04, BLACK, {
      noShadow: true,
      rot: [0, rng.range(-0.5, 0.5), 0],
    });
  }
  for (let i = 0; i < ctx.dense(90); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(-5, z0 - 0.2) : rng.range(z0, z1 + 2.4);
    if (rng.chance(0.7))
      p.box(x, 0.01 + rng.next() * 0.004, z, 0.21, 0.006, 0.28, CREAM, {
        noShadow: true,
        rot: [0, rng.range(0, Math.PI), 0],
      });
    else
      p.cyl(x, 0.06, z, 0.04, 0.03, 0.12, rng.pick(NEON), 6, {
        noShadow: true,
        rot: [H, rng.range(0, 3), 0],
      });
  }

  // primeiro plano: caixas de equipamento e retornos de palco
  for (let x = ctx.x0 + 6; x < ctx.x1; x += rng.range(12, 20)) {
    if (hazards.some((h) => h.kind === 'gust' && h.z >= zc && Math.abs(h.x - x) < 4)) continue;
    if (rng.chance(0.5)) flightCase(p, x, z1 + 2.9, rng.range(1, 1.5), 0.6);
    else {
      p.box(x, 0.2, z1 + 2.9, 0.9, 0.4, 0.6, CASE, { rot: [-0.35, 0, 0] });
      p.box(x, 0.24, z1 + 2.62, 0.7, 0.26, 0.02, STEEL_D, { rot: [-0.35, 0, 0], noShadow: true });
    }
  }
}

// ---------------------------------------------------------------------------
// peças
// ---------------------------------------------------------------------------

/** Caixa de som com os alto-falantes virados para `dir` (1 = para a pista, vindo do fundo). */
function speaker(
  p: Pieces,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  dir: number,
  ring: number,
): void {
  p.box(x, y + h / 2, z, w, h, d, CASE);
  const n = Math.max(1, Math.round(h / 1.3));
  const r = Math.min(w, h / n) * 0.36;
  const zf = z + dir * (d / 2 + 0.02);
  for (let i = 0; i < n; i++) {
    const cy = y + (h / n) * (i + 0.5);
    p.cyl(x, cy, zf, r, r, 0.04, 0x3a3a44, 12, { rot: [H, 0, 0], noShadow: true });
    p.cyl(x, cy, zf + dir * 0.02, r * 0.4, r * 0.4, 0.04, BLACK, 8, { rot: [H, 0, 0], noShadow: true });
    p.part('torus', [r * 0.95, 0.02], x, cy, zf + dir * 0.02, ring, { glow: 1.6 });
  }
}

function laserPost(p: Pieces, x: number, z: number, h: number): void {
  p.box(x, h / 2, z, 0.14, h, 0.14, STEEL_D);
  p.box(x, h - 0.1, z, 0.2, 0.2, 0.2, BLACK);
  p.sphere(x, h - 0.1, z + (z < 0 ? 0.11 : -0.11), 0.06, RED, { glow: 4 });
}

/** Painel de espuma acústica no alto da parede: pirâmides em grade. */
function foam(p: Pieces, x: number, w: number, seed: number): void {
  const z = WALL_Z + 0.08;
  p.box(x, 3.4, z, w, 2.2, 0.08, FOAM, { noShadow: true });
  const cols = Math.floor(w / 0.62);
  const step = w / cols;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < cols; c++)
      p.part('cone', [0.3, 0.2, 4], x - w / 2 + (c + 0.5) * step, 2.7 + r * 0.7, z + 0.14, FOAM_L, {
        rot: [H, 0, 0],
        noShadow: true,
        jitter: (seed + r + c) % 2 ? 0.14 : 0.04,
      });
}

function guitar(p: Pieces, x: number, y: number, z: number, color: number, tilt = 0): void {
  p.box(x, y, z, 0.4, 0.5, 0.08, color, { rot: [0, 0, tilt] });
  p.box(x - Math.sin(tilt) * 0.6, y + Math.cos(tilt) * 0.6, z, 0.07, 0.8, 0.05, 0x3a2a1c, {
    rot: [0, 0, tilt],
  });
  p.box(x - Math.sin(tilt) * 1.05, y + Math.cos(tilt) * 1.05, z, 0.12, 0.16, 0.05, color, {
    rot: [0, 0, tilt],
  });
}

function flightCase(p: Pieces, x: number, z: number, w: number, h: number): void {
  p.box(x, h / 2, z, w, h, 0.7, CASE);
  for (const y of [0.04, h - 0.04]) p.box(x, y, z, w + 0.04, 0.06, 0.74, STEEL);
  for (const s of [-1, 1]) p.box(x + s * (w / 2), h / 2, z, 0.05, h, 0.74, STEEL);
}

/** Pilha de amplificadores com a luz de ligado. */
function ampStack(p: Pieces, x: number, z: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const y = 0.45 + i * 0.92;
    p.box(x, y, z, 1.1, 0.9, 0.6, CASE);
    p.box(x, y - 0.05, z + 0.31, 0.96, 0.66, 0.02, 0x4a4438, { noShadow: true });
    p.box(x, y + 0.36, z + 0.31, 0.96, 0.08, 0.02, GOLD, { noShadow: true });
    p.sphere(x + 0.4, y + 0.36, z + 0.33, 0.025, RED, { glow: 4 });
  }
}

// ---------------------------------------------------------------------------
// salas do fundo
// ---------------------------------------------------------------------------

function amps(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  ampStack(p, x - 2.6, -5.6, 3);
  ampStack(p, x - 1.3, -5.6, 2);
  ampStack(p, x + 1.6, -5.6, rng.int(2, 3));
  guitar(p, x, 0.75, -5.35, rng.pick(GUITARS), 0.18);
  guitar(p, x + 3, 0.75, -5.45, rng.pick(GUITARS), -0.15);
  // pedestal de microfone tombado
  p.cyl(x + 0.4, 0.05, -4.6, 0.02, 0.02, 1.5, STEEL, 5, { rot: [0, 0.6, H] });
}

/** Mesa de som: tampo inclinado com os faders acesos, telas, monitores de referência e a cadeira. */
function mixingDesk(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = -5.5;
  p.box(x, 0.45, z, 5, 0.9, 1.1, WOOD);
  p.box(x, 0.98, z + 0.1, 4.8, 0.08, 0.9, BLACK, { rot: [0.22, 0, 0] });
  for (let i = 0; i < 24; i++)
    p.box(
      x - 2.2 + i * 0.19,
      1.04,
      z + 0.2 + rng.range(-0.2, 0.2),
      0.05,
      0.03,
      0.07,
      i % 6 === 5 ? RED : GREEN,
      {
        glow: 2,
      },
    );
  for (const s of [-1, 1]) {
    p.box(x + s * 0.9, 1.75, z - 0.35, 1.5, 0.9, 0.06, BLACK);
    p.box(x + s * 0.9, 1.75, z - 0.31, 1.36, 0.76, 0.02, CYAN, { glow: 0.9 });
    p.box(x + s * 2.9, 0.7, z, 0.1, 1.4, 0.1, STEEL_D);
    speaker(p, x + s * 2.9, 1.4, z, 0.6, 0.9, 0.5, 1, AMBER);
  }
  ctx.light(x, 2, -4.6, CYAN, 4, 7, 0.15);
  // cadeira
  p.cyl(x + 0.4, 0.25, z + 1.2, 0.03, 0.03, 0.5, STEEL, 5);
  p.box(x + 0.4, 0.52, z + 1.2, 0.5, 0.08, 0.5, CASE);
  p.box(x + 0.4, 0.9, z + 1.43, 0.5, 0.6, 0.07, CASE);
}

/** Cabine de voz: a janela de vidro, o microfone com o filtro e a placa vermelha de NO AR. */
function booth(ctx: EnvCtx, x: number): void {
  const p = ctx.p;
  const z = WALL_Z + 0.12;
  p.box(x, 1.9, z, 3.6, 2.2, 0.12, STEEL_D);
  p.box(x, 1.9, z + 0.07, 3.3, 1.9, 0.02, 0x8ad8ff, { glow: 0.35 });
  p.box(x + 2.5, 1.05, z, 1, 2.1, 0.1, 0x3a2c44);
  p.box(x + 2.5, 2.25, z, 1.3, 0.3, 0.14, BLACK);
  p.box(x, 3.3, z + 0.06, 1.5, 0.42, 0.1, BLACK);
  p.box(x, 3.3, z + 0.12, 1.36, 0.3, 0.02, RED, { glow: 2.6 });
  p.box(x, 3.3, z + 0.135, 0.9, 0.07, 0.01, CREAM, { glow: 2 });
  ctx.light(x, 3.2, WALL_Z + 1.2, RED, 6, 7, 1);
  // microfone
  p.cyl(x - 0.6, 0.02, -5.3, 0.25, 0.25, 0.04, STEEL_D, 8);
  p.cyl(x - 0.6, 0.8, -5.3, 0.02, 0.02, 1.6, STEEL, 5);
  p.cyl(x - 0.6, 1.66, -5.22, 0.045, 0.045, 0.18, BLACK, 6, { rot: [H, 0, 0] });
  p.part('torus', [0.1, 0.012], x - 0.6, 1.66, -5.05, BLACK);
  // banco e partitura
  p.cyl(x + 0.7, 0.35, -5.2, 0.2, 0.16, 0.7, WOOD, 7);
  p.box(x + 0.7, 1.15, -5.6, 0.5, 0.4, 0.03, BLACK, { rot: [-0.2, 0, 0] });
}

/** Bateria no praticável: bumbo, tons, caixa, pratos e o banco. */
function drums(p: Pieces, x: number): void {
  const z = -5.4;
  p.box(x, 0.15, z, 3.6, 0.3, 2.2, CASE);
  p.cyl(x, 0.75, z + 0.3, 0.45, 0.45, 0.5, 0xc8202a, 12, { rot: [H, 0, 0] });
  p.cyl(x, 0.75, z + 0.56, 0.4, 0.4, 0.02, CREAM, 12, { rot: [H, 0, 0] });
  for (const s of [-1, 1]) {
    p.cyl(x + s * 0.32, 1.3, z + 0.2, 0.2, 0.2, 0.22, 0xc8202a, 10, { rot: [0.3, 0, 0] });
    p.cyl(x + s * 1.2, 1.5, z - 0.1, 0.36, 0.36, 0.02, GOLD, 10, { rot: [0, 0, s * 0.15] });
    p.cyl(x + s * 1.2, 0.9, z - 0.1, 0.015, 0.015, 1.2, STEEL, 4);
  }
  p.cyl(x - 0.8, 0.95, z + 0.5, 0.22, 0.22, 0.16, STEEL, 10);
  p.cyl(x + 0.85, 0.7, z + 0.45, 0.28, 0.28, 0.4, 0xc8202a, 10);
  p.cyl(x, 0.6, z - 0.6, 0.2, 0.16, 0.6, CASE, 7);
}

/** Teclado no suporte em X, rack de aparelhos e duas guitarras na parede. */
function keys(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = -5.3;
  for (const s of [-1, 1]) p.box(x - 1.4, 0.48, z, 0.05, 1.2, 0.05, STEEL, { rot: [0, 0, s * 0.6] });
  p.box(x - 1.4, 0.98, z, 1.9, 0.1, 0.45, BLACK);
  p.box(x - 1.4, 1.04, z + 0.08, 1.8, 0.02, 0.24, CREAM, { noShadow: true });
  p.box(x + 1.6, 0.9, -5.6, 0.9, 1.8, 0.7, CASE);
  for (let i = 0; i < 6; i++) {
    p.box(x + 1.6, 0.3 + i * 0.27, -5.24, 0.8, 0.2, 0.02, STEEL_D, { noShadow: true });
    for (let j = 0; j < 4; j++)
      p.box(x + 1.3 + j * 0.2, 0.3 + i * 0.27, -5.22, 0.05, 0.05, 0.02, rng.pick([GREEN, AMBER, CYAN]), {
        glow: 2.2,
      });
  }
  guitar(p, x + 3.2, 1.9, WALL_Z + 0.2, rng.pick(GUITARS));
  guitar(p, x - 3.4, 1.9, WALL_Z + 0.2, rng.pick(GUITARS));
}

/** Arena: o palco do DJ, com a parede de LED em equalizador, a mesa dos toca-discos e as torres de som. */
function stage(ctx: EnvCtx, cx: number): void {
  const { p, rng } = ctx;
  const w = 16;
  p.box(cx, 0.3, -5.4, w, 0.6, 2.2, BLACK);
  p.box(cx, 0.56, -4.29, w, 0.06, 0.03, PINK, { glow: 2 });
  // parede de LED
  const cols = 16;
  for (let c = 0; c < cols; c++) {
    const lit = rng.int(1, 5);
    for (let r = 0; r < 5; r++) {
      const color = r >= lit ? 0x1a1626 : r > 3 ? RED : r > 1 ? AMBER : GREEN;
      p.box(cx - w / 2 + (c + 0.5) * (w / cols), 1.4 + r * 0.7, WALL_Z + 0.15, 0.86, 0.58, 0.04, color, {
        glow: r >= lit ? 0.2 : 1.5,
      });
    }
  }
  // mesa do DJ
  p.box(cx, 1.1, -5.3, 3.2, 1, 0.8, CASE);
  p.box(cx, 1.05, -4.89, 3.2, 0.9, 0.02, PURPLE, { glow: 0.8 });
  for (const s of [-1, 1]) {
    p.cyl(cx + s * 0.95, 1.63, -5.3, 0.36, 0.36, 0.04, BLACK, 14);
    p.cyl(cx + s * 0.95, 1.66, -5.3, 0.12, 0.12, 0.02, CYAN, 10, { glow: 2 });
  }
  p.box(cx, 1.63, -5.3, 0.6, 0.06, 0.5, STEEL_D);
  for (let i = 0; i < 5; i++) p.box(cx - 0.2 + i * 0.1, 1.67, -5.2, 0.04, 0.02, 0.06, GREEN, { glow: 2.4 });
  // torres de som
  for (const s of [-1, 1]) speaker(p, cx + s * 7.2, 0.6, -5.4, 1.8, 4.2, 1, 1, s < 0 ? PINK : CYAN);
  // treliça do palco, refletores e a placa de NO AR
  p.box(cx, 5.45, -4.6, w + 1, 0.18, 0.18, STEEL_D);
  for (let i = 0; i < 6; i++) {
    const lx = cx - 6 + i * 2.4;
    const c = NEON[i % NEON.length]!;
    p.cyl(lx, 5.15, -4.6, 0.16, 0.22, 0.4, BLACK, 8, { noShadow: true });
    p.cyl(lx, 4.93, -4.6, 0.2, 0.2, 0.03, c, 8, { glow: 2.6 });
    p.box(lx, 2.9, -4.9, 0.5, 4, 0.03, c, { glow: 0.1, rot: [0, 0, (i - 2.5) * 0.07] });
  }
  p.box(cx, 5.9, WALL_Z + 0.2, 2.6, 0.7, 0.1, BLACK);
  p.box(cx, 5.9, WALL_Z + 0.27, 2.4, 0.5, 0.02, RED, { glow: 2.6 });
  p.box(cx, 5.9, WALL_Z + 0.285, 1.6, 0.1, 0.01, CREAM, { glow: 2 });
  ctx.light(cx - 5, 3.2, -3.8, PINK, 9, 12, 0.3);
  ctx.light(cx + 5, 3.2, -3.8, CYAN, 9, 12, 0.3);
  ctx.light(cx, 4, -3.2, WARM, 10, 14, 0.1);
}
