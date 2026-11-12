import type { EnvCtx, Pieces } from '../builder';
import { barrel, crate, sandbags } from '../props';

const H = Math.PI / 2;
const CONCRETE = 0x7a7e74;
const CONCRETE_D = 0x4a4e46;
const OLIVE = 0x4a5638;
const OLIVE_D = 0x2c3426;
const STEEL = 0x7a8088;
const STEEL_D = 0x33373d;
const RUST = 0x7a4a2a;
const WARN = 0xffc21a;
const ALARM = 0xff2a2a;
const SCREEN = 0x5aff9a;
const COLD = 0xd8f0e0;
const WALL_Z = -6.5;
const MOD = 10;

type Module = 'bunks' | 'console' | 'ammo' | 'door' | 'maps' | 'lockers' | 'arena';

/**
 * Bunker: parede de concreto com faixa de perigo e canos, pilares numerados, beliches, console de monitores, paiol,
 * portas blindadas, mesa de mapas, armários, giroflexes de alarme e sacos de areia; na arena do chefe, a doca com o
 * submarino. Portas (prensas), pisos elétricos, lasers, minas e respiradouros ganham aqui a parte fixa.
 */
export function bunkerTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  ctx.wall = { kind: 'plaster', c1: 0x62665c, c2: 0x464a42, z: WALL_Z, h: 10 };
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;

  // rodapé escuro, faixa de perigo e canos
  p.box(mid, 0.5, WALL_Z + 0.06, len, 1, 0.12, CONCRETE_D, { noShadow: true });
  for (let x = ctx.x0, i = 0; x < ctx.x1; x += 0.8, i++)
    p.box(x + 0.4, 1.08, WALL_Z + 0.1, 0.8, 0.16, 0.14, i % 2 ? WARN : 0x14161a, { noShadow: true });
  p.cyl(mid, 4.4, WALL_Z + 0.3, 0.16, 0.16, len, OLIVE, 8, { rot: [0, 0, H], noShadow: true });
  p.cyl(mid, 4.8, WALL_Z + 0.26, 0.09, 0.09, len, RUST, 8, { rot: [0, 0, H], noShadow: true });
  p.cyl(mid, 3.9, WALL_Z + 0.22, 0.05, 0.05, len, STEEL_D, 6, { rot: [0, 0, H], noShadow: true });

  // piso: grelhas de drenagem nas bordas da pista
  p.box(mid, 0.006, z0 - 0.4, len, 0.012, 0.3, STEEL_D, { noShadow: true });
  p.box(mid, 0.006, z1 + 0.4, len, 0.012, 0.3, STEEL_D, { noShadow: true });

  const hazards = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of hazards) {
    if (h.kind === 'press') blastDoor(p, h.x, h.z, h.w ?? 1.8, h.d ?? 1.8);
    else if (h.kind === 'laserTrip') {
      laserPost(p, h.x, z0 - 0.7, 1.4);
      laserPost(p, h.x, z1 + 0.9, 0.8);
    } else if (h.kind === 'electricTile') {
      const w = h.w ?? 2;
      const d = h.d ?? 2;
      p.box(h.x, 0.01, h.z, w, 0.014, d, 0x2e3438, { noShadow: true });
      for (let i = -2; i <= 2; i++)
        p.box(h.x + (i * w) / 5.2, 0.018, h.z, 0.04, 0.012, d * 0.9, 0x1a1e22, { noShadow: true });
      for (const s of [-1, 1]) {
        p.box(h.x, 0.02, h.z + (s * d) / 2, w + 0.1, 0.012, 0.08, WARN, { noShadow: true });
        p.box(h.x + (s * w) / 2, 0.02, h.z, 0.08, 0.012, d + 0.1, WARN, { noShadow: true });
      }
    } else if (h.kind === 'mine') {
      p.cyl(h.x, 0.04, h.z, 0.24, 0.28, 0.08, OLIVE_D, 9, { noShadow: true });
      p.sphere(h.x, 0.1, h.z, 0.045, ALARM, { glow: 3.5 });
    } else if (h.kind === 'gasVent') {
      const r = (h.w ?? 2.4) / 2;
      p.cyl(h.x, 0.012, h.z, r * 0.6, r * 0.6, 0.02, STEEL_D, 10, { noShadow: true });
      for (let i = -2; i <= 2; i++)
        p.box(h.x + i * r * 0.2, 0.026, h.z, 0.04, 0.012, r, 0x14161a, { noShadow: true });
    }
  }

  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const arenaMid = arena ? (arena[0] + arena[1]) / 2 : Infinity;
  const kinds: Module[] = ['bunks', 'console', 'ammo', 'door', 'maps', 'lockers', 'console', 'ammo'];
  let k = 0;
  for (let cx = ctx.x0; cx < ctx.x1; cx += MOD, k++) {
    pillar(p, cx, k);
    const mx = cx + MOD / 2;
    let kind: Module = kinds[(k + rng.int(0, 1)) % kinds.length]!;
    if (arena && mx > arena[0] - 4 && mx < arena[1] + 6) kind = 'arena';
    switch (kind) {
      case 'bunks':
        bunks(ctx, mx);
        break;
      case 'console':
        consoleDesk(ctx, mx);
        break;
      case 'ammo':
        ammoDump(ctx, mx);
        break;
      case 'door':
        wallDoor(ctx, mx);
        break;
      case 'maps':
        mapTable(ctx, mx);
        break;
      case 'lockers':
        lockers(ctx, mx);
        break;
      case 'arena':
        break;
    }
    if (kind !== 'arena') beacon(ctx, cx + 2.4, 3.6, WALL_Z + 0.2, k % 2 === 0);
    // luminária fria de teto (uma sim, uma não)
    tube(ctx, cx + 6, 4.3, -3.8, k % 2 === 1);
  }
  if (arena) subDock(ctx, arenaMid);

  // cabos pendurados
  for (let x = ctx.x0 + 4; x < ctx.x1; x += rng.range(6, 11)) {
    const l = rng.range(0.8, 1.8);
    p.box(x, 5 - l / 2, -3.6, 0.025, l, 0.025, 0x14161a, { noShadow: true });
  }

  // cápsulas, papéis e manchas
  for (let i = 0; i < ctx.dense(150); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(-5, z0 - 0.2) : rng.range(z0, z1 + 2.4);
    if (rng.chance(0.7))
      p.box(x, 0.012, z, 0.07, 0.02, 0.02, 0xc8a650, { noShadow: true, rot: [0, rng.range(0, Math.PI), 0] });
    else
      p.box(x, 0.006, z, 0.21, 0.006, 0.28, 0xd8d4c8, { noShadow: true, rot: [0, rng.range(0, Math.PI), 0] });
  }
  for (let i = 0; i < ctx.dense(16); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(-4.6, z0 - 0.5) : rng.range(z1 + 0.6, z1 + 2);
    const r = rng.range(0.3, 0.55);
    p.cyl(x, 0.004, z, r, r, 0.006, rng.chance(0.5) ? 0x4a0c0c : 0x1a1c18, 8, { noShadow: true });
  }

  // sacos de areia e tambores no fundo e no primeiro plano
  for (let x = ctx.x0 + 5; x < ctx.x1; x += rng.range(14, 22)) {
    if (Math.abs(x - arenaMid) < 12) continue;
    sandbags(p, x, rng.range(-4.5, -4.1), rng.int(4, 6));
  }
  for (let x = ctx.x0 + 7; x < ctx.x1; x += rng.range(13, 20)) {
    if (rng.chance(0.5)) sandbags(p, x, z1 + 2.9, 4);
    else {
      crate(p, x, 0, z1 + 2.9, 0.7, OLIVE);
      if (rng.chance(0.5)) barrel(p, x + 0.9, z1 + 3, OLIVE_D);
    }
  }
}

/** Marco da porta blindada (o que desce é desenhado com o perigo): colunas no fundo e a viga em cima. */
function blastDoor(p: Pieces, x: number, z: number, w: number, d: number): void {
  p.box(x, 0.01, z, w, 0.016, d, 0x2a2e30, { noShadow: true });
  for (const s of [-1, 1]) p.box(x + (s * w) / 2, 0.02, z, 0.1, 0.014, d + 0.12, WARN, { noShadow: true });
  const zb = z - d / 2 - 0.2;
  for (const s of [-1, 1]) p.box(x + s * (w / 2 + 0.2), 2.7, zb, 0.24, 5.4, 0.3, CONCRETE_D);
  p.box(x, 5.3, zb, w + 0.9, 0.4, 0.4, CONCRETE_D);
  p.box(x, 5.3, z - 0.1, 0.5, 0.36, d + 0.4, STEEL_D);
  p.sphere(x - w / 2 - 0.2, 4.6, zb + 0.2, 0.08, ALARM, { glow: 3.5 });
}

function laserPost(p: Pieces, x: number, z: number, h: number): void {
  p.box(x, h / 2, z, 0.14, h, 0.14, STEEL_D);
  p.box(x, h - 0.1, z, 0.2, 0.2, 0.2, 0x22262a);
  p.sphere(x, h - 0.1, z + (z < 0 ? 0.11 : -0.11), 0.06, ALARM, { glow: 4 });
  p.box(x, 0.02, z, 0.36, 0.04, 0.36, WARN, { noShadow: true });
}

/** Pilar de concreto com a faixa amarela do setor. */
function pillar(p: Pieces, x: number, k: number): void {
  p.box(x, 3.1, -4.9, 0.7, 6.2, 0.7, CONCRETE, { jitter: 0.12 });
  p.box(x, 1.6, -4.9, 0.72, 0.3, 0.72, WARN);
  // algarismo do setor em tracinhos
  for (let i = 0; i <= k % 4; i++) p.box(x - 0.18 + i * 0.12, 2.05, -4.54, 0.05, 0.3, 0.02, 0x14161a);
  p.box(x, 6.3, -4.9, 1, 0.3, 1, CONCRETE_D);
}

/** Giroflex vermelho de alarme. */
function beacon(ctx: EnvCtx, x: number, y: number, z: number, lit: boolean): void {
  const p = ctx.p;
  p.box(x, y - 0.16, z, 0.4, 0.1, 0.36, STEEL_D);
  p.cyl(x, y + 0.06, z + 0.05, 0.16, 0.17, 0.32, ALARM, 10, { glow: 3 });
  p.cyl(x, y + 0.25, z + 0.05, 0.1, 0.16, 0.06, STEEL_D, 10);
  if (lit) ctx.light(x, y, z + 1.2, ALARM, 8, 10, 1);
}

/** Luminária tubular fria, com grade. */
function tube(ctx: EnvCtx, x: number, y: number, z: number, lit: boolean): void {
  const p = ctx.p;
  p.box(x, y + 0.5, z, 0.02, 1, 0.02, 0x22262a, { noShadow: true });
  p.box(x, y, z, 1.7, 0.1, 0.3, STEEL_D, { noShadow: true });
  p.box(x, y - 0.07, z, 1.55, 0.045, 0.2, COLD, { glow: lit ? 2.2 : 0.8 });
  if (lit) ctx.light(x, y - 0.5, z + 0.6, COLD, 6.5, 10, 0.15);
}

/** Dois beliches de aço com colchões e um cobertor caído. */
function bunks(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  for (const dx of [-2.1, 2.1]) {
    const bx = x + dx;
    for (const sx of [-0.95, 0.95])
      for (const sz of [-0.42, 0.42]) p.box(bx + sx, 1, -5.6 + sz, 0.07, 2, 0.07, STEEL_D);
    for (const y of [0.5, 1.5]) {
      p.box(bx, y, -5.6, 1.95, 0.08, 0.9, STEEL);
      p.box(bx, y + 0.1, -5.6, 1.85, 0.13, 0.8, rng.chance(0.5) ? OLIVE : 0x6a6e5c);
      p.box(bx - 0.7, y + 0.2, -5.6, 0.4, 0.1, 0.55, 0xc8c8b8);
    }
  }
  p.box(x + rng.range(-0.5, 0.5), 0.02, -4.7, 1.2, 0.03, 0.8, OLIVE_D, {
    noShadow: true,
    rot: [0, rng.range(-0.4, 0.4), 0],
  });
}

/** Console de vigilância: bancada, três monitores acesos e uma cadeira tombada. */
function consoleDesk(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  p.box(x, 0.45, -5.6, 5.4, 0.9, 0.9, STEEL_D);
  p.box(x, 0.94, -5.5, 5.5, 0.08, 1.1, STEEL);
  for (let i = -1; i <= 1; i++) {
    const mx = x + i * 1.6;
    const on = rng.chance(0.75);
    p.box(mx, 1.75, -5.9, 1.3, 0.9, 0.14, 0x14161a);
    p.box(mx, 1.75, -5.82, 1.14, 0.74, 0.02, on ? SCREEN : 0x0c1210, on ? { glow: 1.5 } : {});
    if (on)
      for (let l = 0; l < 3; l++)
        p.box(mx - 0.1, 1.95 - l * 0.2, -5.8, rng.range(0.4, 0.8), 0.04, 0.02, 0xd8ffe8, { glow: 2.4 });
    p.box(mx, 1.02, -5.25, 0.7, 0.04, 0.3, 0x22262a);
    for (let b = 0; b < 4; b++)
      p.box(mx - 0.24 + b * 0.16, 1.05, -5.25, 0.06, 0.03, 0.06, rng.pick([ALARM, WARN, SCREEN]), {
        glow: 2,
      });
  }
  ctx.light(x, 1.8, -4.6, SCREEN, 5, 8, 0.3);
  p.box(x + 1, 0.25, -4.5, 0.5, 0.08, 0.5, 0x22262a, { rot: [H, rng.range(0, 3), 0] });
}

/** Paiol: caixas de munição empilhadas, projéteis de pé e um tambor. */
function ammoDump(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  for (let i = 0; i < 4; i++) {
    const bx = x - 2.6 + i * 1.25;
    const n = rng.int(1, 3);
    for (let r = 0; r < n; r++) {
      p.box(bx, 0.25 + r * 0.5, -5.6, 1.1, 0.48, 0.7, r % 2 ? OLIVE_D : OLIVE);
      p.box(bx, 0.25 + r * 0.5, -5.24, 0.5, 0.14, 0.02, WARN);
    }
  }
  for (let i = 0; i < 5; i++) {
    const sx = x + 2.3 + (i % 3) * 0.3;
    const sz = -5.5 + Math.floor(i / 3) * 0.3;
    p.cyl(sx, 0.3, sz, 0.1, 0.1, 0.6, 0xc8a650, 7);
    p.cone(sx, 0.72, sz, 0.1, 0.24, STEEL, 7);
  }
  barrel(p, x - 3.6, -5.5, OLIVE_D);
}

/** Porta blindada na parede, com volante e faixa de perigo. */
function wallDoor(ctx: EnvCtx, x: number): void {
  const p = ctx.p;
  const z = WALL_Z + 0.2;
  p.box(x, 1.9, z, 3.6, 3.8, 0.3, CONCRETE_D);
  p.box(x, 1.8, z + 0.12, 2.8, 3.4, 0.2, STEEL);
  for (let i = 0; i < 6; i++)
    p.box(x - 1.25 + i * 0.5, 0.3, z + 0.23, 0.25, 0.4, 0.02, i % 2 ? WARN : 0x14161a, { noShadow: true });
  p.part('torus', [0.42, 0.06], x, 1.9, z + 0.3, STEEL_D);
  p.box(x, 1.9, z + 0.3, 0.8, 0.07, 0.05, STEEL_D);
  p.box(x, 1.9, z + 0.3, 0.07, 0.8, 0.05, STEEL_D);
  for (const s of [-1, 1])
    for (const y of [0.8, 3])
      p.cyl(x + s * 1.2, y, z + 0.24, 0.07, 0.07, 0.08, STEEL_D, 6, { rot: [H, 0, 0] });
  p.sphere(x, 3.85, z + 0.2, 0.09, ALARM, { glow: 3.5 });
}

/** Mesa de mapas com luminária baixa, rádio e bandeirinhas espetadas. */
function mapTable(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  p.box(x, 0.85, -5.3, 3.4, 0.1, 1.6, 0x5a4630);
  for (const sx of [-1.5, 1.5])
    for (const sz of [-0.65, 0.65]) p.box(x + sx, 0.4, -5.3 + sz, 0.12, 0.8, 0.12, 0x3a2c1e);
  p.box(x, 0.91, -5.3, 2.8, 0.02, 1.3, 0xc8c0a0, { noShadow: true });
  p.box(x - 0.4, 0.925, -5.2, 1.1, 0.01, 0.6, 0x5a8a9a, { noShadow: true });
  for (let i = 0; i < 6; i++) {
    const fx = x + rng.range(-1.2, 1.2);
    const fz = -5.3 + rng.range(-0.5, 0.5);
    p.box(fx, 1.02, fz, 0.015, 0.2, 0.015, STEEL_D, { noShadow: true });
    p.box(fx + 0.05, 1.08, fz, 0.1, 0.07, 0.01, rng.chance(0.5) ? ALARM : 0x3a7ad8, { noShadow: true });
  }
  p.box(x + 1.2, 1.05, -5.7, 0.5, 0.3, 0.3, OLIVE_D);
  p.box(x, 2.9, -5.3, 0.02, 1.6, 0.02, 0x22262a, { noShadow: true });
  p.cone(x, 2.1, -5.3, 0.45, 0.3, OLIVE_D, 10, { noShadow: true });
  p.sphere(x, 1.98, -5.3, 0.1, 0xffe8b0, { glow: 2.6 });
  ctx.light(x, 1.7, -4.7, 0xffe0a0, 6, 7, 0.15);
}

/** Fileira de armários de aço, alguns abertos. */
function lockers(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  for (let i = 0; i < 7; i++) {
    const lx = x - 2.7 + i * 0.9;
    p.box(lx, 1.1, -5.8, 0.85, 2.2, 0.6, i % 2 ? 0x4a5650 : 0x56625a);
    p.box(lx, 1.8, -5.49, 0.5, 0.14, 0.02, 0x1e2220, { noShadow: true });
    if (rng.chance(0.3))
      p.box(lx + 0.42, 1.1, -5.2, 0.04, 2.1, 0.75, 0x56625a, { rot: [0, rng.range(-0.3, 0.3), 0] });
  }
  p.box(x, 0.25, -4.9, 2.4, 0.08, 0.4, 0x5a4630);
  for (const sx of [-1, 1]) p.box(x + sx, 0.12, -4.9, 0.1, 0.24, 0.36, STEEL_D);
}

/** Arena do chefe: a doca alagada com o submarino atracado, a torre com periscópio e as luzes de embarque. */
function subDock(ctx: EnvCtx, cx: number): void {
  const p = ctx.p;
  const z = -5.1;
  // canal e borda da doca
  p.box(cx, 0.015, z, 22, 0.02, 2.6, 0x0e2a30, { glow: 0.35 });
  p.box(cx, 0.03, -3.72, 22, 0.05, 0.16, WARN, { noShadow: true });
  // casco
  p.cyl(cx, 0.75, z, 1.35, 1.35, 15, 0x23292c, 12, { rot: [0, 0, H] });
  p.sphere(cx - 7.5, 0.75, z, 1.35, 0x23292c);
  p.part('cone', [1.35, 3, 12], cx + 9, 0.75, z, 0x23292c, { rot: [0, 0, -H] });
  p.box(cx, 2.05, z, 13, 0.08, 1.4, 0x2e3438);
  // torre, periscópio e escotilha
  p.box(cx - 1, 2.9, z, 2.6, 1.7, 1, 0x2a3034);
  p.cyl(cx - 1.4, 4.3, z, 0.05, 0.05, 1.2, STEEL, 6);
  p.box(cx - 1.4, 4.9, z + 0.08, 0.14, 0.1, 0.22, STEEL);
  p.cyl(cx - 0.5, 4.1, z, 0.03, 0.03, 0.8, STEEL_D, 5);
  p.cyl(cx + 2.4, 2.14, z, 0.4, 0.4, 0.1, STEEL_D, 10);
  p.part('torus', [0.2, 0.03], cx + 2.4, 2.22, z, STEEL, { rot: [H, 0, 0] });
  p.box(cx - 1, 3.2, z + 0.51, 1.6, 0.3, 0.02, 0xd8d4c8, { noShadow: true });
  // hélice e leme
  p.box(cx + 10.4, 0.75, z, 0.08, 1.6, 0.2, STEEL_D);
  p.box(cx + 10.4, 0.75, z, 0.08, 0.2, 1.6, STEEL_D);
  // passarela e luzes de embarque
  p.box(cx + 2.4, 2, -4.2, 1, 0.08, 1.4, STEEL, { rot: [0.35, 0, 0] });
  for (let i = -2; i <= 2; i++)
    p.sphere(cx + i * 3.4, 2.16, z + 0.72, 0.06, i % 2 ? ALARM : 0x5aff9a, { glow: 3.5 });
  ctx.light(cx - 5, 3, -3.8, ALARM, 9, 12, 0.8);
  ctx.light(cx + 5, 3, -3.8, 0x5ad8ff, 8, 12, 0.2);
  ctx.light(cx, 4.2, -3.4, COLD, 9, 14, 0.1);
}
