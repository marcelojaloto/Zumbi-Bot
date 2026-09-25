import {
  BufferGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  type Material,
} from 'three';
import type { MeshRecipe } from '../data/types';
import { recipeGeometry } from './geom';

interface Entry {
  lit: BufferGeometry | null;
  glow: BufferGeometry | null;
}

const geoCache = new Map<string, Entry>();
let litMat: Material | null = null;
let glowMat: MeshBasicMaterial | null = null;
let standard = true;

export function setMeshQuality(std: boolean): void {
  if (std !== standard) {
    litMat?.dispose();
    litMat = null;
  }
  standard = std;
}

export function sharedLitMaterial(): Material {
  litMat ??= standard
    ? new MeshStandardMaterial({ vertexColors: true, flatShading: true, metalness: 0.35, roughness: 0.6 })
    : new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  return litMat;
}

export function sharedGlowMaterial(): MeshBasicMaterial {
  glowMat ??= new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  return glowMat;
}

/** Instancia uma receita de malha (geometria em cache, materiais compartilhados). */
export function recipeMesh(
  key: string,
  recipe: MeshRecipe,
  opts: { shadow?: boolean; scale?: number } = {},
): Group {
  const ck = `${key}@${opts.scale ?? 1}`;
  let e = geoCache.get(ck);
  if (!e) {
    e = recipeGeometry(recipe, opts.scale ?? 1);
    geoCache.set(ck, e);
  }
  const g = new Group();
  g.name = key;
  if (e.lit) {
    const m = new Mesh(e.lit, sharedLitMaterial());
    m.castShadow = opts.shadow ?? true;
    g.add(m);
  }
  if (e.glow) g.add(new Mesh(e.glow, sharedGlowMaterial()));
  return g;
}

export function clearMeshCache(): void {
  for (const e of geoCache.values()) {
    e.lit?.dispose();
    e.glow?.dispose();
  }
  geoCache.clear();
}
