import { describe, expect, it } from 'vitest';
import { PLAYER } from '../data/balance';
import { getBoss } from '../data/bosses';
import { MAPS } from '../data/maps';
import type { BossDef, BossStep, Hitbox, MeleeMoveDef } from '../data/types';
import { isAoe } from './combat/hitbox';

/**
 * Espaço para fugir dos chefes do primeiro e do último mapa (o Coveiro e o OMEGA-Z). As contas seguem o sim: a
 * caixa do golpe cresce com o tamanho do chefe (`meleeHits`), o pouso do salto é um círculo e a arena pode mudar
 * de profundidade numa fase.
 */

/** Faixa de profundidade da arena do chefe no começo da luta. */
function arenaBand(bossId: string): [number, number] {
  for (const m of MAPS) for (const l of m.levels) if (l.boss?.id === bossId) return l.boss.zBand ?? l.zBand;
  throw new Error(bossId);
}

function flat(steps: BossStep[]): BossStep[] {
  return steps.flatMap((s) => (s.t === 'repeat' ? flat(s.steps) : [s]));
}

interface PhaseView {
  phase: number;
  scale: number;
  band: [number, number];
  steps: BossStep[];
}

/** Cada fase com o tamanho do chefe e a faixa da arena que valem nela (transições acumulam). */
function phases(def: BossDef): PhaseView[] {
  let scale = def.scale;
  let band = arenaBand(def.id);
  return def.phases.map((ph, i) => {
    for (const s of flat(ph.transition ?? [])) {
      if (s.t === 'scale') scale *= s.mult;
      if (s.t === 'arena' && s.zBand) band = s.zBand;
    }
    return { phase: i + 1, scale, band, steps: ph.patterns.flatMap((p) => flat(p.steps)) };
  });
}

const BOSSES = ['coveiro', 'omega'];
/** Folga mínima (m) entre a borda do golpe e a borda da rua, com o chefe no meio dela. */
const MIN_ROOM = 0.9;

describe('chefes do primeiro e do último mapa deixam espaço para fugir', () => {
  for (const id of BOSSES) {
    const def = getBoss(id);
    for (const ph of phases(def)) {
      it(`${def.name}, fase ${ph.phase}: golpes corpo a corpo não cobrem a rua toda em profundidade`, () => {
        const depth = ph.band[1] - ph.band[0];
        const moves = ph.steps.filter((s): s is { t: 'melee'; move: MeleeMoveDef } => s.t === 'melee');
        for (const { move } of moves) {
          expect(isAoe(move.hitbox)).toBe(false);
          const box = move.hitbox as Hitbox;
          // mesma conta de `meleeHits`: tolerância em Z escalada + metade do raio do jogador
          const reach = box.zTol * ph.scale + 0.5 * PLAYER.radius;
          expect(depth / 2 - reach, `${move.id}: folga em profundidade`).toBeGreaterThanOrEqual(MIN_ROOM);
          // e para a frente não passa de 4,5 m (o chefe vem até você antes de bater)
          expect(box.x1 * ph.scale, `${move.id}: alcance para a frente`).toBeLessThanOrEqual(4.5);
        }
      });

      it(`${def.name}, fase ${ph.phase}: dá para sair do pouso do salto antes de ele cair`, () => {
        for (const s of ph.steps) {
          if (s.t !== 'leap') continue;
          // andando (sem correr), sai do círculo com folga durante o tempo no ar
          expect(s.landing.radius + PLAYER.radius).toBeLessThan(PLAYER.walkX * s.airS * 0.75);
          expect(s.landing.radius).toBeLessThanOrEqual(2.8);
        }
      });
    }
  }

  it('a varredura do OMEGA-Z passa rente ao chão, e o pulo vai mais alto que ela', () => {
    const sweeps = phases(getBoss('omega'))
      .flatMap((p) => p.steps)
      .filter((s) => s.t === 'beam' && s.mode === 'sweepZ');
    expect(sweeps.length).toBeGreaterThan(0);
    // altura máxima do pulo (v²/2g) acima da altura da varredura (1,1 m no sim)
    expect((PLAYER.jumpV * PLAYER.jumpV) / (2 * PLAYER.gravity)).toBeGreaterThan(1.1 + 0.2);
  });
});
