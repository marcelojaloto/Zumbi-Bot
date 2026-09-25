import type { EnvCtx } from '../builder';
import { carWreck, lamppost, silhouetteRow } from '../props';

const NEON_M = 0xff3ad7;
const NEON_C = 0x3af0ff;
const NEONS = [NEON_M, NEON_C, NEON_M, NEON_C, 0xffb02a, 0x7a5aff];
const WALLS = [0x2c2c36, 0x342c30, 0x262c36, 0x36322e, 0x2e2834, 0x30343a];
const WINDOWS = [0xffc86a, 0xffd89a, 0x8ad8ff, 0xff9a6a];
const SHOPS = [0xffc070, 0x7ad0ff, 0xff8ad8, 0x9affb0, 0xfff0c0];
const WALK = 0x2e2e36;
const CURB = 0x55555c;

/** Fachada de prédio: térreo com vitrines, letreiros de neon e toldos (a câmera vê só até ~5 m de altura). */
function building(ctx: EnvCtx, x: number, w: number, h: number, zf: number): void {
  const { p, rng } = ctx;
  const d = 6;
  const wall = rng.pick(WALLS);
  p.box(x, h / 2, zf - d / 2, w, h, d, wall, { jitter: 0.06 });
  p.box(x, h + 0.15, zf - d / 2, w + 0.3, 0.3, d + 0.3, 0x1c1c22);
  // pilares e marquise
  p.box(x - w / 2 + 0.2, 2.1, zf + 0.1, 0.4, 4.2, 0.2, 0x1e1e26);
  p.box(x + w / 2 - 0.2, 2.1, zf + 0.1, 0.4, 4.2, 0.2, 0x1e1e26);
  p.box(x, 4.05, zf + 0.12, w, 0.22, 0.24, 0x1a1a22);
  // janelas dos andares de cima
  const cols = Math.max(2, Math.floor(w / 1.7));
  const lit = rng.range(0.3, 0.6);
  for (let fy = 5.1; fy < h - 1; fy += 2.8) {
    for (let c = 0; c < cols; c++) {
      const wx = x - w / 2 + (c + 0.5) * (w / cols);
      const on = rng.chance(lit);
      p.box(
        wx,
        fy,
        zf + 0.02,
        0.85,
        1.2,
        0.05,
        on ? rng.pick(WINDOWS) : 0x0a0c12,
        on ? { glow: rng.range(0.5, 1.1) } : {},
      );
      p.box(wx, fy - 0.66, zf + 0.06, 1.0, 0.08, 0.12, 0x1a1a20, { noShadow: true });
    }
  }
  // lojas do térreo
  const shops = w > 10 ? 2 : 1;
  for (let k = 0; k < shops; k++) {
    const sx = x - w / 2 + ((k + 0.5) * w) / shops + rng.range(-0.3, 0.3);
    const sw = Math.min(w / shops - 1.4, rng.range(2.8, 4.6));
    const shop = rng.pick(SHOPS);
    const dark = rng.chance(0.25);
    // vitrine: vidro iluminado por dentro, caixilhos, prateleiras
    p.box(
      sx,
      1.45,
      zf + 0.03,
      sw,
      2.1,
      0.04,
      dark ? 0x0c0e14 : shop,
      dark ? {} : { glow: rng.range(0.07, 0.11) },
    );
    for (let m = 0; m <= Math.round(sw / 1.2); m++)
      p.box(sx - sw / 2 + (m * sw) / Math.round(sw / 1.2), 1.45, zf + 0.07, 0.06, 2.1, 0.04, 0x121216, {
        noShadow: true,
      });
    p.box(sx, 2.25, zf + 0.07, sw, 0.05, 0.04, 0x121216, { noShadow: true });
    p.box(sx, 0.22, zf + 0.06, sw + 0.1, 0.44, 0.06, 0x16161c);
    if (!dark)
      for (let q = 0; q < 3; q++)
        p.box(
          sx + rng.range(-sw / 2 + 0.3, sw / 2 - 0.3),
          rng.range(0.7, 1.4),
          zf + 0.06,
          rng.range(0.2, 0.6),
          rng.range(0.3, 0.7),
          0.03,
          0x14141a,
          {
            noShadow: true,
          },
        );
    if (!dark && rng.chance(0.6)) ctx.light(sx, 1.4, zf + 1.4, shop, 3.5, 6, 0.08);
    // porta
    p.box(sx + sw / 2 + 0.55, 1.1, zf + 0.04, 0.9, 2.2, 0.05, 0x14141a);
    // toldo
    if (rng.chance(0.55)) {
      const aw = rng.pick([0x6a1a3a, 0x1a3a5a, 0x3a1a5a, 0x5a2a1a, 0x1a4a3a]);
      p.box(sx, 2.8, zf + 0.6, sw + 0.4, 0.08, 1.2, aw, { rot: [0.3, 0, 0] });
      p.box(sx, 2.55, zf + 1.18, sw + 0.4, 0.3, 0.04, aw);
    }
    // letreiro de neon (moldura + barras) com luz
    const neon = rng.pick(NEONS);
    const nw = Math.min(sw + 0.4, rng.range(2.4, 4));
    const ny = rng.range(3.25, 3.55);
    p.box(sx, ny, zf + 0.14, nw, 0.62, 0.08, 0x101016);
    p.box(sx, ny - 0.1, zf + 0.2, nw - 0.35, 0.09, 0.03, neon, { glow: 3.2 });
    p.box(sx, ny + 0.1, zf + 0.2, (nw - 0.35) * rng.range(0.4, 0.9), 0.06, 0.03, neon, { glow: 2.4 });
    p.box(sx - nw / 2 + 0.08, ny, zf + 0.2, 0.05, 0.5, 0.03, neon, { glow: 2.4 });
    p.box(sx + nw / 2 - 0.08, ny, zf + 0.2, 0.05, 0.5, 0.03, neon, { glow: 2.4 });
    ctx.light(sx, ny - 0.3, zf + 1.8, neon, 7, 9, 0.12);
  }
  // letreiro vertical saliente (visível na altura da câmera)
  if (rng.chance(0.5)) {
    const vn = rng.pick(NEONS);
    const vx = x + (rng.chance(0.5) ? -1 : 1) * (w / 2 - 0.25);
    const vh = rng.range(2.4, 3.6);
    const vy = 3.4 + vh / 2;
    p.box(vx, vy, zf + 0.75, 0.22, vh, 1.1, 0x121218);
    p.box(vx + 0.12, vy, zf + 0.75, 0.03, vh - 0.35, 0.8, vn, { glow: 2.8 });
    p.box(vx - 0.12, vy, zf + 0.75, 0.03, vh - 0.35, 0.8, vn, { glow: 2.8 });
    for (let k = 0; k < 3; k++)
      p.box(vx + 0.125, vy - vh / 2 + 0.5 + k * ((vh - 1) / 2), zf + 0.75, 0.02, 0.18, 0.5, 0xffffff, {
        glow: 2,
      });
    ctx.light(vx, vy, zf + 2.2, vn, 6, 10, 0.25);
  }
  // telhado
  if (rng.chance(0.5)) {
    p.cyl(x + w * 0.2, h + 1.3, zf - 3, 0.9, 0.9, 1.6, 0x3a3228, 8);
    p.box(x + w * 0.2, h + 0.45, zf - 3, 1.4, 0.3, 1.4, 0x1a1a1a);
  }
  if (rng.chance(0.6)) p.box(x - w * 0.25, h + 0.5, zf - 2, 1.2, 0.7, 1.0, 0x4a4e56);
}

/** Poça escura com reflexo de neon (plana: pode ficar no caminho). */
function puddle(ctx: EnvCtx, x: number, z: number, r: number): void {
  const { p, rng } = ctx;
  p.part('cyl', [r, r * 0.9, 0.012, 9], x, 0.008, z, 0x0e1018, { glow: 0.8, rot: [0, rng.range(0, 3), 0] });
  const c = rng.pick([NEON_M, NEON_C, 0xffc86a]);
  p.box(x + rng.range(-r, r) * 0.3, 0.016, z, r * rng.range(0.6, 1.2), 0.006, 0.06, c, { glow: 0.55 });
  if (rng.chance(0.5))
    p.box(x + rng.range(-r, r) * 0.3, 0.016, z + 0.15, r * 0.5, 0.006, 0.05, c, { glow: 0.4 });
}

function busStop(ctx: EnvCtx, x: number, z: number): void {
  const { p } = ctx;
  for (const dx of [-1.6, 1.6]) p.box(x + dx, 1.3, z, 0.08, 2.6, 0.08, 0x2a2e36);
  p.box(x, 2.65, z + 0.3, 3.6, 0.1, 1.5, 0x3a3e46);
  p.box(x, 1.4, z - 0.4, 3.2, 1.9, 0.04, 0x3a6a8a, { glow: 0.22 });
  p.box(x + 1.1, 1.4, z - 0.36, 1.1, 1.6, 0.05, 0xffe0b0, { glow: 0.45 });
  p.box(x + 1.1, 2.24, z - 0.33, 1.2, 0.05, 0.03, NEON_C, { glow: 2.2 });
  p.box(x + 1.1, 0.56, z - 0.33, 1.2, 0.05, 0.03, NEON_C, { glow: 2.2 });
  p.box(x - 0.5, 0.45, z - 0.15, 1.8, 0.08, 0.45, 0x5a4a3a);
  p.box(x - 0.5, 0.22, z - 0.15, 0.08, 0.44, 0.3, 0x2a2e36);
  ctx.light(x + 1, 1.8, z + 1, 0xffe0b0, 3, 6, 0.1);
}

function trafficLight(ctx: EnvCtx, x: number, z: number, green: boolean): void {
  const { p } = ctx;
  p.cyl(x, 2.4, z, 0.07, 0.09, 4.8, 0x2a2e36, 6);
  p.box(x, 4.6, z + 0.7, 0.08, 0.08, 1.4, 0x2a2e36);
  p.box(x, 4.2, z + 1.35, 0.36, 1.0, 0.3, 0x1a1c22);
  p.sphere(x, 4.52, z + 1.51, 0.1, 0xff2a2a, green ? { glow: 0.4 } : { glow: 4 });
  p.sphere(x, 4.2, z + 1.51, 0.1, 0xffb02a, { glow: 0.4 });
  p.sphere(x, 3.88, z + 1.51, 0.1, 0x3aff7a, green ? { glow: 4 } : { glow: 0.4 });
  ctx.light(x, 4.2, z + 2, green ? 0x3aff7a : 0xff2a2a, 3, 5, 0);
}

function barricade(ctx: EnvCtx, x: number, z: number): void {
  const { p, rng } = ctx;
  const rot = rng.range(-0.25, 0.25);
  for (const dx of [-0.8, 0.8]) p.box(x + dx, 0.45, z, 0.08, 0.9, 0.5, 0x6a6a70, { rot: [0, rot, 0] });
  for (let i = 0; i < 4; i++)
    p.box(x - 0.6 + i * 0.4, 0.75, z + 0.02, 0.4, 0.22, 0.05, i % 2 ? 0xe8e8e8 : 0xd02a2a, {
      rot: [0, rot, 0],
    });
  p.box(x + 0.6, 0.95, z, 0.1, 0.1, 0.1, 0xffa02a, { glow: 3 });
}

function jersey(ctx: EnvCtx, x: number, z: number): void {
  const { p, rng } = ctx;
  p.box(x, 0.4, z, 2, 0.8, 0.5, 0x7a7a7e, { rot: [0, rng.range(-0.15, 0.15), 0], jitter: 0.08 });
  p.box(x, 0.08, z, 2, 0.16, 0.7, 0x6a6a6e);
}

/** Centro em ruínas sob chuva: avenida com faixas, prédios com neon, postes, carros destruídos e poças. */
export function centroTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const back = z0 - 1.1; // meio-fio de trás
  const front = z1 + 1.1; // meio-fio da frente

  // calçadas e meios-fios
  for (let x = ctx.x0; x < ctx.x1; x += 2) {
    p.box(x + 1, 0.07, back - 1.5, 1.97, 0.14, 2.9, rng.pick([WALK, 0x32323a, 0x36363e]), {
      noShadow: true,
      jitter: 0.04,
    });
    p.box(x + 1, 0.08, back, 2, 0.16, 0.2, CURB, { noShadow: true });
    p.box(x + 1, 0.07, front + 1.2, 1.97, 0.14, 2.2, rng.pick([0x26262c, 0x2a2a30]), {
      noShadow: true,
      jitter: 0.04,
    });
    p.box(x + 1, 0.08, front, 2, 0.16, 0.2, CURB, { noShadow: true });
  }

  // faixas da avenida: dupla amarela no centro e tracejadas brancas
  const mid = (z0 + z1) / 2;
  for (let x = ctx.x0; x < ctx.x1; x += 4) {
    p.box(x + 2, 0.006, mid - 0.09, 4, 0.01, 0.1, 0xd8b030, { noShadow: true, glow: 0.35 });
    p.box(x + 2, 0.006, mid + 0.09, 4, 0.01, 0.1, 0xd8b030, { noShadow: true, glow: 0.35 });
    p.box(x + 1, 0.006, z0 + 0.35, 2, 0.01, 0.1, 0xd8d8d8, { noShadow: true, glow: 0.3 });
    p.box(x + 1, 0.006, z1 - 0.25, 2, 0.01, 0.1, 0xd8d8d8, { noShadow: true, glow: 0.3 });
  }
  // faixas de pedestre, semáforos e barricadas nas esquinas
  for (let cx = 38; cx < ctx.x1 - 10; cx += 48) {
    for (let k = 0; k < 7; k++)
      p.box(cx + (k - 3) * 0.9, 0.008, (back + front) / 2, 0.5, 0.012, front - back - 0.4, 0xcfcfcf, {
        noShadow: true,
        glow: 0.28,
      });
    trafficLight(ctx, cx - 4, back - 0.5, rng.chance(0.5));
    barricade(ctx, cx + 5, back - 0.6);
  }
  // bueiros e remendos
  for (let x = ctx.x0 + 5; x < ctx.x1; x += rng.range(12, 20))
    p.part('cyl', [0.4, 0.4, 0.012, 10], x, 0.008, rng.range(z0 + 0.5, z1 - 0.5), 0x2a2a2e, {
      noShadow: true,
    });
  for (let i = 0; i < ctx.dense(26); i++)
    puddle(ctx, rng.range(ctx.x0, ctx.x1), rng.range(z0 - 0.3, z1 + 0.3), rng.range(0.4, 1.1));

  // prédios ao fundo
  let x = ctx.x0;
  while (x < ctx.x1) {
    const w = rng.range(7, 13);
    const h = rng.range(9, 22);
    building(ctx, x + w / 2, w, h, -8 - rng.range(0, 1.2));
    x += w + rng.range(0.3, 2.5);
  }
  // segunda fileira mais alta atrás
  for (let bx = ctx.x0; bx < ctx.x1; bx += rng.range(9, 15)) {
    const h = rng.range(20, 34);
    const w = rng.range(7, 11);
    p.box(bx, h / 2, -19, w, h, 6, 0x1c1a24, { noShadow: true });
    for (let fy = 6; fy < h - 1; fy += 3)
      for (let c = 0; c < 3; c++)
        if (rng.chance(0.28))
          p.box(bx - w / 3 + (c * w) / 3, fy, -15.97, 1, 1.3, 0.05, rng.pick(WINDOWS), {
            glow: rng.range(0.6, 1.2),
          });
  }
  silhouetteRow(ctx, -30, 0x15122a, 14, 30, 9, 'city');
  silhouetteRow(ctx, -44, 0x0f0d1e, 20, 42, 12, 'city');

  // postes de luz na calçada de trás
  for (let lx = 4; lx < ctx.x1; lx += rng.range(14, 18)) lamppost(ctx, lx, back - 0.45, 0xffc890, 4.2, 14);

  // pontos de ônibus, barreiras e carros destruídos na calçada
  for (let bx = 20; bx < ctx.x1 - 8; bx += rng.range(40, 60)) busStop(ctx, bx, back - 2);
  for (let i = 0; i < ctx.dense(8); i++) jersey(ctx, rng.range(ctx.x0, ctx.x1), back - rng.range(0.6, 1.2));
  for (let cx = ctx.x0 + rng.range(4, 10); cx < ctx.x1; cx += rng.range(14, 22))
    carWreck(
      p,
      rng,
      cx,
      back - rng.range(1.6, 2.3),
      rng.pick([0x5a2a2a, 0x2a3a5a, 0x4a4a4e, 0x6a5a2a, 0x2a4a3a]),
    );
  // hidrantes, lixeiras, caixas de jornal e sacos de lixo
  for (let i = 0; i < ctx.dense(18); i++) {
    const hx = rng.range(ctx.x0, ctx.x1);
    const kind = rng.int(0, 3);
    const hz = back - rng.range(0.5, 2.4);
    if (kind === 0) {
      p.cyl(hx, 0.3, hz, 0.12, 0.14, 0.6, 0xb02a2a, 7);
      p.sphere(hx, 0.62, hz, 0.12, 0xb02a2a);
    } else if (kind === 1) p.cyl(hx, 0.45, hz, 0.28, 0.25, 0.9, 0x2a3a2e, 8);
    else if (kind === 2) p.box(hx, 0.5, hz, 0.5, 1.0, 0.45, rng.pick([0x2a4aa0, 0xa02a2a, 0x2a8a4a]));
    else for (let k = 0; k < 3; k++) p.ico(hx + k * 0.35, 0.25, hz + rng.range(-0.2, 0.2), 0.3, 0x141418);
  }

  // placas de neon quebradas onde há choque no chão
  for (const s of ctx.level.segments)
    for (const h of s.hazards ?? []) {
      if (h.kind !== 'electricTile') continue;
      const nc = rng.pick([NEON_M, NEON_C]);
      p.box(h.x, 0.06, h.z, (h.w ?? 2) * 0.9, 0.1, (h.d ?? 2) * 0.6, 0x16161c, { rot: [0, 0.2, 0] });
      p.box(h.x, 0.12, h.z, (h.w ?? 2) * 0.7, 0.02, 0.08, nc, { glow: 1.6, rot: [0, 0.2, 0] });
      for (let k = 0; k < 5; k++)
        p.box(h.x + rng.range(-1, 1), 0.05, h.z + rng.range(-0.5, 0.5), 0.08, 0.04, 0.03, 0xfff15a, {
          glow: 3,
        });
      const pz = h.z < (z0 + z1) / 2 ? back - 0.3 : front + 0.3;
      p.cyl(h.x - 1.2, 2.2, pz, 0.06, 0.08, 4.4, 0x2a2e36, 6, { rot: [0, 0, 0.12] });
      ctx.light(h.x, 0.6, h.z, 0xfff15a, 4, 5, 0.9);
    }

  // frente (baixo, para não esconder o caminho): hidrantes, cones e carros cortados pela borda
  for (let i = 0; i < ctx.dense(14); i++) {
    const fx = rng.range(ctx.x0, ctx.x1);
    const fz = front + rng.range(0.5, 1.6);
    if (rng.chance(0.5)) {
      p.cone(fx, 0.3, fz, 0.18, 0.6, 0xff6a1a, 6);
      p.box(fx, 0.03, fz, 0.4, 0.06, 0.4, 0x1a1a1a);
      p.cyl(fx, 0.35, fz, 0.13, 0.15, 0.08, 0xe8e8e8, 6);
    } else {
      p.cyl(fx, 0.25, fz, 0.1, 0.12, 0.5, 0xb02a2a, 7);
      p.sphere(fx, 0.52, fz, 0.1, 0xb02a2a);
    }
  }
  for (let cx = ctx.x0 + rng.range(10, 20); cx < ctx.x1; cx += rng.range(30, 45))
    carWreck(p, rng, cx, front + rng.range(2.8, 3.4), rng.pick([0x3a3a40, 0x5a2a2a, 0x2a3a5a]));
}
