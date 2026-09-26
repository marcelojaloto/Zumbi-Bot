import {
  Bone,
  BufferGeometry,
  Float32BufferAttribute,
  Material,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Object3D,
  Skeleton,
  SkinnedMesh,
  Uint16BufferAttribute,
} from 'three';
import type { MeshPart } from '../../data/types';
import { merge, paint, place, primitive } from '../geom';
import { bindPositions, type JointDef } from './skeleton';

export interface PartSpec {
  /** Índice da junta. */
  j: number;
  shape: MeshPart['shape'];
  size: number[];
  /** Deslocamento relativo à posição de ligação da junta (espaço do modelo). */
  at: [number, number, number];
  rot?: [number, number, number];
  color: number;
  glow?: boolean;
  glowI?: number;
  jitter?: number;
}

export interface SocketSpec {
  j: number;
  at: [number, number, number];
  rot?: [number, number, number];
  /** Escala do que for preso aqui (cosméticos em corpos de tamanhos diferentes). */
  scale?: number;
}

export interface RigSpec {
  key: string;
  joints: JointDef[];
  parts: PartSpec[];
  sockets: Record<string, SocketSpec>;
  /** Altura aproximada (para barras de vida, etc.). */
  height: number;
  metal: number;
  rough: number;
}

export interface BuiltRig {
  spec: RigSpec;
  lit: BufferGeometry;
  glow: BufferGeometry | null;
  bind: [number, number, number][];
}

const cache = new Map<string, BuiltRig>();

function skin(g: BufferGeometry, joint: number): BufferGeometry {
  const n = g.getAttribute('position').count;
  const idx = new Uint16Array(n * 4);
  const w = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    idx[i * 4] = joint;
    w[i * 4] = 1;
  }
  g.setAttribute('skinIndex', new Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new Float32BufferAttribute(w, 4));
  return g;
}

/** Constrói (e guarda em cache) a geometria mesclada de um rig. */
export function buildRig(spec: RigSpec): BuiltRig {
  const hit = cache.get(spec.key);
  if (hit) return hit;
  const bind = bindPositions(spec.joints);
  const lit: BufferGeometry[] = [];
  const glow: BufferGeometry[] = [];
  let seed = 3;
  for (const p of spec.parts) {
    const b = bind[p.j]!;
    const g = place(primitive(p.shape, p.size), [b[0] + p.at[0], b[1] + p.at[1], b[2] + p.at[2]], p.rot);
    if (p.glow) glow.push(skin(paint(g, p.color, 0, p.glowI ?? 3), p.j));
    else lit.push(skin(paint(g, p.color, p.jitter ?? 0.07, 1, seed++), p.j));
  }
  const built: BuiltRig = { spec, lit: merge(lit)!, glow: merge(glow), bind };
  cache.set(spec.key, built);
  return built;
}

export function clearRigCache(): void {
  for (const b of cache.values()) {
    b.lit.dispose();
    b.glow?.dispose();
  }
  cache.clear();
}

export interface RigInstance {
  root: Object3D;
  bones: Bone[];
  skeleton: Skeleton;
  lit: SkinnedMesh;
  glow: SkinnedMesh | null;
  material: MeshStandardMaterial | MeshLambertMaterial;
  sockets: Record<string, Object3D>;
  built: BuiltRig;
}

let glowMat: MeshBasicMaterial | null = null;
function glowMaterial(): MeshBasicMaterial {
  glowMat ??= new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: true });
  return glowMat;
}

export function makeCharMaterial(
  standard: boolean,
  metal: number,
  rough: number,
): MeshStandardMaterial | MeshLambertMaterial {
  return standard
    ? new MeshStandardMaterial({ vertexColors: true, flatShading: true, metalness: metal, roughness: rough })
    : new MeshLambertMaterial({ vertexColors: true, flatShading: true });
}

/** Cria uma instância animável (ossos próprios, geometria compartilhada). */
export function instantiate(built: BuiltRig, standard: boolean): RigInstance {
  const spec = built.spec;
  const bones: Bone[] = spec.joints.map((j) => {
    const b = new Bone();
    b.name = j.name;
    b.position.set(...j.offset);
    return b;
  });
  spec.joints.forEach((j, i) => {
    if (j.parent >= 0) bones[j.parent]!.add(bones[i]!);
  });
  const skeleton = new Skeleton(bones);
  const material = makeCharMaterial(standard, spec.metal, spec.rough);
  const root = new Object3D();
  const lit = new SkinnedMesh(built.lit, material);
  lit.add(bones[0]!);
  lit.bind(skeleton);
  lit.castShadow = true;
  lit.receiveShadow = false;
  lit.frustumCulled = false;
  root.add(lit);
  let glow: SkinnedMesh | null = null;
  if (built.glow) {
    glow = new SkinnedMesh(built.glow, glowMaterial());
    glow.bind(skeleton, lit.bindMatrix);
    glow.frustumCulled = false;
    root.add(glow);
  }
  const sockets: Record<string, Object3D> = {};
  for (const [name, s] of Object.entries(spec.sockets)) {
    const o = new Object3D();
    o.name = name;
    o.position.set(...s.at);
    if (s.rot) o.rotation.set(...s.rot);
    if (s.scale) o.scale.setScalar(s.scale);
    bones[s.j]!.add(o);
    sockets[name] = o;
  }
  return { root, bones, skeleton, lit, glow, material, sockets, built };
}

export function disposeInstance(r: RigInstance): void {
  (r.material as Material).dispose();
  r.skeleton.dispose();
}
