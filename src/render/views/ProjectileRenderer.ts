import {
  BoxGeometry,
  Color,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type Scene,
} from 'three';
import { lerp } from '../../core/math';
import type { ProjVisual } from '../../data/types';
import type { World } from '../../sim/World';
import type { Lighting } from '../Lighting';

interface VisualCfg {
  geo: 'box' | 'sphere' | 'oct' | 'ico';
  size: [number, number, number];
  color: number;
  glow: number;
  stretch?: boolean;
  lit?: boolean;
  spin?: number;
  light?: { color: number; intensity: number; dist: number };
}

export const PROJ_VISUALS: Record<ProjVisual, VisualCfg> = {
  bullet: { geo: 'box', size: [0.4, 0.05, 0.05], color: 0xffe08a, glow: 5, stretch: true },
  pellet: { geo: 'box', size: [0.22, 0.045, 0.045], color: 0xffd06a, glow: 4, stretch: true },
  tracer: { geo: 'box', size: [0.7, 0.055, 0.055], color: 0xffb04a, glow: 6, stretch: true },
  grenade: { geo: 'sphere', size: [0.13, 0.13, 0.13], color: 0x4a5a2a, glow: 0, lit: true, spin: 10 },
  orb_fire: {
    geo: 'ico',
    size: [0.26, 0.26, 0.26],
    color: 0xff6a1a,
    glow: 4,
    spin: 6,
    light: { color: 0xff6a1a, intensity: 8, dist: 6 },
  },
  jet_water: { geo: 'sphere', size: [0.16, 0.16, 0.16], color: 0x5ab0ff, glow: 2.2 },
  shard_ice: { geo: 'oct', size: [0.34, 0.1, 0.1], color: 0xbff4ff, glow: 3, stretch: true },
  glob_toxic: { geo: 'sphere', size: [0.22, 0.22, 0.22], color: 0x8cff3a, glow: 3 },
  packet_cyber: {
    geo: 'box',
    size: [0.22, 0.22, 0.22],
    color: 0x39e6ff,
    glow: 4.5,
    spin: 8,
    light: { color: 0x39e6ff, intensity: 5, dist: 5 },
  },
  skull_necro: {
    geo: 'ico',
    size: [0.26, 0.26, 0.26],
    color: 0xb05aff,
    glow: 3.5,
    spin: 3,
    light: { color: 0xb05aff, intensity: 6, dist: 5 },
  },
  acid: { geo: 'sphere', size: [0.2, 0.2, 0.2], color: 0x9cff3a, glow: 2.6 },
  laser: { geo: 'box', size: [0.8, 0.06, 0.06], color: 0xff2a2a, glow: 6, stretch: true },
  rock: { geo: 'ico', size: [0.34, 0.34, 0.34], color: 0x6a5a4a, glow: 0, lit: true, spin: 5 },
  fireball: {
    geo: 'ico',
    size: [0.45, 0.45, 0.45],
    color: 0xff5a10,
    glow: 4,
    spin: 5,
    light: { color: 0xff5a10, intensity: 10, dist: 7 },
  },
  missile: { geo: 'box', size: [0.55, 0.14, 0.14], color: 0x5a5e66, glow: 0, lit: true, stretch: true },
  blade: { geo: 'box', size: [0.8, 0.05, 0.25], color: 0xc8d0d8, glow: 0, lit: true, spin: 20 },
  tombstone: { geo: 'box', size: [0.6, 0.9, 0.2], color: 0x7a7a82, glow: 0, lit: true, spin: 4 },
  plasma: {
    geo: 'sphere',
    size: [0.38, 0.38, 0.38],
    color: 0x39e6ff,
    glow: 5,
    light: { color: 0x39e6ff, intensity: 10, dist: 7 },
  },
  iceball: { geo: 'ico', size: [0.38, 0.38, 0.38], color: 0xbff4ff, glow: 2.4, spin: 4 },
  mudball: { geo: 'ico', size: [0.38, 0.38, 0.38], color: 0x5a4a2a, glow: 0, lit: true, spin: 4 },
  spark: { geo: 'sphere', size: [0.12, 0.12, 0.12], color: 0xfff15a, glow: 5 },
};

const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _d = new Vector3();
const _x = new Vector3(1, 0, 0);

function unitGeo(g: VisualCfg['geo']): BufferGeometry {
  switch (g) {
    case 'box':
      return new BoxGeometry(1, 1, 1);
    case 'sphere':
      return new SphereGeometry(1, 8, 6);
    case 'oct':
      return new OctahedronGeometry(1, 0);
    case 'ico':
      return new IcosahedronGeometry(1, 0);
  }
}

/** Projéteis desenhados com uma InstancedMesh por tipo visual. */
export class ProjectileRenderer {
  private meshes = new Map<ProjVisual, InstancedMesh>();
  private counts = new Map<ProjVisual, number>();
  private mats: Material[] = [];
  private t = 0;

  constructor(
    private scene: Scene,
    private cap = 128,
  ) {}

  private mesh(v: ProjVisual): InstancedMesh {
    let m = this.meshes.get(v);
    if (m) return m;
    const cfg = PROJ_VISUALS[v];
    const mat = cfg.lit
      ? new MeshStandardMaterial({ color: cfg.color, roughness: 0.6, metalness: 0.3, flatShading: true })
      : new MeshBasicMaterial({ color: new Color(cfg.color).multiplyScalar(cfg.glow), toneMapped: false });
    this.mats.push(mat);
    m = new InstancedMesh(unitGeo(cfg.geo), mat, this.cap);
    m.instanceMatrix.setUsage(DynamicDrawUsage);
    m.frustumCulled = false;
    m.count = 0;
    m.castShadow = !!cfg.lit;
    this.scene.add(m);
    this.meshes.set(v, m);
    return m;
  }

  sync(w: World, alpha: number, dt: number, lighting: Lighting): void {
    this.t += dt;
    this.counts.clear();
    for (const e of w.entities) {
      const pc = e.projectile;
      if (!pc) continue;
      const cfg = PROJ_VISUALS[pc.visual];
      const m = this.mesh(pc.visual);
      const i = this.counts.get(pc.visual) ?? 0;
      if (i >= this.cap) continue;
      this.counts.set(pc.visual, i + 1);
      const x = lerp(e.t.px, e.t.x, alpha);
      const y = lerp(e.t.py, e.t.y, alpha);
      const z = lerp(e.t.pz, e.t.z, alpha);
      _p.set(x, y, z);
      if (cfg.stretch) {
        _d.set(e.t.vx, e.t.vy, e.t.vz);
        if (_d.lengthSq() < 1e-6) _d.set(1, 0, 0);
        _q.setFromUnitVectors(_x, _d.normalize());
      } else if (cfg.spin) {
        _q.setFromAxisAngle(_d.set(0.3, 1, 0.2).normalize(), this.t * cfg.spin + e.id);
      } else _q.identity();
      _s.set(cfg.size[0], cfg.size[1], cfg.size[2]);
      _m.compose(_p, _q, _s);
      m.setMatrixAt(i, _m);
      if (cfg.light)
        lighting.request({
          x,
          y,
          z,
          color: cfg.light.color,
          intensity: cfg.light.intensity,
          distance: cfg.light.dist,
          priority: 2,
        });
    }
    for (const [v, m] of this.meshes) {
      m.count = this.counts.get(v) ?? 0;
      m.instanceMatrix.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const m of this.meshes.values()) {
      this.scene.remove(m);
      m.geometry.dispose();
      m.dispose();
    }
    for (const m of this.mats) m.dispose();
    this.meshes.clear();
  }
}
