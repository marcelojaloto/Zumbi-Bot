import { describe, expect, it } from 'vitest';
import { DEPTH_SPEED } from '../data/balance';
import { Btn } from './InputFrame';
import { makeWorld, player, run } from './test/helpers';

describe('World / movimento do jogador', () => {
  it('anda para a direita', () => {
    const w = makeWorld();
    const x0 = player(w).t.x;
    run(w, 60, { moveX: 1 });
    const dx = player(w).t.x - x0;
    expect(dx).toBeGreaterThan(3);
    expect(dx).toBeLessThan(4.2);
  });

  it('corre com Shift', () => {
    const w = makeWorld();
    const x0 = player(w).t.x;
    run(w, 60, { moveX: 1, buttons: Btn.Run });
    expect(player(w).t.x - x0).toBeGreaterThan(6.5);
  });

  it('pula e pousa; pulo duplo sobe mais', () => {
    const w = makeWorld();
    run(w, 1, { buttons: Btn.Jump });
    let maxY = 0;
    for (let i = 0; i < 80; i++) {
      run(w, 1);
      maxY = Math.max(maxY, player(w).t.y);
    }
    expect(maxY).toBeGreaterThan(1.1);
    expect(player(w).t.y).toBe(0);
    expect(player(w).body!.grounded).toBe(true);

    const w2 = makeWorld();
    run(w2, 1, { buttons: Btn.Jump });
    run(w2, 15);
    run(w2, 1, { buttons: Btn.Jump });
    let max2 = 0;
    for (let i = 0; i < 120; i++) {
      run(w2, 1);
      max2 = Math.max(max2, player(w2).t.y);
    }
    expect(max2).toBeGreaterThan(maxY + 0.5);
  });

  it('para cima/baixo é o movimento lateral ampliado pela câmera (mesma velocidade na tela)', () => {
    for (const buttons of [0, Btn.Run]) {
      const a = makeWorld();
      const b = makeWorld();
      player(b).t.z = b.zBand[0];
      const vx: number[] = [];
      const vz: number[] = [];
      for (let i = 0; i < 12; i++) {
        run(a, 1, { moveX: 1, buttons });
        run(b, 1, { moveZ: 1, buttons });
        vx.push(player(a).t.vx);
        vz.push(player(b).t.vz);
      }
      // arranca no mesmo ritmo e chega na mesma velocidade (em Z, ×DEPTH_SPEED)
      vx.forEach((v, i) => expect(vz[i]).toBeCloseTo(v * DEPTH_SPEED, 5));
    }
  });

  it('não sai da faixa de profundidade', () => {
    const w = makeWorld();
    run(w, 200, { moveZ: 1 });
    expect(player(w).t.z).toBeLessThanOrEqual(w.zBand[1]);
    run(w, 400, { moveZ: -1 });
    expect(player(w).t.z).toBeGreaterThanOrEqual(w.zBand[0]);
  });

  it('não volta além da borda esquerda da câmera', () => {
    const w = makeWorld();
    run(w, 240, { moveX: 1, buttons: Btn.Run });
    const cam = w.camX;
    run(w, 400, { moveX: -1 });
    expect(player(w).t.x).toBeGreaterThanOrEqual(cam - 8.2);
  });

  it('é determinístico', () => {
    const script = (w: ReturnType<typeof makeWorld>) => {
      run(w, 30, { moveX: 1 });
      run(w, 1, { buttons: Btn.Jump });
      run(w, 40, { moveX: 1, moveZ: -0.5 });
      run(w, 5, { buttons: Btn.Punch });
      run(w, 30, { moveX: -1, buttons: Btn.Run });
    };
    const a = makeWorld({ seed: 7 });
    const b = makeWorld({ seed: 7 });
    script(a);
    script(b);
    expect(JSON.stringify(a.entities)).toBe(JSON.stringify(b.entities));
  });
});
