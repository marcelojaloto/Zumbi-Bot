import { describe, expect, it } from 'vitest';
import { getMap } from '../../data/maps';
import { makeWorld, run } from '../test/helpers';
import { Autopilot } from '../autopilot';
import type { PlayerSlot } from '../Entity';
import type { World } from '../World';
import { killEntity } from '../combat/applyHit';

function playWithAutopilot(w: World, maxTicks: number): void {
  const ap = new Autopilot(() => w);
  for (let i = 0; i < maxTicks && !w.finished; i++) {
    w.step(new Map([[0 as PlayerSlot, ap.sample(w.tick)]]));
    w.drainEvents();
  }
}

describe('nível', () => {
  it('trava a câmera no segmento e libera ao limpar', () => {
    const w = makeWorld({ map: getMap('vila'), noLevel: false });
    const p = w.get(1)!;
    p.player!.god = true;
    // anda até o gatilho do primeiro segmento
    run(w, 200, { moveX: 1 });
    expect(w.levelState.active).toBe(true);
    expect(w.lock).not.toBeNull();
    // mata tudo até limpar
    for (let i = 0; i < 1200 && !w.levelState.cleared[0]; i++) {
      for (const e of [...w.entities])
        if (e.kind === 'enemy' && e.fighter?.state !== 'dead') killEntity(w, e, 1);
      run(w, 1);
    }
    expect(w.levelState.cleared[0]).toBe(true);
    expect(w.lock).toBeNull();
  });

  it('respeita o limite de inimigos vivos', () => {
    const w = makeWorld({ map: getMap('vila'), noLevel: false });
    w.get(1)!.player!.god = true;
    let max = 0;
    for (let i = 0; i < 3000; i++) {
      run(w, 1, { moveX: 1 });
      max = Math.max(max, w.enemiesAlive());
    }
    expect(max).toBeLessThanOrEqual(w.enemyCap);
  });

  it('piloto automático conclui a Vila (com modo deus)', () => {
    const w = makeWorld({ map: getMap('vila'), noLevel: false, seed: 5 });
    w.get(1)!.player!.god = true;
    playWithAutopilot(w, 60 * 60 * 12);
    expect(w.levelState.bossSpawned).toBe(true);
    expect(w.finished).toBe('victory');
    expect(w.get(1)!.player!.staffs).toContain('earth');
  });
});
