import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Quaternion,
  Euler,
  Vector3,
  type Scene,
} from 'three';

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _p = new Vector3();
const _s = new Vector3();
const _c = new Color();

/** Pedaços físicos low-poly (gibs de zumbi, sucata de robô, lascas de madeira) que quicam no chão. */
export class Debris {
  readonly mesh: InstancedMesh;
  private pos: Float32Array;
  private vel: Float32Array;
  private rot: Float32Array;
  private spin: Float32Array;
  private size: Float32Array;
  private life: Float32Array;
  private n = 0;

  constructor(
    scene: Scene,
    private cap: number,
    standard: boolean,
  ) {
    const mat = standard
      ? new MeshStandardMaterial({ roughness: 0.8, metalness: 0.1, flatShading: true })
      : new MeshLambertMaterial({ flatShading: true });
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), mat, cap);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.castShadow = false;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.pos = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3);
    this.rot = new Float32Array(cap * 3);
    this.spin = new Float32Array(cap * 3);
    this.size = new Float32Array(cap);
    this.life = new Float32Array(cap);
    scene.add(this.mesh);
    for (let i = 0; i < cap; i++) this.mesh.setColorAt(i, _c.setHex(0xffffff));
  }

  emit(
    x: number,
    y: number,
    z: number,
    n: number,
    color: number,
    speed: number,
    size: number,
    rnd: () => number,
    upBias = 1,
  ): void {
    for (let k = 0; k < n; k++) {
      let i = this.n;
      if (i >= this.cap) i = Math.floor(rnd() * this.cap);
      else this.n++;
      this.pos.set([x, y, z], i * 3);
      const a = rnd() * Math.PI * 2;
      const s = speed * (0.4 + rnd() * 0.8);
      this.vel.set([Math.cos(a) * s, (1.5 + rnd() * 3) * upBias, Math.sin(a) * s * 0.6], i * 3);
      this.rot.set([rnd() * 6, rnd() * 6, rnd() * 6], i * 3);
      this.spin.set([(rnd() - 0.5) * 16, (rnd() - 0.5) * 16, (rnd() - 0.5) * 16], i * 3);
      this.size[i] = size * (0.5 + rnd());
      this.life[i] = 2.5 + rnd() * 1.5;
      _c.setHex(color).multiplyScalar(0.75 + rnd() * 0.5);
      this.mesh.setColorAt(i, _c);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let i = 0;
    while (i < this.n) {
      this.life[i]! -= dt;
      if (this.life[i]! <= 0) {
        const j = --this.n;
        if (i !== j) {
          this.pos.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.vel.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.rot.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.spin.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.size[i] = this.size[j]!;
          this.life[i] = this.life[j]!;
          this.mesh.getColorAt(j, _c);
          this.mesh.setColorAt(i, _c);
        }
        continue;
      }
      const grounded = this.pos[i * 3 + 1]! <= this.size[i]! * 0.5 + 0.001;
      this.vel[i * 3 + 1]! -= 22 * dt;
      for (let k = 0; k < 3; k++) {
        this.pos[i * 3 + k]! += this.vel[i * 3 + k]! * dt;
        this.rot[i * 3 + k]! += this.spin[i * 3 + k]! * dt;
      }
      const floor = this.size[i]! * 0.5;
      if (this.pos[i * 3 + 1]! < floor) {
        this.pos[i * 3 + 1] = floor;
        this.vel[i * 3 + 1] = -this.vel[i * 3 + 1]! * 0.3;
        this.vel[i * 3]! *= 0.6;
        this.vel[i * 3 + 2]! *= 0.6;
        for (let k = 0; k < 3; k++) this.spin[i * 3 + k]! *= grounded ? 0.3 : 0.6;
      }
      const fade = Math.min(1, this.life[i]! / 0.5);
      _p.set(this.pos[i * 3]!, this.pos[i * 3 + 1]!, this.pos[i * 3 + 2]!);
      _e.set(this.rot[i * 3]!, this.rot[i * 3 + 1]!, this.rot[i * 3 + 2]!);
      _q.setFromEuler(_e);
      _s.setScalar(this.size[i]! * fade);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
      i++;
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(scene: Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as MeshStandardMaterial).dispose();
    this.mesh.dispose();
  }
}
