import { AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry, type Object3D } from 'three';
import { lerp } from '../../core/math';
import { ITEMS } from '../../data/items';
import { MELEE_WEAPONS } from '../../data/melee';
import type { ItemDef, MeshRecipe } from '../../data/types';
import { FIREARMS } from '../../data/weapons';
import { radialTexture } from '../env/textures';
import { recipeMesh } from '../meshCache';
import type { Entity } from '../../sim/Entity';

const ringGeo = new PlaneGeometry(1, 1);
const ringMats = new Map<number, MeshBasicMaterial>();

function ringMat(color: number): MeshBasicMaterial {
  let m = ringMats.get(color);
  if (!m) {
    m = new MeshBasicMaterial({
      color: new Color(color).multiplyScalar(1.4),
      map: radialTexture('glow', 64),
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    ringMats.set(color, m);
  }
  return m;
}

function shapeRecipe(d: ItemDef): MeshRecipe {
  const c = d.color;
  switch (d.shape) {
    case 'medkit':
    case 'bigMedkit': {
      const s = d.shape === 'bigMedkit' ? 1.3 : 1;
      return {
        parts: [
          { shape: 'box', size: [0.42 * s, 0.3 * s, 0.3 * s], pos: [0, 0.15 * s, 0], color: 0xeeeeee },
          {
            shape: 'box',
            size: [0.26 * s, 0.08 * s, 0.02],
            pos: [0, 0.17 * s, 0.16 * s],
            color: c,
            glow: true,
            glowIntensity: 2,
          },
          {
            shape: 'box',
            size: [0.08 * s, 0.22 * s, 0.02],
            pos: [0, 0.17 * s, 0.16 * s],
            color: c,
            glow: true,
            glowIntensity: 2,
          },
        ],
      };
    }
    case 'battery':
      return {
        parts: [
          { shape: 'cyl', size: [0.14, 0.14, 0.42, 8], pos: [0, 0.21, 0], color: 0x2a2e36 },
          {
            shape: 'cyl',
            size: [0.145, 0.145, 0.24, 8],
            pos: [0, 0.21, 0],
            color: c,
            glow: true,
            glowIntensity: 2.2,
          },
        ],
      };
    case 'crystal':
      return {
        parts: [
          { shape: 'oct', size: [0.22, 0], pos: [0, 0.3, 0], color: c, glow: true, glowIntensity: 2.4 },
        ],
      };
    case 'ammo':
      return {
        parts: [
          { shape: 'box', size: [0.46, 0.26, 0.28], pos: [0, 0.13, 0], color: 0x3a4a2a },
          {
            shape: 'box',
            size: [0.3, 0.06, 0.02],
            pos: [0, 0.16, 0.15],
            color: c,
            glow: true,
            glowIntensity: 1.8,
          },
        ],
      };
    case 'power':
      return {
        parts: [
          { shape: 'ico', size: [0.22, 1], pos: [0, 0.35, 0], color: c, glow: true, glowIntensity: 2.8 },
          {
            shape: 'torus',
            size: [0.3, 0.025, 4, 16],
            pos: [0, 0.35, 0],
            rot: [Math.PI / 2, 0, 0],
            color: c,
            glow: true,
            glowIntensity: 2,
          },
        ],
      };
    case 'scrap':
      return {
        parts: [
          { shape: 'cyl', size: [0.08, 0.08, 0.16, 6], pos: [0, 0.1, 0], rot: [0.5, 0, 0.3], color: c },
          {
            shape: 'box',
            size: [0.14, 0.05, 0.1],
            pos: [0.08, 0.05, 0.02],
            rot: [0, 0.6, 0],
            color: 0x8a8e96,
          },
        ],
      };
    case 'bag':
      return {
        parts: [
          { shape: 'sphere', size: [0.22, 7, 5], pos: [0, 0.22, 0], color: 0x6a4a2a },
          { shape: 'cone', size: [0.1, 0.16, 5], pos: [0, 0.46, 0], color: 0x5a3a1a },
          {
            shape: 'torus',
            size: [0.1, 0.02, 4, 10],
            pos: [0, 0.4, 0],
            rot: [Math.PI / 2, 0, 0],
            color: c,
            glow: true,
            glowIntensity: 2.5,
          },
        ],
      };
    case 'gun':
    case 'melee':
      return { parts: [] };
  }
}

/** Item no chão: flutua, gira e tem um brilho circular na cor do item. */
export class PickupView {
  readonly object = new Group();
  private inner: Object3D;
  private t = Math.random() * 6;
  private ring: Mesh;

  constructor(itemId: string) {
    const d = ITEMS[itemId]!;
    const ef = d.effect;
    if (ef.k === 'firearm') this.inner = recipeMesh(`gun:${ef.id}`, FIREARMS[ef.id].mesh, { scale: 1.6 });
    else if (ef.k === 'melee')
      this.inner = recipeMesh(`melee:${ef.id}`, MELEE_WEAPONS[ef.id].mesh, { scale: 1.3 });
    else this.inner = recipeMesh(`item:${d.shape}:${d.color}`, shapeRecipe(d));
    if (ef.k === 'firearm') this.inner.rotation.set(0, Math.PI / 2, 0);
    if (ef.k === 'melee') this.inner.rotation.set(0, 0, Math.PI / 2);
    this.object.add(this.inner);
    this.ring = new Mesh(ringGeo, ringMat(d.color));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.scale.setScalar(ef.k === 'firearm' || ef.k === 'melee' ? 1.6 : 1.1);
    this.ring.position.y = 0.03;
    this.object.add(this.ring);
  }

  sync(e: Entity, alpha: number, dt: number): void {
    this.t += dt;
    const y = lerp(e.t.py, e.t.y, alpha);
    this.object.position.set(lerp(e.t.px, e.t.x, alpha), y, lerp(e.t.pz, e.t.z, alpha));
    const grounded = e.body?.grounded;
    this.inner.position.y = grounded ? 0.25 + Math.sin(this.t * 3) * 0.08 : 0;
    this.inner.rotation.y += dt * 1.8;
    this.ring.visible = !!grounded;
    // pisca antes de sumir
    const pc = e.pickup;
    this.object.visible = !(pc && pc.despawn > 0 && pc.despawn < 180 && Math.sin(this.t * 20) < 0);
  }

  dispose(): void {}
}
