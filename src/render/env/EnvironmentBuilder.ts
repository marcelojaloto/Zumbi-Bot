import {
  FogExp2,
  Group,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  type Material,
  type Scene,
  MeshBasicMaterial,
} from 'three';
import { Rng, hashString } from '../../core/rng';
import type { LevelDef, MapDef } from '../../data/types';
import { merge } from '../geom';
import type { LightRequest } from '../Lighting';
import type { QualityPreset } from '../quality';
import { Pieces, type EnvCtx } from './builder';
import { buildEnvParticles } from './envParticles';
import { buildSky } from './skybox';
import { groundTexture, wallTexture } from './textures';
import { THEMES } from './themes';

export interface BuiltEnv {
  group: Group;
  sky: Group;
  lights: LightRequest[];
  update(camX: number, t: number): void;
  dispose(): void;
}

/** Monta o cenário de um nível: céu, chão, paredes, props do tema mesclados por bloco, partículas e névoa. */
export function buildEnvironment(scene: Scene, map: MapDef, level: LevelDef, q: QualityPreset): BuiltEnv {
  const env = map.env;
  const group = new Group();
  group.name = 'env';
  const materials: Material[] = [];
  const geos: { dispose(): void }[] = [];

  scene.fog = new FogExp2(env.fog.color, env.fog.density);
  scene.background = null;

  const sky = buildSky(env);
  scene.add(sky);

  const x0 = -30;
  const x1 = level.length + 30;
  const std = q.standardMaterials;

  // chão
  const gw = x1 - x0;
  const gd = 60;
  const groundGeo = new PlaneGeometry(gw, gd, 1, 1);
  geos.push(groundGeo);
  const tex = groundTexture(env.ground.pattern, env.ground.color, env.ground.color2, q.textureSize).clone();
  tex.needsUpdate = true;
  tex.repeat.set(gw / 4, gd / 4);
  const groundMat = std
    ? new MeshStandardMaterial({
        map: tex,
        roughness: 0.92,
        metalness: env.ground.pattern === 'metal' ? 0.12 : 0.02,
      })
    : new MeshLambertMaterial({ map: tex });
  materials.push(groundMat);
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((x0 + x1) / 2, 0, -gd / 2 + 16);
  ground.receiveShadow = true;
  group.add(ground);

  // tema
  const rng = new Rng(hashString(level.id));
  const pieces = new Pieces();
  const lights: LightRequest[] = [];
  const ctx: EnvCtx = {
    map,
    level,
    env,
    rng,
    q,
    p: pieces,
    x0,
    x1,
    zBand: level.zBand,
    lights,
    light(x, y, z, color, intensity, distance, flicker) {
      lights.push({ x, y, z, color, intensity, distance, priority: 1, flicker });
    },
    dense(n) {
      return Math.max(1, Math.round(n * q.propDensity));
    },
  };
  const theme = THEMES[env.theme] ?? THEMES.sandbox!;
  theme(ctx);

  // parede de fundo (interiores)
  if (ctx.wall) {
    const w = ctx.wall;
    const wallGeo = new PlaneGeometry(gw, w.h);
    geos.push(wallGeo);
    const wt = wallTexture(w.kind, w.c1, w.c2, q.textureSize).clone();
    wt.needsUpdate = true;
    wt.repeat.set(gw / 4, w.h / 4);
    const wm = std
      ? new MeshStandardMaterial({ map: wt, roughness: 0.9 })
      : new MeshLambertMaterial({ map: wt });
    materials.push(wm);
    const wall = new Mesh(wallGeo, wm);
    wall.position.set((x0 + x1) / 2, w.h / 2, w.z);
    wall.receiveShadow = true;
    group.add(wall);
  }

  // mescla por bloco
  const litMat = std
    ? new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0.08 })
    : new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const glowMat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  materials.push(litMat, glowMat);
  const addMerged = (
    m: Map<number, import('three').BufferGeometry[]>,
    mat: Material,
    shadow: boolean,
    receive: boolean,
  ) => {
    for (const list of m.values()) {
      const g = merge(list);
      if (!g) continue;
      geos.push(g);
      const mesh = new Mesh(g, mat);
      mesh.castShadow = shadow && q.shadows;
      mesh.receiveShadow = receive;
      group.add(mesh);
    }
  };
  addMerged(pieces.lit, litMat, true, true);
  addMerged(pieces.flat, litMat, false, true);
  addMerged(pieces.glow, glowMat, false, false);

  scene.add(group);

  const parts = buildEnvParticles(env.particles, env.particleDensity * q.envParticles);
  if (parts) scene.add(parts.points);

  return {
    group,
    sky,
    lights,
    update(camX: number, t: number) {
      sky.position.x = camX;
      parts?.update(camX, t);
    },
    dispose() {
      scene.remove(group);
      scene.remove(sky);
      if (parts) {
        scene.remove(parts.points);
        parts.points.geometry.dispose();
        (parts.points.material as Material).dispose();
      }
      sky.traverse((o) => {
        const m = o as Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (m.material as Material).dispose();
      });
      for (const g of geos) g.dispose();
      for (const m of materials) m.dispose();
      tex.dispose();
      scene.fog = null;
    },
  };
}
