import {
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type Scene,
} from 'three';
import { radialTexture } from '../env/textures';

const _m = new Matrix4();
const _q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);
const _p = new Vector3();
const _s = new Vector3();

/**
 * Sombras-blob instanciadas: sempre ligadas (mesmo sem shadow map). São a principal pista de
 * profundidade para pulos e alinhamento de planos.
 */
export class BlobShadows {
  readonly mesh: InstancedMesh;
  private n = 0;

  constructor(
    scene: Scene,
    private cap = 256,
  ) {
    const mat = new MeshBasicMaterial({
      map: radialTexture('blob', 64),
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    });
    this.mesh = new InstancedMesh(new PlaneGeometry(1, 1), mat, cap);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }

  begin(): void {
    this.n = 0;
  }

  add(x: number, z: number, radius: number, height: number): void {
    if (this.n >= this.cap) return;
    const k = Math.max(0.25, 1 - height / 5);
    _p.set(x, 0.015, z);
    _s.set(radius * 2.4 * k, radius * 1.6 * k, 1);
    _m.compose(_p, _q, _s);
    this.mesh.setMatrixAt(this.n++, _m);
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(scene: Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshBasicMaterial).dispose();
    this.mesh.dispose();
  }
}
