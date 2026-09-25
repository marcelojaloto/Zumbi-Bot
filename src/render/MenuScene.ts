import { Vector3 } from 'three';
import { damp } from '../core/math';
import { getMap } from '../data/maps';
import { ENEMIES } from '../data/enemies';
import type { CosmeticId, CosmeticSlot } from '../data/types';
import { makeFighter, makeTransform, type Entity } from '../sim/Entity';
import { buildEnvironment, type BuiltEnv } from './env/EnvironmentBuilder';
import { Lighting } from './Lighting';
import type { Renderer } from './Renderer';
import { enemyRig, robotPlayerRig } from './rig/rigs';
import { CharacterView } from './views/CharacterView';
import { CosmeticRig } from './views/Attachments';
import { BlobShadows } from './fx/BlobShadows';

interface Walker {
  e: Entity;
  v: CharacterView;
  dir: number;
  speed: number;
}

/** Cenário 3D atrás dos menus: o robô na névoa da vila, zumbis vagando e prévia do guarda-roupa. */
export class MenuScene {
  private env: BuiltEnv;
  private lighting: Lighting;
  private robot: CharacterView;
  private robotE: Entity;
  private cos: CosmeticRig;
  private walkers: Walker[] = [];
  private blobs: BlobShadows;
  private t = 0;
  private spin = 0;
  /** 0 = menu (plano geral), 1 = guarda-roupa (close no robô). */
  focus = 0;
  private focusV = 0;
  private tmp = new Vector3();

  constructor(private r: Renderer) {
    const map = getMap('vila');
    const level = { ...map.levels[0]!, length: 40, props: [], pickups: [], segments: [] };
    this.env = buildEnvironment(r.scene, map, level, r.quality);
    this.lighting = new Lighting(r.scene, r.gl, r.quality);
    this.lighting.applyEnv(map.env);
    this.lighting.setStaticLights(this.env.lights);
    r.post.applyEnv(map.env);
    this.blobs = new BlobShadows(r.scene, 16);
    this.robot = new CharacterView(robotPlayerRig(), r.quality.standardMaterials, {
      hunch: 0,
      zombieArms: false,
      heavy: false,
    });
    this.robotE = this.fake(20, 0.4, -1);
    r.scene.add(this.robot.group);
    this.cos = new CosmeticRig(this.robot);
    const ids = ['walker', 'runner', 'walker', 'brute'];
    ids.forEach((id, i) => {
      const def = ENEMIES[id]!;
      const e = this.fake(12 + i * 5, -3.5 - (i % 2) * 1.2, i % 2 ? 1 : -1);
      const v = new CharacterView(
        enemyRig(def.id, def.rig, i + 3),
        r.quality.standardMaterials,
        { hunch: def.rig.hunch ?? 0.5, zombieArms: def.archetype !== 'brute', heavy: false },
        def.rig.scale,
      );
      r.scene.add(v.group);
      this.walkers.push({ e, v, dir: i % 2 ? 1 : -1, speed: def.id === 'runner' ? 1.4 : 0.7 });
    });
    r.cam.snap(20, 0, 0);
  }

  private fake(x: number, z: number, facing: 1 | -1): Entity {
    return {
      id: 0,
      kind: 'enemy',
      team: 'enemies',
      defId: '',
      alive: true,
      age: 0,
      t: makeTransform(x, 0, z, facing),
      fighter: makeFighter('idle'),
      body: { radius: 0.35, height: 1.8, mass: 1, grounded: true, gravityScale: 1 },
    };
  }

  setCosmetics(eq: Partial<Record<CosmeticSlot, CosmeticId>>): void {
    this.cos.set(eq);
  }

  frame(dt: number): void {
    this.t += dt;
    this.focusV = damp(this.focusV, this.focus, 0.15, dt);
    // robô: parado, levemente virado para a câmera; no guarda-roupa gira devagar
    const e = this.robotE;
    e.t.px = e.t.x;
    e.t.pz = e.t.z;
    this.robot.sync(e, 1, dt, null);
    this.spin += dt * 0.6 * this.focusV;
    this.robot.yaw.rotation.y =
      Math.PI / 2 - 0.35 - (Math.PI / 2 - 0.35) * this.focusV * 0.9 + Math.sin(this.spin) * 0.8 * this.focusV;
    this.cos.update(dt, 0.3 + Math.sin(this.t) * 0.3, 0, 1);
    this.blobs.begin();
    this.blobs.add(e.t.x, e.t.z, 0.4, 0);
    for (const w of this.walkers) {
      const t = w.e.t;
      t.px = t.x;
      t.pz = t.z;
      t.x += w.dir * w.speed * dt;
      if (t.x > 36 || t.x < 6) w.dir = -w.dir;
      t.facing = w.dir > 0 ? 1 : -1;
      t.vx = w.dir * w.speed;
      w.e.fighter!.state = 'walk';
      w.v.sync(w.e, 1, dt, null);
      this.blobs.add(t.x, t.z, 0.4, 0);
    }
    this.blobs.end();
    // câmera: plano geral (robô à esquerda) ↔ close do guarda-roupa
    const f = this.focusV;
    const cam = this.r.cam;
    cam.zoom = 1 - f * 0.6;
    cam.update(e.t.x + 2.5 - f * 2.4, f * 0.9, e.t.z * 0.3 + f * 0.2, dt);
    this.lighting.update(cam.x, 0, dt);
    this.lighting.request({
      x: e.t.x + 1,
      y: 2.4,
      z: e.t.z + 2.5,
      color: 0xffd8a8,
      intensity: 8 + f * 10,
      distance: 8,
      priority: 3,
    });
    this.env.update(cam.x, this.t);
    void this.tmp;
  }

  dispose(): void {
    this.r.cam.zoom = 1;
    this.cos.dispose();
    this.r.scene.remove(this.robot.group);
    this.robot.dispose();
    for (const w of this.walkers) {
      this.r.scene.remove(w.v.group);
      w.v.dispose();
    }
    this.blobs.dispose(this.r.scene);
    this.lighting.dispose();
    this.env.dispose();
  }
}
