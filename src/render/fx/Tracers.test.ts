import { DoubleSide, Scene, type ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { Tracers } from './Tracers';

describe('traços (raios, rastros de tiro, mira laser)', () => {
  it('aparecem dos dois lados: a fita virada para a câmera muda de giro conforme o sentido do traço', () => {
    const scene = new Scene();
    const t = new Tracers(scene);
    expect((t.mesh.material as ShaderMaterial).side).toBe(DoubleSide);
    t.add(0, 1, 0, 10, 1, 0, 0xff0000);
    t.add(0, 1, 0, -10, 1, 0, 0xff0000);
    t.update(0);
    expect(t.mesh.parent).toBe(scene);
    t.dispose(scene);
  });
});
