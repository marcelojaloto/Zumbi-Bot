import { describe, expect, it } from 'vitest';
import { Btn } from '../InputFrame';
import { makeWorld, player, run } from '../test/helpers';
import { giveFirearm } from './pickups';
import type { GameEvent } from '../events';
import type { World } from '../World';

function countShots(events: GameEvent[]): number {
  return events.filter((e) => e.t === 'shot').length;
}

function fireFor(w: World, ticks: number, buttons: number = Btn.Fire): number {
  let n = 0;
  for (let i = 0; i < ticks; i++) {
    run(w, 1, { buttons });
    n += countShots(w.drainEvents());
  }
  return n;
}

describe('armas de fogo', () => {
  it('submetralhadora a 900 RPM dispara 15 tiros por segundo', () => {
    const w = makeWorld();
    const p = player(w);
    giveFirearm(w, p, 'smg');
    p.player!.ammo.light = 200;
    w.drainEvents();
    expect(fireFor(w, 60)).toBe(15);
  });

  it('semi-automática exige soltar o gatilho', () => {
    const w = makeWorld();
    w.drainEvents();
    expect(fireFor(w, 60)).toBe(1);
    fireFor(w, 1, 0);
    let n = 0;
    for (let i = 0; i < 10; i++) {
      n += fireFor(w, 1);
      n += fireFor(w, 12, 0);
    }
    expect(n).toBe(10);
  });

  it('pistola recarrega em 1,1 s com reserva infinita', () => {
    const w = makeWorld();
    const p = player(w);
    const pc = p.player!;
    w.drainEvents();
    for (let i = 0; i < 12; i++) {
      fireFor(w, 1);
      fireFor(w, 12, 0);
    }
    expect(pc.ammoMag.pistol).toBe(0);
    expect(pc.fire.reload).toBeGreaterThan(0);
    run(w, 66);
    expect(pc.ammoMag.pistol).toBe(12);
  });

  it('escopeta recarrega cartucho a cartucho e pode ser interrompida', () => {
    const w = makeWorld();
    const p = player(w);
    const pc = p.player!;
    giveFirearm(w, p, 'shotgun');
    pc.ammo.shell = 20;
    pc.ammoMag.shotgun = 2;
    run(w, 1, { buttons: Btn.Reload });
    run(w, Math.round((0.4 + 0.45) * 60) + 2);
    expect(pc.ammoMag.shotgun).toBe(3);
    // atirar interrompe
    w.drainEvents();
    expect(fireFor(w, 2)).toBe(1);
    expect(pc.fire.reload).toBe(0);
  });

  it('metralhadora precisa girar antes de atirar', () => {
    const w = makeWorld();
    const p = player(w);
    giveFirearm(w, p, 'mg');
    p.player!.ammo.rifle = 200;
    w.drainEvents();
    expect(fireFor(w, 20)).toBe(0);
    expect(fireFor(w, 60)).toBeGreaterThan(8);
  });

  it('pente vazio dispara recarga automática', () => {
    const w = makeWorld();
    const p = player(w);
    const pc = p.player!;
    giveFirearm(w, p, 'rifle');
    pc.ammo.rifle = 100;
    fireFor(w, 200);
    run(w, 130);
    expect(pc.ammo.rifle).toBeLessThan(100);
    expect(pc.ammoMag.rifle).toBe(30);
  });
});
