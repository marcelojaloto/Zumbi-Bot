import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  LineBasicMaterial,
  LineSegments,
  type Scene,
} from 'three';

const _c = new Color();

/** Traços de tiro instantâneo (hitscan) e raios elétricos que se apagam rapidamente. */
export class Tracers {
  readonly lines: LineSegments;
  private pos: Float32Array;
  private col: Float32Array;
  private base: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private n = 0;

  constructor(
    scene: Scene,
    private cap = 128,
  ) {
    this.pos = new Float32Array(cap * 6);
    this.col = new Float32Array(cap * 6);
    this.base = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);
    this.maxLife = new Float32Array(cap);
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(this.pos, 3).setUsage(DynamicDrawUsage));
    g.setAttribute('color', new BufferAttribute(this.col, 3).setUsage(DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.lines = new LineSegments(
      g,
      new LineBasicMaterial({
        vertexColors: true,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.lines.frustumCulled = false;
    scene.add(this.lines);
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
  ): void {
    const i = this.n < this.cap ? this.n++ : 0;
    this.pos.set([x0, y0, z0, x1, y1, z1], i * 6);
    _c.setHex(color).multiplyScalar(intensity);
    this.base.set([_c.r, _c.g, _c.b], i * 3);
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
      const j = s === segs ? 0 : 0.35;
      const nx = x0 + (x1 - x0) * t + (rnd() - 0.5) * j;
      const ny = y0 + (y1 - y0) * t + (rnd() - 0.5) * j;
      const nz = z0 + (z1 - z0) * t + (rnd() - 0.5) * j;
      this.add(px, py, pz, nx, ny, nz, color, 0.12, 4);
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
          this.pos.copyWithin(i * 6, j * 6, j * 6 + 6);
          this.base.copyWithin(i * 3, j * 3, j * 3 + 3);
          this.life[i] = this.life[j]!;
          this.maxLife[i] = this.maxLife[j]!;
        }
        continue;
      }
      const k = this.life[i]! / this.maxLife[i]!;
      for (let v = 0; v < 2; v++) {
        const f = v === 0 ? k * 0.4 : k;
        this.col[i * 6 + v * 3] = this.base[i * 3]! * f;
        this.col[i * 6 + v * 3 + 1] = this.base[i * 3 + 1]! * f;
        this.col[i * 6 + v * 3 + 2] = this.base[i * 3 + 2]! * f;
      }
      i++;
    }
    const g = this.lines.geometry;
    g.setDrawRange(0, this.n * 2);
    g.getAttribute('position').needsUpdate = true;
    g.getAttribute('color').needsUpdate = true;
  }

  dispose(scene: Scene): void {
    scene.remove(this.lines);
    this.lines.geometry.dispose();
    (this.lines.material as LineBasicMaterial).dispose();
  }
}
