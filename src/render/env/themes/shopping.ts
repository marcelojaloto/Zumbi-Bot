import type { Rng } from '../../../core/rng';
import type { EnvCtx, Pieces } from '../builder';
import { column } from '../props';

const H = Math.PI / 2;
const MARBLE = 0xd0d2d6;
const MARBLE_D = 0x3a3e46;
const STEEL = 0x9aa0a8;
const STEEL_D = 0x3a3e48;
const GLASS = 0x18222c;
const BELT = 0x1e2026;
const YELLOW = 0xffc21a;
const GOLD = 0xd8b040;
const RED = 0xe8202a;
const PLASTIC = 0xe8e4de;
const ALARM = 0xff2a2a;
const NEON = [0xff3ad8, 0x3ad8ff, 0xffe03a, 0x5aff8a, 0xff5a3a, 0xb05aff];
const BAGS = [0xff5ac8, 0x3ad8e8, 0xffd23a, 0x8a5ae8, 0xf4f0e8];
const WALL_Z = -6.5;
const MOD = 10;

type Module = 'store' | 'shutter' | 'escalator' | 'food' | 'fountain' | 'kiosk' | 'arena';

/**
 * Shopping fechado: vitrines com letreiros de neon (algumas com a grade baixada), escada rolante, praça de
 * alimentação, chafariz, quiosque, o mezanino com guarda-corpo de vidro e, na arena, o átrio com o pódio do rei.
 */
export function shoppingTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  ctx.wall = { kind: 'panel', c1: 0x6a7078, c2: 0x4a5058, z: WALL_Z, h: 10 };
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;

  // mezanino com guarda-corpo de vidro
  p.box(mid, 4.7, -5.9, len, 0.25, 1.3, 0xb8bcc2);
  p.box(mid, 5.25, -5.3, len, 0.8, 0.04, 0x8ad8ff, { glow: 0.22 });
  p.box(mid, 5.68, -5.3, len, 0.05, 0.08, STEEL, { noShadow: true });

  // piso: bordas escuras, filete dourado e losangos
  for (const z of [z0 - 0.55, z1 + 0.55]) p.box(mid, 0.006, z, len, 0.012, 0.5, MARBLE_D, { noShadow: true });
  for (const z of [z0 - 0.3, z1 + 0.3]) p.box(mid, 0.008, z, len, 0.012, 0.05, GOLD, { noShadow: true });
  for (let x = ctx.x0 + 5; x < ctx.x1; x += MOD) {
    const zc = (z0 + z1) / 2;
    p.box(x, 0.007, zc, 1.9, 0.012, 1.9, MARBLE_D, { noShadow: true, rot: [0, Math.PI / 4, 0] });
    p.box(x, 0.009, zc, 1.6, 0.012, 1.6, 0xa8acb4, { noShadow: true, rot: [0, Math.PI / 4, 0] });
  }

  // perigos: leito das esteiras, postes do alarme e painéis do piso
  const hazards = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of hazards) {
    if (h.kind === 'conveyor') beltBed(p, h.x, h.z, h.w ?? 6, h.d ?? 1.6);
    else if (h.kind === 'laserTrip') {
      laserPost(p, h.x, z0 - 0.7, 1.4);
      laserPost(p, h.x, z1 + 0.9, 0.8);
    } else if (h.kind === 'electricTile') floorPanel(p, h.x, h.z, h.w ?? 2, h.d ?? 2);
  }

  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const arenaMid = arena ? (arena[0] + arena[1]) / 2 : Infinity;
  const kinds: Module[] = ['store', 'shutter', 'escalator', 'store', 'food', 'fountain', 'store', 'kiosk'];
  let k = 0;
  for (let cx = ctx.x0; cx < ctx.x1; cx += MOD, k++) {
    column(p, cx, -4.9, 4.6, MARBLE, 0.4);
    p.box(cx, 2.2, -4.9, 0.86, 0.06, 0.86, GOLD, { noShadow: true });
    const mx = cx + MOD / 2;
    let kind: Module = kinds[(k + rng.int(0, 1)) % kinds.length]!;
    if (arena && mx > arena[0] - 4 && mx < arena[1] + 6) kind = 'arena';
    const neon = NEON[k % NEON.length]!;
    switch (kind) {
      case 'store':
        store(ctx, mx, MOD - 1.4, neon);
        break;
      case 'shutter':
        shutter(ctx, mx, MOD - 1.4);
        break;
      case 'escalator':
        escalator(p, mx);
        break;
      case 'food':
        food(ctx, mx, neon);
        break;
      case 'fountain':
        fountain(ctx, mx);
        break;
      case 'kiosk':
        kiosk(ctx, mx, neon);
        break;
      case 'arena':
        break;
    }
    // spots embutidos sob o mezanino (um aceso por módulo)
    spot(ctx, cx + 2.5, -4.6, true);
    spot(ctx, cx + 7.5, -4.6, false);
  }
  if (arena) atrium(ctx, arenaMid);

  // faixas de liquidação penduradas
  for (let x = ctx.x0 + 6; x < ctx.x1; x += rng.range(12, 18)) {
    if (Math.abs(x - arenaMid) < 9) continue;
    banner(p, x, 3.9, -3.7, rng.chance(0.3) ? 0.25 : 0);
  }

  // sinais do abandono: sacolas, notas fiscais, pedaços de manequim e carrinhos largados
  for (let i = 0; i < ctx.dense(150); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(-5, z0 - 0.2) : rng.range(z0, z1 + 2.4);
    p.box(x, 0.005 + rng.next() * 0.004, z, rng.range(0.06, 0.1), 0.006, rng.range(0.14, 0.3), 0xf0ece4, {
      noShadow: true,
      rot: [0, rng.range(0, Math.PI), 0],
    });
  }
  for (let i = 0; i < ctx.dense(40); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const back = rng.chance(0.6);
    const z = back ? rng.range(-4.5, z0 - 0.7) : rng.range(z1 + 0.8, z1 + 2.6);
    if (rng.chance(0.65)) bag(p, rng, x, z);
    else limb(p, rng, x, z);
  }
  for (let x = ctx.x0 + rng.range(4, 12); x < ctx.x1; x += rng.range(16, 26)) {
    if (Math.abs(x - arenaMid) < 10) continue;
    cart(p, x, rng.range(-4.5, -3.9), rng.range(-0.5, 0.5));
  }

  // primeiro plano: bancos e vasos
  for (let x = ctx.x0 + 6; x < ctx.x1; x += rng.range(12, 20)) {
    if (rng.chance(0.5)) {
      p.box(x, 0.22, z1 + 2.9, 2.2, 0.1, 0.6, 0x6a4a32);
      for (const s of [-0.9, 0.9]) p.box(x + s, 0.1, z1 + 2.9, 0.1, 0.2, 0.55, STEEL_D);
    } else planter(p, rng, x, z1 + 2.9, 0.7);
  }
}

// ---------------------------------------------------------------------------
// perigos
// ---------------------------------------------------------------------------

function beltBed(p: Pieces, x: number, z: number, w: number, d: number): void {
  p.box(x, 0.008, z, w, 0.014, d, BELT, { noShadow: true });
  for (let bx = x - w / 2 + 0.6; bx < x + w / 2; bx += 1.2)
    p.box(bx, 0.017, z, 0.03, 0.006, d * 0.96, 0x2e3038, { noShadow: true });
  for (const s of [-1, 1]) {
    p.box(x, 0.03, z + (s * d) / 2, w + 0.3, 0.06, 0.07, STEEL, { noShadow: true });
    p.box(x + (s * w) / 2, 0.012, z, 0.3, 0.02, d, STEEL_D, { noShadow: true });
  }
}

function laserPost(p: Pieces, x: number, z: number, h: number): void {
  p.box(x, h / 2, z, 0.14, h, 0.14, STEEL_D);
  p.box(x, h - 0.1, z, 0.2, 0.2, 0.2, 0x22262a);
  p.sphere(x, h - 0.1, z + (z < 0 ? 0.11 : -0.11), 0.06, ALARM, { glow: 4 });
  p.box(x, 0.02, z, 0.36, 0.04, 0.36, YELLOW, { noShadow: true });
}

/** Painel de piso arrancado, com a fiação à mostra. */
function floorPanel(p: Pieces, x: number, z: number, w: number, d: number): void {
  p.box(x, 0.01, z, w, 0.014, d, 0x2e3438, { noShadow: true });
  for (let i = -2; i <= 2; i++)
    p.box(x + (i * w) / 5.2, 0.018, z, 0.04, 0.012, d * 0.9, 0x1a1e22, { noShadow: true });
  for (const s of [-1, 1]) {
    p.box(x, 0.02, z + (s * d) / 2, w + 0.1, 0.012, 0.08, YELLOW, { noShadow: true });
    p.box(x + (s * w) / 2, 0.02, z, 0.08, 0.012, d + 0.1, YELLOW, { noShadow: true });
  }
}

// ---------------------------------------------------------------------------
// peças
// ---------------------------------------------------------------------------

/** Manequim de vitrine parado, de frente para a pista. */
function dummy(p: Pieces, x: number, y: number, z: number, s: number, cloth: number | null): void {
  for (const d of [-0.07, 0.07]) p.box(x + d * s, y + 0.42 * s, z, 0.1 * s, 0.84 * s, 0.1 * s, PLASTIC);
  p.box(x, y + 1.12 * s, z, 0.34 * s, 0.56 * s, 0.2 * s, cloth ?? PLASTIC);
  for (const d of [-0.22, 0.22]) p.box(x + d * s, y + 1.08 * s, z, 0.08 * s, 0.6 * s, 0.08 * s, PLASTIC);
  p.sphere(x, y + 1.58 * s, z, 0.12 * s, PLASTIC);
}

function bag(p: Pieces, rng: Rng, x: number, z: number): void {
  const s = rng.range(0.22, 0.34);
  p.box(x, s * 0.5, z, s, s, s * 0.45, rng.pick(BAGS), { rot: [0, rng.range(-0.6, 0.6), 0] });
  p.box(x, s * 1.08, z, s * 0.5, s * 0.16, 0.02, 0x22262a, { noShadow: true });
}

/** Pedaço de manequim largado no chão. */
function limb(p: Pieces, rng: Rng, x: number, z: number): void {
  if (rng.chance(0.3)) p.sphere(x, 0.12, z, 0.12, PLASTIC);
  else p.box(x, 0.05, z, 0.1, 0.1, rng.range(0.5, 0.8), PLASTIC, { rot: [0, rng.range(0, Math.PI), 0] });
}

function cart(p: Pieces, x: number, z: number, yaw: number): void {
  p.box(x, 0.6, z, 0.9, 0.4, 0.55, STEEL, { rot: [0, yaw, 0] });
  p.box(x, 0.78, z, 0.82, 0.05, 0.47, STEEL_D, { rot: [0, yaw, 0], noShadow: true });
  p.box(x, 0.25, z, 0.8, 0.04, 0.5, STEEL_D, { rot: [0, yaw, 0] });
  p.box(x - 0.5 * Math.cos(yaw), 0.95, z + 0.5 * Math.sin(yaw), 0.04, 0.04, 0.55, RED, { rot: [0, yaw, 0] });
}

function planter(p: Pieces, rng: Rng, x: number, z: number, s: number): void {
  p.cyl(x, 0.3 * s, z, 0.42 * s, 0.32 * s, 0.6 * s, MARBLE, 8);
  const dead = rng.chance(0.5);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    p.cone(
      x + Math.cos(a) * 0.14 * s,
      (0.6 + 0.4) * s,
      z + Math.sin(a) * 0.14 * s,
      0.1 * s,
      0.9 * s,
      dead ? 0x6a5a32 : 0x2e6a3a,
      4,
      {
        rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5],
        noShadow: true,
      },
    );
  }
}

/** Spot embutido sob o mezanino. */
function spot(ctx: EnvCtx, x: number, z: number, lit: boolean): void {
  ctx.p.cyl(x, 4.55, z, 0.16, 0.16, 0.05, 0xf4f8ff, 8, { glow: lit ? 2.4 : 0.6 });
  if (lit) ctx.light(x, 3.9, z + 1.2, 0xdcecff, 7, 10, 0.1);
}

/** Faixa de liquidação pendurada (algumas tortas, presas por um lado só). */
function banner(p: Pieces, x: number, y: number, z: number, tilt: number): void {
  for (const s of [-0.5, 0.5]) p.box(x + s, y + 0.75, z, 0.015, 0.7, 0.015, 0x22262a, { noShadow: true });
  p.box(x, y, z, 1.3, 0.9, 0.03, RED, { rot: [0, 0, tilt], noShadow: true });
  p.box(x, y + 0.2, z + 0.02, 1.1, 0.12, 0.01, 0xf4f0e8, { rot: [0, 0, tilt], noShadow: true });
  p.cyl(x, y - 0.15, z + 0.02, 0.2, 0.2, 0.01, YELLOW, 10, { rot: [H, 0, 0], noShadow: true });
}

/** Letreiro de neon: blocos acesos no lugar das letras. */
function sign(ctx: EnvCtx, x: number, y: number, z: number, w: number, color: number, on: boolean): void {
  const { p, rng } = ctx;
  p.box(x, y, z, w, 0.7, 0.2, 0x22262e);
  const n = Math.max(3, Math.floor(w / 1.1));
  for (let i = 0; i < n; i++) {
    const lx = x - w / 2 + ((i + 0.5) * w) / n;
    const lit = on && !rng.chance(0.2);
    p.box(lx, y, z + 0.11, (w / n) * 0.6, 0.36, 0.03, color, lit ? { glow: 2.4 } : { noShadow: true });
  }
  if (on) ctx.light(x, y - 0.5, z + 1.4, color, 5, 8, 0.5);
}

/** Vitrine aberta: vidro escuro, manequins sobre o degrau e a porta. */
function store(ctx: EnvCtx, x: number, w: number, neon: number): void {
  const { p, rng } = ctx;
  const z = WALL_Z + 0.25;
  sign(ctx, x, 3.75, z, w, neon, true);
  p.box(x - 0.9, 1.75, z, w - 1.8, 3.1, 0.08, GLASS);
  p.box(x - 0.9, 0.18, z + 0.4, w - 1.8, 0.36, 0.8, 0x4a4e58);
  p.box(x + w / 2 - 0.7, 1.4, z, 1.2, 2.8, 0.1, 0x10141a);
  p.box(x + w / 2 - 0.7, 2.9, z + 0.06, 1.3, 0.1, 0.06, STEEL, { noShadow: true });
  for (const s of [-1, 1]) p.box(x + (s * w) / 2, 2, z + 0.05, 0.2, 4, 0.3, 0x8a8e96);
  // reflexo no vidro
  p.box(x - 1.6, 2.1, z + 0.05, 0.5, 2, 0.01, 0xbfe8ff, { glow: 0.25, rot: [0, 0, 0.3] });
  const n = Math.max(2, Math.floor((w - 2.4) / 1.5));
  for (let i = 0; i < n; i++) {
    if (rng.chance(0.2)) continue;
    const dx = x - w / 2 + 0.9 + i * 1.5;
    dummy(p, dx, 0.36, z + 0.45, 1, rng.chance(0.7) ? rng.pick(BAGS) : null);
  }
}

/** Loja fechada: letreiro apagado e a grade de enrolar baixada. */
function shutter(ctx: EnvCtx, x: number, w: number): void {
  const p = ctx.p;
  const z = WALL_Z + 0.25;
  sign(ctx, x, 3.75, z, w, 0x5a6068, false);
  for (let y = 0.2; y < 3.3; y += 0.26)
    p.box(x, y, z, w - 0.4, 0.2, 0.06, y % 0.52 < 0.26 ? STEEL : 0x858b93);
  for (const s of [-1, 1]) p.box(x + (s * w) / 2, 2, z + 0.05, 0.2, 4, 0.3, 0x8a8e96);
  p.box(x, 0.3, z + 0.06, 0.14, 0.18, 0.06, GOLD);
}

/** Escada rolante parada, subindo para o mezanino. */
function escalator(p: Pieces, x: number): void {
  const z = -5.6;
  const a = 0.72;
  p.box(x, 2.3, z, 7.2, 0.5, 1.1, STEEL_D, { rot: [0, 0, a] });
  for (const dz of [-0.56, 0.56]) {
    p.box(x - 0.3, 2.75, z + dz, 7.2, 0.7, 0.04, 0x8ad8ff, { rot: [0, 0, a], glow: 0.2 });
    p.box(x - 0.52, 3.08, z + dz, 7.2, 0.07, 0.08, 0x14161c, { rot: [0, 0, a], noShadow: true });
  }
  for (let i = -4; i <= 4; i++)
    p.box(x + i * 0.6 - 0.17, 2.3 + i * 0.53 + 0.2, z, 0.3, 0.03, 0.9, YELLOW, { noShadow: true });
  p.box(x - 3.1, 0.04, z, 1.4, 0.08, 1.2, STEEL);
}

/** Praça de alimentação: balcão com toldo listrado, cardápios acesos e mesas reviradas. */
function food(ctx: EnvCtx, x: number, neon: number): void {
  const { p, rng } = ctx;
  p.box(x, 0.55, -5.7, 6.4, 1.1, 0.8, 0x7a4a3a);
  p.box(x, 1.13, -5.7, 6.6, 0.06, 0.9, MARBLE);
  for (let i = 0; i < 8; i++)
    p.box(x - 2.8 + i * 0.8, 2.75, -5.6, 0.8, 0.12, 1.2, i % 2 ? 0xf4f0e8 : RED, { rot: [0.3, 0, 0] });
  for (const dx of [-2, 0, 2])
    p.box(x + dx, 3.5, WALL_Z + 0.15, 1.5, 0.8, 0.06, neon, { glow: rng.range(0.9, 1.8) });
  ctx.light(x, 3, -5, neon, 5, 8, 0.4);
  for (const dx of [-2.6, -0.4, 1.9]) {
    const tz = rng.range(-4.6, -4.1);
    if (rng.chance(0.35)) {
      // mesa tombada
      p.cyl(x + dx, 0.4, tz, 0.5, 0.5, 0.05, MARBLE, 10, { rot: [0, 0, H] });
      p.cyl(x + dx + 0.35, 0.05, tz, 0.04, 0.04, 0.7, STEEL_D, 6, { rot: [0, 0, H] });
    } else {
      p.cyl(x + dx, 0.72, tz, 0.5, 0.5, 0.05, MARBLE, 10);
      p.cyl(x + dx, 0.36, tz, 0.05, 0.05, 0.72, STEEL_D, 6);
      p.box(x + dx + 0.1, 0.77, tz, 0.3, 0.02, 0.22, rng.pick(BAGS), { noShadow: true });
    }
    p.box(x + dx - 0.75, 0.24, tz + 0.1, 0.36, 0.48, 0.36, rng.pick(NEON), {
      rot: [0, rng.range(-0.5, 0.5), 0],
    });
  }
}

/** Chafariz: a bacia de mármore, a água parada que ainda brilha e a coluna do meio. */
function fountain(ctx: EnvCtx, x: number): void {
  const p = ctx.p;
  const z = -5.1;
  p.cyl(x, 0.25, z, 1.7, 1.8, 0.5, MARBLE, 14);
  p.cyl(x, 0.5, z, 1.5, 1.5, 0.04, 0x1a6a8a, 14, { glow: 0.7 });
  p.cyl(x, 0.9, z, 0.2, 0.3, 1.3, MARBLE, 8);
  p.cyl(x, 1.55, z, 0.7, 0.3, 0.14, MARBLE, 10);
  p.sphere(x, 1.8, z, 0.2, GOLD);
  ctx.light(x, 1.1, z + 1.2, 0x3ad8ff, 5, 7, 0.3);
}

/** Quiosque com cobertura, letreiro aceso e mercadoria no balcão. */
function kiosk(ctx: EnvCtx, x: number, neon: number): void {
  const { p, rng } = ctx;
  const z = -5.3;
  p.box(x, 0.5, z, 3, 1, 1.4, 0x4a4e58);
  p.box(x, 1.03, z, 3.2, 0.06, 1.6, MARBLE);
  for (const sx of [-1.4, 1.4])
    for (const dz of [-0.6, 0.6]) p.box(x + sx, 1.8, z + dz, 0.06, 1.5, 0.06, STEEL);
  p.box(x, 2.6, z, 3.4, 0.14, 1.8, RED);
  p.box(x, 2.9, z + 0.6, 2.2, 0.4, 0.06, neon, { glow: 2 });
  for (let i = 0; i < 5; i++)
    p.box(x - 1.1 + i * 0.55, 1.16, z + 0.3, 0.2, 0.2, 0.2, rng.pick(BAGS), {
      rot: [0, rng.range(-0.4, 0.4), 0],
    });
  ctx.light(x, 2.2, z + 1.2, neon, 4, 7, 0.4);
}

/**
 * Arena do chefe: o átrio, com a vitrine de moldura dourada, o pódio vazio do rei sob a coroa de neon, fileiras de
 * manequins em degraus dos dois lados e o cordão de veludo na frente.
 */
function atrium(ctx: EnvCtx, cx: number): void {
  const { p, rng } = ctx;
  const w = 16;
  const z = WALL_Z + 0.2;
  p.box(cx, 3, z, w, 5.2, 0.1, GLASS, { noShadow: true });
  p.box(cx, 5.75, z + 0.1, w + 0.8, 0.4, 0.4, GOLD);
  for (const s of [-1, 1]) p.box(cx + s * (w / 2 + 0.2), 3, z + 0.1, 0.4, 5.9, 0.4, GOLD);
  // pódio do rei e a coroa de neon acima
  p.cyl(cx, 0.35, z + 0.9, 1.5, 1.7, 0.7, MARBLE, 14);
  p.cyl(cx, 0.72, z + 0.9, 1.3, 1.3, 0.04, RED, 14);
  p.box(cx, 4.25, z + 0.12, 2.6, 0.22, 0.05, 0xffe03a, { glow: 2.6 });
  for (let i = -2; i <= 2; i++)
    p.cone(cx + i * 0.6, 4.7 + (i % 2 ? 0 : 0.15), z + 0.12, 0.2, 0.7, 0xffe03a, 4, { glow: 2.6 });
  // degraus com manequins
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const sx = cx + s * (3 + i * 1.6);
      const h = 0.3 + i * 0.3;
      p.box(sx, h / 2, z + 0.7, 1.5, h, 1.1, 0x4a4e58);
      dummy(p, sx, h, z + 0.7, 1.15, rng.pick(BAGS));
    }
  // cordão de veludo
  for (let x = cx - 7; x <= cx + 7; x += 2) {
    if (Math.abs(x - cx) < 1.5) continue;
    p.cyl(x, 0.45, -4.3, 0.04, 0.04, 0.9, GOLD, 6);
    p.sphere(x, 0.93, -4.3, 0.07, GOLD);
    if (x + 2 <= cx + 7 && Math.abs(x + 2 - cx) >= 1.5)
      p.cyl(x + 1, 0.74, -4.3, 0.025, 0.025, 2, 0x7a1420, 5, { rot: [0, 0, H], noShadow: true });
  }
  banner(p, cx - 5.5, 4.4, -4.2, 0);
  banner(p, cx + 5.5, 4.4, -4.2, 0);
  ctx.light(cx - 4.5, 3.2, -4.2, NEON[0]!, 9, 12, 0.3);
  ctx.light(cx + 4.5, 3.2, -4.2, NEON[1]!, 9, 12, 0.3);
  ctx.light(cx, 4, -3.5, 0xfff0d8, 10, 14, 0.1);
}
