import type { EnvCtx } from '../builder';
import { crate, lamppost } from '../props';

/** Laboratório de testes: piso metálico, parede de painéis com faixas de luz. */
export function sandboxTheme(ctx: EnvCtx): void {
  const { p, rng } = ctx;
  ctx.wall = { kind: 'panel', c1: 0x3a4250, c2: 0x22262e, z: -6.5, h: 9 };
  for (let x = ctx.x0; x < ctx.x1; x += 6) {
    p.box(x, 2.6, -6.4, 4.6, 0.12, 0.1, 0x39e6ff, { glow: 2.2 });
    p.box(x + 3, 4.5, -6.3, 0.4, 9, 0.4, 0x2a2e36);
    if (rng.chance(0.5)) {
      p.box(x + 1, 1.0, -5.6, 1.6, 2.0, 1.0, 0x4a5260);
      p.box(x + 1, 1.5, -5.08, 1.2, 0.5, 0.04, rng.pick([0x5aff9a, 0xffb02a, 0x39e6ff]), { glow: 1.6 });
    }
    if (rng.chance(0.4)) crate(p, x + 2.5, 0, -4.8, 0.8, 0x5a5e66);
  }
  for (let x = 6; x < ctx.x1; x += 14) lamppost(ctx, x, -4.6, 0x8ad8ff, 3.8, 12);
  // faixa de segurança
  for (let x = ctx.x0; x < ctx.x1; x += 2) {
    p.box(x, 0.01, ctx.zBand[0] - 0.4, 1, 0.02, 0.2, 0xffc02a, { noShadow: true });
  }
}
