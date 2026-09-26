import { describe, expect, it } from 'vitest';
import { Btn } from '../InputFrame';
import { makeWorld, player, run } from '../test/helpers';
import { giveFirearm } from './pickups';
import { resolveAim } from './weapons';
import { spawnEnemy } from '../ai/spawnEnemy';
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

describe('arma pega no chão', () => {
  it('sem munição nenhuma, volta sozinho para a pistola', () => {
    const w = makeWorld();
    const p = player(w);
    const pc = p.player!;
    giveFirearm(w, p, 'shotgun');
    pc.ammoMag.shotgun = 1;
    pc.ammo.shell = 0;
    w.drainEvents();
    run(w, 1, { buttons: Btn.Fire });
    const ev = w.drainEvents();
    expect(countShots(ev)).toBe(1);
    expect(pc.guns[pc.gunIdx]).toBe('pistol');
    expect(ev.some((e) => e.t === 'weaponSwap' && e.weapon === 'pistol')).toBe(true);
    // com reserva, recarrega em vez de trocar
    pc.gunIdx = pc.guns.indexOf('shotgun');
    pc.ammoMag.shotgun = 1;
    pc.ammo.shell = 4;
    fireFor(w, 30, 0);
    fireFor(w, 1);
    expect(pc.guns[pc.gunIdx]).toBe('shotgun');
    // trocou para uma arma vazia: ao apertar o gatilho, vai para a pistola
    pc.ammoMag.shotgun = 0;
    pc.ammo.shell = 0;
    pc.fire.reload = 0;
    fireFor(w, 30, 0);
    fireFor(w, 1);
    expect(pc.guns[pc.gunIdx]).toBe('pistol');
  });
});

describe('mira', () => {
  it('tiro mirado com o mouse na diagonal sai reto para a frente', () => {
    const w = makeWorld();
    const p = player(w);
    p.player!.aimMode = 1;
    p.player!.aimYaw = Math.PI / 4;
    expect(resolveAim(w, p, 20)).toBe(0);
    p.player!.aimYaw = (3 * Math.PI) / 4;
    expect(resolveAim(w, p, 20)).toBe(Math.PI);
  });

  it('assistência só pega inimigo à frente na mesma faixa', () => {
    const w = makeWorld();
    const p = player(w);
    p.t.facing = 1;
    const x0 = p.t.x;
    const z0 = p.t.z;
    // fora da faixa (profundidade diferente): ignorado, tiro reto
    spawnEnemy(w, 'walker', x0 + 4, z0 + 3, 'right');
    expect(resolveAim(w, p, 20)).toBe(0);
    // na faixa: mira nele, com inclinação pequena
    const e = spawnEnemy(w, 'walker', x0 + 6, z0 + 0.5, 'right');
    const yaw = resolveAim(w, p, 20);
    expect(yaw).toBeCloseTo(Math.atan2(e.t.z - z0, e.t.x - x0));
    expect(Math.abs(yaw)).toBeLessThan(0.2);
    // atrás não conta
    p.t.facing = -1;
    expect(resolveAim(w, p, 20)).toBe(Math.PI);
  });
});
