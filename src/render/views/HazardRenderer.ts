import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  type BufferGeometry,
  type Scene,
} from 'three';
import type { Entity, EntityId, HazardShape } from '../../sim/Entity';
import type { World } from '../../sim/World';
import { radialTexture } from '../env/textures';

const FX_COLORS: Record<string, number> = {
  acidPool: 0x7aff2a,
  poisonCloud: 0x7aff2a,
  toxicPool: 0x7aff2a,
  gasVent: 0x9aff5a,
  flame: 0xff6a1a,
  fire: 0xff6a1a,
  fireJet: 0xff6a1a,
  magma: 0xff4a0a,
  ice: 0x9fe8ff,
  frost: 0x9fe8ff,
  electric: 0xfff15a,
  electricTile: 0xfff15a,
  shock: 0xfff15a,
  necro: 0xb05aff,
  water: 0x3a9cff,
  mud: 0x8a6a3a,
  swamp: 0x4a6a3a,
  earth: 0xb08a4a,
  spikes: 0xb08a4a,
  shockwave: 0xd8c8a8,
  wind: 0xd8f0ff,
  gust: 0xd8f0ff,
  laser: 0xff2a2a,
  laserTrip: 0xff2a2a,
  beam: 0x39e6ff,
  plasma: 0x39e6ff,
  explosion: 0xff8a2a,
  artillery: 0xff3a2a,
  mine: 0xff3a2a,
  heal: 0x5aff9a,
  pendulum: 0xc8c8d0,
  debris: 0xa89878,
};

export function fxColor(fx: string): number {
  return FX_COLORS[fx] ?? 0xff4a2a;
}

function shapeGeo(s: HazardShape): BufferGeometry {
  switch (s.k) {
    case 'circle':
      return new CircleGeometry(s.r, 28);
    case 'ring':
      return new RingGeometry(Math.max(0.01, s.r - s.width / 2), s.r + s.width / 2, 40);
    case 'rect':
      return new PlaneGeometry(s.w, s.d);
    case 'lane':
      return new PlaneGeometry(s.x1 - s.x0, s.width);
    case 'cone':
      return new CircleGeometry(s.range, 20, -s.angle / 2, s.angle);
  }
}

interface HzView {
  group: Group;
  base: Mesh;
  fill: Mesh | null;
  maxDelay: number;
  shapeKey: string;
  mat: MeshBasicMaterial;
  fillMat: MeshBasicMaterial | null;
}

/** Decalques de perigos: aviso vermelho pulsante (telegraph) e zona ativa colorida por elemento. */
export class HazardRenderer {
  private views = new Map<EntityId, HzView>();
  private t = 0;
  private glowTex = radialTexture('glow', 64);

  constructor(private scene: Scene) {}

  private key(s: HazardShape): string {
    switch (s.k) {
      case 'circle':
        return `c${s.r.toFixed(2)}`;
      case 'ring':
        return `r${s.r.toFixed(2)}`;
      case 'rect':
        return `q${s.w}x${s.d}`;
      case 'lane':
        return `l${s.x0}:${s.x1}:${s.width}`;
      case 'cone':
        return `k${s.angle}:${s.range.toFixed(2)}:${s.dir}`;
    }
  }

  private create(e: Entity): HzView {
    const hz = e.hazard!;
    const group = new Group();
    const color = new Color(hz.delay > 0 ? 0xff2a2a : fxColor(hz.fx));
    const mat = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      map: hz.shape.k === 'circle' ? this.glowTex : null,
      toneMapped: false,
    });
    const base = new Mesh(shapeGeo(hz.shape), mat);
    base.rotation.x = -Math.PI / 2;
    group.add(base);
    let fill: Mesh | null = null;
    let fillMat: MeshBasicMaterial | null = null;
    if (hz.delay > 0) {
      fillMat = new MeshBasicMaterial({
        color: 0xff3a1a,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      });
      fill = new Mesh(shapeGeo(hz.shape), fillMat);
      fill.rotation.x = -Math.PI / 2;
      fill.position.y = 0.01;
      group.add(fill);
    }
    this.scene.add(group);
    return { group, base, fill, maxDelay: Math.max(1, hz.delay), shapeKey: this.key(hz.shape), mat, fillMat };
  }

  sync(w: World, dt: number): void {
    this.t += dt;
    const seen = new Set<EntityId>();
    for (const e of w.entities) {
      const hz = e.hazard;
      if (!hz) continue;
      seen.add(e.id);
      let v = this.views.get(e.id);
      const k = this.key(hz.shape);
      if (v && v.shapeKey !== k && hz.shape.k !== 'circle' && hz.shape.k !== 'ring') {
        this.remove(e.id);
        v = undefined;
      }
      if (!v) {
        v = this.create(e);
        this.views.set(e.id, v);
      }
      const s = hz.shape;
      let x = e.t.x;
      if (s.k === 'lane') x = (s.x0 + s.x1) / 2 + (e.t.x - e.t.px === 0 ? 0 : 0);
      v.group.position.set(s.k === 'lane' ? x : e.t.x, 0.03 + (e.id % 7) * 0.002, e.t.z);
      if (s.k === 'cone') v.base.rotation.z = -s.dir;
      if ((s.k === 'circle' || s.k === 'ring') && v.shapeKey !== k) {
        // crescimento: escala ao invés de recriar
        const r0 = parseFloat(v.shapeKey.slice(1));
        const sc = r0 > 0 ? s.r / r0 : 1;
        v.base.scale.set(sc, sc, 1);
      }
      const telegraph = hz.delay > 0;
      const envInactive = !!hz.env && hz.phase === 0;
      if (telegraph) {
        const prog = 1 - hz.delay / v.maxDelay;
        v.mat.color.setHex(0xff2a2a);
        v.mat.opacity = 0.18 + Math.abs(Math.sin(this.t * 10)) * 0.2;
        if (v.fill) {
          v.fill.visible = true;
          v.fill.scale.set(Math.max(0.01, prog), Math.max(0.01, prog), 1);
        }
      } else {
        if (v.fill) v.fill.visible = false;
        v.mat.color.setHex(fxColor(hz.fx)).multiplyScalar(envInactive ? 0.4 : 1.2);
        v.mat.opacity = envInactive ? 0.12 : 0.28 + Math.sin(this.t * 6 + e.id) * 0.06;
      }
    }
    for (const id of [...this.views.keys()]) if (!seen.has(id)) this.remove(id);
  }

  private remove(id: EntityId): void {
    const v = this.views.get(id);
    if (!v) return;
    this.scene.remove(v.group);
    v.base.geometry.dispose();
    v.fill?.geometry.dispose();
    v.mat.dispose();
    v.fillMat?.dispose();
    this.views.delete(id);
  }

  dispose(): void {
    for (const id of [...this.views.keys()]) this.remove(id);
  }
}
