import { Btn } from '../sim/InputFrame';

/** Ticks parado até a corrida ligada pela rodinha desligar (~0,5 s). */
export const WHEEL_RUN_TICKS = 30;

/** Bits dos botões do mouse (`1 << MouseEvent.button`): esquerdo, rodinha apertada e direito. */
export const MOUSE_LEFT = 1;
export const MOUSE_MIDDLE = 2;
export const MOUSE_RIGHT = 4;

/**
 * Mouse de quem está com o teclado inteiro: botão esquerdo atira, o direito solta o especial e a rodinha apertada
 * corre (girar a rodinha também liga a corrida, veja `wheelRun`).
 */
export function mouseButtons(bits: number): number {
  let b = 0;
  if (bits & MOUSE_LEFT) b |= Btn.Fire;
  if (bits & MOUSE_RIGHT) b |= Btn.Special;
  if (bits & MOUSE_MIDDLE) b |= Btn.Run;
  return b;
}

/**
 * Rodinha corre: um giro liga a corrida, que fica ligada enquanto o jogador anda (como o toque duplo); parado por
 * WHEEL_RUN_TICKS ticks, desliga. `latch` é o estado guardado entre os ticks.
 */
export function wheelRun(latch: number, wheel: number, moving: boolean): { latch: number; run: boolean } {
  if (wheel !== 0) latch = WHEEL_RUN_TICKS;
  if (latch <= 0) return { latch: 0, run: false };
  if (moving) return { latch: WHEEL_RUN_TICKS, run: true };
  return { latch: latch - 1, run: false };
}
