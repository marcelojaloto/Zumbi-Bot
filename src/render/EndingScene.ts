import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
} from 'three';
import { getMap } from '../data/maps';
import { ENEMIES } from '../data/enemies';
import { CHARACTERS, HERO_ORDER, getCharacter } from '../data/characters';
import { COSMETICS } from '../data/cosmetics';
import { MOVES } from '../data/melee';
import type { CharacterId } from '../data/types';
import { makeFighter, makeTransform, type Entity } from '../sim/Entity';
import { buildEnvironment, type BuiltEnv } from './env/EnvironmentBuilder';
import { Lighting } from './Lighting';
import type { Renderer } from './Renderer';
import { enemyRig } from './rig/rigs';
import { characterRig, characterStyle } from './rig/characterRigs';
import { J } from './rig/skeleton';
import { CharacterView } from './views/CharacterView';
import { CosmeticRig } from './views/Attachments';
import { recipeMesh } from './meshCache';
import { BlobShadows } from './fx/BlobShadows';

/**
 * Capítulo do final lendário: um por personagem, o epílogo com todos juntos e, por último, a revelação do
 * personagem secreto (liberado bem nessa hora).
 */
export type EndingChapter = CharacterId | 'all';

export const ENDING_CHAPTERS: EndingChapter[] = [
  ...HERO_ORDER,
  'all',
  ...(Object.keys(CHARACTERS) as CharacterId[]).filter((c) => CHARACTERS[c].secret),
];

/** Onde cada final acontece (cenário de um mapa do jogo). */
const CHAPTER_MAP: Record<EndingChapter, string> = {
  robot: 'vila',
  mage: 'torre',
  military: 'guerra',
  cyborg: 'centro',
  mutant: 'floresta',
  all: 'vila',
  prodigy: 'vila',
};

const X0 = 20;
const _v = new Vector3();

interface Actor {
  v: CharacterView;
  e: Entity;
  cos: CosmeticRig | null;
  /** Golpe em exibição (especial) e o tempo dele. */
  move: string | null;
  moveT: number;
  /** Pose própria depois da animação normal (braços, cabeça...). */
  pose?: (a: Actor, t: number) => void;
  yaw: number;
}

interface Spark {
  m: Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  g: number;
}

/**
 * Mini cenário animado de cada final do final lendário: o cenário de um mapa do jogo, o personagem vivendo o seu
 * final feliz e alguns detalhes que crescem, acendem ou explodem em cores (flores, luzes roxas, fogos de artifício,
 * letreiros de neon, árvores e bichos). Só visual; nada do jogo roda aqui.
 */
export class EndingScene {
  private env: BuiltEnv;
  private lighting: Lighting;
  private blobs: BlobShadows;
  private actors: Actor[] = [];
  private props = new Group();
  private sparks: Spark[] = [];
  private updaters: ((t: number, dt: number) => void)[] = [];
  private timers: { at: number; fn: () => void }[] = [];
  private lights: { x: number; y: number; z: number; color: number; intensity: number }[] = [];
  private geos = new Set<BufferGeometry>();
  private mats = new Set<Material>();
  private t = 0;
  // y negativo: a cena sobe na tela e fica acima do texto do capítulo
  private cam = { x: X0 + 0.6, y: -0.75, z: 0.3, zoom: 0.68, push: 0.06 };
  private sphere: SphereGeometry;
  private box: BoxGeometry;
  private rng = 1;

  constructor(
    private r: Renderer,
    readonly chapter: EndingChapter,
  ) {
    const map = getMap(CHAPTER_MAP[chapter]);
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
    this.blobs = new BlobShadows(r.scene, 24);
    r.scene.add(this.props);
    this.sphere = this.geo(new SphereGeometry(1, 10, 8));
    this.box = this.geo(new BoxGeometry(1, 1, 1));
    switch (chapter) {
      case 'robot':
        this.garden();
        break;
      case 'mage':
        this.academy();
        break;
      case 'military':
        this.party();
        break;
      case 'cyborg':
        this.neonCity();
        break;
      case 'mutant':
        this.forest();
        break;
      case 'prodigy':
        this.reveal();
        break;
      default:
        this.epilogue();
    }
    r.cam.zoom = this.cam.zoom;
    r.cam.snap(this.cam.x, this.cam.y, this.cam.z);
  }

  // ------------------------------------------------------------------ peças
  private rand(): number {
    // determinístico: o mesmo final sempre igual
    this.rng = (this.rng * 16807) % 2147483647;
    return (this.rng - 1) / 2147483646;
  }

  private geo<T extends BufferGeometry>(g: T): T {
    this.geos.add(g);
    return g;
  }

  private mat(color: number, glow = 0): Material {
    const m = glow
      ? new MeshBasicMaterial({ color: new Color(color).multiplyScalar(glow), toneMapped: false })
      : new MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05 });
    this.mats.add(m);
    return m;
  }

  private mesh(g: BufferGeometry, color: number, glow = 0, parent: Object3D = this.props): Mesh {
    const m = new Mesh(g, this.mat(color, glow));
    parent.add(m);
    return m;
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

  private hero(id: CharacterId, x: number, z: number, yaw: number, scale = 1): Actor {
    const st = characterStyle(id);
    const v = new CharacterView(
      characterRig(id),
      this.r.quality.standardMaterials,
      { hunch: st.hunch, zombieArms: false, heavy: false },
      st.scale * scale,
    );
    this.r.scene.add(v.group);
    const cos = new CosmeticRig(v);
    cos.set({});
    const a: Actor = { v, e: this.fake(x, z, 1), cos, move: null, moveT: 0, yaw };
    this.actors.push(a);
    return a;
  }

  private robotFriend(x: number, z: number, yaw: number): Actor {
    const def = ENEMIES.soldier!;
    const v = new CharacterView(
      enemyRig(def.id, def.rig, 7),
      this.r.quality.standardMaterials,
      { hunch: 0, zombieArms: false, heavy: false },
      0.85,
    );
    this.r.scene.add(v.group);
    const a: Actor = { v, e: this.fake(x, z, 1), cos: null, move: null, moveT: 0, yaw };
    this.actors.push(a);
    return a;
  }

  private play(a: Actor, move: string): void {
    const fi = a.e.fighter!;
    fi.state = 'attack';
    fi.moveId = move;
    fi.st = 0;
    a.move = move;
    a.moveT = 0;
  }

  /** Gira um osso do boneco (depois da animação normal), misturando com o que já estava. */
  private bone(a: Actor, j: number, x: number, y = 0, z = 0, w = 1): void {
    const b = a.v.rig.bones[j];
    if (!b) return;
    b.rotation.x += (x - b.rotation.x) * w;
    b.rotation.y += (y - b.rotation.y) * w;
    b.rotation.z += (z - b.rotation.z) * w;
  }

  /** Brilho que sobe, some e cai (faíscas, luzes, gotas). */
  private spark(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    color: number,
    o: { size?: number; life?: number; g?: number; glow?: number } = {},
  ): void {
    const m = this.mesh(this.sphere, color, o.glow ?? 4);
    m.position.set(x, y, z);
    m.scale.setScalar(o.size ?? 0.06);
    this.sparks.push({ m, vx, vy, vz, life: o.life ?? 1.2, max: o.life ?? 1.2, g: o.g ?? 0 });
  }

  /** Faz `fn` uma vez, no tempo `at` do capítulo. */
  private later(at: number, fn: () => void): void {
    this.timers.push({ at, fn });
  }

  private firework(x: number, z: number, color: number): void {
    // foguete sobe e estoura em muitas faíscas
    const y1 = 5.5 + this.rand() * 2;
    const up = 9;
    const tUp = y1 / up;
    this.spark(x, 0.5, z, 0, up, 0, 0xffe0a0, { size: 0.07, life: tUp, glow: 5 });
    this.later(this.t + tUp, () => {
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        const b = (this.rand() - 0.5) * 1.6;
        const s = 3 + this.rand() * 1.5;
        this.spark(
          x,
          y1,
          z,
          Math.cos(a) * Math.cos(b) * s,
          Math.sin(b) * s + 1,
          Math.sin(a) * Math.cos(b) * s * 0.4,
          color,
          { size: 0.08, life: 1.4 + this.rand() * 0.5, g: 3.5, glow: 5 },
        );
      }
      this.lights.push({ x, y: y1, z, color, intensity: 30 });
    });
  }

  // ------------------------------------------------------------------ finais
  /** Zumbi Bot: rega o primeiro jardim da vila; robôs libertados passam carregando tábuas. */
  private garden(): void {
    const a = this.hero('robot', X0 - 0.6, 0.5, 0.9);
    // regador na mão
    const hand = a.v.socket('handR');
    const can = new Group();
    this.mesh(this.geo(new CylinderGeometry(0.09, 0.1, 0.18, 10)), 0x3aa0d8, 0, can);
    const spout = this.mesh(this.geo(new CylinderGeometry(0.018, 0.025, 0.22, 6)), 0x2a80b0, 0, can);
    spout.position.set(0, 0.05, 0.15);
    spout.rotation.x = 1.1;
    can.position.set(0, -0.12, 0.05);
    hand?.add(can);
    a.pose = (h, t) => {
      this.bone(h, J.upperArmR, -1.05 + Math.sin(t * 1.6) * 0.08, 0, -0.1);
      this.bone(h, J.foreArmR, -0.35);
      this.bone(h, J.spine, 0.18);
      this.bone(h, J.neck, 0.25);
    };
    // gotas saindo do bico
    this.updaters.push((t) => {
      if (Math.floor(t * 14) === Math.floor((t - 1 / 60) * 14)) return;
      spout.getWorldPosition(_v);
      this.spark(_v.x, _v.y, _v.z, 0.6 + this.rand() * 0.3, -0.2, (this.rand() - 0.5) * 0.2, 0x7ad0ff, {
        size: 0.025,
        life: 0.7,
        g: 7,
        glow: 2,
      });
    });
    // canteiro de flores que brotam uma a uma
    const colors = [0xff4a6a, 0xffd23a, 0xff8ad8, 0xffffff, 0xb05aff, 0xff7a2a];
    const stemG = this.geo(new CylinderGeometry(0.015, 0.02, 1, 5));
    const soil = this.mesh(this.box, 0x3a2a1a);
    soil.scale.set(2.6, 0.06, 1.4);
    soil.position.set(X0 + 1.1, 0.03, 0.4);
    for (let i = 0; i < 16; i++) {
      const f = new Group();
      const stem = this.mesh(stemG, 0x3a8a2a, 0, f);
      stem.scale.y = 0.34;
      stem.position.y = 0.17;
      const bloom = this.mesh(this.sphere, colors[i % colors.length]!, 1.3, f);
      bloom.scale.setScalar(0.07);
      bloom.position.y = 0.36;
      f.position.set(
        X0 + 0.05 + (i % 8) * 0.3 + this.rand() * 0.08,
        0.05,
        0.05 + Math.floor(i / 8) * 0.6 + this.rand() * 0.1,
      );
      f.scale.setScalar(0.001);
      this.props.add(f);
      const t0 = 1 + i * 0.45;
      this.updaters.push((t) => {
        const k = Math.max(0, Math.min(1, (t - t0) / 0.7));
        f.scale.setScalar(Math.max(0.001, k * (1 + Math.sin(k * Math.PI) * 0.25)));
        f.rotation.z = Math.sin(t * 1.3 + i) * 0.06;
      });
    }
    // robôs libertados indo consertar as casas
    for (const [i, dir] of [
      [0, 1],
      [1, -1],
    ] as const) {
      const f = this.robotFriend(X0 - 3 + i * 6, -1.6 - i * 0.5, 0);
      const board = this.mesh(this.box, 0x8a6a3a, 0, f.v.socket('handR') ?? this.props);
      board.scale.set(0.9, 0.05, 0.16);
      f.pose = (h) => {
        this.bone(h, J.upperArmR, -1.3);
        this.bone(h, J.upperArmL, -1.3);
      };
      this.updaters.push((t) => {
        const x = X0 - 3 + i * 6 + dir * ((t * 0.7) % 6);
        f.e.t.px = f.e.t.x;
        f.e.t.x = x;
        f.e.t.vx = dir * 0.7;
        f.e.fighter!.state = 'walk';
        f.yaw = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      });
    }
    this.fireflies(X0 + 1, 10, 0xfff08a);
    this.lights.push({ x: X0 + 1, y: 2, z: 2, color: 0xffd8a8, intensity: 10 });
  }

  /** Maga: professora da Academia; alunos em volta e luzes roxas subindo no festival. */
  private academy(): void {
    const a = this.hero('mage', X0, 0.3, 0.1);
    a.pose = (h, t) => {
      const up = (Math.sin(t * 1.2) + 1) / 2;
      this.bone(h, J.upperArmL, -2.2 - up * 0.4, 0, 0.5 + up * 0.6);
      this.bone(h, J.upperArmR, -2.2 - up * 0.4, 0, -0.5 - up * 0.6);
      this.bone(h, J.foreArmL, -0.5);
      this.bone(h, J.foreArmR, -0.5);
      this.bone(h, J.neck, -0.25);
    };
    const students = [
      [X0 - 1.5, 1.1, 0.9],
      [X0 + 1.6, 1.0, -0.9],
      [X0 - 0.4, 1.7, 0.2],
    ] as const;
    students.forEach(([x, z, yaw], i) => {
      const s = this.hero('mage', x, z, yaw + Math.PI, 0.62);
      s.pose = (h, t) => {
        // pulam de alegria, um de cada vez
        const hop = Math.max(0, Math.sin(t * 3 + i * 2));
        h.v.group.position.y = hop * 0.18;
        this.bone(h, J.upperArmR, -2.4 * hop, 0, -0.3);
      };
    });
    // luzes roxas subindo e anel no chão
    this.updaters.push((t) => {
      if (Math.floor(t * 9) === Math.floor((t - 1 / 60) * 9)) return;
      const ang = this.rand() * Math.PI * 2;
      const d = 0.5 + this.rand() * 2.5;
      this.spark(
        X0 + Math.cos(ang) * d,
        0.3,
        0.3 + Math.sin(ang) * d * 0.5,
        0,
        1.2 + this.rand(),
        0,
        this.rand() < 0.6 ? 0xb05aff : 0xe0a0ff,
        {
          size: 0.05 + this.rand() * 0.05,
          life: 3.5,
          glow: 4,
        },
      );
    });
    const ring = this.mesh(this.geo(new CylinderGeometry(1.8, 1.8, 0.01, 40, 1, true)), 0xb05aff, 3);
    ring.position.set(X0, 0.02, 0.3);
    this.updaters.push((t) => {
      const k = (t * 0.5) % 1;
      ring.scale.set(0.4 + k, 1, 0.4 + k);
      (ring.material as MeshBasicMaterial).color.setHex(0xb05aff).multiplyScalar(3 * (1 - k));
    });
    this.lights.push({ x: X0, y: 1.6, z: 1.2, color: 0xb05aff, intensity: 16 });
    this.cam = { x: X0 + 0.1, y: -0.8, z: 0.5, zoom: 0.72, push: 0.06 };
  }

  /** Militar: festa no Campo de Guerra, com as granadas virando fogos de artifício. */
  private party(): void {
    const a = this.hero('military', X0, 0.4, 0.15);
    a.pose = (h, t) => {
      // acena com o braço direito
      this.bone(h, J.upperArmR, -2.7, 0, -0.35 + Math.sin(t * 6) * 0.35);
      this.bone(h, J.foreArmR, -0.4);
      this.bone(h, J.neck, -0.35);
    };
    const colors = [0xff4a4a, 0x4ae0ff, 0xffd23a, 0x7aff5a, 0xff7ad8, 0xffffff];
    let next = 0.5;
    let n = 0;
    this.updaters.push((t) => {
      if (t < next) return;
      next = t + 0.9 + this.rand() * 0.5;
      this.firework(X0 - 3 + this.rand() * 6, -2.5 - this.rand() * 2, colors[n++ % colors.length]!);
    });
    // bandeirinhas de festa
    const flags = [0xff4a4a, 0xffd23a, 0x4ae0ff, 0x7aff5a];
    for (let i = 0; i < 18; i++) {
      const f = this.mesh(this.geo(new ConeGeometry(0.12, 0.22, 3)), flags[i % 4]!, 0.9);
      f.rotation.x = Math.PI;
      f.position.set(X0 - 4 + i * 0.47, 3 - Math.sin((i / 17) * Math.PI) * 0.5, -1.6);
      this.updaters.push((t) => (f.rotation.z = Math.sin(t * 2 + i) * 0.2));
    }
    this.lights.push({ x: X0, y: 2, z: 2, color: 0xffd8a8, intensity: 12 });
    this.cam = { x: X0 + 0.2, y: -0.8, z: 0.3, zoom: 0.72, push: 0.06 };
  }

  /** Ciborgue: religa a energia do Centro da Cidade; letreiros de neon acendem um a um. */
  private neonCity(): void {
    const a = this.hero('cyborg', X0 - 0.4, 0.5, 0.5);
    a.pose = (h, t) => {
      const k = Math.min(1, t / 1.5);
      this.bone(h, J.upperArmR, -2.9 * k, 0, -0.1);
      this.bone(h, J.foreArmR, -0.1);
      this.bone(h, J.neck, -0.4 * k);
    };
    const colors = [0xff3a8a, 0x39e6ff, 0xffd23a, 0x7aff5a, 0xb05aff, 0xff7a2a, 0x39e6ff];
    for (let i = 0; i < 7; i++) {
      const sign = this.mesh(this.box, colors[i]!, 3);
      const w = 0.8 + this.rand() * 0.8;
      sign.scale.set(w, 0.22 + this.rand() * 0.2, 0.06);
      sign.position.set(X0 - 3.6 + i * 1.25, 1.8 + (i % 3) * 0.7, -2.6);
      const mat = sign.material as MeshBasicMaterial;
      const base = new Color(colors[i]!);
      const t0 = 1.5 + i * 0.55;
      this.updaters.push((t) => {
        const on = t > t0 ? (t < t0 + 0.4 ? (Math.sin(t * 60) > 0 ? 1 : 0.1) : 1) : 0.05;
        mat.color.copy(base).multiplyScalar(on * 3);
      });
      this.updaters.push((t) => {
        if (t > t0 + 0.4) this.lightsTick(sign.position.x, sign.position.y, -2, colors[i]!, 6);
      });
    }
    // faísca do dedo para o céu quando liga tudo
    this.updaters.push((t) => {
      if (t < 1.3 || t > 1.6) return;
      a.v.socket('handR')?.getWorldPosition(_v);
      this.spark(_v.x, _v.y, _v.z, (this.rand() - 0.5) * 2, 3 + this.rand() * 2, 0, 0xbff4ff, {
        size: 0.04,
        life: 0.6,
        glow: 6,
      });
    });
    const friend = this.robotFriend(X0 + 1.8, 0.9, -0.6);
    friend.pose = (h, t) => this.bone(h, J.upperArmL, -2.6, 0, 0.3 + Math.sin(t * 5) * 0.3);
    this.cam = { x: X0 + 0.3, y: -0.7, z: 0.2, zoom: 0.72, push: 0.06 };
  }

  /** Mutante: guardião da floresta; árvores brotam, vaga-lumes e coelhos por perto. */
  private forest(): void {
    const a = this.hero('mutant', X0, 0.5, 0.4);
    a.pose = (h, t) => {
      // agachado, fazendo carinho num coelho
      this.bone(h, J.thighL, -1.2);
      this.bone(h, J.shinL, 1.9);
      this.bone(h, J.thighR, -0.4);
      this.bone(h, J.shinR, 1.4);
      this.bone(h, J.spine, 0.35);
      this.bone(h, J.upperArmR, -0.9 + Math.sin(t * 3) * 0.15, 0, -0.2);
      this.bone(h, J.foreArmR, -0.2);
      h.v.group.position.y = -0.38;
    };
    const trunkG = this.geo(new CylinderGeometry(0.08, 0.12, 1, 6));
    const leafG = this.geo(new ConeGeometry(0.55, 1.1, 7));
    for (let i = 0; i < 7; i++) {
      const tree = new Group();
      const trunk = this.mesh(trunkG, 0x5a3a1a, 0, tree);
      trunk.position.y = 0.5;
      for (let k = 0; k < 2; k++) {
        const leaf = this.mesh(leafG, k ? 0x3aaa3a : 0x2a8a2a, 0, tree);
        leaf.position.y = 1.1 + k * 0.55;
        leaf.scale.setScalar(1 - k * 0.3);
      }
      const side = i % 2 ? 1 : -1;
      tree.position.set(X0 + side * (1.5 + (i >> 1) * 1.1), 0, -0.6 - (i % 3) * 0.7);
      tree.scale.setScalar(0.001);
      this.props.add(tree);
      const t0 = 0.8 + i * 0.6;
      const size = 0.9 + this.rand() * 0.5;
      this.updaters.push((t) => {
        const k = Math.max(0, Math.min(1, (t - t0) / 1.2));
        const e = 1 - (1 - k) ** 3;
        tree.scale.setScalar(Math.max(0.001, e * size));
        tree.rotation.z = Math.sin(t * 0.8 + i) * 0.03;
      });
    }
    // coelhos
    for (let i = 0; i < 3; i++) {
      const bun = new Group();
      const body = this.mesh(this.sphere, 0xf0f0f0, 0, bun);
      body.scale.set(0.13, 0.11, 0.1);
      body.position.y = 0.11;
      const head = this.mesh(this.sphere, 0xf0f0f0, 0, bun);
      head.scale.setScalar(0.075);
      head.position.set(0.12, 0.2, 0);
      for (const z of [-0.03, 0.03]) {
        const ear = this.mesh(this.box, 0xf0d0d0, 0, bun);
        ear.scale.set(0.025, 0.12, 0.02);
        ear.position.set(0.11, 0.3, z);
      }
      this.props.add(bun);
      const x0 = X0 + 0.5 + i * 0.7;
      const z0 = 0.9 - i * 0.35;
      this.updaters.push((t) => {
        const hop = Math.max(0, Math.sin(t * 5 + i * 2));
        bun.position.set(x0 + Math.sin(t * 0.6 + i) * 0.3, hop * 0.15, z0);
        bun.rotation.y = Math.cos(t * 0.6 + i) > 0 ? Math.PI : 0;
      });
    }
    this.fireflies(X0, 18, 0xd8ff6a);
    this.lights.push({ x: X0, y: 2, z: 2, color: 0xd8ffa8, intensity: 9 });
    this.cam = { x: X0 + 0.6, y: -1.05, z: 0.4, zoom: 0.62, push: 0.05 };
  }

  /**
   * Personagem secreto: um garoto de peruca castanho-escura e lentes verdes treina caratê na vila; num estalo de energia
   * arcana, o disfarce voa longe (loiro, olhos azuis) e ele solta o Tornado Arcano, quebrando as tábuas do dojo.
   */
  private reveal(): void {
    const a = this.hero('prodigy', X0 - 0.8, 0.4, 0.35);
    a.cos?.set({ head: 'wig_black', eyes: 'lens_green' });
    // guarda de caratê enquanto está disfarçado
    a.pose = (h, t) => {
      if (t > 2.4) return;
      this.bone(h, J.upperArmL, -1.2, 0, 0.3);
      this.bone(h, J.foreArmL, -1.7);
      this.bone(h, J.upperArmR, -0.5, 0, -0.2);
      this.bone(h, J.foreArmR, -2.1);
      this.bone(h, J.thighL, -0.3 + Math.sin(t * 3) * 0.05);
      this.bone(h, J.shinL, 0.4);
    };
    // estalo: o disfarce voa e o cabelo loiro aparece
    this.later(2.2, () => {
      a.cos?.set({});
      const head = a.v.socket('head_top');
      head?.getWorldPosition(_v);
      for (let i = 0; i < 40; i++) {
        const ang = (i / 40) * Math.PI * 2;
        this.spark(_v.x, _v.y, _v.z, Math.cos(ang) * 2.6, Math.sin(ang) * 2.6 + 1, 0.3, 0x4ad8ff, {
          size: 0.05,
          life: 0.9,
          g: 2,
          glow: 5,
        });
      }
      // a própria peruca (mesmo penteado do cabelo, em castanho-escuro) sai voando
      const wig = recipeMesh('cos:wig_black', COSMETICS.wig_black!.mesh);
      wig.scale.setScalar(0.78 * 0.94);
      wig.position.copy(_v);
      this.props.add(wig);
      const w0 = _v.clone();
      this.updaters.push((t) => {
        const k = t - 2.2;
        if (k > 2.5) {
          wig.visible = false;
          return;
        }
        wig.position.set(w0.x - k * 1.4, Math.max(0.07, w0.y + k * 4 - k * k * 5), w0.z - k * 0.6);
        wig.rotation.set(k * 5, k * 3, k * 7);
      });
      this.lights.push({ x: _v.x, y: _v.y, z: _v.z + 0.5, color: 0x4ad8ff, intensity: 30 });
    });
    // pilhas de tábuas do dojo: o tornado quebra ao passar
    const boards: { m: Mesh; x: number; broken: number }[] = [];
    for (let i = 0; i < 2; i++) {
      const x = X0 + 1.1 + i * 1.2;
      const stand = this.mesh(this.box, 0x5a3a1a);
      stand.scale.set(0.12, 0.9, 0.5);
      stand.position.set(x, 0.45, 0.4);
      const m = this.mesh(this.box, 0xc89a5a);
      m.scale.set(0.05, 0.5, 0.5);
      m.position.set(x, 1.15, 0.4);
      boards.push({ m, x, broken: -1 });
    }
    let next = 3.2;
    this.updaters.push((t) => {
      if (t >= next) {
        next = t + 5;
        this.play(a, 'tornadoArcano');
      }
      // avança com o tornado e volta devagar ao lugar
      const e = a.e;
      const m = MOVES.tornadoArcano!;
      const st = e.fighter!.state === 'attack' ? e.fighter!.st : -1;
      const x0 = X0 - 0.8;
      if (st >= m.startup && st < m.startup + m.active) e.t.x += 3 * (1 / 60);
      else if (st < 0) e.t.x += (x0 - e.t.x) * 0.02;
      if (st >= m.startup && st < m.startup + m.active && st % 3 === 0)
        this.spark(e.t.x, 0.9 + this.rand() * 0.6, 0.4, (this.rand() - 0.5) * 2, 1, 0.4, 0x4ad8ff, {
          size: 0.04,
          life: 0.6,
          glow: 5,
        });
      for (const b of boards) {
        if (b.broken < 0 && st >= 0 && Math.abs(e.t.x - b.x) < 0.45) {
          b.broken = t;
          this.lights.push({ x: b.x, y: 1.2, z: 0.8, color: 0x4ad8ff, intensity: 24 });
        }
        if (b.broken >= 0) {
          const k = t - b.broken;
          if (k > 2.6) {
            b.broken = -1;
            b.m.position.set(b.x, 1.15, 0.4);
            b.m.rotation.set(0, 0, 0);
          } else {
            b.m.position.set(b.x + k * 1.5, Math.max(0.03, 1.15 + k * 2 - k * k * 4.9), 0.4 + k * 0.4);
            b.m.rotation.set(0, 0, k * 6);
          }
        }
      }
    });
    this.fireflies(X0, 12, 0x9ff0ff);
    this.lights.push({ x: X0, y: 2, z: 2, color: 0xa8e8ff, intensity: 12 });
    this.cam = { x: X0 + 0.2, y: -0.85, z: 0.35, zoom: 0.66, push: 0.05 };
  }

  /** Epílogo: os cinco juntos na vila, cada um soltando o seu especial, com fogos no céu. */
  private epilogue(): void {
    HERO_ORDER.forEach((id, i) => {
      const a = this.hero(id, X0 - 2.3 + i * 1.15, 0.4 - (i % 2) * 0.35, 0.15);
      let next = 1 + i * 1.2;
      this.updaters.push((t) => {
        if (t < next) return;
        next = t + 6;
        this.play(a, getCharacter(id).special);
      });
    });
    const colors = [0xff8c1a, 0xb05aff, 0x7a9a3a, 0xff3a4a, 0x5aff5a];
    let next = 0.6;
    let n = 0;
    this.updaters.push((t) => {
      if (t < next) return;
      next = t + 0.8 + this.rand() * 0.4;
      this.firework(X0 - 4 + this.rand() * 8, -3 - this.rand() * 2, colors[n++ % colors.length]!);
    });
    this.lights.push({ x: X0, y: 2.5, z: 2.5, color: 0xffd8a8, intensity: 14 });
    this.cam = { x: X0, y: -0.9, z: 0.2, zoom: 0.9, push: 0.05 };
  }

  private fireflies(cx: number, n: number, color: number): void {
    const flies: Mesh[] = [];
    for (let i = 0; i < n; i++) {
      const m = this.mesh(this.sphere, color, 5);
      m.scale.setScalar(0.03);
      flies.push(m);
    }
    const seeds = flies.map(() => [
      this.rand() * 6 - 3,
      this.rand() * 2 + 0.4,
      this.rand() * 3 - 2,
      this.rand() * 6,
    ]);
    this.updaters.push((t) =>
      flies.forEach((m, i) => {
        const [x, y, z, p] = seeds[i]!;
        m.position.set(
          cx + x! + Math.sin(t * 0.7 + p!) * 0.4,
          y! + Math.sin(t * 1.3 + p!) * 0.25,
          z! + Math.cos(t * 0.5 + p!) * 0.3,
        );
        m.visible = Math.sin(t * 2 + p! * 3) > -0.6;
      }),
    );
  }

  private lightsTick(x: number, y: number, z: number, color: number, intensity: number): void {
    this.lighting.request({ x, y, z, color, intensity, distance: 5, priority: 2 });
  }

  // ------------------------------------------------------------------ quadro
  frame(dt: number): void {
    this.t += dt;
    const t = this.t;
    for (const f of this.updaters) f(t, dt);
    for (let i = this.timers.length - 1; i >= 0; i--)
      if (this.timers[i]!.at <= t) this.timers.splice(i, 1)[0]!.fn();
    this.blobs.begin();
    for (const a of this.actors) {
      const e = a.e;
      if (a.move) a.moveT = advance(e, a.moveT, dt);
      if (!e.fighter!.moveId) a.move = null;
      a.v.sync(e, 1, dt, null);
      a.v.yaw.rotation.y = a.yaw;
      a.pose?.(a, t);
      a.cos?.update(dt, 0.2, 0, 1);
      this.blobs.add(e.t.x, e.t.z, 0.4, 0);
      if (e.fighter!.state === 'walk') e.fighter!.state = 'idle';
    }
    this.blobs.end();
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]!;
      s.life -= dt;
      if (s.life <= 0) {
        s.m.parent?.remove(s.m);
        (s.m.material as Material).dispose();
        this.mats.delete(s.m.material as Material);
        this.sparks.splice(i, 1);
        continue;
      }
      s.vy -= s.g * dt;
      s.m.position.x += s.vx * dt;
      s.m.position.y += s.vy * dt;
      s.m.position.z += s.vz * dt;
      const k = s.life / s.max;
      s.m.scale.setScalar(Math.max(0.005, s.m.scale.x * (k > 0.3 ? 1 : 0.97)));
    }
    // luzes dos fogos se apagam aos poucos
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const l = this.lights[i]!;
      this.lighting.request({
        x: l.x,
        y: l.y,
        z: l.z,
        color: l.color,
        intensity: l.intensity,
        distance: 9,
        priority: 3,
      });
      if (l.intensity > 20) {
        l.intensity *= 1 - dt * 2.5;
        if (l.intensity < 21) this.lights.splice(i, 1);
      }
    }
    // câmera: aproxima devagar
    const c = this.cam;
    const cam = this.r.cam;
    cam.zoom = c.zoom - Math.min(1, t / 14) * c.push;
    cam.update(c.x, c.y, c.z, Math.max(dt, 1e-4));
    this.lighting.update(cam.x, 0, dt);
    this.env.update(cam.x, t);
  }

  dispose(): void {
    this.r.cam.zoom = 1;
    for (const a of this.actors) {
      a.cos?.dispose();
      this.r.scene.remove(a.v.group);
      a.v.dispose();
    }
    this.r.scene.remove(this.props);
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
    this.blobs.dispose(this.r.scene);
    this.lighting.dispose();
    this.env.dispose();
  }
}

/** Avança o golpe em exibição (60 quadros por segundo); devolve o novo tempo. */
function advance(e: Entity, moveT: number, dt: number): number {
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
