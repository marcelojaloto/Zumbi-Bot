import { describe, expect, it } from 'vitest';
import { inCone, meleeHits, sweptHit } from './hitbox';

const jab = { x0: 0.2, x1: 1.1, y0: 1.0, y1: 1.6, zTol: 0.55 };
const target = (x: number, z: number, y = 0) => ({ x, y, z, radius: 0.35, height: 1.8 });

describe('hitbox corpo a corpo', () => {
  it('acerta alvo à frente no mesmo plano', () => {
    expect(meleeHits({ x: 0, y: 0, z: 0, facing: 1 }, jab, target(0.9, 0))).toBe(true);
  });

  it('não acerta alvo atrás', () => {
    expect(meleeHits({ x: 0, y: 0, z: 0, facing: 1 }, jab, target(-0.9, 0))).toBe(false);
  });

  it('espelha pela direção', () => {
    expect(meleeHits({ x: 0, y: 0, z: 0, facing: -1 }, jab, target(-0.9, 0))).toBe(true);
  });

  it('respeita a tolerância de profundidade (Z)', () => {
    const lim = 0.55 + 0.5 * 0.35;
    expect(meleeHits({ x: 0, y: 0, z: 0, facing: 1 }, jab, target(0.9, lim - 0.01))).toBe(true);
    expect(meleeHits({ x: 0, y: 0, z: 0, facing: 1 }, jab, target(0.9, lim + 0.01))).toBe(false);
  });

  it('soco no chão não alcança drone voando a 2 m', () => {
    const drone = { x: 0.9, y: 1.7, z: 0, radius: 0.35, height: 0.6 };
    expect(meleeHits({ x: 0, y: 0, z: 0, facing: 1 }, { ...jab, y1: 1.6 }, drone)).toBe(false);
    const upper = { x0: 0.1, x1: 1.0, y0: 0.9, y1: 2.3, zTol: 0.6 };
    expect(meleeHits({ x: 0, y: 0, z: 0, facing: 1 }, upper, drone)).toBe(true);
  });

  it('golpe em área acerta ao redor', () => {
    const aoe = { aoeR: 2.2 };
    expect(meleeHits({ x: 0, y: 0, z: 0, facing: 1 }, aoe, target(-1.5, 1))).toBe(true);
    expect(meleeHits({ x: 0, y: 0, z: 0, facing: 1 }, aoe, target(3, 0))).toBe(false);
  });
});

describe('projéteis', () => {
  it('teste varrido não atravessa alvos em alta velocidade', () => {
    // 75 m/s a 60 Hz = 1,25 m por tick: o alvo fica "entre" as posições
    expect(sweptHit(0, 0, 1.25, 0, { x: 0.6, z: 0.1 }, 0.5)).toBeGreaterThanOrEqual(0);
    expect(sweptHit(0, 0, 1.25, 0, { x: 0.6, z: 1.0 }, 0.5)).toBe(-1);
  });

  it('cone', () => {
    expect(inCone(0, 0, 0, Math.PI / 2, 5, 3, 1)).toBe(true);
    expect(inCone(0, 0, 0, Math.PI / 2, 5, -3, 0)).toBe(false);
    expect(inCone(0, 0, 0, Math.PI / 2, 5, 6, 0)).toBe(false);
  });
});
