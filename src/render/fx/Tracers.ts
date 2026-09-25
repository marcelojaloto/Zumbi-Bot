import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  type Scene,
} from 'three';

const _c = new Color();

/**
 * Traços de tiro instantâneo, raios elétricos e mira laser: fitas com espessura sempre
 * voltadas para a câmera (linhas WebGL têm só 1 px).
 */
export class Tracers {
  readonly mesh: Mesh;
  private geo: InstancedBufferGeometry;
  private a: Float32Array;
  private b: Float32Array;
  private col: Float32Array;
  private width: Float32Array;
  private base: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private attrs: InstancedBufferAttribute[];
  private n = 0;

  constructor(
    scene: Scene,
    private cap = 256,
  ) {
    const plane = new PlaneGeometry(1, 1);
    plane.translate(0.5, 0, 0);
    this.geo = new InstancedBufferGeometry();
    this.geo.index = plane.index;
    this.geo.setAttribute('position', plane.getAttribute('position'));
    this.a = new Float32Array(cap * 3);
    this.b = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 3);
    this.width = new Float32Array(cap);
    this.base = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.maxLife = new Float32Array(cap);
    const mk = (arr: Float32Array, n: number) =>
      new InstancedBufferAttribute(arr, n).setUsage(DynamicDrawUsage);
    this.attrs = [mk(this.a, 3), mk(this.b, 3), mk(this.col, 3), mk(this.width, 1)];
    this.geo.setAttribute('iA', this.attrs[0]!);
    this.geo.setAttribute('iB', this.attrs[1]!);
    this.geo.setAttribute('iCol', this.attrs[2]!);
    this.geo.setAttribute('iW', this.attrs[3]!);
    this.geo.instanceCount = 0;
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 iA; attribute vec3 iB; attribute vec3 iCol; attribute float iW;
        varying vec3 vCol; varying float vY;
        void main() {
          vec3 p = mix(iA, iB, position.x);
          vec3 dir = normalize(iB - iA + vec3(1e-5));
          vec3 toCam = normalize(cameraPosition - p);
          vec3 side = normalize(cross(dir, toCam));
          p += side * position.y * iW;
          vCol = iCol; vY = position.y * 2.0;
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol; varying float vY;
        void main() {
          float a = 1.0 - abs(vY);
          gl_FragColor = vec4(vCol * (a * a), a);
        }`,
    });
    this.mesh = new Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    scene.add(this.mesh);
  }

  add(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    color: number,
    life = 0.08,
    intensity = 3,
    width = 0.07,
  ): void {
    const i = this.n < this.cap ? this.n++ : this.cap - 1;
    this.a.set([x0, y0, z0], i * 3);
    this.b.set([x1, y1, z1], i * 3);
    _c.setHex(color).multiplyScalar(intensity);
    this.base.set([_c.r, _c.g, _c.b], i * 3);
    this.width[i] = width;
    this.life[i] = life;
    this.maxLife[i] = life;
  }

  /** Raio em zigue-zague (elétrico). */
  bolt(
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    color: number,
    rnd: () => number,
    segs = 6,
  ): void {
    let px = x0;
    let py = y0;
    let pz = z0;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const j = s === segs ? 0 : 0.45;
      const nx = x0 + (x1 - x0) * t + (rnd() - 0.5) * j;
      const ny = y0 + (y1 - y0) * t + (rnd() - 0.5) * j;
      const nz = z0 + (z1 - z0) * t + (rnd() - 0.5) * j;
      this.add(px, py, pz, nx, ny, nz, color, 0.14, 4, 0.12);
      this.add(px, py, pz, nx, ny, nz, 0xffffff, 0.1, 2, 0.04);
      px = nx;
      py = ny;
      pz = nz;
    }
  }

  update(dt: number): void {
    let i = 0;
    while (i < this.n) {
      this.life[i]! -= dt;
      if (this.life[i]! <= 0) {
        const j = --this.n;
        if (i !== j) {
          this.a.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.b.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.base.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.width[i] = this.width[j]!;
          this.life[i] = this.life[j]!;
          this.maxLife[i] = this.maxLife[j]!;
        }
        continue;
      }
      const k = Math.min(1, this.life[i]! / this.maxLife[i]!);
      this.col[i * 3] = this.base[i * 3]! * k;
      this.col[i * 3 + 1] = this.base[i * 3 + 1]! * k;
      this.col[i * 3 + 2] = this.base[i * 3 + 2]! * k;
      i++;
    }
    this.geo.instanceCount = this.n;
    for (const a of this.attrs) a.needsUpdate = true;
  }

  dispose(scene: Scene): void {
    scene.remove(this.mesh);
    this.geo.dispose();
    (this.mesh.material as ShaderMaterial).dispose();
  }
}
