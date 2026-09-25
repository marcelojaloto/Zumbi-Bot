import type { Rng } from '../../../core/rng';
import type { EnvCtx, Pieces } from '../builder';
import { carWreck, column, rock } from '../props';

const FIRE_OUT = 0xff3c0a;
const FIRE_MID = 0xff7418;
const FIRE_CORE = 0xffb448;
const EMBER = 0xff5a14;
const CHAR = [0x2a2420, 0x302824, 0x382e28, 0x40342c];
const BRICK = [0x5a4036, 0x4e3a32, 0x62463a, 0x483a34];
const CONCRETE = [0x5a524c, 0x4c4642, 0x645c54];

/** Labareda: três cones emissivos sobrepostos (externo, meio e núcleo). */
function flame(p: Pieces, rng: Rng, x: number, y: number, z: number, s: number): void {
  const lean = rng.range(-0.12, 0.12);
  p.cone(x, y + 0.45 * s, z, 0.3 * s, 0.9 * s, FIRE_OUT, 5, { glow: 1.6, rot: [0, rng.next() * 3, lean] });
  p.cone(x + rng.range(-0.06, 0.06) * s, y + 0.38 * s, z + 0.04 * s, 0.2 * s, 0.72 * s, FIRE_MID, 5, {
    glow: 2,
    rot: [0, rng.next() * 3, lean * 1.3],
  });
  p.cone(x, y + 0.26 * s, z + 0.08 * s, 0.1 * s, 0.44 * s, FIRE_CORE, 5, { glow: 2.4 });
}

/** Foco de incêndio: várias labaredas, brasas no chão e uma luz laranja tremulante. */
function fireCluster(ctx: EnvCtx, x: number, y: number, z: number, s: number, light = true): void {
  const { p, rng } = ctx;
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++)
    flame(p, rng, x + rng.range(-0.5, 0.5) * s, y, z + rng.range(-0.3, 0.3) * s, s * rng.range(0.6, 1.15));
  p.part('ico', [0.45 * s, 0], x, y + 0.05, z, 0x1a1210, { rot: [0, rng.next() * 3, 0], jitter: 0.2 });
  p.box(x, y + 0.03, z, 0.9 * s, 0.05, 0.7 * s, EMBER, { glow: 1.2, rot: [0, rng.next() * 3, 0] });
  if (light) ctx.light(x, y + 1.1 * s, z + 0.6, 0xff6a2a, 5 + 3 * s, 5 + 3 * s, 0.85);
}

/** Viga entre dois pontos (plano XY) numa profundidade z. */
function beam(
  p: Pieces,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  z: number,
  t: number,
  color: number,
  glow?: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const a = Math.atan2(-dx, dy);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  p.box(cx, cy, z, t, len, t, color, { rot: [0, 0, a] });
  // abas de perfil I
  p.box(cx, cy, z + t * 0.45, t * 1.6, len, t * 0.18, color, { rot: [0, 0, a] });
  if (glow) p.box(cx, cy, z + t * 0.56, t * 0.3, len * 0.7, 0.03, EMBER, { rot: [0, 0, a], glow: glow * 0.7 });
}

/** Rachadura de brasas no chão: segmentos finos emissivos em zigue-zague. */
function emberCrack(p: Pieces, rng: Rng, x: number, z: number, n: number): void {
  let a = rng.range(0, Math.PI);
  let cx = x;
  let cz = z;
  for (let i = 0; i < n; i++) {
    const len = rng.range(0.4, 1.3);
    a += rng.range(-0.9, 0.9);
    const nx = cx + Math.cos(a) * len;
    const nz = cz + Math.sin(a) * len * 0.6;
    p.box((cx + nx) / 2, 0.015, (cz + nz) / 2, len, 0.02, rng.range(0.04, 0.08), EMBER, {
      glow: rng.range(1.2, 2),
      rot: [0, -Math.atan2(nz - cz, nx - cx), 0],
    });
    cx = nx;
    cz = nz;
  }
}

/** Parede queimada com topo irregular, janelas escuras ou em chamas. */
function charredWall(ctx: EnvCtx, x: number, z: number, w: number, h: number, fire: number): void {
  const { p, rng } = ctx;
  const col = rng.pick(BRICK);
  p.box(x, h / 2, z, w, h, 0.45, col, { jitter: 0.12 });
  // topo quebrado
  for (let bx = x - w / 2 + 0.4; bx < x + w / 2; bx += rng.range(0.5, 1.1)) {
    const bh = rng.range(0.2, 1.1);
    if (rng.chance(0.65)) p.box(bx, h + bh / 2, z, rng.range(0.4, 0.9), bh, 0.45, col, { jitter: 0.12 });
  }
  // fuligem na base e manchas
  p.box(x, 0.5, z + 0.235, w * 0.98, 1, 0.02, 0x140e0c, { noShadow: true });
  const cols = Math.max(1, Math.floor(w / 1.8));
  for (let i = 0; i < cols; i++) {
    const wx = x - w / 2 + (i + 0.5) * (w / cols);
    if (h < 2.4) continue;
    const wy = Math.min(h - 0.9, 2.1);
    const burning = rng.chance(fire);
    p.box(wx, wy, z + 0.235, 0.8, 1.0, 0.03, burning ? 0xff5a14 : 0x0a0706, burning ? { glow: 1.2 } : {});
    p.box(wx, wy - 0.55, z + 0.3, 0.95, 0.1, 0.16, 0x2a2420);
    if (burning) {
      flame(p, rng, wx, wy - 0.5, z + 0.3, 0.55);
      if (rng.chance(0.5)) ctx.light(wx, wy, z + 1.2, 0xff6a2a, 7, 6, 0.9);
    }
  }
}

/** Coluna de fumaça: blocos escuros crescendo para cima. */
function smokeColumn(p: Pieces, rng: Rng, x: number, z: number, s: number): void {
  let y = 0;
  let r = 1.2 * s;
  for (let i = 0; i < 7; i++) {
    const h = 2.2 * s;
    const c = i < 2 ? 0x1c1412 : rng.pick([0x201816, 0x241c18, 0x1a1412]);
    p.part('ico', [r, 0], x + Math.sin(i * 0.8) * 0.8 * s + i * 0.35 * s, y + h * 0.5, z, c, {
      noShadow: true,
      jitter: 0.1,
      rot: [rng.next() * 3, rng.next() * 3, 0],
    });
    y += h * 0.8;
    r *= 1.18;
  }
}

/**
 * Área em Chamas: quarteirão industrial queimando. Corredor estreito com escombros baixos nas
 * bordas, paredes calcinadas, vigas desabadas em brasa, fábrica em chamas ao fundo, colunas de
 * fumaça e rachaduras de brasas no chão.
 */
export function chamasTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const boss = ctx.level.boss;
  const arena0 = boss ? boss.lock[0] - 1.5 : Infinity;
  const [bz0, bz1] = boss?.zBand ?? ctx.zBand;
  const back = (x: number) => (x >= arena0 ? Math.min(bz0, ctx.zBand[0]) - 0.6 : ctx.zBand[0] - 0.6);
  const front = (x: number) => (x >= arena0 ? Math.max(bz1, ctx.zBand[1]) + 0.6 : ctx.zBand[1] + 0.6);

  // ---------------------------------------------------------------- borda do corredor
  // mureta quebrada ao fundo (baixa) e entulho
  for (let x = ctx.x0; x < ctx.x1; x += rng.range(0.9, 1.6)) {
    const z = back(x) - rng.range(0.05, 0.4);
    if (rng.chance(0.72)) {
      const h = rng.range(0.25, 0.85);
      p.box(x, h / 2, z - 0.15, rng.range(0.7, 1.4), h, 0.4, rng.pick(BRICK), {
        rot: [0, rng.range(-0.15, 0.15), rng.range(-0.08, 0.08)],
        jitter: 0.14,
      });
    }
    if (rng.chance(0.55)) rock(p, rng, x + rng.range(-0.4, 0.4), z + rng.range(-0.3, 0.2), 0.55, rng.pick(CHAR));
    if (rng.chance(0.3))
      p.box(x, 0.06, z + 0.15, rng.range(0.2, 0.4), 0.12, rng.range(0.15, 0.3), rng.pick(BRICK), {
        rot: [0, rng.next() * 3, 0],
      });
  }
  // entulho baixo na frente (não bloqueia a visão)
  for (let x = ctx.x0; x < ctx.x1; x += rng.range(0.9, 2)) {
    const z = front(x) + rng.range(0.1, 1.6);
    if (rng.chance(0.55))
      p.part('ico', [rng.range(0.14, 0.3), 0], x, 0.06, z, rng.pick(CHAR), {
        rot: [rng.next() * 3, rng.next() * 3, rng.next() * 3],
        jitter: 0.15,
      });
    if (rng.chance(0.45))
      p.box(x + 0.3, 0.07, z + 0.2, rng.range(0.3, 0.6), 0.14, rng.range(0.2, 0.4), rng.pick(BRICK), {
        rot: [rng.range(-0.2, 0.2), rng.next() * 3, rng.range(-0.2, 0.2)],
      });
    if (rng.chance(0.08)) {
      // viga caída no chão, em brasa
      const len = rng.range(1.4, 2.4);
      const a = rng.range(-0.6, 0.6);
      p.box(x, 0.12, z + 0.3, len, 0.2, 0.2, 0x1e1816, { rot: [0, a, 0] });
      p.box(x, 0.225, z + 0.3, len * 0.6, 0.02, 0.06, EMBER, { rot: [0, a, 0], glow: 1.2 });
    }
  }
  // pequenos focos nas bordas do corredor
  for (let x = ctx.x0 + 4; x < ctx.x1; x += rng.range(5.5, 9)) {
    const f = rng.chance(0.45);
    fireCluster(ctx, x, 0, f ? front(x) + rng.range(0.5, 1.3) : back(x) - rng.range(0.4, 1), rng.range(0.45, 0.7), !f && rng.chance(0.7));
  }

  // rachaduras de brasas fora da faixa
  for (let i = 0; i < ctx.dense(70); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.chance(0.6) ? rng.range(-7, back(x) - 0.4) : rng.range(front(x) + 0.3, front(x) + 3);
    emberCrack(p, rng, x, z, rng.int(2, 5));
  }
  // cinzas e manchas de queimado no chão
  for (let i = 0; i < ctx.dense(50); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const r = rng.range(0.4, 1.1);
    p.part('cyl', [r, r * 1.1, 0.02, 7], x, 0.01, rng.range(-8, back(x) - 0.2), 0x201a18, {
      noShadow: true,
      jitter: 0.1,
    });
  }

  // ---------------------------------------------------------------- plano médio
  // paredes queimadas, pilares e entulho
  let x = ctx.x0;
  while (x < ctx.x1) {
    const w = rng.range(3, 6.5);
    const z = rng.range(-6, -4) + (x >= arena0 ? -1.2 : 0);
    const kind = rng.next();
    if (kind < 0.45) charredWall(ctx, x + w / 2, z, w, rng.range(2, 3.6), 0.35);
    else if (kind < 0.7) {
      // pilares de concreto (um tombado)
      const c = rng.pick(CONCRETE);
      column(p, x + 0.6, z, rng.range(2.6, 4), c, 0.3);
      if (rng.chance(0.6)) column(p, x + w - 0.6, z, rng.range(1.2, 2.2), c, 0.3);
      const a = rng.range(0.9, 1.3);
      p.cyl(x + w / 2, 0.9, z + 0.4, 0.28, 0.3, 3.2, c, 8, { rot: [0, 0, a] });
      fireCluster(ctx, x + w / 2, 0.2, z + 0.7, rng.range(0.6, 0.9));
    } else if (kind < 0.85) {
      carWreck(p, rng, x + w / 2, z + 0.6, rng.pick([0x2a1e1a, 0x3a2420, 0x221c1c]));
      fireCluster(ctx, x + w / 2 - 0.3, 1.2, z + 0.6, 0.8);
    } else {
      // pilha de escombros em chamas
      for (let i = 0; i < 6; i++)
        rock(p, rng, x + w / 2 + rng.range(-1.3, 1.3), z + rng.range(-0.6, 0.6), rng.range(0.8, 1.4), rng.pick(CHAR));
      fireCluster(ctx, x + w / 2, 0.5, z + 0.3, 1.1);
    }
    x += w + rng.range(0.5, 2.5);
  }

  // vigas desabadas cruzando o fundo (algumas em brasa)
  for (let bx = ctx.x0 + 6; bx < ctx.x1; bx += rng.range(9, 15)) {
    const z = rng.range(-6.8, -5.4) + (bx >= arena0 ? -1 : 0);
    const dir = rng.chance(0.5) ? 1 : -1;
    const len = rng.range(5, 8);
    const topY = rng.range(3.2, 5.5);
    beam(p, bx, 0, bx + dir * len, topY, z, 0.3, 0x241e1a, rng.chance(0.7) ? 1.8 : undefined);
    // apoio (parede/pilar onde a viga descansa)
    p.box(bx + dir * (len + 0.3), topY / 2, z - 0.4, 0.8, topY + 0.2, 0.8, rng.pick(CONCRETE));
    if (rng.chance(0.6)) flame(p, rng, bx + dir * len * 0.55, topY * 0.55, z + 0.25, 0.7);
    fireCluster(ctx, bx + dir * 0.4, 0, z + 0.5, 0.7, rng.chance(0.5));
  }

  // ---------------------------------------------------------------- fábrica ao fundo
  let fx = ctx.x0 - 5;
  while (fx < ctx.x1 + 5) {
    const w = rng.range(8, 14);
    const h = rng.range(7, 11);
    const z = -13 - rng.range(0, 2);
    const col = rng.pick([0x2e2420, 0x34261e, 0x2a2220]);
    const collapsed = rng.chance(0.25);
    const hh = collapsed ? h * 0.45 : h;
    p.box(fx + w / 2, hh / 2, z, w, hh, 3, col, { jitter: 0.08 });
    if (collapsed) {
      for (let i = 0; i < 5; i++)
        p.box(fx + rng.range(1, w - 1), hh + rng.range(0.3, 1.8), z, rng.range(0.8, 2), rng.range(0.8, 3), 3, col, {
          rot: [0, 0, rng.range(-0.4, 0.4)],
        });
      fireCluster(ctx, fx + w / 2, hh, z + 1.2, 1.6, false);
      ctx.light(fx + w / 2, hh + 1.5, z + 3, 0xff5a1a, 20, 14, 0.9);
    } else {
      // telhado em dente de serra
      for (let rx = fx + 1.2; rx < fx + w - 0.6; rx += 2.4)
        p.box(rx, h + 0.8, z, 2.3, 0.2, 3, 0x1e1816, { rot: [0, 0, 0.55] });
    }
    // janelas em fileiras: muitas em chamas
    const rows = Math.max(1, Math.floor(hh / 2.6));
    for (let r = 0; r < rows; r++)
      for (let wx = fx + 1; wx < fx + w - 0.8; wx += 1.9) {
        const on = rng.chance(0.35);
        const wy = 1.6 + r * 2.6;
        p.box(wx, wy, z + 1.51, 0.8, 1.0, 0.04, on ? rng.pick([0xff5a14, 0xff6a1c, 0xff4010]) : 0x120c0a, on ? { glow: rng.range(0.6, 1.1) } : {});
        p.box(wx, wy - 0.55, z + 1.56, 1, 0.1, 0.12, 0x1a1412);
        p.box(wx, wy, z + 1.55, 0.06, 1.0, 0.06, 0x1a1412);
      }
    // chaminé com fumaça
    if (rng.chance(0.45)) {
      const cx = fx + rng.range(1.5, w - 1.5);
      p.cyl(cx, h + 3, z - 0.5, 0.55, 0.75, 6, 0x2a201c, 8);
      p.cyl(cx, h + 6.05, z - 0.5, 0.62, 0.62, 0.3, 0x1a1412, 8);
      smokeColumn(p, rng, cx, z - 0.5 + 0.2, 1);
    }
    fx += w + rng.range(0.5, 3);
  }
  // estrutura de vigas de aço (galpão destelhado) entre o plano médio e a fábrica
  for (let gx = ctx.x0; gx < ctx.x1; gx += rng.range(14, 22)) {
    const z = -9.5;
    const n = rng.int(2, 4);
    const h = rng.range(5, 7);
    for (let i = 0; i < n; i++) {
      const px = gx + i * 3.2;
      p.box(px, h / 2, z, 0.28, h, 0.28, 0x2a2624);
      p.box(px, h / 2, z + 0.13, 0.45, h, 0.05, 0x2a2624);
      if (i > 0) {
        if (rng.chance(0.65)) p.box(px - 1.6, h - 0.15, z, 3.2, 0.3, 0.28, 0x2a2624);
        else beam(p, px - 3.2, h - 0.2, px - 0.4, rng.range(0.5, 2), z + 0.35, 0.24, 0x2a2624, 1.5);
      }
    }
    if (rng.chance(0.6)) fireCluster(ctx, gx + rng.range(0, (n - 1) * 3.2), 0, z + 0.6, rng.range(0.9, 1.3));
  }

  // ---------------------------------------------------------------- horizonte
  for (let hx = ctx.x0 - 20; hx < ctx.x1 + 20; hx += rng.range(7, 12)) {
    const h = rng.range(8, 18);
    const w = rng.range(5, 9);
    p.box(hx, h / 2, -30 - rng.range(0, 6), w, h, 4, rng.pick([0x1a0c08, 0x160a06, 0x1e0e0a]), {
      noShadow: true,
    });
    // brilho do incêndio atrás dos prédios
    if (rng.chance(0.5))
      p.box(hx + rng.range(-2, 2), rng.range(1, 3), -27.8, rng.range(2, 5), rng.range(1, 3), 0.1, 0xff4a10, {
        glow: rng.range(0.8, 1.5),
      });
  }
  for (let i = 0; i < ctx.dense(14); i++) smokeColumn(p, rng, rng.range(ctx.x0, ctx.x1), rng.range(-24, -18), rng.range(1.2, 2));

  // ---------------------------------------------------------------- arena do chefe: fornalha
  if (boss) {
    const ax = (boss.lock[0] + boss.lock[1]) / 2;
    // bocas de fornalha na parede do fundo
    for (let i = -1; i <= 1; i++) {
      const bx = ax + i * 6.5;
      const z = back(bx) - 3.2;
      p.box(bx, 1.8, z, 3.6, 3.6, 1.4, 0x2a2220);
      p.box(bx, 1.3, z + 0.72, 2.2, 1.5, 0.04, 0xff4a10, { glow: 1.3 });
      for (let k = -2; k <= 2; k++) p.box(bx + k * 0.45, 1.3, z + 0.76, 0.08, 1.5, 0.06, 0x1a1412);
      p.box(bx, 2.45, z + 0.8, 2.6, 0.3, 0.2, 0x1a1412);
      fireCluster(ctx, bx, 0.6, z + 0.9, 0.9, false);
      ctx.light(bx, 1.6, z + 2, 0xff6a2a, 22, 12, 0.7);
    }
    // canaletas de lava fora da faixa
    for (const lz of [back(ax) - 1.2]) {
      p.box(ax, 0.03, lz, boss.lock[1] - boss.lock[0] + 6, 0.05, 0.35, 0xff4a10, { glow: 2.2 });
      p.box(ax, 0.08, lz - 0.25, boss.lock[1] - boss.lock[0] + 6, 0.16, 0.14, 0x1e1816);
      p.box(ax, 0.08, lz + 0.25, boss.lock[1] - boss.lock[0] + 6, 0.16, 0.14, 0x1e1816);
    }
  }
}
