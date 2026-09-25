import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { COSMETICS } from '../../data/cosmetics';
import type { CosmeticDef, CosmeticId, CosmeticSlot } from '../../data/types';
import { recipeMesh } from '../meshCache';
import type { CharacterView } from './CharacterView';

const SOCKET: Record<CosmeticSlot, string> = {
  head: 'head_top',
  eyes: 'face',
  mask: 'mouth',
  body: 'torso',
  back: 'back',
};

interface CapeState {
  root: Group;
  joints: Object3D[];
  angle: number[];
  vel: number[];
  geo: BoxGeometry;
  mats: MeshStandardMaterial[];
}

/** Capa em corrente de segmentos com mola amortecida, reagindo à velocidade do personagem. */
function buildCape(def: NonNullable<CosmeticDef['cape']>): CapeState {
  const root = new Group();
  const segLen = def.length / def.segments;
  const geo = new BoxGeometry(def.width, segLen, 0.03);
  geo.translate(0, -segLen / 2, 0);
  const outer = new MeshStandardMaterial({ color: def.color, roughness: 0.8, flatShading: true });
  const inner = new MeshStandardMaterial({
    color: def.color2 ?? def.color,
    roughness: 0.8,
    flatShading: true,
  });
  const joints: Object3D[] = [];
  let parent: Object3D = root;
  for (let i = 0; i < def.segments; i++) {
    const j = new Object3D();
    if (i > 0) j.position.y = -segLen;
    const m = new Mesh(geo, i % 2 === 0 ? outer : inner);
    m.castShadow = true;
    // alarga levemente para baixo
    m.scale.x = 1 + i * 0.08;
    j.add(m);
    parent.add(j);
    joints.push(j);
    parent = j;
  }
  root.rotation.x = 0.12;
  return { root, joints, angle: joints.map(() => 0.05), vel: joints.map(() => 0), geo, mats: [outer, inner] };
}

/** Cosméticos equipados no rig do robô (chapéus, óculos, máscaras, roupas e capas). */
export class CosmeticRig {
  private current: Partial<Record<CosmeticSlot, CosmeticId>> = {};
  private objs: Partial<Record<CosmeticSlot, Object3D>> = {};
  private cape: CapeState | null = null;
  private t = 0;

  constructor(private view: CharacterView) {}

  set(equipped: Partial<Record<CosmeticSlot, CosmeticId>>): void {
    for (const slot of Object.keys(SOCKET) as CosmeticSlot[]) {
      const want = equipped[slot];
      if (this.current[slot] === want) continue;
      this.clearSlot(slot);
      this.current[slot] = want;
      const def = want ? COSMETICS[want] : undefined;
      if (!def) continue;
      const socket = this.view.socket(SOCKET[slot]);
      if (!socket) continue;
      if (def.cape) {
        this.cape = buildCape(def.cape);
        socket.add(this.cape.root);
        this.objs[slot] = this.cape.root;
        if (def.mesh.parts.length) this.cape.root.add(recipeMesh(`cos:${def.id}`, def.mesh));
      } else {
        const o = recipeMesh(`cos:${def.id}`, def.mesh);
        socket.add(o);
        this.objs[slot] = o;
      }
    }
  }

  private clearSlot(slot: CosmeticSlot): void {
    const o = this.objs[slot];
    if (o) o.parent?.remove(o);
    delete this.objs[slot];
    if (slot === 'back' && this.cape) {
      this.cape.geo.dispose();
      for (const m of this.cape.mats) m.dispose();
      this.cape = null;
    }
  }

  /** Física da capa: velocidade para frente levanta a capa para trás; queda levanta tudo. */
  update(dt: number, vx: number, vy: number, facing: number): void {
    const c = this.cape;
    if (!c || dt <= 0) return;
    this.t += dt;
    const fwd = Math.abs(vx);
    const target =
      0.08 +
      Math.min(1.1, fwd * 0.14) +
      Math.max(0, -vy) * 0.06 +
      Math.sin(this.t * 5) * 0.03 * Math.min(1, fwd);
    void facing;
    const k = 60;
    const d = 9;
    for (let i = 0; i < c.joints.length; i++) {
      const tgt = i === 0 ? target : target * 0.35 + (i % 2 ? 0.05 : -0.02);
      const acc = (tgt - c.angle[i]!) * k - c.vel[i]! * d;
      c.vel[i]! += acc * dt;
      c.angle[i]! += c.vel[i]! * dt;
      c.joints[i]!.rotation.x = c.angle[i]!;
    }
  }

  dispose(): void {
    for (const s of Object.keys(this.objs) as CosmeticSlot[]) this.clearSlot(s);
  }
}
