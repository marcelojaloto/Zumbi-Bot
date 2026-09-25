/**
 * Detector de toque duplo (correr). Puro: recebe o eixo X quantizado a cada tick.
 * Retorna o novo estado; `running` fica verdadeiro até soltar ou inverter a direção.
 */
export interface DoubleTapState {
  lastDir: number;
  lastTapTick: number;
  prevAxisDir: number;
  running: boolean;
}

export function createDoubleTap(): DoubleTapState {
  return { lastDir: 0, lastTapTick: -9999, prevAxisDir: 0, running: false };
}

export function updateDoubleTap(
  s: DoubleTapState,
  axisX: number,
  tick: number,
  window: number,
): DoubleTapState {
  const dir = axisX > 0.5 ? 1 : axisX < -0.5 ? -1 : 0;
  let { lastDir, lastTapTick, running } = s;
  if (dir !== 0 && s.prevAxisDir === 0) {
    // borda de pressionar
    if (dir === lastDir && tick - lastTapTick <= window) running = true;
    lastDir = dir;
    lastTapTick = tick;
  }
  if (dir === 0 || (running && dir !== lastDir)) running = false;
  return { lastDir, lastTapTick, prevAxisDir: dir, running };
}
