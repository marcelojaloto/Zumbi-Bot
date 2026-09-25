import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  type Scene,
} from 'three';

export interface Emit {
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  /** Espalhamento aleatório de velocidade. */
  spread?: number;
  life: number;
  size: number;
  sizeEnd?: number;
  color: number;
  colorEnd?: number;
  alpha?: number;
  gravity?: number;
  drag?: number;
  /** Intensidade HDR (brilho no bloom), só no pool aditivo. */
  intensity?: number;
}

const _c0 = new Color();
const _c1 = new Color();

/**
 * Pool de partículas em billboards instanciados, simuladas na CPU sem alocação.
 * Um pool aditivo (faíscas, fogo, magia) e um normal (fumaça, sangue, poeira).
 */
export class ParticlePool {
  readonly mesh: Mesh;
  private geo: InstancedBufferGeometry;
  private pos: Float32Array;
  private vel: Float32Array;
  private col: Float32Array;
  private c0: Float32Array;
  private c1: Float32Array;
  private sz: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private phys: Float32Array;
  private aPos: InstancedBufferAttribute;
  private aCol: InstancedBufferAttribute;
  private aSize: InstancedBufferAttribute;
  private n = 0;

  constructor(
    scene: Scene,
    private cap: number,
    additive: boolean,
  ) {
    const base = new PlaneGeometry(1, 1);
    this.geo = new InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.setAttribute('position', base.getAttribute('position'));
    this.geo.setAttribute('uv', base.getAttribute('uv'));
    this.pos = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 4);
    this.c0 = new Float32Array(cap * 4);
    this.c1 = new Float32Array(cap * 4);
    this.sz = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.maxLife = new Float32Array(cap);
    this.phys = new Float32Array(cap * 2);
    this.aPos = new InstancedBufferAttribute(this.pos, 3).setUsage(DynamicDrawUsage);
    this.aCol = new InstancedBufferAttribute(this.col, 4).setUsage(DynamicDrawUsage);
    this.aSize = new InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(DynamicDrawUsage);
    this.geo.setAttribute('iPos', this.aPos);
    this.geo.setAttribute('iCol', this.aCol);
    this.geo.setAttribute('iSize', this.aSize);
    this.geo.instanceCount = 0;
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending,
      vertexShader: /* glsl */ `
        attribute vec3 iPos; attribute vec4 iCol; attribute float iSize;
        varying vec4 vCol; varying vec2 vUv;
        void main() {
          vCol = iCol; vUv = uv;
          vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
          mv.xy += position.xy * iSize;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec4 vCol; varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.2, d);
          if (a <= 0.0) discard;
          gl_FragColor = vec4(vCol.rgb, vCol.a * a);
        }`,
    });
    this.mesh = new Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 5 : 4;
    scene.add(this.mesh);
  }

  emit(e: Emit, rnd: () => number): void {
    if (this.n >= this.cap) return;
    const i = this.n++;
    const s = e.spread ?? 0;
    this.pos[i * 3] = e.x;
    this.pos[i * 3 + 1] = e.y;
    this.pos[i * 3 + 2] = e.z;
    this.vel[i * 3] = (e.vx ?? 0) + (rnd() - 0.5) * 2 * s;
    this.vel[i * 3 + 1] = (e.vy ?? 0) + (rnd() - 0.5) * 2 * s;
    this.vel[i * 3 + 2] = (e.vz ?? 0) + (rnd() - 0.5) * 2 * s;
    const I = e.intensity ?? 1;
    _c0.setHex(e.color);
    _c1.setHex(e.colorEnd ?? e.color);
    const a = e.alpha ?? 1;
    this.c0.set([_c0.r * I, _c0.g * I, _c0.b * I, a], i * 4);
    this.c1.set([_c1.r * I, _c1.g * I, _c1.b * I, 0], i * 4);
    this.sz[i * 3] = e.size;
    this.sz[i * 3 + 1] = e.sizeEnd ?? e.size;
    this.life[i] = e.life * (0.75 + rnd() * 0.5);
    this.maxLife[i] = this.life[i]!;
    this.phys[i * 2] = e.gravity ?? 0;
    this.phys[i * 2 + 1] = e.drag ?? 0;
  }

  update(dt: number): void {
    const sizes = this.aSize.array as Float32Array;
    let i = 0;
    while (i < this.n) {
      this.life[i]! -= dt;
      if (this.life[i]! <= 0) {
        this.swapRemove(i);
        continue;
      }
      const drag = Math.max(0, 1 - this.phys[i * 2 + 1]! * dt);
      this.vel[i * 3 + 1]! -= this.phys[i * 2]! * dt;
      this.vel[i * 3]! *= drag;
      this.vel[i * 3 + 1]! *= drag;
      this.vel[i * 3 + 2]! *= drag;
      this.pos[i * 3]! += this.vel[i * 3]! * dt;
      this.pos[i * 3 + 1]! += this.vel[i * 3 + 1]! * dt;
      this.pos[i * 3 + 2]! += this.vel[i * 3 + 2]! * dt;
      if (this.pos[i * 3 + 1]! < 0.02) {
        this.pos[i * 3 + 1] = 0.02;
        this.vel[i * 3 + 1] = Math.abs(this.vel[i * 3 + 1]!) * 0.2;
      }
      const t = 1 - this.life[i]! / this.maxLife[i]!;
      for (let k = 0; k < 4; k++)
        this.col[i * 4 + k] = this.c0[i * 4 + k]! + (this.c1[i * 4 + k]! - this.c0[i * 4 + k]!) * t;
      sizes[i] = this.sz[i * 3]! + (this.sz[i * 3 + 1]! - this.sz[i * 3]!) * t;
      i++;
    }
    this.geo.instanceCount = this.n;
    this.aPos.needsUpdate = true;
    this.aCol.needsUpdate = true;
    this.aSize.needsUpdate = true;
  }

  private swapRemove(i: number): void {
    const j = --this.n;
    if (i === j) return;
    this.pos.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.vel.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.col.copyWithin(i * 4, j * 4, j * 4 + 4);
    this.c0.copyWithin(i * 4, j * 4, j * 4 + 4);
    this.c1.copyWithin(i * 4, j * 4, j * 4 + 4);
    this.sz.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.phys.copyWithin(i * 2, j * 2, j * 2 + 2);
    this.life[i] = this.life[j]!;
    this.maxLife[i] = this.maxLife[j]!;
  }

  clear(): void {
    this.n = 0;
    this.geo.instanceCount = 0;
  }

  get count(): number {
    return this.n;
  }

  dispose(scene: Scene): void {
    scene.remove(this.mesh);
    this.geo.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
  }
}
