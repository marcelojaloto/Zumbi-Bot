import type { Rng } from '../../../core/rng';
import type { EnvCtx, Pieces } from '../builder';
import { column } from '../props';

const H = Math.PI / 2;
const MARBLE = 0xd8d4cc;
const MARBLE_D = 0x3a4440;
const WOOD = 0x4a3428;
const WOOD_D = 0x2e2018;
const BRASS = 0xc8a650;
const STEEL = 0x8a949e;
const STEEL_D = 0x3a4248;
const FLUO = 0xd8f0ff;
const ALARM = 0xff2a2a;
const GLASS = 0xbfe8ff;
const CASH = 0x6aa86a;
const GOLD = 0xe8c040;
const WALL_Z = -6.5;
const MOD = 10;

type Module = 'tellers' | 'deposit' | 'lounge' | 'atms' | 'office' | 'arena';

/**
 * Saguão do banco: piso de mármore, colunas, balcões de caixa com vidro, cofres de aluguel,
 * caixas eletrônicos com letreiro, luminárias fluorescentes, giroflexes de alarme, cordões de
 * veludo, dinheiro espalhado e, na arena do chefe, a porta do cofre-forte.
 */
export function bancoTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  ctx.wall = { kind: 'panel', c1: 0x4a5a56, c2: 0x2c3634, z: WALL_Z, h: 10 };
  const len = ctx.x1 - ctx.x0;
  const mid = (ctx.x0 + ctx.x1) / 2;

  // lambri de madeira, frisos e sanca
  p.box(mid, 0.6, WALL_Z + 0.06, len, 1.2, 0.12, WOOD_D, { noShadow: true });
  p.box(mid, 1.22, WALL_Z + 0.1, len, 0.08, 0.2, BRASS, { noShadow: true });
  p.box(mid, 0.06, WALL_Z + 0.16, len, 0.12, 0.3, 0x1e1a16, { noShadow: true });
  p.box(mid, 4.85, WALL_Z + 0.15, len, 0.3, 0.4, 0xa8a49c, { noShadow: true });

  // piso: faixas de mármore escuro nas bordas e losangos embutidos na pista
  p.box(mid, 0.006, z0 - 0.55, len, 0.012, 0.5, MARBLE_D, { noShadow: true });
  p.box(mid, 0.006, z1 + 0.55, len, 0.012, 0.5, MARBLE_D, { noShadow: true });
  p.box(mid, 0.008, z0 - 0.3, len, 0.012, 0.05, BRASS, { noShadow: true });
  p.box(mid, 0.008, z1 + 0.3, len, 0.012, 0.05, BRASS, { noShadow: true });
  for (let x = ctx.x0 + 5; x < ctx.x1; x += MOD) {
    p.box(x, 0.007, (z0 + z1) / 2, 1.9, 0.012, 1.9, BRASS, { noShadow: true, rot: [0, Math.PI / 4, 0] });
    p.box(x, 0.009, (z0 + z1) / 2, 1.78, 0.012, 1.78, 0x7e8682, { noShadow: true, rot: [0, Math.PI / 4, 0] });
    p.box(x, 0.011, (z0 + z1) / 2, 0.5, 0.012, 0.5, 0x5a6460, { noShadow: true, rot: [0, Math.PI / 4, 0] });
  }

  // perigos: emissores do alarme a laser e placas metálicas dos pisos energizados
  const hazards = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of hazards) {
    if (h.kind === 'laserTrip') {
      laserPost(ctx, h.x, z0 - 0.7, 1.4);
      laserPost(ctx, h.x, z1 + 0.9, 0.8);
    } else if (h.kind === 'electricTile') {
      const w = h.w ?? 2;
      const d = h.d ?? 2;
      p.box(h.x, 0.01, h.z, w, 0.014, d, 0x2e3438, { noShadow: true });
      for (let i = -2; i <= 2; i++)
        p.box(h.x + (i * w) / 5.2, 0.018, h.z, 0.04, 0.012, d * 0.9, 0x1a1e22, { noShadow: true });
      for (const s of [-1, 1]) {
        p.box(h.x, 0.02, h.z + (s * d) / 2, w + 0.1, 0.012, 0.08, 0xffc21a, { noShadow: true });
        p.box(h.x + (s * w) / 2, 0.02, h.z, 0.08, 0.012, d + 0.1, 0xffc21a, { noShadow: true });
      }
    }
  }

  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const arenaMid = arena ? (arena[0] + arena[1]) / 2 : Infinity;
  const kinds: Module[] = ['tellers', 'lounge', 'deposit', 'tellers', 'atms', 'office', 'tellers', 'deposit'];
  let k = 0;
  for (let cx = ctx.x0; cx < ctx.x1; cx += MOD, k++) {
    column(p, cx, -4.9, 6.2, MARBLE, 0.42);
    p.box(cx, 2.4, -4.9, 0.9, 0.06, 0.9, BRASS, { noShadow: true });
    const mx = cx + MOD / 2;
    let kind: Module = kinds[(k + rng.int(0, 1)) % kinds.length]!;
    if (arena && mx > arena[0] - 4 && mx < arena[1] + 6) kind = 'arena';
    switch (kind) {
      case 'tellers':
        tellers(ctx, mx, MOD - 1.4);
        break;
      case 'deposit':
        depositWall(ctx, mx);
        break;
      case 'lounge':
        lounge(ctx, mx);
        break;
      case 'atms':
        atmWall(ctx, mx);
        break;
      case 'office':
        office(ctx, mx);
        break;
      case 'arena':
        break;
    }
    // alarme giratório na parede
    if (kind !== 'arena') beacon(ctx, cx + 2.4, 3.9, WALL_Z + 0.2, k % 2 === 0);
  }
  if (arena) vault(ctx, arenaMid);

  // luminárias fluorescentes (duas fileiras, atrás e acima da pista)
  let li = 0;
  for (let x = ctx.x0 + 2; x < ctx.x1; x += 4.5, li++) {
    const broken = rng.chance(0.12);
    fluorescent(ctx, x, 4.25, -4.3, li % 2 === 0, broken);
    if (li % 2 === 1) fluorescent(ctx, x + 2.2, 4.75, -0.8, false, broken);
  }

  // cordões de veludo: fila atrás da pista e alguns na frente (baixos)
  for (let x = ctx.x0 + 3; x < ctx.x1; x += rng.range(9, 15)) {
    if (x > arenaMid - 12 && x < arenaMid + 12) continue;
    ropes(p, x, x + rng.range(3, 6), -3.85);
  }
  for (let x = ctx.x0 + 8; x < ctx.x1; x += rng.range(26, 40)) ropes(p, x, x + rng.range(3, 5), z1 + 2.5);

  // sinais do apocalipse: manchas de sangue, cadeiras tombadas e vidro quebrado
  for (let i = 0; i < ctx.dense(18); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.5) ? rng.range(z0 - 1.2, z0 + 0.6) : rng.range(z1 - 0.6, z1 + 1.8);
    for (let j = 0; j < 4; j++) {
      const r = j === 0 ? rng.range(0.25, 0.45) : rng.range(0.05, 0.14);
      p.cyl(x + rng.range(-0.5, 0.5) * (j ? 1 : 0), 0.004 + j * 0.001, z + rng.range(-0.3, 0.3) * (j ? 1 : 0), r, r, 0.006, 0x5a0c0c, 7, {
        noShadow: true,
        rot: [0, rng.range(0, Math.PI), 0],
      });
    }
  }
  for (let i = 0; i < ctx.dense(8); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    if (x > arenaMid - 12 && x < arenaMid + 12) continue;
    chair(p, x, rng.range(-4.6, -3.9), rng.range(0, Math.PI * 2));
  }
  for (let i = 0; i < ctx.dense(30); i++)
    p.part('tet', [rng.range(0.04, 0.09), 0], rng.range(ctx.x0, ctx.x1), 0.03, rng.range(-5, z1 + 1.5), GLASS, {
      glow: 0.8,
      rot: [rng.next() * 3, rng.next() * 3, rng.next() * 3],
    });

  // dinheiro espalhado, papéis e cacos de vidro
  for (let i = 0; i < ctx.dense(140); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.55) ? rng.range(-5.8, z0 - 0.2) : rng.range(z0, z1 + 2.4);
    if (rng.chance(0.7))
      p.box(x, 0.006 + rng.next() * 0.004, z, 0.17, 0.008, 0.08, rng.chance(0.85) ? CASH : 0x8ac88a, {
        noShadow: true,
        rot: [0, rng.range(0, Math.PI), 0],
      });
    else
      p.box(x, 0.006, z, 0.21, 0.006, 0.28, 0xe8e4dc, { noShadow: true, rot: [0, rng.range(0, Math.PI), 0] });
  }
  for (let i = 0; i < ctx.dense(12); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    moneyBag(p, rng, x, rng.chance(0.6) ? rng.range(-5.6, -4.1) : rng.range(z1 + 1.2, z1 + 2.6));
  }

  // primeiro plano: bancos baixos de mármore e vasos
  for (let x = ctx.x0 + 6; x < ctx.x1; x += rng.range(12, 20)) {
    if (rng.chance(0.5)) {
      p.box(x, 0.2, z1 + 2.9, 2.4, 0.4, 0.6, MARBLE);
      p.box(x, 0.43, z1 + 2.9, 2.5, 0.06, 0.66, 0xb8b4ac);
    } else plant(p, rng, x, z1 + 2.8, 0.7);
  }
}

// ---------------------------------------------------------------------------
// peças
// ---------------------------------------------------------------------------

/** Luminária pendente com tubo brilhante; algumas piscam (quebradas). */
function fluorescent(ctx: EnvCtx, x: number, y: number, z: number, lit: boolean, broken: boolean): void {
  const p = ctx.p;
  p.box(x - 0.7, y + 0.8, z, 0.015, 1.6, 0.015, 0x22262a, { noShadow: true });
  p.box(x + 0.7, y + 0.8, z, 0.015, 1.6, 0.015, 0x22262a, { noShadow: true });
  p.box(x, y, z, 1.9, 0.1, 0.36, 0xc8ccd0, { noShadow: true });
  p.box(x, y - 0.07, z, 1.75, 0.045, 0.24, FLUO, { glow: broken ? 0.9 : 2.2 });
  if (lit || broken) ctx.light(x, y - 0.5, z + 0.6, FLUO, broken ? 5 : 7, 10, broken ? 0.95 : 0.12);
}

/** Giroflex vermelho com luz pulsante. */
function beacon(ctx: EnvCtx, x: number, y: number, z: number, lit = true): void {
  const p = ctx.p;
  p.box(x, y - 0.16, z, 0.4, 0.1, 0.36, STEEL_D);
  p.cyl(x, y + 0.06, z + 0.05, 0.16, 0.17, 0.32, ALARM, 10, { glow: 3 });
  p.box(x, y + 0.06, z + 0.22, 0.07, 0.26, 0.02, 0xffd0c0, { glow: 4 });
  p.cyl(x, y + 0.25, z + 0.05, 0.1, 0.16, 0.06, STEEL_D, 10);
  if (lit) ctx.light(x, y, z + 1.2, ALARM, 9, 10, 1);
}

function chair(p: Pieces, x: number, z: number, yaw: number): void {
  // cadeira de escritório tombada de lado
  const c = Math.cos(yaw);
  const sn = Math.sin(yaw);
  p.box(x, 0.25, z, 0.5, 0.08, 0.5, 0x22262a, { rot: [H, yaw, 0] });
  p.box(x - sn * 0.28, 0.3, z - c * 0.28, 0.5, 0.55, 0.07, 0x22262a, { rot: [0, yaw, H] });
  p.cyl(x + sn * 0.25, 0.25, z + c * 0.25, 0.03, 0.03, 0.4, STEEL, 5, { rot: [0, yaw, H] });
  p.cyl(x + sn * 0.45, 0.25, z + c * 0.45, 0.22, 0.22, 0.04, STEEL_D, 5, { rot: [0, yaw, H] });
}

function laserPost(ctx: EnvCtx, x: number, z: number, h: number): void {
  const p = ctx.p;
  p.box(x, h / 2, z, 0.14, h, 0.14, STEEL_D);
  p.box(x, h - 0.1, z, 0.2, 0.2, 0.2, 0x22262a);
  p.sphere(x, h - 0.1, z + (z < 0 ? 0.11 : -0.11), 0.06, ALARM, { glow: 4 });
  p.box(x, 0.02, z, 0.36, 0.04, 0.36, 0xffc21a, { noShadow: true });
}

/** Balcão dos caixas com vidro (moldura + reflexos), plaquinhas e monitores atrás. */
function tellers(ctx: EnvCtx, x: number, w: number): void {
  const { p, rng } = ctx;
  const z = -5.55;
  p.box(x, 0.55, z, w, 1.1, 0.9, WOOD);
  p.box(x, 0.55, z + 0.46, w, 0.9, 0.03, 0x5a4234);
  for (let i = 0; i < 4; i++)
    p.box(x - w / 2 + (i + 0.5) * (w / 4), 0.55, z + 0.475, w / 4 - 0.3, 0.6, 0.02, WOOD_D);
  p.box(x, 1.14, z + 0.05, w + 0.1, 0.08, 1.05, MARBLE);
  const n = Math.max(2, Math.round(w / 1.8));
  const pw = w / n;
  for (let i = 0; i <= n; i++) p.box(x - w / 2 + i * pw, 1.75, z + 0.1, 0.05, 1.2, 0.05, BRASS);
  p.box(x, 2.36, z + 0.1, w, 0.06, 0.07, BRASS);
  for (let i = 0; i < n; i++) {
    const wx = x - w / 2 + (i + 0.5) * pw;
    // reflexos no vidro
    p.box(wx - pw * 0.15, 1.85, z + 0.12, 0.03, 0.75, 0.01, GLASS, { glow: 0.9, rot: [0, 0, 0.5] });
    p.box(wx + pw * 0.05, 1.8, z + 0.12, 0.015, 0.5, 0.01, GLASS, { glow: 0.7, rot: [0, 0, 0.5] });
    p.box(wx, 1.2, z + 0.1, pw * 0.5, 0.03, 0.2, 0x9aa0a4);
    // plaquinha iluminada do caixa
    p.box(wx, 2.55, z + 0.1, 0.5, 0.2, 0.05, 0x14181a);
    p.box(wx, 2.55, z + 0.13, 0.4, 0.12, 0.02, rng.pick([0x5aff9a, 0x5aff9a, 0xffb02a]), { glow: 1.4 });
    // monitor e cadeira
    p.box(wx, 1.35, z - 0.2, 0.48, 0.34, 0.05, 0x1a1e22);
    p.box(wx, 1.35, z - 0.17, 0.42, 0.27, 0.02, rng.pick([0x39e6ff, 0x5aff9a]), { glow: 0.9 });
    p.box(wx, 0.55, WALL_Z + 0.4, 0.5, 0.08, 0.5, 0x22262a);
    p.box(wx, 0.9, WALL_Z + 0.2, 0.5, 0.6, 0.08, 0x22262a);
  }
}

/** Parede de cofres de aluguel (portinholas com puxadores; algumas arrombadas). */
function depositWall(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  const z = WALL_Z + 0.12;
  const cols = 11;
  const rows = 7;
  const cw = 0.5;
  const rh = 0.34;
  const y0 = 1.45;
  p.box(x, y0 + (rows * rh) / 2 - 0.05, z, cols * cw + 0.3, rows * rh + 0.3, 0.2, STEEL_D);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const dx = x - (cols * cw) / 2 + (c + 0.5) * cw;
      const dy = y0 + r * rh + rh / 2 - 0.05;
      if (rng.chance(0.08)) {
        p.box(dx, dy, z + 0.1, cw - 0.06, rh - 0.06, 0.02, 0x0c0e10);
        p.box(dx, dy - 0.05, z + 0.12, cw - 0.16, 0.06, 0.04, CASH);
        continue;
      }
      p.box(dx, dy, z + 0.11, cw - 0.05, rh - 0.05, 0.03, STEEL, { jitter: 0.12 });
      p.sphere(dx + cw * 0.28, dy, z + 0.14, 0.025, BRASS);
    }
  // mesa de conferência e dinheiro
  p.box(x, 0.8, -5.0, 2.6, 0.08, 0.9, WOOD);
  for (const sx of [-1, 1]) p.box(x + sx * 1.15, 0.4, -5.0, 0.1, 0.8, 0.8, WOOD_D);
  for (let i = 0; i < 4; i++)
    p.box(x - 0.8 + i * 0.5, 0.88, -5.0 + rng.range(-0.2, 0.2), 0.34, 0.08 + rng.next() * 0.12, 0.16, CASH);
  p.box(x + 0.9, 0.9, -5.1, 0.3, 0.1, 0.14, GOLD);
}

/** Área de espera: poltronas, vasos, quadros e relógio. */
function lounge(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  for (const sx of [-1, 1]) {
    const bx = x + sx * 2;
    p.box(bx, 0.25, -5.6, 2.0, 0.5, 0.8, 0x6a2a2e);
    p.box(bx, 0.7, -5.95, 2.0, 0.6, 0.2, 0x6a2a2e);
    p.box(bx - 1.0, 0.45, -5.6, 0.14, 0.4, 0.8, 0x4a1a1e);
    p.box(bx + 1.0, 0.45, -5.6, 0.14, 0.4, 0.8, 0x4a1a1e);
    // quadro com moldura dourada
    p.box(bx, 2.6, WALL_Z + 0.08, 1.5, 1.1, 0.05, BRASS);
    p.box(bx, 2.6, WALL_Z + 0.11, 1.35, 0.95, 0.02, rng.pick([0x2a3a4a, 0x3a2a2a, 0x2a3a2a]));
    p.box(bx + rng.range(-0.3, 0.3), 2.5, WALL_Z + 0.125, 0.6, 0.4, 0.01, rng.pick([0x8a7a5a, 0x5a6a7a]));
  }
  plant(p, rng, x, -5.4, 1);
  // relógio de parede
  p.cyl(x, 3.6, WALL_Z + 0.08, 0.45, 0.45, 0.06, 0xe8e4dc, 20, { rot: [H, 0, 0] });
  p.part('torus', [0.45, 0.04, 4, 20], x, 3.6, WALL_Z + 0.1, BRASS);
  p.box(x + 0.1, 3.68, WALL_Z + 0.13, 0.24, 0.035, 0.02, 0x1a1a1a, { rot: [0, 0, 0.6] });
  p.box(x, 3.72, WALL_Z + 0.14, 0.02, 0.3, 0.02, 0x1a1a1a);
  // mesinha com revistas
  p.cyl(x, 0.22, -4.6, 0.4, 0.4, 0.05, WOOD, 10);
  p.cyl(x, 0.1, -4.6, 0.05, 0.05, 0.2, BRASS, 6);
  p.box(x + 0.1, 0.26, -4.6, 0.3, 0.02, 0.22, 0xd84a4a, { rot: [0, 0.4, 0] });
}

/** Caixas eletrônicos embutidos com letreiro "BANCO". */
function atmWall(ctx: EnvCtx, x: number): void {
  const p = ctx.p;
  const z = WALL_Z + 0.35;
  p.box(x, 1.4, WALL_Z + 0.15, 6.2, 2.8, 0.3, 0x2a3236);
  for (let i = -1; i <= 1; i++) {
    const ax = x + i * 1.8;
    p.box(ax, 0.8, z, 1.1, 1.6, 0.5, 0x5a6268);
    p.box(ax, 1.25, z + 0.26, 0.6, 0.42, 0.02, 0x0a1a14);
    p.box(ax, 1.25, z + 0.27, 0.52, 0.34, 0.01, 0x5aff9a, { glow: 1.2 });
    p.box(ax, 0.9, z + 0.27, 0.5, 0.18, 0.04, 0x1a1e22, { rot: [0.5, 0, 0] });
    p.box(ax + 0.3, 0.72, z + 0.26, 0.18, 0.02, 0.02, 0xffb02a, { glow: 2 });
  }
  signText(p, 'BANCO', x, 3.25, WALL_Z + 0.33, 0.13, 0x4ad8a0);
  ctx.light(x, 2.5, WALL_Z + 1.4, 0x4ad8a0, 5, 7, 0.05);
}

/** Escritório do gerente: mesa, cadeira, arquivo, cofre pequeno. */
function office(ctx: EnvCtx, x: number): void {
  const { p, rng } = ctx;
  // divisória de vidro fosco com moldura
  p.box(x, 1.3, -4.7, 6.5, 0.06, 0.06, BRASS);
  p.box(x, 2.6, -4.7, 6.5, 0.06, 0.06, BRASS);
  for (let i = 0; i <= 4; i++) p.box(x - 3.25 + i * 1.625, 1.95, -4.7, 0.05, 1.3, 0.05, BRASS);
  for (let i = 0; i < 4; i++)
    p.box(x - 2.8 + i * 1.625, 1.95, -4.68, 0.02, 0.9, 0.01, GLASS, { glow: 0.8, rot: [0, 0, 0.55] });
  p.box(x, 0.65, -4.7, 6.5, 1.3, 0.08, WOOD);
  // mesa e cadeira
  p.box(x - 1, 0.78, -5.7, 2.2, 0.08, 1.0, WOOD);
  p.box(x - 1, 0.39, -5.7, 2.0, 0.78, 0.9, WOOD_D);
  p.box(x - 1.4, 1.0, -5.7, 0.5, 0.35, 0.04, 0x1a1e22);
  p.box(x - 1.4, 1.0, -5.67, 0.44, 0.28, 0.02, 0x39e6ff, { glow: 0.9 });
  p.sphere(x - 0.4, 0.93, -5.6, 0.1, 0xffd07a, { glow: 2 });
  // cofre pequeno e arquivos
  p.box(x + 1.8, 0.55, -5.9, 1.0, 1.1, 0.9, STEEL_D);
  p.cyl(x + 1.8, 0.6, -5.44, 0.2, 0.2, 0.04, STEEL, 10, { rot: [H, 0, 0] });
  p.box(x + 1.95, 0.35, -5.44, 0.04, 0.2, 0.04, BRASS);
  for (let i = 0; i < 2; i++) p.box(x + 0.6 + i * 0.6, 0.7, -6.1, 0.5, 1.4, 0.6, 0x5a6268, { jitter: 0.1 });
  if (rng.chance(0.6)) plant(p, rng, x + 2.8, -5.4, 0.9);
}

/** Porta do cofre-forte na arena do chefe (fechada, com vazamento de luz dourada). */
function vault(ctx: EnvCtx, cx: number): void {
  const p = ctx.p;
  const cy = 2.7;
  const r = 2.35;
  const z = WALL_Z + 0.3;
  // moldura quadrada de concreto e faixas de perigo
  p.box(cx, cy, WALL_Z + 0.12, 6.4, 5.4, 0.2, 0x5a6064, { jitter: 0.05 });
  for (let i = 0; i < 12; i++)
    p.box(cx - 3 + i * 0.55, 0.12, -5.55, 0.28, 0.02, 0.5, i % 2 ? 0xffc21a : 0x14161a, {
      noShadow: true,
      rot: [0, 0.5, 0],
    });
  // vazamento de luz dourada
  p.part('torus', [r + 0.05, 0.06, 4, 40], cx, cy, WALL_Z + 0.25, GOLD, { glow: 2.4 });
  ctx.light(cx, cy, WALL_Z + 1.4, 0xffc84a, 8, 10, 0.1);
  // porta
  p.cyl(cx, cy, z, r, r, 0.5, STEEL, 32, { rot: [H, 0, 0] });
  p.part('torus', [r + 0.12, 0.22, 6, 40], cx, cy, z + 0.12, STEEL_D);
  p.part('torus', [r * 0.8, 0.06, 4, 36], cx, cy, z + 0.27, 0x6a747e);
  p.part('torus', [r * 0.52, 0.05, 4, 28], cx, cy, z + 0.27, 0x6a747e);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    p.cyl(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9, z + 0.28, 0.08, 0.08, 0.12, 0xb8c2cc, 8, {
      rot: [H, 0, 0],
    });
  }
  // volante
  p.cyl(cx, cy, z + 0.4, 0.28, 0.28, 0.3, BRASS, 12, { rot: [H, 0, 0] });
  p.part('torus', [0.95, 0.07, 5, 24], cx, cy, z + 0.55, BRASS);
  for (let i = 0; i < 3; i++)
    p.box(cx, cy, z + 0.5, 0.1, 1.9, 0.08, BRASS, { rot: [0, 0, (i * Math.PI) / 3] });
  // dobradiças
  for (const dy of [-1.3, 1.3]) p.box(cx + r + 0.15, cy + dy, z + 0.1, 0.4, 0.55, 0.5, STEEL_D);
  // barras de trava
  for (const sx of [-1, 1]) p.box(cx + sx * (r + 0.6), cy, z, 0.8, 0.18, 0.18, 0xb8c2cc);
  // painel de senha iluminado
  p.box(cx - r - 0.9, 1.5, WALL_Z + 0.3, 0.45, 0.65, 0.12, 0x22262a);
  p.box(cx - r - 0.9, 1.62, WALL_Z + 0.37, 0.34, 0.22, 0.02, ALARM, { glow: 1.6 });
  for (let i = 0; i < 6; i++)
    p.box(cx - r - 1.0 + (i % 3) * 0.1, 1.35 - Math.floor(i / 3) * 0.1, WALL_Z + 0.37, 0.06, 0.06, 0.02, 0xc8ccd0);
  // pilhas de ouro e dinheiro nas laterais
  for (const sx of [-1, 1]) {
    const gx = cx + sx * 5.5;
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 4 - row; i++)
        p.box(gx - 0.45 + i * 0.3 + row * 0.15, 0.07 + row * 0.13, -5.3, 0.26, 0.12, 0.5, GOLD);
    for (let i = 0; i < 3; i++)
      p.box(gx + sx * 1.2, 0.1 + i * 0.16, -5.6 + i * 0.05, 0.6, 0.15, 0.4, CASH, { rot: [0, i * 0.3, 0] });
    beacon(ctx, cx + sx * 4.2, 4.2, WALL_Z + 0.25);
    camera(p, cx + sx * 3.4, 4.4, WALL_Z + 0.3, sx);
  }
}

function camera(p: Pieces, x: number, y: number, z: number, dir: number): void {
  p.box(x, y, z, 0.12, 0.12, 0.3, STEEL_D);
  p.box(x - dir * 0.1, y - 0.12, z + 0.3, 0.42, 0.2, 0.22, 0xd8dcdf, { rot: [0.3, dir * 0.4, 0] });
  p.sphere(x - dir * 0.28, y - 0.16, z + 0.42, 0.03, ALARM, { glow: 4 });
}

function ropes(p: Pieces, x0: number, x1: number, z: number): void {
  const n = Math.max(2, Math.round((x1 - x0) / 1.4) + 1);
  const step = (x1 - x0) / (n - 1);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step;
    p.cyl(x, 0.02, z, 0.16, 0.18, 0.04, BRASS, 10);
    p.cyl(x, 0.45, z, 0.03, 0.03, 0.9, BRASS, 6);
    p.sphere(x, 0.93, z, 0.06, BRASS);
    if (i < n - 1) {
      // cordão caído em "V"
      const mx = x + step / 2;
      const sag = 0.18;
      const half = step / 2;
      const a = Math.atan2(sag, half);
      const l = Math.hypot(half, sag);
      p.cyl(x + half / 2, 0.84 - sag / 2, z, 0.03, 0.03, l, 0x8a1a2a, 5, { rot: [0, 0, H - a] });
      p.cyl(mx + half / 2, 0.84 - sag / 2, z, 0.03, 0.03, l, 0x8a1a2a, 5, { rot: [0, 0, H + a] });
    }
  }
}

function plant(p: Pieces, rng: Rng, x: number, z: number, s: number): void {
  p.cyl(x, 0.3 * s, z, 0.28 * s, 0.22 * s, 0.6 * s, 0x8a6a4a, 8);
  for (let i = 0; i < 5; i++)
    p.ico(x + rng.range(-0.25, 0.25) * s, (0.8 + rng.next() * 0.5) * s, z + rng.range(-0.2, 0.2) * s, 0.28 * s, 0x2a6a3a, {
      jitter: 0.2,
    });
}

function moneyBag(p: Pieces, rng: Rng, x: number, z: number): void {
  const s = rng.range(0.8, 1.1);
  p.sphere(x, 0.28 * s, z, 0.3 * s, 0xa89868);
  p.cyl(x, 0.58 * s, z, 0.06 * s, 0.1 * s, 0.12 * s, 0xa89868, 6);
  p.part('torus', [0.08 * s, 0.02, 4, 8], x, 0.54 * s, z, 0x6a5a3a, { rot: [H, 0, 0] });
  p.box(x, 0.3 * s, z + 0.29 * s, 0.14 * s, 0.14 * s, 0.01, 0x2a5a2a);
}

/** Letreiro com fonte de pixels (5 linhas). */
const FONT: Record<string, string[]> = {
  B: ['110', '101', '110', '101', '110'],
  A: ['010', '101', '111', '101', '101'],
  N: ['1001', '1101', '1011', '1001', '1001'],
  C: ['011', '100', '100', '100', '011'],
  O: ['010', '101', '101', '101', '010'],
};

function signText(p: Pieces, text: string, x: number, y: number, z: number, px: number, color: number): void {
  const widths = [...text].map((c) => (FONT[c]?.[0]?.length ?? 3) + 1);
  const total = widths.reduce((a, b) => a + b, 0) - 1;
  p.box(x, y, z - 0.04, (total + 2) * px, 7 * px, 0.05, 0x14181a);
  let cx = x - (total * px) / 2;
  for (const [i, c] of [...text].entries()) {
    const rows = FONT[c] ?? [];
    rows.forEach((row, r) => {
      [...row].forEach((bit, col) => {
        if (bit === '1') p.box(cx + (col + 0.5) * px, y + (2 - r) * px, z, px * 0.9, px * 0.9, 0.03, color, { glow: 2.2 });
      });
    });
    cx += widths[i]! * px;
  }
}
