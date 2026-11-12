import type { EnvCtx, Pieces } from '../builder';
import { silhouetteRow } from '../props';

const H = Math.PI / 2;
const WHITE = 0xf2f2ea;
const GRASS_L = 0x3a7c40;
const CONCRETE = 0x5a5e66;
const CONCRETE_D = 0x3e424a;
const STEEL_D = 0x2a2e36;
const DARK = 0x14161c;
const ORANGE = 0xff7a1a;
const FLARE = 0xff3a2a;
const LAMP = 0xf4f8ff;
const ADS = [0xd8202a, 0x2060d8, 0xf2c21a, 0x20a85a, 0xf2f2ea, 0x8a3ad8];
const CROWD = [0xc8202a, 0x2050c8, 0x3a3e46, 0x8a8e96, 0xf2f2ea, 0x4a2a2a];
const ROWS = 9;

/**
 * Estádio à noite: gramado em faixas com as linhas do campo, placas de publicidade, bancos de reservas, arquibancada
 * com a torcida zumbi, refletores, placar e, na arena do chefe, a grande área com a trave e a faixa em chamas.
 */
export function campoTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const zc = (z0 + z1) / 2;
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;
  const depth = z1 - z0 + 1;

  // gramado em faixas e linhas laterais
  for (let x = ctx.x0, i = 0; x < ctx.x1; x += 5, i++)
    if (i % 2) p.box(x + 2.5, 0.003, zc - 1.5, 5, 0.006, depth + 6, GRASS_L, { noShadow: true });
  p.box(mid, 0.008, z0 - 0.5, len, 0.01, 0.1, WHITE, { noShadow: true });
  p.box(mid, 0.008, z1 + 0.5, len, 0.01, 0.1, WHITE, { noShadow: true });

  // meio de campo
  const half = ctx.level.length / 2;
  p.box(half, 0.008, zc, 0.1, 0.01, depth, WHITE, { noShadow: true });
  p.part('torus', [2.2, 0.05], half, 0.01, zc, WHITE, { rot: [H, 0, 0], noShadow: true });
  p.cyl(half, 0.009, zc, 0.16, 0.16, 0.01, WHITE, 10, { noShadow: true });

  // perigos do nível
  const hazards = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of hazards) {
    if (h.kind === 'hurdle') cones(p, h.x, h.z, h.d ?? 1.6);
    else if (h.kind === 'fire') flare(ctx, h.x, h.z);
    else if (h.kind === 'swamp') puddle(p, h.x, h.z, (h.w ?? 4) / 2);
  }

  // placas de publicidade (algumas de LED) atrás da linha do fundo
  for (let x = ctx.x0, i = 0; x < ctx.x1; x += 4.2, i++) {
    const c = ADS[i % ADS.length]!;
    p.box(x + 2, 0.5, z0 - 1.7, 4, 0.9, 0.12, c);
    p.box(x + 2, 0.5, z0 - 1.63, 2.8, 0.3, 0.02, i % 2 ? DARK : WHITE, i % 3 === 0 ? { glow: 1.1 } : {});
  }

  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const arenaMid = arena ? (arena[0] + arena[1]) / 2 : Infinity;

  // bancos de reservas
  for (let x = ctx.x0 + 22; x < ctx.x1; x += 56) if (Math.abs(x - arenaMid) > 14) dugout(p, x, z0 - 3.2);

  stands(ctx);

  // refletores e placar
  for (let x = ctx.x0 + 10; x < ctx.x1; x += 38) floodlight(ctx, x);
  scoreboard(p, half - 12);

  // cobertura do estádio e a cidade ao longe
  p.box(mid, 13.4, -24, len, 1.2, 3, 0x0e1218, { noShadow: true });
  for (let x = ctx.x0; x < ctx.x1; x += 6) p.box(x, 12.7, -22.4, 0.5, 0.12, 0.05, LAMP, { glow: 1.6 });
  silhouetteRow(ctx, -40, 0x080c12, 14, 24, 12, 'city');

  // traves: uma atrás da largada, outra no fim da arena do chefe
  goal(p, -1.5, zc, -1);
  if (arena) {
    const gx = arena[1] + 0.8;
    goal(p, gx, zc, 1);
    // grande área, pequena área e a marca do pênalti
    p.box(gx - 10, 0.008, zc, 0.1, 0.01, depth, WHITE, { noShadow: true });
    p.box(gx - 3.5, 0.008, zc, 0.1, 0.01, depth * 0.6, WHITE, { noShadow: true });
    for (const s of [-1, 1])
      p.box(gx - 1.75, 0.008, zc + s * depth * 0.3, 3.5, 0.01, 0.1, WHITE, { noShadow: true });
    p.cyl(gx - 7, 0.009, zc, 0.16, 0.16, 0.01, WHITE, 10, { noShadow: true });
    banner(ctx, arenaMid);
    // grama queimada e bolas em brasa largadas na beira do campo
    for (let i = 0; i < 6; i++) {
      const r = rng.range(0.5, 1.1);
      p.cyl(rng.range(arena[0] + 2, arena[1] - 2), 0.005, rng.range(z0, z1), r, r, 0.008, 0x1c2416, 9, {
        noShadow: true,
      });
    }
    for (const dx of [-7, 1, 8]) {
      ball(p, arenaMid + dx, z0 - 0.9, true);
      ctx.light(arenaMid + dx, 0.6, z0 - 0.4, ORANGE, 4, 5, 0.6);
    }
    cornerFlag(p, arena[1] + 0.6, z0 - 0.5);
    cornerFlag(p, arena[1] + 0.6, z1 + 0.5);
  }
  cornerFlag(p, 0.4, z0 - 0.5);
  cornerFlag(p, 0.4, z1 + 0.5);

  // beira do campo: bolas, cones e garrafas esquecidos
  for (let i = 0; i < ctx.dense(26); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(z0 - 1.3, z0 - 0.8) : rng.range(z1 + 0.9, z1 + 2.6);
    const k = rng.int(0, 2);
    if (k === 0) ball(p, x, z, false);
    else if (k === 1) cone(p, x, z);
    else p.cyl(x, 0.11, z, 0.04, 0.05, 0.22, rng.pick(ADS), 6);
  }

  // primeiro plano: câmera de transmissão tombada e mochilas
  for (let x = ctx.x0 + 9; x < ctx.x1; x += rng.range(26, 40)) {
    if (rng.chance(0.5)) {
      p.box(x, 0.2, z1 + 3, 0.7, 0.4, 0.4, DARK, { rot: [0, rng.range(-0.5, 0.5), 0.3] });
      p.cyl(x + 0.45, 0.24, z1 + 3, 0.12, 0.14, 0.3, 0x22262e, 8, { rot: [0, 0, H] });
    } else p.box(x, 0.18, z1 + 3, 0.6, 0.36, 0.4, rng.pick(ADS), { jitter: 0.15 });
  }
}

/** Fileira de cones de treino atravessada na faixa. */
function cones(p: Pieces, x: number, z: number, d: number): void {
  for (let cz = z - d / 2 + 0.2; cz <= z + d / 2 - 0.1; cz += 0.45) cone(p, x, cz);
}

function cone(p: Pieces, x: number, z: number): void {
  p.box(x, 0.02, z, 0.34, 0.04, 0.34, ORANGE);
  p.cone(x, 0.32, z, 0.13, 0.56, ORANGE, 7);
  p.cyl(x, 0.34, z, 0.075, 0.095, 0.1, WHITE, 7, { noShadow: true });
}

/** Sinalizador caído, aceso. */
function flare(ctx: EnvCtx, x: number, z: number): void {
  const p = ctx.p;
  p.cyl(x, 0.04, z, 0.035, 0.035, 0.4, 0x8a1414, 6, { rot: [0, 0.6, H] });
  p.cone(x + 0.22, 0.2, z - 0.12, 0.12, 0.4, FLARE, 5, { glow: 3 });
  p.cyl(x, 0.005, z, 0.7, 0.7, 0.008, 0x1c2416, 9, { noShadow: true });
  ctx.light(x, 0.8, z + 0.3, FLARE, 7, 7, 0.8);
}

/** Poça da irrigação, com o aspersor quebrado esguichando. */
function puddle(p: Pieces, x: number, z: number, r: number): void {
  p.cyl(x, 0.006, z, r, r, 0.01, 0x1e4a5a, 14, { glow: 0.45 });
  p.cyl(x + r * 0.2, 0.01, z - r * 0.15, r * 0.55, r * 0.55, 0.008, 0x2a6a7a, 12, { glow: 0.4 });
  p.cyl(x, 0.12, z, 0.05, 0.06, 0.24, STEEL_D, 6);
  for (const a of [-0.5, 0, 0.5])
    p.box(x + a * 0.5, 0.55, z, 0.02, 0.7, 0.02, 0xbfe8ff, { rot: [0, 0, -a], glow: 0.8 });
}

/** Bola; `hot` = em brasa. */
function ball(p: Pieces, x: number, z: number, hot: boolean): void {
  p.sphere(x, 0.16, z, 0.16, hot ? 0x3a1c12 : WHITE);
  if (hot) p.cone(x, 0.42, z, 0.1, 0.3, ORANGE, 5, { glow: 2.8 });
  else p.box(x, 0.2, z + 0.13, 0.1, 0.1, 0.06, DARK);
}

function cornerFlag(p: Pieces, x: number, z: number): void {
  p.cyl(x, 0.8, z, 0.02, 0.02, 1.6, WHITE, 5);
  p.box(x + 0.16, 1.45, z, 0.3, 0.22, 0.02, FLARE, { noShadow: true });
}

/** Trave com a rede; `dir` = para que lado fica o fundo da rede. */
function goal(p: Pieces, x: number, zc: number, dir: number): void {
  const w = 4.4;
  const h = 2.5;
  const back = x + dir * 1.3;
  for (const s of [-1, 1]) {
    const z = zc + (s * w) / 2;
    p.cyl(x, h / 2, z, 0.07, 0.07, h, WHITE, 7);
    p.box((x + back) / 2, h, z, 1.3, 0.05, 0.05, WHITE, { noShadow: true });
    p.box(back, h / 2, z, 0.05, h, 0.05, 0xc8c8c0, { noShadow: true });
  }
  p.cyl(x, h, zc, 0.07, 0.07, w, WHITE, 7, { rot: [H, 0, 0] });
  for (let i = 1; i < 9; i++)
    p.box(back, h / 2, zc - w / 2 + (i * w) / 9, 0.015, h, 0.015, 0xd8d8d0, { noShadow: true });
  for (let i = 1; i < 5; i++) p.box(back, (i * h) / 5, zc, 0.015, 0.015, w, 0xd8d8d0, { noShadow: true });
}

/** Banco de reservas: abrigo de acrílico com o banco e as garrafas. */
function dugout(p: Pieces, x: number, z: number): void {
  p.box(x, 1.05, z - 0.6, 5, 2.1, 0.08, 0x3a5a7a);
  p.box(x, 2.15, z - 0.1, 5.2, 0.1, 1.2, 0x2a3a5a);
  for (const s of [-1, 1]) p.box(x + s * 2.5, 1.05, z - 0.1, 0.08, 2.1, 1.1, 0x3a5a7a);
  p.box(x, 0.42, z - 0.25, 4.4, 0.1, 0.45, CONCRETE);
  for (const dx of [-1.8, 0, 1.8]) p.box(x + dx, 0.2, z - 0.25, 0.1, 0.4, 0.4, CONCRETE_D);
  p.box(x + 1.2, 0.56, z - 0.25, 0.5, 0.2, 0.3, 0x2060d8);
}

/** Arquibancada em degraus com a mureta, a torcida zumbi e sinalizadores acesos. */
function stands(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;
  const rowY = (r: number) => 0.9 + r * 0.75;
  const rowZ = (r: number) => -8.6 - r * 1.15;
  p.box(mid, 0.6, -7.9, len, 1.2, 0.2, 0x2a3a5a);
  for (let r = 0; r < ROWS; r++)
    p.box(mid, rowY(r) / 2, rowZ(r), len, rowY(r), 1.15, r % 2 ? CONCRETE : CONCRETE_D, { noShadow: true });
  for (let i = 0; i < ctx.dense(380); i++) {
    const r = rng.int(0, ROWS - 1);
    const x = rng.range(ctx.x0, ctx.x1);
    const y = rowY(r);
    const z = rowZ(r);
    p.box(x, y + 0.3, z, 0.34, 0.6, 0.25, rng.pick(CROWD), { noShadow: true });
    p.box(x, y + 0.72, z, 0.2, 0.22, 0.2, 0x6f7f5a, { noShadow: true });
    if (rng.chance(0.3)) p.box(x, y + 0.74, z + 0.105, 0.14, 0.03, 0.01, 0x9cff4a, { glow: 2.2 });
  }
  for (let x = ctx.x0 + rng.range(6, 16); x < ctx.x1; x += rng.range(24, 36)) {
    const r = rng.int(1, ROWS - 2);
    p.cone(x, rowY(r) + 1.2, rowZ(r), 0.14, 0.5, FLARE, 5, { glow: 3 });
    ctx.light(x, rowY(r) + 1.6, rowZ(r) + 1.5, FLARE, 6, 9, 0.8);
  }
}

/** Torre de refletores: o poste, o painel de lâmpadas e a luz que ele joga no gramado. */
function floodlight(ctx: EnvCtx, x: number): void {
  const p = ctx.p;
  p.cyl(x, 6.5, -20.5, 0.22, 0.36, 13, STEEL_D, 7, { noShadow: true });
  p.box(x, 13.4, -20.3, 4.4, 2.2, 0.3, DARK, { noShadow: true });
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 5; c++)
      p.box(x - 1.6 + c * 0.8, 12.75 + r * 0.65, -20.1, 0.55, 0.42, 0.05, LAMP, { glow: 3 });
  ctx.light(x, 5, -3.6, LAMP, 13, 18, 0.05);
}

/** Placar de LED: mortos de vermelho, vivos de verde. */
function scoreboard(p: Pieces, x: number): void {
  const z = -20.6;
  p.box(x, 10, z, 9, 3.6, 0.4, DARK, { noShadow: true });
  for (const s of [-1, 1]) p.cyl(x + s * 3.6, 4.2, z, 0.16, 0.2, 8.4, STEEL_D, 6, { noShadow: true });
  p.box(x - 2.4, 10.1, z + 0.22, 1.5, 2.2, 0.05, FLARE, { glow: 2.4 });
  p.box(x + 2.4, 10.1, z + 0.22, 1.5, 2.2, 0.05, 0x3ac85a, { glow: 1 });
  p.box(x, 10.1, z + 0.22, 0.5, 0.14, 0.05, WHITE, { glow: 2 });
  p.box(x, 11.4, z + 0.22, 3, 0.2, 0.05, 0xf2c21a, { glow: 2 });
}

/** Faixa da torcida pegando fogo na arquibancada, atrás da arena do chefe. */
function banner(ctx: EnvCtx, cx: number): void {
  const { p, rng } = ctx;
  const y = 0.9 + 3 * 0.75 + 1.6;
  const z = -8.6 - 3 * 1.15 + 0.5;
  p.box(cx, y, z, 14, 1.6, 0.06, 0x8a1414, { noShadow: true });
  for (let i = 0; i < 7; i++)
    p.box(cx - 6 + i * 2, y, z + 0.04, 1, 1.6, 0.02, i % 2 ? DARK : WHITE, { noShadow: true });
  for (let x = cx - 6.6; x < cx + 6.6; x += rng.range(0.7, 1.3)) {
    const s = rng.range(0.5, 1);
    p.cone(x, y + 0.8 + s * 0.4, z + 0.05, 0.22 * s, 0.9 * s, ORANGE, 5, { glow: 2.6 });
  }
  ctx.light(cx - 4, y + 1, z + 2, ORANGE, 9, 13, 0.7);
  ctx.light(cx + 4, y + 1, z + 2, ORANGE, 9, 13, 0.7);
}
