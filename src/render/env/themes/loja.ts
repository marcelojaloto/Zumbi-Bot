import type { EnvCtx, Pieces } from '../builder';

const H = Math.PI / 2;
const ORANGE = 0xff8a2a;
const RED = 0xd8302a;
const YELLOW = 0xffd23a;
const WHITE = 0xf0f0ec;
const STEEL = 0x8a909a;
const STEEL_D = 0x3a3e48;
const TIRE = 0x141416;
const OIL = 0x0c0c12;
const FLUO = 0xe8f4ff;
const PAINTS = [0xc02a2a, 0x2a5ac0, 0xe8e8e8, 0x1c1e24, 0xf2b01a, 0x2a8a5a];
const WALL_Z = -6.5;
const MOD = 10;

type Module = 'platform' | 'tires' | 'desk' | 'bay' | 'banners' | 'arena';

// concessionária: vidraça ao fundo, carros em plataformas, mesas de venda, oficina com elevador e pneus por todo lado
export function lojaTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  ctx.wall = { kind: 'panel', c1: 0x3a4658, c2: 0x263040, z: WALL_Z, h: 10 };
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;

  // vidraça: montantes, travessa e a faixa laranja da marca
  for (let x = ctx.x0; x < ctx.x1; x += 2.5)
    p.box(x, 2.6, WALL_Z + 0.08, 0.1, 5.2, 0.12, STEEL_D, { noShadow: true });
  p.box(mid, 2.6, WALL_Z + 0.08, len, 0.1, 0.12, STEEL_D, { noShadow: true });
  p.box(mid, 5.5, WALL_Z + 0.12, len, 0.7, 0.16, ORANGE, { noShadow: true });
  p.box(mid, 5.08, WALL_Z + 0.14, len, 0.08, 0.18, WHITE, { noShadow: true });
  p.box(mid, 0.12, WALL_Z + 0.14, len, 0.24, 0.24, 0x1c1e24, { noShadow: true });

  // piso: faixas brancas na borda da pista e marcas de pneu
  p.box(mid, 0.006, z0 - 0.35, len, 0.012, 0.1, WHITE, { noShadow: true });
  p.box(mid, 0.006, z1 + 0.35, len, 0.012, 0.1, WHITE, { noShadow: true });
  for (let i = 0; i < ctx.dense(26); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.range(z0, z1);
    const l = rng.range(2, 5);
    const yaw = rng.range(-0.2, 0.2);
    for (const s of [-0.35, 0.35])
      p.box(x, 0.004, z + s, l, 0.006, 0.12, 0x24262a, { noShadow: true, rot: [0, yaw, 0] });
  }

  const hazards = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of hazards) {
    if (h.kind === 'swamp') oilPuddle(ctx, h.x, h.z, (h.w ?? 4) / 2);
    else if (h.kind === 'press') lift(p, h.x, h.z, h.w ?? 1.8, h.d ?? 1.8);
    else if (h.kind === 'fire') burntTires(ctx, h.x, h.z);
  }

  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const arenaMid = arena ? (arena[0] + arena[1]) / 2 : Infinity;
  const kinds: Module[] = ['platform', 'desk', 'banners', 'platform', 'tires', 'bay', 'platform', 'desk'];
  let k = 0;
  for (let cx = ctx.x0; cx < ctx.x1; cx += MOD, k++) {
    pillar(p, cx);
    const mx = cx + MOD / 2;
    let kind: Module = kinds[(k + rng.int(0, 1)) % kinds.length]!;
    if (arena && mx > arena[0] - 4 && mx < arena[1] + 6) kind = 'arena';
    switch (kind) {
      case 'platform':
        platform(ctx, mx);
        break;
      case 'tires':
        tireRack(ctx, mx);
        break;
      case 'desk':
        desk(ctx, mx);
        break;
      case 'bay':
        bay(ctx, mx);
        break;
      case 'banners':
        banners(ctx, mx);
        break;
      case 'arena':
        break;
    }
    striplight(ctx, cx + 2.5, 4.4, -4.2, true);
    striplight(ctx, cx + 7.5, 4.8, -0.9, false);
  }
  if (arena) garage(ctx, arenaMid);

  // varal de bandeirinhas
  for (let x = ctx.x0, i = 0; x < ctx.x1; x += 0.7, i++) {
    const sag = Math.sin(((x - ctx.x0) / MOD) * Math.PI) ** 2 * 0.5;
    p.part('cone', [0.14, 0.26, 3], x, 4.9 - sag, -3.4, PAINTS[i % PAINTS.length]!, {
      rot: [Math.PI, 0, 0],
      noShadow: true,
    });
  }

  // folhetos e porcas pelo chão
  for (let i = 0; i < ctx.dense(120); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(-5, z0 - 0.2) : rng.range(z0, z1 + 2.4);
    p.box(x, 0.005 + rng.next() * 0.004, z, 0.2, 0.006, 0.28, rng.chance(0.7) ? WHITE : ORANGE, {
      noShadow: true,
      rot: [0, rng.range(0, Math.PI), 0],
    });
  }
  // pequenas manchas de óleo fora da pista
  for (let i = 0; i < ctx.dense(16); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(-4.6, z0 - 0.6) : rng.range(z1 + 0.7, z1 + 2.2);
    const r = rng.range(0.25, 0.55);
    p.cyl(x, 0.004, z, r, r, 0.006, OIL, 9, { noShadow: true });
  }

  // primeiro plano: cones e pneus
  for (let x = ctx.x0 + 6; x < ctx.x1; x += rng.range(11, 18)) {
    if (rng.chance(0.5)) tireStack(p, x, z1 + 2.9, rng.int(2, 3));
    else cone(p, x, z1 + 2.8);
    if (rng.chance(0.4)) cone(p, x + 0.8, z1 + 3);
  }
}

// ---------------------------------------------------------------------------
// perigos
// ---------------------------------------------------------------------------

function oilPuddle(ctx: EnvCtx, x: number, z: number, r: number): void {
  const { p, rng } = ctx;
  p.cyl(x, 0.01, z, r, r, 0.016, OIL, 16, { noShadow: true });
  p.cyl(x + r * 0.2, 0.016, z - r * 0.1, r * 0.55, r * 0.55, 0.01, 0x2a2440, 12, { glow: 0.35 });
  p.cyl(x - r * 0.3, 0.018, z + r * 0.2, r * 0.25, r * 0.25, 0.008, 0x1a3a44, 10, { glow: 0.35 });
  // o galão tombado de onde o óleo vazou
  const a = rng.range(0, Math.PI * 2);
  p.cyl(x + Math.cos(a) * r, 0.16, z - Math.abs(Math.sin(a)) * r, 0.16, 0.16, 0.5, 0x2a5ac0, 8, {
    rot: [H, a, 0],
  });
}

// elevador hidráulico: mesa no chão com borda amarela e as duas colunas atrás, de onde a plataforma desce
function lift(p: Pieces, x: number, z: number, w: number, d: number): void {
  p.box(x, 0.01, z, w, 0.016, d, 0x2e3238, { noShadow: true });
  const zb = z - d / 2 - 0.18;
  for (const s of [-1, 1]) {
    p.box(x, 0.02, z + (s * d) / 2, w + 0.12, 0.014, 0.1, YELLOW, { noShadow: true });
    p.box(x + (s * w) / 2, 0.02, z, 0.1, 0.014, d + 0.12, YELLOW, { noShadow: true });
    p.box(x + s * (w / 2 + 0.18), 2.7, zb, 0.22, 5.4, 0.22, 0x2a5ac0);
    p.box(x + s * (w / 2 + 0.18), 0.06, zb, 0.5, 0.12, 0.5, STEEL_D);
  }
  p.box(x, 5.3, zb, w + 0.8, 0.3, 0.3, 0x2a5ac0);
  p.box(x, 5.3, z - 0.1, 0.5, 0.36, d + 0.4, STEEL_D);
}

// pilha de pneus carbonizados embaixo do fogo
function burntTires(ctx: EnvCtx, x: number, z: number): void {
  const p = ctx.p;
  for (const [dx, dz] of [
    [0, 0],
    [0.45, 0.2],
    [-0.4, 0.15],
  ] as const)
    p.part('torus', [0.26, 0.11], x + dx, 0.1, z + dz, 0x0c0a0a, { rot: [H, 0, 0], noShadow: true });
  ctx.light(x, 0.8, z + 0.4, 0xff6a1a, 6, 6, 0.8);
}

// ---------------------------------------------------------------------------
// peças
// ---------------------------------------------------------------------------

function tire(p: Pieces, x: number, y: number, z: number, r = 0.3): void {
  p.part('torus', [r, r * 0.4], x, y, z, TIRE, { rot: [H, 0, 0] });
}

function tireStack(p: Pieces, x: number, z: number, n: number): void {
  for (let i = 0; i < n; i++) tire(p, x, 0.12 + i * 0.24, z);
}

function cone(p: Pieces, x: number, z: number): void {
  p.box(x, 0.02, z, 0.34, 0.04, 0.34, ORANGE);
  p.cone(x, 0.3, z, 0.13, 0.52, ORANGE, 8);
  p.cyl(x, 0.32, z, 0.075, 0.095, 0.1, WHITE, 8);
}

// carro de vitrine, de lado para a pista; `on` acende os faróis
function car(ctx: EnvCtx, x: number, y: number, z: number, color: number, on: boolean): void {
  const p = ctx.p;
  p.box(x, y + 0.55, z, 3.8, 0.6, 1.7, color);
  p.box(x - 0.25, y + 1.1, z, 2.1, 0.55, 1.5, color);
  p.box(x - 0.25, y + 1.1, z, 2.12, 0.38, 1.52, 0x10141a);
  p.box(x + 1.92, y + 0.38, z, 0.08, 0.16, 1.74, STEEL);
  p.box(x - 1.92, y + 0.38, z, 0.08, 0.16, 1.74, STEEL);
  for (const dx of [-1.2, 1.2])
    for (const dz of [-0.82, 0.82]) {
      p.cyl(x + dx, y + 0.32, z + dz, 0.32, 0.32, 0.22, TIRE, 10, { rot: [H, 0, 0] });
      p.cyl(x + dx, y + 0.32, z + dz + Math.sign(dz) * 0.1, 0.15, 0.15, 0.04, STEEL, 8, { rot: [H, 0, 0] });
    }
  for (const dz of [-0.55, 0.55])
    p.box(x + 1.91, y + 0.62, z + dz, 0.06, 0.16, 0.36, on ? 0xfff4c0 : 0x8a8e96, on ? { glow: 2.4 } : {});
  // etiqueta de preço no para-brisa
  p.box(x + 0.83, y + 1.12, z + 0.5, 0.02, 0.24, 0.4, YELLOW, { noShadow: true });
}

function pillar(p: Pieces, x: number): void {
  p.box(x, 3.1, -4.9, 0.5, 6.2, 0.5, WHITE);
  p.box(x, 1.2, -4.9, 0.52, 0.3, 0.52, ORANGE);
  p.box(x, 6.25, -4.9, 0.8, 0.3, 0.8, STEEL_D);
}

function striplight(ctx: EnvCtx, x: number, y: number, z: number, lit: boolean): void {
  const p = ctx.p;
  p.box(x - 0.8, y + 0.8, z, 0.015, 1.6, 0.015, 0x22262a, { noShadow: true });
  p.box(x + 0.8, y + 0.8, z, 0.015, 1.6, 0.015, 0x22262a, { noShadow: true });
  p.box(x, y, z, 2.1, 0.1, 0.36, 0xc8ccd0, { noShadow: true });
  p.box(x, y - 0.07, z, 1.95, 0.045, 0.24, FLUO, { glow: 2.2 });
  if (lit) ctx.light(x, y - 0.5, z + 0.6, FLUO, 7, 10, 0.1);
}

// plataforma giratória (parada) com um carro e o totem de oferta
function platform(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = -5.3;
  p.cyl(x, 0.14, z, 2.5, 2.6, 0.28, 0x2a2e36, 20);
  p.cyl(x, 0.29, z, 2.3, 2.3, 0.03, 0xc8ccd4, 20);
  p.part('torus', [2.42, 0.04], x, 0.3, z, ORANGE, { rot: [H, 0, 0], glow: 1.6 });
  car(ctx, x, 0.3, z, rng.pick(PAINTS), rng.chance(0.4));
  // totem
  p.box(x + 3.2, 1.1, -5.9, 0.08, 2.2, 0.08, STEEL_D);
  p.box(x + 3.2, 2.1, -5.86, 0.9, 0.6, 0.06, RED);
  p.box(x + 3.2, 2.1, -5.82, 0.6, 0.12, 0.02, YELLOW, { glow: 1.6 });
  ctx.light(x, 3, -4.2, 0xfff0d8, 6, 9, 0.05);
}

// prateleira de pneus e uma pilha ao lado
function tireRack(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = -5.7;
  const w = 6;
  for (const s of [-1, 1]) p.box(x + (s * w) / 2, 1.7, z, 0.1, 3.4, 0.7, STEEL_D);
  for (let r = 0; r < 3; r++) {
    const y = 0.5 + r * 1.05;
    p.box(x, y, z, w, 0.06, 0.7, STEEL);
    for (let tx = x - w / 2 + 0.5; tx < x + w / 2 - 0.3; tx += 0.72)
      if (rng.chance(0.85)) p.part('torus', [0.3, 0.12], tx, y + 0.44, z, TIRE, { rot: [0, H, 0] });
  }
  tireStack(p, x + 3.9, -5.2, rng.int(3, 5));
  tireStack(p, x - 3.8, -5.4, rng.int(2, 4));
  p.box(x, 3.7, z + 0.1, 2.4, 0.5, 0.06, YELLOW);
}

// mesa de venda: tampo, monitor aceso, duas cadeiras e um vaso
function desk(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = -5.2;
  p.box(x, 0.74, z, 2.4, 0.08, 1, 0xd8d4cc);
  for (const s of [-1, 1]) p.box(x + s * 1.1, 0.37, z, 0.08, 0.74, 0.9, STEEL_D);
  p.box(x - 0.5, 1.05, z - 0.2, 0.6, 0.4, 0.04, 0x16181c);
  p.box(x - 0.5, 1.05, z - 0.17, 0.52, 0.32, 0.02, 0x5ac8ff, { glow: 1.8 });
  p.box(x - 0.5, 0.82, z - 0.2, 0.1, 0.1, 0.1, 0x16181c);
  p.box(x + 0.5, 0.8, z + 0.1, 0.3, 0.02, 0.4, WHITE);
  for (const [dx, dz, yaw] of [
    [-0.6, 0.9, 0.3],
    [0.6, 0.95, -0.4],
  ] as const) {
    p.box(x + dx, 0.45, z + dz, 0.5, 0.08, 0.5, ORANGE, { rot: [0, yaw, 0] });
    p.box(x + dx, 0.22, z + dz, 0.06, 0.44, 0.06, STEEL_D);
    p.box(x + dx, 0.8, z + dz + 0.24, 0.5, 0.6, 0.06, ORANGE, { rot: [0, yaw, 0] });
  }
  // vaso
  const vx = x + 2.2;
  p.cyl(vx, 0.3, z - 0.3, 0.3, 0.22, 0.6, WHITE, 8);
  for (let i = 0; i < 5; i++)
    p.part(
      'cone',
      [0.1, 1, 4],
      vx + rng.range(-0.15, 0.15),
      1.05,
      z - 0.3 + rng.range(-0.15, 0.15),
      0x2a6a3a,
      {
        rot: [rng.range(-0.3, 0.3), 0, rng.range(-0.3, 0.3)],
      },
    );
  ctx.light(x - 0.5, 1.4, z + 0.6, 0x5ac8ff, 3, 5, 0.3);
}

// baia da oficina: carro erguido no elevador, armário de ferramentas e galões
function bay(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = -5.3;
  for (const s of [-1, 1]) {
    p.box(x + s * 2.3, 1.6, z, 0.24, 3.2, 0.24, 0x2a5ac0);
    p.box(x + s * 1.2, 1.5, z, 2, 0.1, 0.24, STEEL_D);
  }
  car(ctx, x, 1.5, z, rng.pick(PAINTS), false);
  // armário vermelho de ferramentas
  p.box(x - 3.6, 0.6, -5.7, 1, 1.2, 0.6, RED);
  for (let i = 0; i < 4; i++) p.box(x - 3.6, 0.25 + i * 0.27, -5.39, 0.8, 0.03, 0.02, STEEL);
  p.cyl(x + 3.5, 0.45, -5.6, 0.3, 0.3, 0.9, 0x2a5ac0, 9);
  p.cyl(x + 4.1, 0.45, -5.4, 0.3, 0.3, 0.9, 0x2a8a5a, 9);
  // lâmpada de inspeção embaixo do carro
  p.sphere(x + 0.4, 1.2, z + 0.4, 0.08, 0xffd87a, { glow: 3 });
  ctx.light(x + 0.4, 1.1, z + 0.8, 0xffd87a, 5, 6, 0.2);
}

// faixas de promoção penduradas e um cacho de balões
function banners(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  for (const dx of [-2.6, 0, 2.6]) {
    const c = rng.pick([RED, ORANGE, YELLOW]);
    p.box(x + dx, 4.9, -5.6, 0.02, 0.8, 0.02, STEEL_D, { noShadow: true });
    p.box(x + dx, 3.4, -5.6, 1.5, 2.2, 0.04, c);
    p.box(x + dx, 3.9, -5.57, 1.1, 0.3, 0.02, WHITE);
    p.box(x + dx, 3.2, -5.57, 0.8, 0.5, 0.02, 0x16181c);
    p.part('cone', [0.75, 0.5, 3], x + dx, 2.05, -5.6, c, { rot: [Math.PI, 0, 0] });
  }
  const bx = x + rng.range(-1, 1);
  for (let i = 0; i < 6; i++) {
    const ox = rng.range(-0.5, 0.5);
    const oy = rng.range(0, 0.9);
    p.sphere(bx + ox, 2.3 + oy, -4.9 + rng.range(-0.2, 0.2), 0.24, PAINTS[i % PAINTS.length]!);
    p.box(bx + ox * 0.5, 1.15 + oy * 0.5, -4.9, 0.01, 2.3 + oy, 0.01, WHITE, {
      noShadow: true,
      rot: [0, 0, -ox * 0.4],
    });
  }
  cone(p, x - 3.8, -5);
  cone(p, x + 3.9, -5.2);
}

// arena: portão da garagem arrombado com luz vermelha, o letreiro V8, a plataforma de onde o monstro saiu e pneus
function garage(ctx: EnvCtx, cx: number): void {
  const { p, rng } = ctx;
  const z = WALL_Z + 0.2;
  const w = 12;
  p.box(cx, 2.6, z, w, 5.2, 0.12, 0x1a1c22, { noShadow: true });
  for (const s of [-1, 1]) p.box(cx + s * (w / 2 + 0.25), 2.8, z + 0.1, 0.5, 5.6, 0.5, STEEL_D);
  p.box(cx, 5.6, z + 0.1, w + 1, 0.5, 0.5, STEEL_D);
  // lâminas do portão, as de baixo tortas
  for (let i = 0; i < 9; i++) {
    const y = 5.1 - i * 0.42;
    const bent = i > 5;
    p.box(
      cx + (bent ? rng.range(-0.6, 0.6) : 0),
      y,
      z + 0.14,
      w * (bent ? rng.range(0.4, 0.7) : 1),
      0.36,
      0.05,
      STEEL,
      {
        rot: [bent ? rng.range(-0.3, 0.3) : 0, 0, bent ? rng.range(-0.12, 0.12) : 0],
      },
    );
  }
  p.box(cx, 0.9, z + 0.06, w * 0.8, 1.6, 0.04, 0xff2a1a, { glow: 0.9 });
  // letreiro V8
  const y = 6.5;
  p.box(cx - 0.95, y, z + 0.3, 0.14, 0.9, 0.1, ORANGE, { glow: 2.6, rot: [0, 0, 0.3] });
  p.box(cx - 0.55, y, z + 0.3, 0.14, 0.9, 0.1, ORANGE, { glow: 2.6, rot: [0, 0, -0.3] });
  p.part('torus', [0.19, 0.06], cx + 0.45, y + 0.21, z + 0.3, ORANGE, { glow: 2.6 });
  p.part('torus', [0.23, 0.06], cx + 0.45, y - 0.21, z + 0.3, ORANGE, { glow: 2.6 });
  // plataforma vazia e rachada
  p.cyl(cx, 0.14, -5.2, 2.5, 2.6, 0.28, 0x2a2e36, 20);
  p.cyl(cx, 0.29, -5.2, 2.3, 2.3, 0.03, 0xc8ccd4, 20);
  p.box(cx + 0.3, 0.31, -5.2, 3.6, 0.02, 0.1, 0x16181c, { rot: [0, 0.5, 0], noShadow: true });
  p.box(cx - 0.4, 0.31, -5, 2.4, 0.02, 0.08, 0x16181c, { rot: [0, -0.7, 0], noShadow: true });
  for (const s of [-1, 1]) {
    tireStack(p, cx + s * 5, -5.3, 5);
    tireStack(p, cx + s * 5.7, -5, 3);
    tireStack(p, cx + s * 4.3, -4.9, 2);
    cone(p, cx + s * 7, -4.8);
  }
  ctx.light(cx, 1.4, -4.6, 0xff2a1a, 10, 12, 0.5);
  ctx.light(cx - 5, 3.4, -4, 0xfff0d8, 8, 12, 0.1);
  ctx.light(cx + 5, 3.4, -4, 0xfff0d8, 8, 12, 0.1);
}
