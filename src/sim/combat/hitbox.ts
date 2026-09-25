import { segPointDist2 } from '../../core/math';
import type { AoeBox, Hitbox } from '../../data/types';

export interface HurtCylinder {
  x: number;
  y: number;
  z: number;
  radius: number;
  height: number;
}

export interface Attacker {
  x: number;
  y: number;
  z: number;
  facing: 1 | -1;
}

export function isAoe(h: Hitbox | AoeBox): h is AoeBox {
  return (h as AoeBox).aoeR !== undefined;
}

/**
 * Teste de acerto corpo a corpo 2.5D: caixa relativa ao atacante (espelhada pela direção)
 * contra o cilindro do alvo. Em Z usa uma tolerância (planos de profundidade).
 */
export function meleeHits(a: Attacker, box: Hitbox | AoeBox, t: HurtCylinder, scale = 1): boolean {
  if (isAoe(box)) {
    const r = box.aoeR * scale + t.radius;
    const dx = t.x - a.x;
    const dz = t.z - a.z;
    if (dx * dx + dz * dz > r * r) return false;
    const y0 = a.y + (box.y0 ?? 0) * scale;
    const y1 = a.y + (box.y1 ?? 2) * scale;
    return y1 >= t.y && y0 <= t.y + t.height;
  }
  const bx0 = a.facing === 1 ? a.x + box.x0 * scale : a.x - box.x1 * scale;
  const bx1 = a.facing === 1 ? a.x + box.x1 * scale : a.x - box.x0 * scale;
  if (bx1 < t.x - t.radius || bx0 > t.x + t.radius) return false;
  const by0 = a.y + box.y0 * scale;
  const by1 = a.y + box.y1 * scale;
  if (by1 < t.y || by0 > t.y + t.height) return false;
  return Math.abs(t.z - a.z) <= box.zTol * scale + 0.5 * t.radius;
}

/**
 * Teste varrido de projétil (segmento no plano XZ contra círculo). Retorna o parâmetro t ∈ [0,1]
 * do ponto de contato aproximado ou -1 se não houver contato. Evita tunneling em alta velocidade.
 */
export function sweptHit(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  t: { x: number; z: number },
  r: number,
): number {
  const { d2, t: tt } = segPointDist2(x0, z0, x1, z1, t.x, t.z);
  return d2 <= r * r ? tt : -1;
}

/** Ponto dentro de um cone no plano XZ. */
export function inCone(
  ox: number,
  oz: number,
  dir: number,
  angle: number,
  range: number,
  px: number,
  pz: number,
  pr = 0,
): boolean {
  const dx = px - ox;
  const dz = pz - oz;
  const d = Math.hypot(dx, dz);
  if (d > range + pr) return false;
  if (d < 0.001) return true;
  let da = Math.atan2(dz, dx) - dir;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  const slack = pr > 0 ? Math.atan2(pr, d) : 0;
  return Math.abs(da) <= angle / 2 + slack;
}
