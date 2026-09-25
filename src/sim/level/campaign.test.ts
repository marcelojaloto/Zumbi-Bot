import { describe, expect, it } from 'vitest';
import { MAPS } from '../../data/maps';
import { makeWorld } from '../test/helpers';
import { Autopilot } from '../autopilot';
import type { PlayerSlot } from '../Entity';
import { validateData } from '../../data/validate';

/**
 * Campanha inteira com piloto automático (modo deus). Filtre com MAP=<id>.
 * Garante que todo nível é concluível: ondas terminam, o chefe surge e morre.
 */
const only = process.env.MAP;

describe('campanha (piloto automático)', () => {
  it('dados válidos', () => {
    expect(validateData()).toEqual([]);
  });
  for (const m of MAPS) {
    if (only && only !== m.id) continue;
    m.levels.forEach((lv, idx) => {
      it(`${m.id} / ${lv.id} é concluível`, () => {
        const w = makeWorld({
          map: m,
          noLevel: false,
          seed: 3,
          loadout: { level: 1 + m.index * 3, guns: ['pistol', 'shotgun'], staffs: ['heal'] },
        });
        void idx;
        w.get(1)!.player!.god = true;
        const ap = new Autopilot(() => w);
        let t = 0;
        for (; t < 60 * 60 * 30 && !w.finished; t++) {
          w.step(new Map([[0 as PlayerSlot, ap.sample(w.tick)]]));
          w.drainEvents();
        }
        expect(w.levelState.bossSpawned || !lv.boss).toBe(true);
        expect(w.finished).toBe('victory');
      });
    });
  }
});
