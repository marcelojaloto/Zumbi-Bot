import type { Rng } from '../../../core/rng';
import type { HazardPlacement } from '../../../data/types';
import type { EnvCtx, Pieces } from '../builder';

const STONE = 0x4a4452;
const STONE_D = 0x2e2934;
const STONE_L = 0x5e5868;
const GOLD = 0xc8a04a;
const CARPET = 0x6e0f1a;
const CANDLE = 0xffcc88;
const WAX = 0xe8dcc0;
const IRON = 0x24222a;
const STEEL = 0x8a8e9a;
const WOOD = 0x3a2218;
const GLASS = [0xff3a5a, 0x4a6aff, 0xa04aff, 0xffb03a, 0x3affa0, 0xff5ad0, 0x5ad8ff];
const WALL_Z = -9;

/** Todos os perigos do nível (segmentos + nível), para decorar os pontos de perigo. */
function levelHazards(ctx: EnvCtx): HazardPlacement[] {
  const out: HazardPlacement[] = [...(ctx.level.hazards ?? [])];
  for (const s of ctx.level.segments) out.push(...(s.hazards ?? []));
  return out;
}

/** Vela com chama (y = base). */
function candle(p: Pieces, x: number, y: number, z: number, h = 0.25, r = 0.035): void {
  p.cyl(x, y + h / 2, z, r, r * 1.1, h, WAX, 6);
  p.cone(x, y + h + 0.06, z, r * 1.1, 0.12, CANDLE, 5, { glow: 3 });
}

/** Candelabro de pé com três velas e luz quente tremulante. */
function candelabra(ctx: EnvCtx, x: number, z: number, lit = true): void {
  const p = ctx.p;
  p.cyl(x, 0.05, z, 0.22, 0.3, 0.1, IRON, 8);
  p.cyl(x, 0.9, z, 0.035, 0.05, 1.7, IRON, 6);
  p.box(x, 1.62, z, 0.72, 0.04, 0.04, IRON);
  for (const dx of [-0.34, 0, 0.34]) {
    p.cyl(x + dx, 1.66, z, 0.06, 0.04, 0.06, GOLD, 6);
    candle(p, x + dx, 1.69, z, dx === 0 ? 0.28 : 0.22);
  }
  if (lit) ctx.light(x, 1.95, z + 0.6, CANDLE, 7, 8, 0.55);
}

/** Armadura de cavaleiro sobre pedestal (olhos apagados, alabarda). */
function armor(p: Pieces, rng: Rng, x: number, z: number): void {
  const s = rng.range(0.95, 1.08);
  p.box(x, 0.16, z, 0.95, 0.32, 0.75, STONE_L);
  p.box(x, 0.34, z, 0.8, 0.06, 0.62, STONE_D);
  const y0 = 0.37;
  // pernas e botas
  for (const dx of [-0.12, 0.12]) {
    p.box(x + dx, y0 + 0.08 * s, z + 0.04, 0.2, 0.16 * s, 0.3, 0x5a5e68);
    p.box(x + dx, y0 + 0.5 * s, z, 0.17, 0.72 * s, 0.2, STEEL);
    p.box(x + dx, y0 + 0.5 * s, z + 0.1, 0.12, 0.14, 0.04, 0xa8acb8);
  }
  // tronco, cinto e saiote
  p.box(x, y0 + 0.95 * s, z, 0.46, 0.24, 0.3, 0x6a6e78);
  p.box(x, y0 + 1.32 * s, z, 0.52, 0.52 * s, 0.34, STEEL);
  p.box(x, y0 + 1.36 * s, z + 0.175, 0.08, 0.4, 0.02, 0xb4b8c4);
  p.box(x, y0 + 1.07 * s, z, 0.54, 0.07, 0.36, 0x3a2a22);
  // ombreiras e braços
  for (const dx of [-0.34, 0.34]) {
    p.box(x + dx, y0 + 1.55 * s, z, 0.22, 0.14, 0.32, 0x9a9eaa, { rot: [0, 0, dx > 0 ? -0.25 : 0.25] });
    p.box(x + dx, y0 + 1.25 * s, z, 0.14, 0.5 * s, 0.16, STEEL);
    p.box(x + dx, y0 + 0.97 * s, z + 0.02, 0.15, 0.1, 0.18, 0x5a5e68);
  }
  // elmo com viseira escura e pluma
  p.box(x, y0 + 1.78 * s, z, 0.28, 0.32, 0.3, 0x9a9eaa);
  p.box(x, y0 + 1.8 * s, z + 0.152, 0.22, 0.04, 0.02, 0x0c0a10);
  p.box(x, y0 + 1.7 * s, z + 0.152, 0.03, 0.14, 0.02, 0x0c0a10);
  p.cone(x, y0 + 2.02 * s, z - 0.02, 0.08, 0.2, 0x7a1422, 5);
  // alabarda
  const hx = x + 0.48;
  p.cyl(hx, 1.35, z + 0.05, 0.025, 0.025, 2.6, WOOD, 5);
  p.box(hx + 0.12, 2.5, z + 0.05, 0.22, 0.34, 0.03, 0xa8acb8);
  p.cone(hx, 2.75, z + 0.05, 0.04, 0.2, 0xa8acb8, 4);
}

/** Caixão deitado ao longo de X (ou em pé, encostado na parede). */
function coffin(p: Pieces, rng: Rng, x: number, z: number, standing: boolean): void {
  const tone = rng.pick([WOOD, 0x2a1810, 0x3a2a24, 0x1e1418]);
  if (standing) {
    const tilt = rng.range(-0.08, 0.08);
    p.box(x, 1.02, z, 0.66, 2.0, 0.4, tone, { rot: [0.06, 0, tilt] });
    p.box(x, 1.02, z + 0.2, 0.7, 2.04, 0.05, 0x1a100c, { rot: [0.06, 0, tilt] });
    p.box(x, 1.25, z + 0.24, 0.06, 0.8, 0.02, GOLD, { rot: [0.06, 0, tilt] });
    p.box(x, 1.4, z + 0.24, 0.36, 0.06, 0.02, GOLD, { rot: [0.06, 0, tilt] });
    return;
  }
  const rot = rng.range(-0.25, 0.25);
  p.box(x, 0.2, z, 1.9, 0.38, 0.6, tone, { rot: [0, rot, 0] });
  const open = rng.chance(0.3);
  if (open) {
    p.box(x, 0.2, z, 1.8, 0.34, 0.5, 0x0c080a, { rot: [0, rot, 0] });
    p.box(x + 0.3, 0.18, z + 0.55, 1.9, 0.06, 0.62, 0x1a100c, { rot: [0.35, rot, 0] });
  } else {
    p.box(x, 0.42, z, 1.94, 0.06, 0.64, 0x1a100c, { rot: [0, rot, 0] });
    p.box(x, 0.46, z, 0.8, 0.02, 0.06, GOLD, { rot: [0, rot, 0] });
    p.box(x - 0.2 * Math.cos(rot), 0.46, z + 0.2 * Math.sin(rot), 0.06, 0.02, 0.34, GOLD, {
      rot: [0, rot, 0],
    });
  }
}

/** Vitral gótico com moldura de chumbo e ponta de arco. */
function stainedGlass(ctx: EnvCtx, x: number): void {
  const p = ctx.p;
  const rng = ctx.rng;
  const z = WALL_Z + 0.06;
  const palette = [rng.pick(GLASS), rng.pick(GLASS), rng.pick(GLASS)];
  // nicho e moldura
  p.box(x, 3.0, z, 2.3, 3.6, 0.08, STONE_D);
  p.box(x, 4.6, z, 1.7, 1.7, 0.08, STONE_D, { rot: [0, 0, Math.PI / 4] });
  p.box(x, 2.95, z + 0.05, 1.8, 3.1, 0.04, 0x120e16);
  p.box(x, 4.45, z + 0.05, 1.3, 1.3, 0.04, 0x120e16, { rot: [0, 0, Math.PI / 4] });
  // painéis coloridos
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 3; c++) {
      const col = palette[(r + c) % 3]!;
      p.box(x - 0.58 + c * 0.58, 1.72 + r * 0.6, z + 0.08, 0.5, 0.52, 0.02, col, {
        glow: rng.range(0.9, 1.5),
      });
    }
  p.box(x, 4.45, z + 0.08, 0.95, 0.95, 0.02, palette[1]!, {
    glow: 1.6,
    rot: [0, 0, Math.PI / 4],
  });
  p.box(x, 4.45, z + 0.1, 0.4, 0.4, 0.02, 0xffe8a0, { glow: 2, rot: [0, 0, Math.PI / 4] });
  // mainel central e soleira
  p.box(x, 2.95, z + 0.1, 0.06, 3.1, 0.03, 0x0c0a10);
  p.box(x, 1.32, z + 0.18, 2.1, 0.14, 0.36, STONE_L);
}

/** Estandarte vermelho com emblema dourado. */
function banner(p: Pieces, x: number): void {
  const z = WALL_Z + 0.12;
  p.box(x, 4.6, z, 1.2, 0.08, 0.08, IRON);
  p.box(x, 3.3, z, 0.95, 2.6, 0.04, 0x5a0c16);
  p.box(x, 3.3, z + 0.03, 0.8, 2.4, 0.02, 0x7a1422);
  p.box(x, 3.6, z + 0.05, 0.36, 0.36, 0.02, GOLD, { rot: [0, 0, Math.PI / 4] });
  p.box(x, 3.6, z + 0.06, 0.16, 0.16, 0.02, 0x2a0c14, { rot: [0, 0, Math.PI / 4] });
  p.cone(x - 0.24, 1.9, z, 0.24, 0.3, 0x7a1422, 3, { rot: [Math.PI, 0, 0] });
  p.cone(x + 0.24, 1.9, z, 0.24, 0.3, 0x7a1422, 3, { rot: [Math.PI, 0, 0] });
}

/** Lustre pendurado (acima da ação) com velas e luz. */
function chandelier(ctx: EnvCtx, x: number, z: number, y: number): void {
  const p = ctx.p;
  p.part('torus', [1.0, 0.045, 5, 18], x, y, z, IRON, { rot: [Math.PI / 2, 0, 0] });
  p.part('torus', [0.55, 0.035, 5, 14], x, y + 0.25, z, IRON, { rot: [Math.PI / 2, 0, 0] });
  p.cyl(x, y + 0.1, z, 0.06, 0.14, 0.5, GOLD, 6);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    candle(p, x + Math.cos(a) * 1.0, y + 0.03, z + Math.sin(a) * 1.0, 0.16, 0.03);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    candle(p, x + Math.cos(a) * 0.55, y + 0.28, z + Math.sin(a) * 0.55, 0.14, 0.028);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const cx = x + Math.cos(a) * 0.5;
    const cz = z + Math.sin(a) * 0.5;
    p.box(cx, y + 2.2, cz, 0.03, 4.4, 0.03, IRON, { rot: [Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22] });
  }
  ctx.light(x, y - 0.3, z + 0.4, CANDLE, 9, 11, 0.3);
}

/** Pilastra embutida na parede do fundo. */
function pilaster(p: Pieces, x: number): void {
  const z = WALL_Z + 0.4;
  p.box(x, 0.35, z, 1.1, 0.7, 0.9, STONE_L);
  p.box(x, 3.5, z, 0.8, 7, 0.7, STONE);
  p.box(x, 3.5, z + 0.36, 0.2, 7, 0.06, STONE_D);
  p.box(x, 5.0, z + 0.05, 1.0, 0.25, 0.85, STONE_L);
}

export function casteloTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const cz = (z0 + z1) / 2;
  ctx.wall = { kind: 'stone', c1: 0x4a4352, c2: 0x2c2632, z: WALL_Z, h: 14 };

  // tapete vermelho no centro do caminho, com bordas douradas
  for (let x = ctx.x0; x < ctx.x1; x += 4) {
    p.box(x + 2, 0.011, cz, 4.02, 0.02, 2.4, CARPET, { noShadow: true, jitter: 0.03 });
    p.box(x + 2, 0.014, cz - 1.12, 4.02, 0.02, 0.08, GOLD, { noShadow: true, jitter: 0.02 });
    p.box(x + 2, 0.014, cz + 1.12, 4.02, 0.02, 0.08, GOLD, { noShadow: true, jitter: 0.02 });
  }
  // meio-fio de pedra que marca o salão (fundo e frente)
  for (let x = ctx.x0; x < ctx.x1; x += 1.6) {
    const c = rng.pick([STONE, STONE_L, 0x524c5a]);
    p.box(x, 0.09, z0 - 1.0, 1.55, 0.18, 0.5, c, { noShadow: true, jitter: 0.08 });
    p.box(x, 0.07, z1 + 1.2, 1.55, 0.14, 0.45, c, { noShadow: true, jitter: 0.08 });
  }
  // rodapé da parede
  for (let x = ctx.x0; x < ctx.x1; x += 2.4)
    p.box(x, 0.3, WALL_Z + 0.2, 2.35, 0.6, 0.4, rng.pick([STONE_D, 0x36303e]), { jitter: 0.1 });

  // baias: pilastras, vitrais, estandartes
  let bay = 0;
  for (let x = ctx.x0; x < ctx.x1; x += 6, bay++) {
    pilaster(p, x);
    const mid = x + 3;
    if (bay % 3 === 2) banner(p, mid);
    else stainedGlass(ctx, mid);
  }

  // fileira do fundo: armaduras, candelabros e caixões
  for (let x = ctx.x0 + 2; x < ctx.x1; x += 12) {
    armor(p, rng, x + rng.range(-0.4, 0.4), -6.6);
    candelabra(ctx, x + 4.5, -5.2);
    if (rng.chance(0.65)) coffin(p, rng, x + 8.5, -7.9, true);
    else coffin(p, rng, x + 8.5, -6.4, false);
  }
  for (let i = 0; i < ctx.dense(10); i++)
    coffin(p, rng, rng.range(ctx.x0, ctx.x1), rng.range(-6.8, -5.6), false);

  // velas no chão e crânios (fundo e primeiro plano, baixos)
  for (let i = 0; i < ctx.dense(26); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.55) ? rng.range(-5.4, z0 - 1.4) : rng.range(z1 + 1.7, z1 + 4);
    const n = rng.int(2, 5);
    for (let k = 0; k < n; k++)
      candle(p, x + rng.range(-0.35, 0.35), 0, z + rng.range(-0.25, 0.25), rng.range(0.1, 0.35), 0.04);
  }
  for (let i = 0; i < ctx.dense(14); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(-6, z0 - 1.5) : rng.range(z1 + 1.8, z1 + 4.5);
    for (let k = 0; k < rng.int(1, 4); k++)
      p.sphere(x + rng.range(-0.3, 0.3), 0.1, z + rng.range(-0.2, 0.2), 0.1, 0xd8d0bc, { noShadow: true });
  }
  // primeiro plano: caixões baixos e destroços de pedra
  for (let i = 0; i < ctx.dense(7); i++)
    coffin(p, rng, rng.range(ctx.x0, ctx.x1), rng.range(z1 + 2.2, z1 + 4.5), false);
  for (let i = 0; i < ctx.dense(12); i++)
    p.part(
      'ico',
      [rng.range(0.15, 0.35), 0],
      rng.range(ctx.x0, ctx.x1),
      0.1,
      rng.range(z1 + 1.6, z1 + 5),
      STONE,
      {
        rot: [rng.next() * 3, rng.next() * 3, 0],
        noShadow: true,
      },
    );

  // primeiro plano: bases de colunas quebradas e castiçais baixos (não tapam a ação)
  for (let x = ctx.x0 + rng.range(2, 6); x < ctx.x1; x += rng.range(9, 14)) {
    const z = rng.range(z1 + 2.6, z1 + 3.4);
    const h = rng.range(0.35, 0.75);
    p.box(x, 0.12, z, 1.1, 0.24, 1.1, STONE_L);
    p.cyl(x, 0.24 + h / 2, z, 0.38, 0.42, h, STONE, 8, { rot: [0, 0, rng.range(-0.06, 0.06)] });
    p.part('ico', [0.22, 0], x + 0.7, 0.12, z + 0.3, STONE, {
      rot: [rng.next(), rng.next(), 0],
      noShadow: true,
    });
    if (rng.chance(0.6)) candle(p, x + rng.range(-0.15, 0.15), 0.24 + h, z, rng.range(0.12, 0.22), 0.045);
  }

  // lustres sobre o salão (acima da altura dos personagens)
  for (let x = 14; x < ctx.x1 - 10; x += 17) chandelier(ctx, x, -2.8, 4.55);

  // perigos: pêndulos (trilho no chão + mecanismo) e fogueiras de velas
  for (const h of levelHazards(ctx)) {
    if (h.kind === 'pendulum') {
      p.box(h.x, 0.026, cz, 0.7, 0.02, z1 - z0 + 1.2, 0x0c0a0e, { noShadow: true });
      p.box(h.x - 0.38, 0.03, cz, 0.06, 0.03, z1 - z0 + 1.2, 0x6a6e78, { noShadow: true });
      p.box(h.x + 0.38, 0.03, cz, 0.06, 0.03, z1 - z0 + 1.2, 0x6a6e78, { noShadow: true });
      // engrenagem do mecanismo na borda do fundo
      p.box(h.x, 0.45, z0 - 1.1, 0.7, 0.9, 0.7, STONE_D);
      p.part('torus', [0.26, 0.06, 5, 10], h.x, 0.6, z0 - 0.74, 0x6a6e78);
      p.box(h.x, 4.75, cz, 0.35, 0.35, z1 - z0 + 4, IRON, { noShadow: true });
      p.cone(h.x, 4.2, z0 - 1.6, 0.3, 0.9, 0xa8acb8, 4, { rot: [Math.PI, 0, 0], noShadow: true });
    } else if (h.kind === 'fire') {
      // candelabro tombado e cera derretida
      p.cyl(h.x + 0.3, 0.06, h.z + 0.2, 0.035, 0.05, 1.6, IRON, 6, { rot: [0, 0.4, Math.PI / 2] });
      p.cyl(h.x - 0.5, 0.05, h.z - 0.3, 0.22, 0.3, 0.1, IRON, 8, { rot: [0.3, 0, 1.2] });
      p.cyl(h.x, 0.012, h.z, (h.w ?? 2) * 0.45, (h.w ?? 2) * 0.5, 0.02, 0x2a1810, 12, { noShadow: true });
      for (let k = 0; k < 4; k++)
        candle(p, h.x + rng.range(-0.5, 0.5), 0, h.z + rng.range(-0.4, 0.4), rng.range(0.08, 0.2), 0.04);
      ctx.light(h.x, 0.8, h.z + 0.4, 0xff8a3c, 8, 6, 0.9);
    }
  }

  // sala do trono (arena do chefe)
  const b = ctx.level.boss;
  if (b) {
    const tx = (b.lock[0] + b.lock[1]) / 2 + 2;
    // tapete largo e degraus
    p.box(tx, 0.015, cz, 16, 0.02, 4.2, 0x5a0a14, { noShadow: true });
    p.box(tx, 0.18, -6.6, 6, 0.36, 2.6, STONE_L);
    p.box(tx, 0.45, -7.1, 5, 0.3, 2.0, STONE);
    // trono
    p.box(tx, 1.1, -7.3, 1.8, 1.0, 1.2, 0x3a0c18);
    p.box(tx, 2.8, -7.9, 1.9, 3.6, 0.35, 0x2a0a14);
    p.box(tx, 2.8, -7.72, 1.5, 3.2, 0.05, 0x6a1020);
    p.cone(tx, 5.0, -7.9, 0.75, 1.2, 0x2a0a14, 4, { rot: [0, Math.PI / 4, 0] });
    for (const dx of [-1.05, 1.05]) {
      p.box(tx + dx, 1.6, -7.3, 0.25, 1.0, 1.3, 0x2a0a14);
      p.sphere(tx + dx, 2.15, -6.75, 0.14, GOLD);
      p.cone(tx + dx, 4.9, -7.9, 0.15, 0.9, GOLD, 5);
    }
    p.box(tx, 4.0, -7.68, 0.5, 0.5, 0.03, 0xb05aff, { glow: 2.2, rot: [0, 0, Math.PI / 4] });
    // rosácea atrás do trono
    p.cyl(tx, 3.4, WALL_Z + 0.1, 2.0, 2.0, 0.1, STONE_D, 16, { rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      p.box(tx + Math.cos(a) * 1.35, 3.4 + Math.sin(a) * 1.35, WALL_Z + 0.18, 0.5, 0.5, 0.02, GLASS[i % 4]!, {
        glow: 1.4,
        rot: [0, 0, a + Math.PI / 4],
      });
    }
    p.cyl(tx, 3.4, WALL_Z + 0.2, 0.7, 0.7, 0.02, 0xb05aff, 12, { glow: 2, rot: [Math.PI / 2, 0, 0] });
    // braseiros roxos ao lado do trono
    for (const dx of [-4.5, 4.5]) {
      p.cyl(tx + dx, 0.6, -6.2, 0.14, 0.2, 1.2, IRON, 6);
      p.cyl(tx + dx, 1.3, -6.2, 0.5, 0.3, 0.3, IRON, 8);
      p.cone(tx + dx, 1.7, -6.2, 0.4, 0.7, 0xb05aff, 6, { glow: 2.6 });
      p.cone(tx + dx, 1.75, -6.2, 0.2, 0.9, 0xe8c8ff, 5, { glow: 3 });
      ctx.light(tx + dx, 2.0, -5.6, 0xb05aff, 10, 10, 0.6);
    }
  }
}
