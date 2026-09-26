import { Vector3 } from 'three';
import { damp } from '../core/math';
import { getMap } from '../data/maps';
import { ENEMIES } from '../data/enemies';
import { getCharacter } from '../data/characters';
import { MOVES } from '../data/melee';
import type { CharacterId, CosmeticId, CosmeticSlot } from '../data/types';
import { makeFighter, makeTransform, type Entity } from '../sim/Entity';
import { buildEnvironment, type BuiltEnv } from './env/EnvironmentBuilder';
import { Lighting } from './Lighting';
import type { Renderer } from './Renderer';
import { enemyRig } from './rig/rigs';
import { characterRig, characterStyle } from './rig/characterRigs';
import { CharacterView } from './views/CharacterView';
import { CosmeticRig } from './views/Attachments';
import { BlobShadows } from './fx/BlobShadows';

/** Personagem extra na fila da seleção (jogadores 2 a 5). */
interface Actor {
  id: CharacterId;
  v: CharacterView;
  e: Entity;
  moveT: number;
}

interface Walker {
  e: Entity;
  v: CharacterView;
  dir: number;
  speed: number;
}

/**
 * Cenário 3D atrás dos menus: o personagem do jogador no mapa atual, zumbis vagando, prévia do guarda-roupa e da
 * tela de seleção.
 */
export class MenuScene {
  private env: BuiltEnv;
  private lighting: Lighting;
  private robot: CharacterView;
  private robotE: Entity;
  private cos: CosmeticRig;
  private character: CharacterId = 'robot';
  private eq: Partial<Record<CosmeticSlot, CosmeticId>> = {};
  /** Tempo (ticks) do golpe especial em exibição. */
  private moveT = 0;
  /** Jogadores 2..5 na seleção, lado a lado com o jogador 1. */
  private extras: Actor[] = [];
  private walkers: Walker[] = [];
  private blobs: BlobShadows;
  private t = 0;
  private spin = 0;
  /** 0 = menu (plano geral), 1 = guarda-roupa (close no robô). */
  focus = 0;
  /** Seleção de jogadores: personagens de frente, no alto da tela (os cartões ficam embaixo). */
  stage = false;
  private stageV = 0;
  private focusV = 0;
  private tmp = new Vector3();

  constructor(
    private r: Renderer,
    mapId = 'vila',
    character: CharacterId = 'robot',
  ) {
    const map = getMap(mapId);
    const level = {
      ...map.levels[0]!,
      length: 40,
      props: [],
      pickups: [],
      segments: [],
      hazards: [],
      boss: undefined,
    };
    this.env = buildEnvironment(r.scene, map, level, r.quality);
    this.lighting = new Lighting(r.scene, r.gl, r.quality);
    this.lighting.applyEnv(map.env);
    this.lighting.setStaticLights(this.env.lights);
    r.post.applyEnv(map.env);
    this.blobs = new BlobShadows(r.scene, 16);
    this.character = character;
    this.robot = this.makeHero(character);
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

  private makeHero(id: CharacterId): CharacterView {
    const st = characterStyle(id);
    return new CharacterView(
      characterRig(id),
      this.r.quality.standardMaterials,
      { hunch: st.hunch, zombieArms: false, heavy: false },
      st.scale,
    );
  }

  setCosmetics(eq: Partial<Record<CosmeticSlot, CosmeticId>>): void {
    this.eq = { ...eq };
    this.cos.set(eq);
  }

  /** Troca o personagem em exibição (mantém os cosméticos) e mostra o golpe especial dele. */
  setCharacter(id: CharacterId, showSpecial = true): void {
    if (id !== this.character) {
      this.character = id;
      this.cos.dispose();
      this.r.scene.remove(this.robot.group);
      this.robot.dispose();
      this.robot = this.makeHero(id);
      this.r.scene.add(this.robot.group);
      this.cos = new CosmeticRig(this.robot);
      this.cos.set(this.eq);
    }
    if (showSpecial) {
      playSpecial(this.robotE, id);
      this.moveT = 0;
    }
  }

  /**
   * Fila de personagens da seleção com vários jogadores (o primeiro é o jogador 1). Lista vazia ou com um só
   * volta ao personagem sozinho. Quem mudou de personagem mostra o especial.
   */
  setLineup(chars: CharacterId[]): void {
    const want = chars.slice(1);
    for (let i = 0; i < Math.max(want.length, this.extras.length); i++) {
      const id = want[i];
      const cur = this.extras[i];
      if (cur && cur.id === id) continue;
      if (cur) {
        this.r.scene.remove(cur.v.group);
        cur.v.dispose();
      }
      if (!id) continue;
      const a: Actor = { id, v: this.makeHero(id), e: this.fake(20, 0.4, -1), moveT: 0 };
      this.r.scene.add(a.v.group);
      playSpecial(a.e, id);
      this.extras[i] = a;
    }
    this.extras.length = want.length;
    if (chars[0]) this.setCharacter(chars[0], chars[0] !== this.character);
  }

  frame(dt: number): void {
    this.t += dt;
    this.focusV = damp(this.focusV, this.focus, 0.15, dt);
    // robô: parado, levemente virado para a câmera; no guarda-roupa gira devagar
    const e = this.robotE;
    // com vários jogadores, todos lado a lado (P1 à esquerda), centrados no enquadramento
    const n = 1 + this.extras.length;
    const place = (a: Entity, i: number) => {
      a.t.x = n > 1 || this.stage ? 21 + (i - (n - 1) / 2) * 1.15 : 20;
      a.t.z = n > 1 ? 0.5 - (i % 2) * 0.45 : 0.4;
      a.t.px = a.t.x;
      a.t.pz = a.t.z;
    };
    place(e, 0);
    this.moveT = advanceMove(e, this.moveT, dt);
    this.robot.sync(e, 1, dt, null);
    this.spin += dt * 0.6 * this.focusV * (n > 1 ? 0 : 1);
    this.stageV = damp(this.stageV, this.stage ? 1 : 0, 0.15, dt);
    const face =
      (Math.PI / 2 - 0.35 - (Math.PI / 2 - 0.35) * this.focusV * 0.9) * (1 - this.stageV) +
      0.12 * this.stageV;
    this.robot.yaw.rotation.y = face + Math.sin(this.spin) * 0.8 * this.focusV;
    this.cos.update(dt, 0.3 + Math.sin(this.t) * 0.3, 0, 1);
    this.blobs.begin();
    this.blobs.add(e.t.x, e.t.z, 0.4, 0);
    this.extras.forEach((a, i) => {
      place(a.e, i + 1);
      a.moveT = advanceMove(a.e, a.moveT, dt);
      a.v.sync(a.e, 1, dt, null);
      a.v.yaw.rotation.y = face;
      this.blobs.add(a.e.t.x, a.e.t.z, 0.4, 0);
    });
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
    const sv = this.stageV;
    cam.zoom = (1 - f * 0.6) * (1 - sv) + 0.8 * sv;
    // seleção: fila centralizada e mais alta na tela; senão robô à esquerda (menu) ou em close (guarda-roupa)
    const menuX = n > 1 ? 21 : e.t.x + 2.5 - f * 2.4;
    cam.update(menuX * (1 - sv) + 21 * sv, f * 0.9 * (1 - sv) - 1.2 * sv, e.t.z * 0.3 + f * 0.2, dt);
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
    for (const a of this.extras) {
      this.r.scene.remove(a.v.group);
      a.v.dispose();
    }
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

/** Começa a mostrar o golpe especial do personagem numa entidade de fachada. */
function playSpecial(e: Entity, id: CharacterId): void {
  const fi = e.fighter!;
  fi.state = 'attack';
  fi.moveId = getCharacter(id).special;
  fi.st = 0;
}

/** Avança o golpe em exibição (60 quadros por segundo); devolve o novo tempo. */
function advanceMove(e: Entity, moveT: number, dt: number): number {
  const fi = e.fighter!;
  if (fi.state !== 'attack' || !fi.moveId) return 0;
  const m = MOVES[fi.moveId];
  const t = moveT + dt * 60;
  fi.st = Math.floor(t);
  if (!m || fi.st >= m.startup + m.active + m.recovery) {
    fi.state = 'idle';
    fi.moveId = null;
    fi.st = 0;
    return 0;
  }
  return t;
}
