import type { EnvCtx } from '../builder';
import { rock, silhouetteRow } from '../props';

const H = Math.PI / 2;
const CORAL = [0xff5a7a, 0xff9a3a, 0xc85aff, 0x3ad8c8, 0xffd23a];
const KELP = [0x1e5a3a, 0x2a6a44, 0x184a32];
const STEEL = 0x4a5a66;
const STEEL_D = 0x24303a;
const GLASS = 0x8ae8ff;
const CORE = 0xff2a3a;

function kelp(ctx: EnvCtx, x: number, z: number, h: number): void {
  const { p, rng } = ctx;
  const c = rng.pick(KELP);
  for (let i = 0; i < 3; i++)
    p.box(x + rng.range(-0.15, 0.15), h / 2, z + rng.range(-0.1, 0.1), 0.07, h * rng.range(0.7, 1), 0.03, c, {
      rot: [rng.range(-0.12, 0.12), 0, rng.range(-0.2, 0.2)],
      noShadow: true,
    });
}

function coral(ctx: EnvCtx, x: number, z: number, s: number): void {
  const { p, rng } = ctx;
  const c = rng.pick(CORAL);
  if (rng.chance(0.5)) {
    // ramos
    for (let i = 0; i < 5; i++) {
      const a = rng.range(0, Math.PI * 2);
      p.cyl(
        x + Math.cos(a) * 0.15 * s,
        0.4 * s,
        z + Math.sin(a) * 0.15 * s,
        0.03 * s,
        0.07 * s,
        0.9 * s,
        c,
        5,
        {
          rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5],
        },
      );
    }
  } else {
    // cérebro
    p.sphere(x, 0.3 * s, z, 0.45 * s, c, { jitter: 0.2 });
    p.sphere(x + 0.4 * s, 0.2 * s, z + 0.1, 0.28 * s, c, { jitter: 0.2 });
  }
}

function bubbles(ctx: EnvCtx, x: number, z: number, n: number): void {
  const { p, rng } = ctx;
  for (let i = 0; i < n; i++)
    p.sphere(
      x + rng.range(-0.3, 0.3),
      0.4 + i * rng.range(0.4, 0.7),
      z + rng.range(-0.2, 0.2),
      rng.range(0.03, 0.08),
      GLASS,
      {
        glow: 1.6,
      },
    );
}

/** Módulo do laboratório: cúpula de vidro acesa sobre uma base de aço, com escotilha e cano. */
function labDome(ctx: EnvCtx, x: number, z: number, r: number): void {
  const p = ctx.p;
  p.cyl(x, 0.4, z, r * 1.05, r * 1.1, 0.8, STEEL_D, 12);
  p.sphere(x, 0.8, z, r, GLASS, { glow: 0.5 });
  p.cyl(x, 0.82, z, r * 1.02, r * 1.02, 0.1, STEEL, 12);
  p.cyl(x, 0.5, z + r * 1.02, 0.3, 0.3, 0.1, STEEL, 8, { rot: [H, 0, 0] });
  p.cyl(x + r * 1.6, 0.25, z, 0.14, 0.14, r * 1.4, STEEL, 6, { rot: [0, 0, H] });
  ctx.light(x, 1.6, z + r, GLASS, 6, 9, 0.15);
}

/** Dressing dos perigos: mina com corrente, chaminé das fontes termais e tufo de algas. */
function hazardDressing(ctx: EnvCtx): void {
  const { p } = ctx;
  const all = [...(ctx.level.hazards ?? []), ...ctx.level.segments.flatMap((s) => s.hazards ?? [])];
  for (const h of all) {
    if (h.kind === 'mine') {
      p.sphere(h.x, 0.45, h.z, 0.3, STEEL_D);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        p.cone(h.x + Math.cos(a) * 0.3, 0.45, h.z + Math.sin(a) * 0.3, 0.05, 0.16, STEEL, 4, {
          rot: [Math.sin(a) * H, 0, -Math.cos(a) * H],
        });
      }
      p.sphere(h.x, 0.78, h.z, 0.05, CORE, { glow: 3 });
    } else if (h.kind === 'gasVent') {
      p.cone(h.x, 0.25, h.z, 0.7, 0.5, 0x2a2420, 8);
      p.cyl(h.x, 0.5, h.z, 0.2, 0.25, 0.06, 0xff7a2a, 8, { glow: 1.8 });
    } else if (h.kind === 'swamp') {
      const r = (h.w ?? 4) / 2;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        kelp(ctx, h.x + Math.cos(a) * r * 0.8, h.z + Math.sin(a) * r * 0.6, 1.2);
      }
    }
  }
}

/** Arena do chefe: a parede do laboratório com o tubo do núcleo, cabos e monitores. */
function coreChamber(ctx: EnvCtx, cx: number): void {
  const { p } = ctx;
  const z = -6.2;
  p.box(cx, 3.2, z, 22, 6.4, 0.6, STEEL_D);
  for (let i = -5; i <= 5; i++) p.box(cx + i * 2, 3.2, z + 0.32, 0.18, 6.4, 0.1, STEEL);
  // tubo do núcleo
  p.cyl(cx, 3, z + 0.9, 1.3, 1.3, 5, GLASS, 14, { glow: 0.35 });
  p.cyl(cx, 0.3, z + 0.9, 1.6, 1.7, 0.6, STEEL, 14);
  p.cyl(cx, 5.7, z + 0.9, 1.6, 1.5, 0.6, STEEL, 14);
  p.sphere(cx, 3, z + 0.9, 0.7, CORE, { glow: 3.2 });
  ctx.light(cx, 3, z + 3, CORE, 12, 14, 0.5);
  for (const s of [-1, 1]) {
    // cabos e monitores
    p.cyl(cx + s * 3, 0.2, z + 1.6, 0.12, 0.12, 4.2, 0x10181e, 6, { rot: [0, s * 0.5, H] });
    p.box(cx + s * 6.5, 2.6, z + 0.36, 2.2, 1.4, 0.06, 0x39e6ff, { glow: 1.4 });
    p.box(cx + s * 6.5, 2.6, z + 0.34, 2.4, 1.6, 0.06, STEEL);
    ctx.light(cx + s * 6.5, 2.4, z + 2.5, 0x39e6ff, 7, 10, 0.3);
  }
}

/** Fundo do mar: areia, corais, algas, pedras, bolhas, feixes de luz, um casco afundado e os módulos do laboratório. */
export function marTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  const [z0, z1] = ctx.zBand;
  const arena = ctx.level.boss ? ctx.level.boss.lock : null;
  const arenaMid = arena ? (arena[0] + arena[1]) / 2 : Infinity;
  const inArena = (x: number) => Math.abs(x - arenaMid) < 13;

  hazardDressing(ctx);

  // conchas, estrelas e pedrinhas
  for (let i = 0; i < ctx.dense(200); i++) {
    const x = rng.range(ctx.x0, ctx.x1);
    const z = rng.range(-7, z1 + 2.5);
    if (rng.chance(0.3)) p.cyl(x, 0.02, z, 0.09, 0.09, 0.03, rng.pick(CORAL), 5, { noShadow: true });
    else
      p.box(x, 0.02, z, 0.1, 0.03, 0.07, rng.pick([0xd8d0b8, 0xb8a888, 0x8a9a9a]), {
        rot: [0, rng.range(0, 3), 0],
        noShadow: true,
      });
  }

  // recife ao fundo e algas altas
  for (let x = ctx.x0; x < ctx.x1; x += rng.range(2.2, 4)) {
    if (inArena(x)) continue;
    const z = rng.range(-6.5, z0 - 0.9);
    if (rng.chance(0.55)) coral(ctx, x, z, rng.range(0.8, 1.6));
    else rock(p, rng, x, z, rng.range(1, 2.2), rng.pick([0x2a4a4a, 0x34565a, 0x243e42]));
    if (rng.chance(0.6)) kelp(ctx, x + rng.range(-1, 1), z - 0.6, rng.range(2, 4.5));
    if (rng.chance(0.35)) bubbles(ctx, x, z + 0.4, rng.int(4, 8));
  }
  for (let x = ctx.x0; x < ctx.x1; x += rng.range(1.6, 3))
    kelp(ctx, x, rng.range(-11, -7.5), rng.range(3, 6));

  // módulos do laboratório (mais perto do fim) e o casco afundado no começo
  for (let x = ctx.x0 + 20; x < ctx.x1; x += rng.range(16, 26)) {
    if (inArena(x)) continue;
    if (x < 60) continue;
    labDome(ctx, x, -6.2, rng.range(1.3, 1.9));
  }
  const sx = 28;
  p.box(sx, 1.4, -7.2, 9, 2.8, 2.4, 0x4a3426, { rot: [0, 0.15, 0.12], jitter: 0.15 });
  p.cyl(sx - 1, 4.2, -7.2, 0.14, 0.18, 5, 0x3a2a1e, 6, { rot: [0, 0, -0.25] });
  p.box(sx + 1.5, 2.2, -5.95, 0.6, 0.6, 0.05, 0xffb35c, { glow: 1.2 });

  // feixes de luz vindos da superfície
  for (let x = ctx.x0 + rng.range(4, 12); x < ctx.x1; x += rng.range(14, 24)) {
    const tilt = rng.range(0.2, 0.32);
    const z = rng.range(-12, -9);
    for (let k = 0; k < 3; k++)
      p.box(x + k * rng.range(0.8, 1.4), 7, z - k * 0.3, rng.range(0.15, 0.4), 16, 0.03, 0x8ae8ff, {
        glow: rng.range(0.06, 0.1),
        rot: [0, 0, tilt],
      });
  }

  // cardumes ao longe
  for (let i = 0; i < ctx.dense(24); i++) {
    const fx = rng.range(ctx.x0, ctx.x1);
    const fy = rng.range(2.5, 6);
    const fz = rng.range(-14, -8);
    for (let k = 0; k < 6; k++)
      p.box(
        fx + rng.range(-1, 1),
        fy + rng.range(-0.4, 0.4),
        fz + rng.range(-0.4, 0.4),
        0.22,
        0.08,
        0.03,
        0x9ac8d8,
        {
          noShadow: true,
        },
      );
  }

  if (arena) coreChamber(ctx, arenaMid);

  silhouetteRow(ctx, -24, 0x06202a, 6, 12, 5, 'hills');
  silhouetteRow(ctx, -38, 0x041820, 9, 18, 9, 'hills');

  // frente: corais baixos e algas
  for (let x = ctx.x0 + 3; x < ctx.x1; x += rng.range(6, 11)) {
    if (rng.chance(0.5)) coral(ctx, x, z1 + 2.2, rng.range(0.4, 0.7));
    else kelp(ctx, x, z1 + 2, rng.range(0.8, 1.4));
  }
}
