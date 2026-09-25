import type { Rng } from '../../../core/rng';
import type { EnvCtx, Pieces } from '../builder';
import { barrel, rock, sandbags, silhouetteRow } from '../props';

const H = Math.PI / 2;
const MUD = [0x4a3e30, 0x3e3428, 0x55483a, 0x463a2c];
const OLIVE = [0x4a5236, 0x3e4430, 0x545a3c];
const METAL = 0x2e302c;
const RUST = 0x6a4a32;
const WOOD = 0x5a4630;
const WIRE = 0x1e1e1c;
const FIRE = 0xff7a24;
const FIRE_CORE = 0xffc060;
const LAMP = 0xfff0c0;

/** Cratera: centro escuro, halo chamuscado e borda de terra revolvida. */
function crater(p: Pieces, rng: Rng, x: number, z: number, r: number): void {
  p.cyl(x, 0.006, z, r * 1.45, r * 1.5, 0.012, 0x2e271e, 12, { noShadow: true, jitter: 0.06 });
  p.cyl(x, 0.014, z, r, r * 1.05, 0.016, 0x1c1812, 12, { noShadow: true, jitter: 0.08 });
  const n = Math.max(7, Math.round(r * 9));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.2, 0.2);
    const rr = r * rng.range(1.02, 1.2);
    p.part('ico', [rng.range(0.18, 0.28) * Math.min(1.6, r), 0], x + Math.cos(a) * rr, 0.02, z + Math.sin(a) * rr * 0.9, rng.pick(MUD), {
      rot: [rng.next() * 3, rng.next() * 3, rng.next() * 3],
      jitter: 0.15,
    });
  }
}

/** Cerca de arame farpado: estacas tortas, fios horizontais e fios cruzados em X. */
function barbedWire(p: Pieces, rng: Rng, x0: number, x1: number, z: number): void {
  let prev: [number, number] | null = null;
  for (let x = x0; x <= x1; x += rng.range(1.6, 2.2)) {
    const h = rng.range(0.9, 1.15);
    const tilt = rng.range(-0.18, 0.18);
    p.box(x, h / 2, z, 0.07, h, 0.07, 0x3a3024, { rot: [rng.range(-0.1, 0.1), 0, tilt] });
    if (prev) {
      const [px, ph] = prev;
      const len = x - px;
      const mx = (x + px) / 2;
      for (const k of [0.3, 0.6, 0.9]) {
        const y = Math.min(h, ph) * k;
        p.box(mx, y - 0.04, z, len, 0.015, 0.015, WIRE, { rot: [0, 0, rng.range(-0.05, 0.05)], noShadow: true });
      }
      const a = Math.atan2(Math.min(h, ph) * 0.8, len);
      const d = Math.hypot(len, Math.min(h, ph) * 0.8);
      p.box(mx, Math.min(h, ph) * 0.5, z, d, 0.015, 0.015, WIRE, { rot: [0, 0, a], noShadow: true });
      p.box(mx, Math.min(h, ph) * 0.5, z, d, 0.015, 0.015, WIRE, { rot: [0, 0, -a], noShadow: true });
    }
    prev = [x, h];
  }
}

/** Arame farpado baixo em cavaletes (primeiro plano: não bloqueia a visão). */
function lowWire(p: Pieces, rng: Rng, x0: number, x1: number, z: number): void {
  for (let x = x0; x <= x1; x += 1.4) {
    p.box(x, 0.28, z, 0.05, 0.6, 0.05, 0x3a3024, { rot: [0.5, 0, 0.3] });
    p.box(x, 0.28, z, 0.05, 0.6, 0.05, 0x3a3024, { rot: [-0.5, 0, -0.3] });
  }
  const len = x1 - x0;
  for (const [y, dz] of [
    [0.45, 0],
    [0.3, 0.12],
    [0.3, -0.12],
    [0.15, 0],
  ] as const)
    p.box((x0 + x1) / 2, y, z + dz, len, 0.012, 0.012, WIRE, { rot: [0, 0, rng.range(-0.03, 0.03)], noShadow: true });
}

/** Ouriço tcheco: três vigas cruzadas. */
function hedgehog(p: Pieces, rng: Rng, x: number, z: number, s = 1): void {
  const y = 0.55 * s;
  const c = rng.chance(0.5) ? METAL : RUST;
  p.box(x, y, z, 0.1 * s, 1.5 * s, 0.1 * s, c, { rot: [0.95, 0.3, 0] });
  p.box(x, y, z, 0.1 * s, 1.5 * s, 0.1 * s, c, { rot: [-0.95, 0.3, 0] });
  p.box(x, y, z, 1.5 * s, 0.1 * s, 0.1 * s, c, { rot: [0, 0.3, 0.95] });
}

/** Tonel de óleo em chamas. */
function burningDrum(ctx: EnvCtx, x: number, z: number, light = true): void {
  const { p, rng } = ctx;
  barrel(p, x, z, rng.pick([RUST, 0x3a3a34, 0x4a5236]));
  p.cyl(x, 1.01, z, 0.34, 0.34, 0.02, 0x1a1008, 9, { noShadow: true });
  for (let i = 0; i < 3; i++) {
    const s = rng.range(0.7, 1.1);
    const dx = rng.range(-0.15, 0.15);
    const dz = rng.range(-0.12, 0.12);
    p.cone(x + dx, 1.25 * s, z + dz, 0.2 * s, 0.6 * s, FIRE, 5, { glow: 2, rot: [0, rng.next() * 3, rng.range(-0.15, 0.15)] });
    p.cone(x + dx, 1.18 * s, z + dz + 0.03, 0.1 * s, 0.35 * s, FIRE_CORE, 5, { glow: 2.6 });
  }
  if (light) ctx.light(x, 1.8, z + 0.6, 0xff8a3a, 9, 8, 0.8);
}

/** Pilha de caixas militares. */
function crateStack(p: Pieces, rng: Rng, x: number, z: number): void {
  const n = rng.int(2, 5);
  for (let i = 0; i < n; i++) {
    const s = rng.range(0.55, 0.8);
    const lvl = i < 3 ? 0 : 1;
    const cx = x + (lvl ? rng.range(-0.3, 0.3) : (i - 1) * 0.75);
    const cz = z + rng.range(-0.15, 0.15);
    const col = rng.pick(OLIVE);
    p.box(cx, lvl * 0.72 + s * 0.35, cz, s * 1.25, s * 0.7, s * 0.8, col, { rot: [0, rng.range(-0.15, 0.15), 0] });
    p.box(cx, lvl * 0.72 + s * 0.35, cz + s * 0.405, s * 0.5, s * 0.14, 0.01, 0xc8b88a, { noShadow: true });
  }
}

/** Carcaça de tanque (com torre deslocada às vezes). */
function tankWreck(ctx: EnvCtx, x: number, z: number, dir: number): void {
  const { p, rng } = ctx;
  const col = rng.pick(OLIVE);
  const yaw = rng.range(-0.25, 0.25);
  const off = (dx: number, dz: number): [number, number] => [
    x + dx * Math.cos(yaw) + dz * Math.sin(yaw),
    z - dx * Math.sin(yaw) + dz * Math.cos(yaw),
  ];
  // esteiras
  for (const side of [-1, 1]) {
    const [tx, tz] = off(0, side * 1.35);
    p.box(tx, 0.5, tz, 5.2, 0.95, 0.62, 0x22221e, { rot: [0, yaw, 0] });
    for (let i = -2; i <= 2; i++) {
      const [wx, wz] = off(i * 0.95, side * 1.68);
      p.cyl(wx, 0.42, wz, 0.34, 0.34, 0.06, 0x3a3a34, 8, { rot: [H, yaw, 0] });
    }
  }
  // casco
  const [hx, hz] = off(0, 0);
  p.box(hx, 1.05, hz, 4.8, 0.8, 2.6, col, { rot: [0, yaw, 0], jitter: 0.1 });
  const [fx, fz] = off(dir * 2.55, 0);
  p.box(fx, 0.85, fz, 0.9, 0.7, 2.5, col, { rot: [0, yaw, dir * 0.6] });
  // torre
  const knocked = rng.chance(0.35);
  const [tx, tz] = knocked ? off(-dir * 3.2, rng.range(1.6, 2.2)) : off(-dir * 0.3, 0);
  const ty = knocked ? 0.45 : 1.8;
  const tr: [number, number, number] = knocked ? [0.3, yaw, dir * 0.5] : [0, yaw, 0];
  p.cyl(tx, ty, tz, 0.95, 1.1, 0.75, col, 9, { rot: tr, jitter: 0.1 });
  p.box(tx, ty + 0.45, tz, 0.5, 0.15, 0.5, METAL, { rot: tr });
  const bx = tx + dir * 1.7;
  const by = knocked ? 0.35 : 1.85 + rng.range(-0.1, 0.25);
  p.cyl(bx, by, tz, 0.09, 0.12, 2.6, METAL, 7, { rot: [0, yaw, -dir * (H - (knocked ? 0.15 : rng.range(-0.15, 0.08)))] });
  // queimaduras e fogo no motor
  p.box(hx - dir * 1.2, 1.46, hz, 1.2, 0.02, 1.6, 0x16140f, { noShadow: true });
  if (rng.chance(0.6)) {
    for (let i = 0; i < 3; i++)
      p.cone(hx - dir * rng.range(0.8, 1.8), 1.8, hz + rng.range(-0.5, 0.5), 0.22, 0.7, FIRE, 5, { glow: 1.8 });
    ctx.light(hx - dir * 1.3, 2.4, hz + 1.2, 0xff8a3a, 10, 9, 0.8);
  }
}

/** Canhão de artilharia destruído atrás de sacos de areia. */
function artilleryWreck(ctx: EnvCtx, x: number, z: number): void {
  const { p, rng } = ctx;
  const col = rng.pick(OLIVE);
  for (const s of [-1, 1]) {
    p.cyl(x, 0.62, z + s * 0.75, 0.6, 0.6, 0.12, 0x2a2a26, 10, { rot: [H, 0, 0] });
    p.cyl(x, 0.62, z + s * 0.82, 0.14, 0.14, 0.1, 0x55503a, 6, { rot: [H, 0, 0] });
    // pernas da carreta abertas no chão
    p.box(x - 1.4, 0.18, z + s * 0.5, 2.6, 0.16, 0.16, col, { rot: [0, s * 0.3, 0.08] });
  }
  p.box(x + 0.2, 1.05, z, 0.1, 1.1, 1.8, col, { rot: [0, 0, -0.12] });
  const elev = rng.range(0.25, 0.7);
  p.cyl(x + 1.3, 1.0 + Math.sin(elev) * 1.1, z, 0.08, 0.13, 2.8, METAL, 7, { rot: [0, 0, -(H - elev)] });
  p.box(x - 0.2, 0.85, z, 0.9, 0.35, 0.6, METAL);
  // cápsulas e caixas de munição
  for (let i = 0; i < 5; i++)
    p.cyl(x - 1 + rng.range(-0.8, 0.8), 0.07, z + rng.range(-1.2, 1.2), 0.06, 0.06, 0.4, 0xb08a4a, 6, {
      rot: [H, rng.next() * 3, 0],
      noShadow: true,
    });
  sandbags(p, x + 0.6, z + 1.9, 6);
}

/** Torre de holofote (luz forte, lâmpada emissiva). */
function searchlight(ctx: EnvCtx, x: number, z: number): void {
  const { p } = ctx;
  const h = 3.1;
  for (const [dx, dz] of [
    [-0.6, -0.6],
    [0.6, -0.6],
    [-0.6, 0.6],
    [0.6, 0.6],
  ] as const)
    p.box(x + dx * 0.8, h / 2, z + dz * 0.8, 0.1, h, 0.1, WOOD, { rot: [-dz * 0.08, 0, dx * 0.08] });
  p.box(x, h * 0.45, z, 1.1, 0.06, 0.06, WOOD, { rot: [0, 0, 0.7] });
  p.box(x, h, z, 1.5, 0.12, 1.5, WOOD);
  p.box(x, h + 0.35, z - 0.7, 1.5, 0.6, 0.06, WOOD);
  p.cyl(x, h + 0.55, z, 0.3, 0.36, 0.55, METAL, 8, { rot: [1.1, 0, 0.3] });
  p.cyl(x + 0.08, h + 0.72, z + 0.24, 0.27, 0.27, 0.03, LAMP, 10, { rot: [1.1, 0, 0.3], glow: 3.2 });
  ctx.light(x + 0.6, h, z + 2, LAMP, 20, 16, 0.05);
}

/** Casamata de concreto com fenda de tiro e sacos de areia. */
function bunker(ctx: EnvCtx, x: number, z: number): void {
  const { p, rng } = ctx;
  const c = rng.pick([0x5a5650, 0x4e4a44]);
  p.box(x, 0.8, z, 4.2, 1.6, 3, c, { jitter: 0.08 });
  p.box(x, 1.7, z, 4.6, 0.25, 3.3, c);
  p.box(x, 1.05, z + 1.51, 2.6, 0.22, 0.04, 0x0c0a08);
  sandbags(p, x - 0.4, z + 1.8, 7);
  if (rng.chance(0.5)) p.box(x + 1.2, 1.3, z + 1.52, 0.2, 0.08, 0.04, 0xff6a2a, { glow: 1.5 });
}

/** Trincheira: fundo escuro, taludes de terra, revestimento de tábuas e sacos de areia. */
function trench(ctx: EnvCtx, x0: number, x1: number, z: number): void {
  const { p, rng } = ctx;
  const len = x1 - x0;
  const mx = (x0 + x1) / 2;
  p.box(mx, 0.01, z, len, 0.02, 1.3, 0x14110c, { noShadow: true });
  for (const s of [-1, 1]) {
    p.box(mx, 0.22, z + s * 1.05, len, 0.44, 0.8, rng.pick(MUD), { rot: [s * 0.25, 0, 0], jitter: 0.1 });
    for (let x = x0 + 0.3; x < x1; x += 0.9)
      p.box(x, 0.3, z + s * 0.66, 0.85, 0.5, 0.05, WOOD, { rot: [0, 0, rng.range(-0.04, 0.04)], jitter: 0.15 });
  }
  for (let x = x0 + 1; x < x1 - 1; x += 3.4) sandbags(p, x, z + 1.55, 5);
  for (let x = x0 + 0.5; x < x1; x += 2.2) p.box(x, 0.5, z + 0.7, 0.08, 1, 0.08, WOOD);
}

/** Toco de árvore estilhaçado. */
function stump(p: Pieces, rng: Rng, x: number, z: number): void {
  const h = rng.range(1.2, 3.2);
  const c = rng.pick([0x2e261e, 0x3a3026, 0x262018]);
  p.cyl(x, h / 2, z, 0.14, 0.24, h, c, 6, { rot: [rng.range(-0.08, 0.08), 0, rng.range(-0.12, 0.12)] });
  for (let i = 0; i < 3; i++)
    p.cone(x + rng.range(-0.08, 0.08), h + 0.15, z + rng.range(-0.08, 0.08), 0.06, rng.range(0.3, 0.6), c, 4, {
      rot: [rng.range(-0.4, 0.4), 0, rng.range(-0.4, 0.4)],
    });
  if (rng.chance(0.5))
    p.cyl(x + 0.4, h * 0.6, z, 0.03, 0.06, 1.1, c, 4, { rot: [0, 0, -1] });
}

/** Coluna de fumaça cinza. */
function smoke(p: Pieces, rng: Rng, x: number, z: number, s: number): void {
  let y = 0.5;
  let r = 0.9 * s;
  for (let i = 0; i < 6; i++) {
    p.part('ico', [r, 0], x + i * 0.6 * s, y, z, rng.pick([0x3a3630, 0x46403a, 0x2e2a26]), {
      noShadow: true,
      jitter: 0.1,
      rot: [rng.next() * 3, rng.next() * 3, 0],
    });
    y += r * 1.3;
    r *= 1.22;
  }
}

/**
 * Campo de Guerra: terra de ninguém ao entardecer. Crateras, sacos de areia, arame farpado,
 * tanques e canhões destruídos, trincheiras, tonéis em chamas, holofotes e fumaça distante.
 */
export function guerraTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const back = z0 - 0.7;
  const front = z1 + 0.7;
  const boss = ctx.level.boss;
  const arena0 = boss ? boss.lock[0] : Infinity;
  const arena1 = boss ? boss.lock[1] : -Infinity;

  // ------------------------------------------------------------ chão: crateras e marcas
  for (let i = 0; i < ctx.dense(28); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const inLane = rng.chance(0.35);
    const z = inLane ? rng.range(z0 + 0.6, z1 - 0.6) : rng.chance(0.6) ? rng.range(-11, back - 1) : rng.range(front + 1, front + 4);
    crater(p, rng, x, z, inLane ? rng.range(0.6, 1.1) : rng.range(0.9, 2.2));
  }
  for (let i = 0; i < ctx.dense(40); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    p.cyl(x, 0.005, rng.range(-10, 5), rng.range(0.3, 0.8), rng.range(0.4, 1), 0.01, 0x2a241c, 7, { noShadow: true });
  }
  // marcas de esteira atravessando a faixa
  for (let x = ctx.x0 + 10; x < ctx.x1; x += rng.range(25, 40)) {
    const a = rng.range(-0.25, 0.25);
    for (const dz of [-0.9, 0.9])
      for (let k = 0; k < 18; k++)
        p.box(x + k * 0.55, 0.012, -1 + dz + Math.tan(a) * k * 0.55, 0.16, 0.02, 0.45, 0x3a3226, {
          rot: [0, -a, 0],
          noShadow: true,
        });
  }

  // ------------------------------------------------------------ borda do fundo
  let x = ctx.x0;
  while (x < ctx.x1) {
    const w = rng.range(4, 8);
    const r = rng.next();
    const z = back - rng.range(0, 0.6);
    if (r < 0.4) {
      for (let sx = x; sx < x + w; sx += 2.6) sandbags(p, sx + 1.3, z, 5);
      if (rng.chance(0.5)) sandbags(p, x + w / 2, z - 0.1, 3);
    } else if (r < 0.65) barbedWire(p, rng, x, x + w, z - 0.2);
    else if (r < 0.8) {
      hedgehog(p, rng, x + 1, z - 0.3);
      if (rng.chance(0.6)) hedgehog(p, rng, x + 2.6, z - 0.6, 0.9);
    } else crateStack(p, rng, x + w / 2, z - 0.3);
    if (rng.chance(0.18)) burningDrum(ctx, x + rng.range(0.5, w - 0.5), z + 0.2);
    x += w + rng.range(0.2, 1.5);
  }

  // ------------------------------------------------------------ primeiro plano (baixo)
  for (let fx = ctx.x0; fx < ctx.x1; fx += rng.range(6, 12)) {
    const r = rng.next();
    const z = front + rng.range(0, 0.5);
    if (r < 0.45) lowWire(p, rng, fx, fx + rng.range(2.8, 5.6), z + 0.1);
    else if (r < 0.6) sandbags(p, fx, z + 0.1, rng.int(2, 3));
    else if (r < 0.72) burningDrum(ctx, fx, z + 0.2, false);
    for (let i = 0; i < 3; i++) rock(p, rng, fx + rng.range(-2, 2), z + rng.range(0, 1.5), 0.3, rng.pick(MUD));
  }
  // cápsulas e destroços espalhados fora da faixa
  for (let i = 0; i < ctx.dense(50); i++) {
    const cx = rng.range(ctx.x0, ctx.x1);
    const cz = rng.chance(0.6) ? rng.range(back - 3, back) : rng.range(front, front + 2.5);
    if (rng.chance(0.5))
      p.cyl(cx, 0.04, cz, 0.035, 0.035, 0.18, 0x9a7a44, 6, { rot: [H, rng.next() * 3, 0], noShadow: true });
    else p.box(cx, 0.05, cz, rng.range(0.2, 0.6), 0.08, rng.range(0.1, 0.3), rng.pick([METAL, RUST, WOOD]), { rot: [0, rng.next() * 3, 0] });
  }

  // ------------------------------------------------------------ plano médio
  let mx = ctx.x0 + rng.range(0, 6);
  while (mx < ctx.x1) {
    const r = rng.next();
    const inArena = mx > arena0 - 4 && mx < arena1 + 4;
    const z = rng.range(-8.5, -6.8);
    let w = 6;
    if (r < 0.26 && !inArena) {
      tankWreck(ctx, mx + 2.6, z - 0.8, rng.chance(0.5) ? 1 : -1);
      w = 7.5;
    } else if (r < 0.44) {
      artilleryWreck(ctx, mx + 1.5, z);
      w = 5;
    } else if (r < 0.58) {
      bunker(ctx, mx + 2, z - 0.8);
      w = 5.5;
    } else if (r < 0.72) {
      searchlight(ctx, mx + 1, z + 0.5);
      burningDrum(ctx, mx + 2.4, z + 1.2);
      w = 4;
    } else if (r < 0.86) {
      for (let i = 0; i < 3; i++) stump(p, rng, mx + i * 1.5 + rng.range(-0.4, 0.4), z + rng.range(-1, 1));
      w = 5;
    } else {
      crateStack(p, rng, mx + 1, z + 0.8);
      burningDrum(ctx, mx + 2.6, z + 1);
      w = 4;
    }
    mx += w + rng.range(1, 4);
  }
  // trincheira contínua (com interrupções) mais ao fundo
  for (let tx = ctx.x0; tx < ctx.x1; tx += rng.range(3, 8)) {
    const len = rng.range(10, 18);
    trench(ctx, tx, tx + len, -11.5 + rng.range(-0.4, 0.4));
    tx += len;
  }
  // postes telegráficos com fios caídos
  for (let px = ctx.x0 + 5; px < ctx.x1; px += rng.range(12, 18)) {
    const h = rng.range(5, 6.5);
    const tilt = rng.range(-0.2, 0.2);
    p.cyl(px, h / 2, -9.8, 0.09, 0.12, h, 0x3a2e22, 6, { rot: [0, 0, tilt] });
    p.box(px - Math.sin(tilt) * h * 0.45, h * 0.92, -9.8, 1.2, 0.08, 0.08, 0x3a2e22, { rot: [0, 0, tilt] });
    p.box(px + 2.5, h * 0.62, -9.8, 5, 0.02, 0.02, WIRE, { rot: [0, 0, -0.35], noShadow: true });
  }
  // tanques e tocos mais distantes
  for (let tx = ctx.x0 + 8; tx < ctx.x1; tx += rng.range(22, 34)) tankWreck(ctx, tx, -16 - rng.range(0, 3), rng.chance(0.5) ? 1 : -1);
  for (let i = 0; i < ctx.dense(24); i++) stump(p, rng, rng.range(ctx.x0, ctx.x1), rng.range(-22, -13));

  // ------------------------------------------------------------ horizonte
  silhouetteRow(ctx, -34, 0x2e2a22, 4, 9, 14, 'hills');
  silhouetteRow(ctx, -48, 0x24211c, 8, 16, 20, 'hills');
  // ruínas de vila no horizonte
  for (let rx = ctx.x0 - 10; rx < ctx.x1 + 10; rx += rng.range(10, 22)) {
    const n = rng.int(2, 4);
    for (let i = 0; i < n; i++) {
      const h = rng.range(2.5, 6);
      p.box(rx + i * 2.2, h / 2, -27, 2, h, 2, rng.pick([0x3a342c, 0x332e28]), { noShadow: true, jitter: 0.08 });
      p.box(rx + i * 2.2 + 0.5, h + 0.4, -27, 0.8, 0.8, 2, 0x3a342c, { noShadow: true, rot: [0, 0, 0.5] });
    }
    if (rng.chance(0.4)) {
      p.box(rx + 1, 1, -25.9, 1.4, 0.8, 0.1, 0xff7a2a, { glow: 1.2 });
      smoke(p, rng, rx + 1, -26.5, 1.3);
    }
  }
  for (let i = 0; i < ctx.dense(8); i++) smoke(p, rng, rng.range(ctx.x0, ctx.x1), rng.range(-24, -18), rng.range(1, 1.8));

  // ------------------------------------------------------------ arena do chefe: posto de comando
  if (boss) {
    const ax = (arena0 + arena1) / 2;
    const cz = back - 2.8;
    bunker(ctx, ax - 3, cz - 0.6);
    searchlight(ctx, ax + 4.5, cz);
    searchlight(ctx, ax - 8.5, cz + 0.2);
    // mastro com bandeira rasgada
    p.cyl(ax + 1.2, 3, cz, 0.05, 0.06, 6, 0x6a6a64, 6);
    p.box(ax + 1.95, 5.3, cz, 1.4, 0.8, 0.03, 0x5a2a22, { rot: [0, 0.1, -0.08] });
    // gelo se espalhando: cristais pálidos ao fundo (o chefe congela o posto)
    for (let i = 0; i < 14; i++) {
      const ix = ax + rng.range(-11, 11);
      const iz = back - rng.range(0.2, 2.2);
      p.part('oct', [rng.range(0.2, 0.45), 0], ix, rng.range(0.1, 0.3), iz, rng.pick([0x7ab4cc, 0x8ac4da, 0x6a9cb4]), {
        rot: [rng.next(), rng.next() * 3, rng.next()],
      });
    }
    for (let i = 0; i < 6; i++)
      p.cyl(ax + rng.range(-10, 10), 0.008, back - rng.range(0, 1.5), rng.range(0.6, 1.4), rng.range(0.7, 1.5), 0.01, 0x6a8a98, 9, { noShadow: true });
  }
}
