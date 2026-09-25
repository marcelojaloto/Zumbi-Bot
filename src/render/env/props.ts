import type { Rng } from '../../core/rng';
import type { EnvCtx, Pieces } from './builder';

/** Kit de props decorativos reutilizáveis entre temas. Todas as coordenadas são de mundo. */

export function lamppost(ctx: EnvCtx, x: number, z: number, color = 0xffb35c, h = 3.6, intensity = 14): void {
  const p = ctx.p;
  p.cyl(x, h / 2, z, 0.06, 0.09, h, 0x1e2126, 6);
  p.box(x + 0.35, h - 0.05, z, 0.8, 0.08, 0.08, 0x1e2126);
  p.box(x + 0.7, h - 0.22, z, 0.26, 0.26, 0.26, 0x2a2e36);
  p.box(x + 0.7, h - 0.36, z, 0.2, 0.06, 0.2, color, { glow: 3 });
  ctx.light(x + 0.7, h - 0.6, z + 0.4, color, intensity, 11, ctx.env.accent.flicker);
}

export function torch(ctx: EnvCtx, x: number, y: number, z: number, color = 0xff8a3c): void {
  const p = ctx.p;
  p.box(x, y - 0.25, z, 0.08, 0.5, 0.08, 0x3a2a1a);
  p.cone(x, y + 0.12, z, 0.1, 0.3, color, 5, { glow: 3.5 });
  p.cone(x, y + 0.2, z, 0.05, 0.22, 0xffd07a, 5, { glow: 4 });
  ctx.light(x, y + 0.2, z + 0.5, color, 10, 8, 0.8);
}

export function crate(p: Pieces, x: number, y: number, z: number, s = 0.9, color = 0x6a4a2a): void {
  p.box(x, y + s / 2, z, s, s, s, color);
  p.box(x, y + s / 2, z + s / 2 + 0.005, s * 0.95, s * 0.12, 0.02, 0x4a3218);
  p.box(x, y + s / 2, z + s / 2 + 0.006, 0.1, s * 0.95, 0.02, 0x4a3218);
}

export function barrel(p: Pieces, x: number, z: number, color = 0x3a5a3a, y = 0): void {
  p.cyl(x, y + 0.5, z, 0.38, 0.38, 1.0, color, 9);
  p.cyl(x, y + 0.25, z, 0.395, 0.395, 0.06, 0x1a1a1a, 9);
  p.cyl(x, y + 0.75, z, 0.395, 0.395, 0.06, 0x1a1a1a, 9);
}

export function rock(p: Pieces, rng: Rng, x: number, z: number, s = 1, color = 0x4a4a50): void {
  p.part('ico', [s * rng.range(0.5, 0.9), 0], x, s * 0.25, z, color, {
    rot: [rng.next() * 3, rng.next() * 3, rng.next() * 3],
    jitter: 0.15,
  });
}

export function deadTree(p: Pieces, rng: Rng, x: number, z: number, s = 1, color = 0x2a221c): void {
  const h = rng.range(3.5, 6) * s;
  p.cyl(x, h / 2, z, 0.12 * s, 0.28 * s, h, color, 6);
  const branches = rng.int(3, 6);
  for (let i = 0; i < branches; i++) {
    const by = h * rng.range(0.45, 0.95);
    const len = rng.range(0.8, 2.2) * s;
    const a = rng.range(0, Math.PI * 2);
    const tilt = rng.range(0.5, 1.2);
    p.cyl(
      x + Math.cos(a) * len * 0.35,
      by + len * 0.2,
      z + Math.sin(a) * len * 0.35,
      0.03 * s,
      0.08 * s,
      len,
      color,
      4,
      {
        rot: [Math.sin(a) * tilt, 0, -Math.cos(a) * tilt],
      },
    );
  }
}

export function pine(p: Pieces, rng: Rng, x: number, z: number, s = 1, c1 = 0x1f3a2a, c2 = 0x16281e): void {
  const h = rng.range(4, 7) * s;
  p.cyl(x, h * 0.15, z, 0.12 * s, 0.18 * s, h * 0.3, 0x2a1e14, 5);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const r = (1.4 - i * 0.35) * s;
    const th = h * 0.36;
    p.cone(x, h * 0.22 + i * h * 0.22 + th / 2, z, r, th, i % 2 ? c1 : c2, 7);
  }
}

export function fence(p: Pieces, x0: number, x1: number, z: number, color = 0x3a2e24, broken?: Rng): void {
  for (let x = x0; x < x1; x += 1.2) {
    if (broken && broken.chance(0.15)) continue;
    const h = broken ? broken.range(0.8, 1.2) : 1.1;
    p.box(x, h / 2, z, 0.1, h, 0.08, color, { rot: [0, 0, broken ? broken.range(-0.15, 0.15) : 0] });
  }
  p.box((x0 + x1) / 2, 0.8, z, x1 - x0, 0.08, 0.05, color);
  p.box((x0 + x1) / 2, 0.4, z, x1 - x0, 0.08, 0.05, color);
}

export function grave(p: Pieces, rng: Rng, x: number, z: number, color = 0x6a6a72): void {
  const kind = rng.int(0, 2);
  const tilt = rng.range(-0.2, 0.2);
  if (kind === 0) {
    p.box(x, 0.45, z, 0.55, 0.9, 0.14, color, { rot: [0, 0, tilt] });
    p.cyl(x, 0.9, z, 0.275, 0.275, 0.14, color, 8, { rot: [Math.PI / 2, 0, tilt] });
  } else if (kind === 1) {
    p.box(x, 0.6, z, 0.12, 1.2, 0.12, color, { rot: [0, 0, tilt] });
    p.box(x, 0.85, z, 0.6, 0.12, 0.12, color, { rot: [0, 0, tilt] });
  } else {
    p.box(x, 0.3, z, 0.7, 0.6, 0.2, color, { rot: [0, 0, tilt] });
  }
  p.box(x, 0.03, z + 0.5, 0.7, 0.06, 1.1, 0x2a2420, { noShadow: true });
}

/** Casa simples com telhado de duas águas e janelas iluminadas. */
export function house(
  ctx: EnvCtx,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  wall: number,
  roof: number,
  window = 0xffb35c,
  lit = 0.6,
): void {
  const p = ctx.p;
  const rng = ctx.rng;
  p.box(x, h / 2, z, w, h, d, wall, { jitter: 0.1 });
  // telhado: prisma via cone de 4 lados achatado
  p.part('cone', [Math.max(w, d) * 0.78, h * 0.55, 4], x, h + h * 0.27, z, roof, {
    rot: [0, Math.PI / 4, 0],
    jitter: 0.12,
  });
  p.box(x, h + 0.02, z, w + 0.3, 0.1, d + 0.3, 0x1a1614);
  // chaminé
  if (rng.chance(0.6)) p.box(x + w * 0.25, h + h * 0.45, z - d * 0.1, 0.35, h * 0.5, 0.35, 0x3a3230);
  // janelas (frente)
  const cols = Math.max(1, Math.floor(w / 1.6));
  for (let i = 0; i < cols; i++) {
    const wx = x - w / 2 + (i + 0.5) * (w / cols);
    for (const wy of h > 4 ? [h * 0.3, h * 0.7] : [h * 0.55]) {
      const on = rng.chance(lit);
      p.box(
        wx,
        wy,
        z + d / 2 + 0.01,
        0.6,
        0.75,
        0.04,
        on ? window : 0x0c0e14,
        on ? { glow: rng.range(1.2, 2.2) } : {},
      );
      p.box(wx, wy, z + d / 2 + 0.03, 0.06, 0.8, 0.03, 0x1a1410);
      if (on && rng.chance(0.4)) ctx.light(wx, wy, z + d / 2 + 1, window, 4, 6, 0.3);
    }
  }
  // porta
  p.box(x + (rng.chance(0.5) ? -1 : 1) * w * 0.2, 0.95, z + d / 2 + 0.02, 0.9, 1.9, 0.05, 0x2a1a10);
}

export function column(p: Pieces, x: number, z: number, h: number, color: number, r = 0.35): void {
  p.box(x, 0.15, z, r * 2.6, 0.3, r * 2.6, color);
  p.cyl(x, h / 2, z, r, r * 1.05, h, color, 8);
  p.box(x, h - 0.15, z, r * 2.6, 0.3, r * 2.6, color);
}

export function sandbags(p: Pieces, x: number, z: number, n = 5): void {
  for (let i = 0; i < n; i++) {
    for (let row = 0; row < 2; row++) {
      p.part('capsule', [0.18, 0.4], x - n * 0.25 + i * 0.5 + row * 0.25, 0.18 + row * 0.33, z, 0x8a7a5a, {
        rot: [0, 0, Math.PI / 2],
        jitter: 0.12,
      });
    }
  }
}

export function carWreck(p: Pieces, rng: Rng, x: number, z: number, color = 0x5a2a2a): void {
  const rot = rng.range(-0.3, 0.3);
  p.box(x, 0.55, z, 3.8, 0.7, 1.7, color, { rot: [0, rot, rng.range(-0.05, 0.05)] });
  p.box(x - 0.2, 1.15, z, 2.0, 0.55, 1.5, color, { rot: [0, rot, 0] });
  p.box(x - 0.2, 1.15, z, 2.02, 0.4, 1.52, 0x14161c, { rot: [0, rot, 0] });
  for (const dx of [-1.2, 1.2])
    for (const dz of [-0.8, 0.8])
      p.cyl(x + dx, 0.32, z + dz, 0.32, 0.32, 0.22, 0x111111, 8, { rot: [Math.PI / 2, 0, 0] });
}

export function silhouetteRow(
  ctx: EnvCtx,
  z: number,
  color: number,
  minH: number,
  maxH: number,
  step: number,
  kind: 'city' | 'hills' | 'trees' | 'castle',
): void {
  const p = ctx.p;
  const rng = ctx.rng;
  for (let x = ctx.x0 - 20; x < ctx.x1 + 20; x += step * rng.range(0.7, 1.3)) {
    const h = rng.range(minH, maxH);
    switch (kind) {
      case 'city': {
        const w = step * rng.range(0.6, 1.1);
        p.box(x, h / 2, z, w, h, 4, color, { noShadow: true, jitter: 0.05 });
        const rows = Math.floor(h / 3);
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < 3; c++)
            if (rng.chance(0.18))
              p.box(
                x - w / 3 + (c * w) / 3,
                2 + r * 3,
                z + 2.02,
                0.8,
                1,
                0.05,
                rng.pick([0xffc86a, 0x8ad8ff, 0xff8a5a]),
                { glow: 1.2 },
              );
        break;
      }
      case 'hills':
        p.part('cone', [step * 1.4, h, 5], x, h / 2, z, color, { noShadow: true, jitter: 0.04 });
        break;
      case 'trees':
        p.cone(x, h / 2, z, h * 0.25, h, color, 6, { noShadow: true, jitter: 0.04 });
        break;
      case 'castle':
        p.box(x, h / 2, z, step * 0.5, h, 3, color, { noShadow: true });
        p.cone(x, h + 2, z, step * 0.35, 4, color, 4, { noShadow: true, rot: [0, Math.PI / 4, 0] });
        if (rng.chance(0.5)) p.box(x, h * 0.6, z + 1.52, 0.5, 0.8, 0.05, 0xffb35c, { glow: 1.5 });
        break;
    }
  }
}
