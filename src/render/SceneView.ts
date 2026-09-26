import { Group, Mesh, MeshBasicMaterial, Object3D, RingGeometry, type Scene } from 'three';
import { SLOT_COLOR_HEX } from '../app/party';
import { lerp } from '../core/math';
import { ENEMIES } from '../data/enemies';
import { MELEE_WEAPONS } from '../data/melee';
import { FIREARMS } from '../data/weapons';
import type { Entity, EntityId } from '../sim/Entity';
import type { World } from '../sim/World';
import { BlobShadows } from './fx/BlobShadows';
import { recipeMesh } from './meshCache';
import type { QualityPreset } from './quality';
import { enemyRig } from './rig/rigs';
import { characterRig, characterStyle } from './rig/characterRigs';
import { CharacterView, animInfoFor } from './views/CharacterView';
import { PROP_RECIPES } from './views/propRecipes';
import { staffRecipe } from './views/staffRecipe';
import { Btn } from '../sim/InputFrame';
import { bossRig } from './rig/bossRigs';
import { BOSSES } from '../data/bosses';
import type { PropKind } from '../data/types';
import { PickupView } from './views/PickupView';
import { CosmeticRig } from './views/Attachments';

interface SimpleView {
  object: Object3D;
  sync(e: Entity, alpha: number, dt: number): void;
  dispose(): void;
}

/** Liga entidades do sim a objetos 3D (cria, atualiza com interpolação e remove). */
export class SceneView {
  readonly root = new Group();
  readonly chars = new Map<EntityId, CharacterView>();
  private simple = new Map<EntityId, SimpleView>();
  readonly blobs: BlobShadows;
  private cosmetics = new Map<EntityId, CosmeticRig>();
  /** Anel colorido no chão sob cada jogador (multijogador). */
  private rings = new Map<EntityId, Mesh>();
  private ringGeo: RingGeometry | null = null;
  private time = 0;
  /** Extensões: outras camadas (projéteis, perigos) registram sincronizadores. */
  extraSync: ((w: World, alpha: number, dt: number) => void)[] = [];

  constructor(
    private scene: Scene,
    private q: QualityPreset,
  ) {
    scene.add(this.root);
    this.blobs = new BlobShadows(scene);
  }

  character(id: EntityId): CharacterView | undefined {
    return this.chars.get(id);
  }

  sync(w: World, alpha: number, dt: number): void {
    this.time += dt;
    const seen = new Set<EntityId>();
    this.blobs.begin();
    for (const e of w.entities) {
      seen.add(e.id);
      switch (e.kind) {
        case 'player':
        case 'enemy':
        case 'boss':
          this.syncChar(e, alpha, dt, w.tick);
          if (e.player) {
            let cr = this.cosmetics.get(e.id);
            const v = this.chars.get(e.id);
            if (!cr && v) this.cosmetics.set(e.id, (cr = new CosmeticRig(v)));
            const lo = w.loadouts.find((l) => l.slot === e.player!.slot);
            if (cr && lo) {
              cr.set(lo.cosmetics);
              cr.update(dt, e.t.vx, e.t.vy, e.t.facing);
            }
          }
          break;
        case 'prop':
        case 'pickup': {
          let v = this.simple.get(e.id);
          if (!v) {
            v = e.kind === 'prop' ? makePropView(e.defId as PropKind) : new PickupView(e.defId);
            this.simple.set(e.id, v);
            this.root.add(v.object);
          }
          v.sync(e, alpha, dt);
          const r = e.body?.radius ?? 0.4;
          this.blobs.add(v.object.position.x, v.object.position.z, r, v.object.position.y);
          break;
        }
        default:
          break;
      }
    }
    for (const [id, cr] of this.cosmetics) {
      if (!seen.has(id)) {
        cr.dispose();
        this.cosmetics.delete(id);
      }
    }
    if (w.playerCount > 1) this.syncRings(w, alpha);
    for (const [id, v] of this.chars) {
      if (!seen.has(id)) {
        this.root.remove(v.group);
        v.dispose();
        this.chars.delete(id);
      }
    }
    for (const [id, v] of this.simple) {
      if (!seen.has(id)) {
        this.root.remove(v.object);
        v.dispose();
        this.simple.delete(id);
      }
    }
    for (const f of this.extraSync) f(w, alpha, dt);
    this.blobs.end();
  }

  private syncChar(e: Entity, alpha: number, dt: number, tick: number): void {
    let v = this.chars.get(e.id);
    if (!v) {
      v = this.createChar(e);
      this.chars.set(e.id, v);
      this.root.add(v.group);
    }
    if (e.player) this.syncPlayerHeld(e, v, tick);
    // chefes que crescem (OMEGA-Z fase 3): escala acompanha o sim suavemente
    if (e.kind === 'boss' && e.scale && Math.abs(v.scale - e.scale) > 1e-3)
      v.scale += (e.scale - v.scale) * Math.min(1, dt * 2.5);
    v.sync(e, alpha, dt, animInfoFor(e, tick));
    // afundar corpos
    if (e.fighter?.state === 'dead' && e.kind === 'enemy') {
      const d = e.deadTicks ?? 0;
      if (d > 90) v.sink = Math.min(1.2, (d - 90) / 60);
    } else v.sink = 0;
    const hidden = !!(e.player && e.player.respawn > 0);
    v.group.visible = !hidden;
    if (!hidden) {
      const y = lerp(e.t.py, e.t.y, alpha);
      this.blobs.add(
        v.group.position.x,
        v.group.position.z,
        e.body?.radius ?? 0.4,
        e.fighter?.state === 'dead' ? 0 : y,
      );
    }
  }

  private createChar(e: Entity): CharacterView {
    const std = this.q.standardMaterials;
    if (e.kind === 'player') {
      const id = e.player?.character ?? 'robot';
      const st = characterStyle(id);
      return new CharacterView(
        characterRig(id),
        std,
        { hunch: st.hunch, zombieArms: false, heavy: false },
        st.scale,
      );
    }
    if (e.kind === 'boss') {
      const def = BOSSES[e.defId]!;
      return new CharacterView(
        bossRig(def),
        std,
        { hunch: def.family === 'zombie' ? 0.3 : 0, zombieArms: false, heavy: true },
        def.scale,
      );
    }
    const def = ENEMIES[e.defId]!;
    const rig = enemyRig(def.id, def.rig, e.id);
    const v = new CharacterView(
      rig,
      std,
      {
        hunch: def.rig.hunch ?? 0,
        zombieArms: def.family === 'zombie' && def.archetype !== 'brute' && def.archetype !== 'exploder',
        heavy: def.archetype === 'brute',
      },
      def.rig.scale,
    );
    if (def.archetype === 'soldier') v.setHeld('gun:rifle', recipeMesh('gun:rifle', FIREARMS.rifle.mesh));
    return v;
  }

  /** Arma/cajado na mão do robô e camada de mira. */
  private syncPlayerHeld(e: Entity, v: CharacterView, tick: number): void {
    const p = e.player!;
    const recentlyFired = tick - p.lastFireTick < 30;
    const firing = (p.buttons & Btn.Fire) !== 0 || recentlyFired;
    const aiming = (p.buttons & Btn.Aim) !== 0;
    let key = '';
    let obj: Object3D | null = null;
    let socket = 'handR';
    if (p.melee && !(p.mode === 'gun' && (firing || aiming))) {
      key = `melee:${p.melee.id}`;
      if (v.heldKey !== key) obj = recipeMesh(key, MELEE_WEAPONS[p.melee.id].mesh);
    } else if (p.mode === 'staff') {
      const st = p.staffs[p.staffIdx] ?? 'heal';
      key = `staff:${st}`;
      socket = 'staffR';
      if (v.heldKey !== key) obj = recipeMesh(key, staffRecipe(st));
    } else {
      const g = p.guns[p.gunIdx] ?? 'pistol';
      key = `gun:${g}`;
      if (v.heldKey !== key) obj = recipeMesh(key, FIREARMS[g].mesh);
    }
    if (v.heldKey !== key) v.setHeld(key, obj, socket);
    v.aim =
      p.mode === 'gun' && !(p.melee && !(firing || aiming)) && (firing || aiming)
        ? e.t.facing >= 0
          ? 0
          : Math.PI
        : null;
  }

  flash(id: EntityId, amount = 1): void {
    const v = this.chars.get(id);
    if (v) v.flash = Math.max(v.flash, amount);
  }

  /** Anéis coloridos sob os jogadores (quem é quem no multijogador). */
  private syncRings(w: World, alpha: number): void {
    this.ringGeo ??= new RingGeometry(0.42, 0.56, 28).rotateX(-Math.PI / 2);
    for (const e of w.playerEntities()) {
      let m = this.rings.get(e.id);
      if (!m) {
        const mat = new MeshBasicMaterial({
          color: SLOT_COLOR_HEX[e.player!.slot] ?? 0xffffff,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
        });
        m = new Mesh(this.ringGeo, mat);
        m.renderOrder = 2;
        this.rings.set(e.id, m);
        this.root.add(m);
      }
      const gone = e.player!.respawn > 0 || e.fighter?.state === 'dead';
      m.visible = !gone;
      m.position.set(lerp(e.t.px, e.t.x, alpha), 0.03, lerp(e.t.pz, e.t.z, alpha));
    }
  }

  dispose(): void {
    for (const m of this.rings.values()) {
      this.root.remove(m);
      (m.material as MeshBasicMaterial).dispose();
    }
    this.rings.clear();
    this.ringGeo?.dispose();
    for (const c of this.cosmetics.values()) c.dispose();
    this.cosmetics.clear();
    for (const v of this.chars.values()) v.dispose();
    for (const v of this.simple.values()) v.dispose();
    this.chars.clear();
    this.simple.clear();
    this.scene.remove(this.root);
    this.blobs.dispose(this.scene);
  }
}

function makePropView(kind: PropKind): SimpleView {
  const obj = recipeMesh(`prop:${kind}`, PROP_RECIPES[kind]);
  let shake = 0;
  let lastHp = -1;
  return {
    object: obj,
    sync(e, alpha) {
      obj.position.set(lerp(e.t.px, e.t.x, alpha), 0, lerp(e.t.pz, e.t.z, alpha));
      const hp = e.health?.hp ?? 0;
      if (lastHp >= 0 && hp < lastHp) shake = 1;
      lastHp = hp;
      shake = Math.max(0, shake - 0.08);
      obj.rotation.z = Math.sin(shake * 20) * shake * 0.08;
    },
    dispose() {},
  };
}
