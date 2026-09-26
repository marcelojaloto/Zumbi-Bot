import { describe, expect, it } from 'vitest';
import { PLAYER, depthSpeed } from '../data/balance';
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
      const k0 = depthSpeed(b.zBand[0]);
      run(a, 1, { moveX: 1, buttons });
      run(b, 1, { moveZ: 1, buttons });
      // arranca no mesmo ritmo...
      expect(player(b).t.vz).toBeCloseTo(player(a).t.vx * k0, 5);
      run(a, 10, { moveX: 1, buttons });
      run(b, 10, { moveZ: 1, buttons });
      // ...e chega na mesma velocidade na tela (em Z, × a razão da profundidade onde está)
      const ratio = player(b).t.vz / depthSpeed(player(b).t.z) / player(a).t.vx;
      expect(Math.abs(ratio - 1)).toBeLessThan(0.02);
    }
  });

  it('qualquer diagonal tem a mesma velocidade na tela (teclado: duas direções; celular: qualquer ângulo)', () => {
    for (const deg of [20, 45, 70, -45, 135]) {
      const w = makeWorld();
      const p = player(w);
      p.t.z = (w.zBand[0] + w.zBand[1]) / 2;
      const r = (deg * Math.PI) / 180;
      // duas teclas chegam como (1, 1): o próprio jogo corta o vetor para 1
      const [mx, mz] = deg === 45 ? [1, 1] : [Math.cos(r), Math.sin(r)];
      run(w, 12, { moveX: mx, moveZ: mz });
      const onScreen = Math.hypot(p.t.vx, p.t.vz / depthSpeed(p.t.z));
      expect(onScreen).toBeCloseTo(PLAYER.walkX, 1);
    }
  });

  it('encostado na borda da faixa, a diagonal desliza na velocidade cheia', () => {
    const w = makeWorld();
    const p = player(w);
    run(w, 60, { moveZ: 1 });
    const z = p.t.z;
    run(w, 30, { moveX: 1, moveZ: 1 });
    expect(p.t.z).toBeCloseTo(z, 5);
    expect(p.t.vx).toBeCloseTo(PLAYER.walkX, 3);
    // quase reto contra a borda: desliza devagar
    run(w, 30, { moveX: 0.1, moveZ: 0.99 });
    expect(p.t.vx).toBeLessThan(PLAYER.walkX * 0.2);
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
