import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  CylinderGeometry,
  MeshStandardMaterial,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Scene,
} from 'three';
import type { Entity, EntityId, HazardShape } from '../../sim/Entity';
import type { World } from '../../sim/World';
import { radialTexture, swirlTexture } from '../env/textures';

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
  arcane: 0x4ad8ff,
  cyclone: 0x4ad8ff,
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
  /** Lâmina pendular (perigo "pendulum"): pivô no alto, balança em profundidade. */
  blade: Group | null;
  /** Funil girando (ciclone do Prodígio). */
  funnel: Group | null;
  /** Duração (quadros) quando apareceu: o funil cresce ao nascer e encolhe no fim. */
  maxActive: number;
}

interface CycloneKit {
  outer: CylinderGeometry;
  inner: CylinderGeometry;
  ring: TorusGeometry;
  outerMat: MeshBasicMaterial;
  innerMat: MeshBasicMaterial;
  ringMat: MeshBasicMaterial;
}

/** Alturas e raios dos anéis de vento em volta do funil. */
const CYCLONE_RINGS: [number, number][] = [
  [0.3, 0.2],
  [0.9, 0.38],
  [1.5, 0.55],
];

const PEND_TOP = 4.4;

/** Decalques de perigos: aviso vermelho pulsante (telegraph) e zona ativa colorida por elemento. */
export class HazardRenderer {
  private views = new Map<EntityId, HzView>();
  private t = 0;
  private glowTex = radialTexture('glow', 64);
  private bladeKit: { arm: CylinderGeometry; blade: CylinderGeometry; mat: MeshStandardMaterial } | null =
    null;

  private makeBlade(): Group {
    this.bladeKit ??= {
      arm: new CylinderGeometry(0.04, 0.04, 1, 6).translate(0, -0.5, 0),
      blade: new CylinderGeometry(0.75, 0.75, 0.07, 18, 1, false, Math.PI / 2, Math.PI),
      mat: new MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.35, roughness: 0.35 }),
    };
    const k = this.bladeKit;
    const pivot = new Group();
    const arm = new Mesh(k.arm, k.mat);
    arm.scale.y = PEND_TOP - 1.1;
    arm.castShadow = true;
    pivot.add(arm);
    // meia-lua de aço no fim do braço, com o gume para baixo
    const blade = new Mesh(k.blade, k.mat);
    blade.rotation.set(0, 0.45, Math.PI / 2);
    blade.position.y = -(PEND_TOP - 1.1);
    blade.castShadow = true;
    pivot.add(blade);
    return pivot;
  }

  private cycloneKit: CycloneKit | null = null;

  private makeFunnel(): Group {
    if (!this.cycloneKit) {
      const swirl = swirlTexture();
      swirl.repeat.set(2, 1);
      const mat = (color: number, opacity: number, map = true): MeshBasicMaterial =>
        new MeshBasicMaterial({
          color,
          map: map ? swirl : null,
          transparent: true,
          opacity,
          depthWrite: false,
          side: DoubleSide,
          blending: AdditiveBlending,
          toneMapped: false,
        });
      this.cycloneKit = {
        // funil aberto: estreito no chão e largo em cima
        outer: new CylinderGeometry(0.62, 0.1, 1.9, 16, 1, true).translate(0, 0.95, 0),
        inner: new CylinderGeometry(0.38, 0.05, 1.6, 12, 1, true).translate(0, 0.8, 0),
        ring: new TorusGeometry(1, 0.035, 4, 20),
        outerMat: mat(fxColor('cyclone'), 0.8),
        innerMat: mat(0xc8f6ff, 0.55),
        ringMat: mat(fxColor('cyclone'), 0.85, false),
      };
    }
    const k = this.cycloneKit;
    const root = new Group();
    const spin = new Group();
    spin.add(new Mesh(k.outer, k.outerMat));
    spin.add(new Mesh(k.inner, k.innerMat));
    // anéis de vento, cada um um pouco torto e fora do centro (girando, o funil bamboleia)
    for (const [y, r] of CYCLONE_RINGS) {
      const ring = new Mesh(k.ring, k.ringMat);
      ring.scale.setScalar(r);
      ring.position.set(r * 0.18, y, 0);
      ring.rotation.set(Math.PI / 2 + 0.22, 0, 0);
      spin.add(ring);
    }
    root.add(spin);
    return root;
  }

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
    let blade: Group | null = null;
    if (hz.fx === 'pendulum') {
      blade = this.makeBlade();
      this.scene.add(blade);
    }
    let funnel: Group | null = null;
    if (hz.fx === 'cyclone') {
      funnel = this.makeFunnel();
      this.scene.add(funnel);
    }
    this.scene.add(group);
    return {
      group,
      base,
      fill,
      maxDelay: Math.max(1, hz.delay),
      shapeKey: this.key(hz.shape),
      mat,
      fillMat,
      blade,
      funnel,
      maxActive: Math.max(1, hz.active),
    };
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
      if (v.blade) {
        const zc = (w.zBand[0] + w.zBand[1]) / 2;
        const len = PEND_TOP - 1.1;
        v.blade.position.set(e.t.x, PEND_TOP, zc);
        v.blade.rotation.x = Math.asin(Math.max(-0.95, Math.min(0.95, (e.t.z - zc) / (len + 0.4))));
      }
      if (v.funnel) {
        // nasce crescendo, gira rápido bamboleando e some encolhendo
        const age = v.maxActive - hz.active;
        const k = Math.max(0.05, Math.min(1, (age + 1) / 6) * Math.min(1, hz.active / 10));
        v.funnel.position.set(e.t.x, e.t.y, e.t.z);
        v.funnel.scale.set(k, 0.4 + 0.6 * k, k);
        const spin = v.funnel.children[0]!;
        spin.rotation.set(
          Math.sin(this.t * 9 + e.id) * 0.1,
          -this.t * 14 - e.id,
          Math.cos(this.t * 7 + e.id) * 0.1,
        );
        spin.children[1]!.rotation.y = this.t * 22;
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
    if (v.blade) this.scene.remove(v.blade);
    if (v.funnel) this.scene.remove(v.funnel);
    v.base.geometry.dispose();
    v.fill?.geometry.dispose();
    v.mat.dispose();
    v.fillMat?.dispose();
    this.views.delete(id);
  }

  dispose(): void {
    for (const id of [...this.views.keys()]) this.remove(id);
    if (this.bladeKit) {
      this.bladeKit.arm.dispose();
      this.bladeKit.blade.dispose();
      this.bladeKit.mat.dispose();
      this.bladeKit = null;
    }
    if (this.cycloneKit) {
      const k = this.cycloneKit;
      for (const d of [k.outer, k.inner, k.ring, k.outerMat, k.innerMat, k.ringMat]) d.dispose();
      this.cycloneKit = null;
    }
  }
}
