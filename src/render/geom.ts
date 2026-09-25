import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  TetrahedronGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MeshPart, MeshRecipe } from '../data/types';

export type Shape = MeshPart['shape'];

/** Primitiva low-poly (não indexada, para sombreamento facetado e cor por triângulo). */
export function primitive(shape: Shape, s: number[]): BufferGeometry {
  let g: BufferGeometry;
  switch (shape) {
    case 'box':
      g = new BoxGeometry(s[0] ?? 1, s[1] ?? 1, s[2] ?? 1);
      break;
    case 'cyl':
      g = new CylinderGeometry(s[0] ?? 0.5, s[1] ?? 0.5, s[2] ?? 1, s[3] ?? 7);
      break;
    case 'cone':
      g = new ConeGeometry(s[0] ?? 0.5, s[1] ?? 1, s[2] ?? 6);
      break;
    case 'sphere':
      g = new SphereGeometry(s[0] ?? 0.5, s[1] ?? 7, s[2] ?? 5);
      break;
    case 'ico':
      g = new IcosahedronGeometry(s[0] ?? 0.5, s[1] ?? 0);
      break;
    case 'oct':
      g = new OctahedronGeometry(s[0] ?? 0.5, s[1] ?? 0);
      break;
    case 'tet':
      g = new TetrahedronGeometry(s[0] ?? 0.5, s[1] ?? 0);
      break;
    case 'torus':
      g = new TorusGeometry(s[0] ?? 0.5, s[1] ?? 0.1, s[2] ?? 5, s[3] ?? 10);
      break;
    case 'capsule':
      g = new CapsuleGeometry(s[0] ?? 0.2, s[1] ?? 0.5, 2, 6);
      break;
  }
  const ni = g.index ? g.toNonIndexed() : g;
  if (ni !== g) g.dispose();
  ni.deleteAttribute('uv');
  return ni;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _s = new Vector3(1, 1, 1);
const _p = new Vector3();
const _c = new Color();

/** Posiciona uma geometria (rotação + translação). */
export function place(
  g: BufferGeometry,
  pos?: [number, number, number],
  rot?: [number, number, number],
  scale?: number,
): BufferGeometry {
  _e.set(rot?.[0] ?? 0, rot?.[1] ?? 0, rot?.[2] ?? 0);
  _q.setFromEuler(_e);
  _p.set(pos?.[0] ?? 0, pos?.[1] ?? 0, pos?.[2] ?? 0);
  _s.setScalar(scale ?? 1);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  return g;
}

/**
 * Pinta a geometria com uma cor por triângulo, com leve variação aleatória (visual low-poly).
 * `intensity` > 1 gera cores HDR para brilho no bloom.
 */
export function paint(
  g: BufferGeometry,
  color: number,
  jitter = 0.06,
  intensity = 1,
  seed = 1,
): BufferGeometry {
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  _c.setHex(color);
  let s = seed * 9301 + 49297;
  for (let i = 0; i < n; i += 3) {
    s = (s * 9301 + 49297) % 233280;
    const j = 1 + (s / 233280 - 0.5) * 2 * jitter;
    for (let k = 0; k < 3 && i + k < n; k++) {
      arr[(i + k) * 3] = _c.r * j * intensity;
      arr[(i + k) * 3 + 1] = _c.g * j * intensity;
      arr[(i + k) * 3 + 2] = _c.b * j * intensity;
    }
  }
  g.setAttribute('color', new BufferAttribute(arr, 3));
  return g;
}

export function merge(list: BufferGeometry[]): BufferGeometry | null {
  if (list.length === 0) return null;
  const m = mergeGeometries(list, false);
  for (const g of list) g.dispose();
  return m;
}

export interface RecipeGeometry {
  lit: BufferGeometry | null;
  glow: BufferGeometry | null;
}

/** Converte uma receita de malha (armas, cosméticos, itens) em geometria colorida (normal + brilho). */
export function recipeGeometry(r: MeshRecipe, scale = 1): RecipeGeometry {
  const lit: BufferGeometry[] = [];
  const glow: BufferGeometry[] = [];
  let seed = 1;
  for (const p of r.parts) {
    const g = place(primitive(p.shape, p.size), p.pos, p.rot);
    if (scale !== 1) g.scale(scale, scale, scale);
    if (p.glow) glow.push(paint(g, p.color, 0, p.glowIntensity ?? 2.5));
    else lit.push(paint(g, p.color, 0.05, 1, seed++));
  }
  return { lit: merge(lit), glow: merge(glow) };
}
