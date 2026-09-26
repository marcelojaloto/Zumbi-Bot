import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DEPTH_SPEED } from '../data/balance';
import { CameraRig } from './CameraRig';

describe('câmera', () => {
  it('DEPTH_SPEED é a razão entre 1 m em X e 1 m em Z na tela (meio da faixa)', () => {
    const rig = new CameraRig();
    rig.setAspect(16 / 9);
    const z = -0.75; // meio de uma faixa típica ([-3,5; 2])
    rig.snap(0, 0, z * 0.3);
    rig.update(0, 0, z * 0.3, 1 / 60);
    const cam = rig.camera;
    cam.updateMatrixWorld();
    const px = (x: number, zz: number) => {
      const p = new Vector3(x, 0, zz).project(cam);
      return [(p.x * 1280) / 2, (-p.y * 720) / 2] as const;
    };
    const o = px(0, z);
    const dx = px(1, z);
    const dz = px(0, z + 1);
    const ratio = Math.hypot(dx[0] - o[0], dx[1] - o[1]) / Math.hypot(dz[0] - o[0], dz[1] - o[1]);
    expect(Math.abs(ratio / DEPTH_SPEED - 1)).toBeLessThan(0.1);
  });
});
