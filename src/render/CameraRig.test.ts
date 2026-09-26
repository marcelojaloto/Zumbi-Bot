import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { depthSpeed } from '../data/balance';
import { CameraRig } from './CameraRig';

/** Pixels na tela por metro em X e em Z, na profundidade `z` (câmera seguindo o jogador como na partida). */
function pxPerM(aspect: number, z: number): { x: number; z: number } {
  const rig = new CameraRig();
  rig.setAspect(aspect);
  rig.snap(0, 0, z * 0.3);
  rig.update(0, 0, z * 0.3, 1 / 60);
  const cam = rig.camera;
  cam.updateMatrixWorld();
  const H = 720;
  const W = H * aspect;
  const px = (x: number, zz: number) => {
    const p = new Vector3(x, 0, zz).project(cam);
    return [(p.x * W) / 2, (-p.y * H) / 2] as const;
  };
  const d = 0.05;
  const o = px(0, z);
  const dx = px(d, z);
  const dz = px(0, z + d);
  return {
    x: Math.hypot(dx[0] - o[0], dx[1] - o[1]) / d,
    z: Math.hypot(dz[0] - o[0], dz[1] - o[1]) / d,
  };
}

describe('câmera', () => {
  it('depthSpeed é a razão entre 1 m em X e 1 m em Z na tela, do fundo à frente da faixa', () => {
    for (const aspect of [16 / 9, 19.5 / 9, 4 / 3])
      for (const z of [-4, -3, -2, -1, 0, 1, 2]) {
        const s = pxPerM(aspect, z);
        expect(Math.abs(s.x / s.z / depthSpeed(z) - 1)).toBeLessThan(0.05);
      }
  });

  it('andar em qualquer direção tem a mesma velocidade na tela', () => {
    for (const z of [-3, -0.75, 1.5]) {
      const s = pxPerM(16 / 9, z);
      const k = depthSpeed(z);
      const speeds = [0, 30, 45, 60, 90].map((deg) => {
        const r = (deg * Math.PI) / 180;
        // velocidade no mundo: X anda cos, Z anda sin × k (metros); na tela cada eixo tem sua escala
        return Math.hypot(Math.cos(r) * s.x, Math.sin(r) * k * s.z);
      });
      for (const v of speeds) expect(Math.abs(v / speeds[0]! - 1)).toBeLessThan(0.03);
    }
  });
});
