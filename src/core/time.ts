/** Frequência fixa da simulação. Todo frame data do jogo é expresso em ticks de 1/60 s. */
export const TICK_HZ = 60;
export const DT = 1 / TICK_HZ;

/** Converte segundos em ticks (arredondado, mínimo 0). */
export function secToTicks(s: number): number {
  return Math.max(0, Math.round(s * TICK_HZ));
}

export function ticksToSec(t: number): number {
  return t / TICK_HZ;
}
