import { describe, expect, it } from 'vitest';
import { Btn } from '../sim/InputFrame';
import { MOUSE_LEFT, MOUSE_RIGHT, WHEEL_RUN_TICKS, mouseButtons, wheelRun } from './mouse';

describe('mouse', () => {
  it('esquerdo atira, direito solta o especial e a rodinha apertada corre', () => {
    // bits como o navegador manda: 1 << MouseEvent.button (0 esquerdo, 1 rodinha, 2 direito)
    expect(mouseButtons(0)).toBe(0);
    expect(mouseButtons(1 << 0)).toBe(Btn.Fire);
    expect(mouseButtons(1 << 2)).toBe(Btn.Special);
    expect(mouseButtons(1 << 1)).toBe(Btn.Run);
    expect(mouseButtons(MOUSE_LEFT | MOUSE_RIGHT)).toBe(Btn.Fire | Btn.Special);
  });

  it('rodinha liga a corrida até o jogador parar', () => {
    // girou parado: espera o jogador andar
    let s = wheelRun(0, 1, false);
    expect(s.run).toBe(false);
    s = wheelRun(s.latch, 0, true);
    expect(s.run).toBe(true);
    // continua correndo enquanto anda, sem girar de novo
    for (let i = 0; i < 200; i++) s = wheelRun(s.latch, 0, true);
    expect(s.run).toBe(true);
    // parado por um tempo: desliga
    for (let i = 0; i < WHEEL_RUN_TICKS; i++) s = wheelRun(s.latch, 0, false);
    s = wheelRun(s.latch, 0, true);
    expect(s.run).toBe(false);
    // sem rodinha nunca corre
    expect(wheelRun(0, 0, true).run).toBe(false);
  });
});
