export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function invLerp(a: number, b: number, v: number): number {
  return a === b ? 0 : (v - a) / (b - a);
}

/** Move `v` em direção a `target` no máximo `step`. */
export function approach(v: number, target: number, step: number): number {
  if (v < target) return Math.min(v + step, target);
  if (v > target) return Math.max(v - step, target);
  return v;
}

/** Amortecimento exponencial independente de framerate (meia-vida em segundos). */
export function damp(current: number, target: number, halfLife: number, dt: number): number {
  if (halfLife <= 0) return target;
  return lerp(target, current, Math.pow(2, -dt / halfLife));
}

export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

export function dist2(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

export function sign(v: number): 1 | -1 {
  return v < 0 ? -1 : 1;
}

/**
 * Menor distância² entre o segmento (x0,z0)-(x1,z1) e o ponto (px,pz), e o parâmetro t do ponto mais próximo.
 * Usado para testes varridos de projéteis (sem tunneling).
 */
export function segPointDist2(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  px: number,
  pz: number,
): { d2: number; t: number } {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((px - x0) * dx + (pz - z0) * dz) / len2 : 0;
  t = clamp01(t);
  const cx = x0 + dx * t;
  const cz = z0 + dz * t;
  const ex = px - cx;
  const ez = pz - cz;
  return { d2: ex * ex + ez * ez, t };
}
