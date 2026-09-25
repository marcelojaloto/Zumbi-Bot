import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  Points,
  ShaderMaterial,
} from 'three';
import { Rng } from '../../core/rng';
import type { EnvParticles } from '../../data/types';

interface Cfg {
  color: number;
  size: number;
  vel: [number, number, number];
  sway: number;
  additive: boolean;
  alpha: number;
  count: number;
  streak?: boolean;
}

const CFG: Record<Exclude<EnvParticles, 'none'>, Cfg> = {
  ash: {
    color: 0xb8b0a8,
    size: 5,
    vel: [0.3, -0.5, 0.1],
    sway: 0.6,
    additive: false,
    alpha: 0.6,
    count: 500,
  },
  embers: { color: 0xff7a2a, size: 6, vel: [0.4, 1.2, 0], sway: 0.9, additive: true, alpha: 1, count: 500 },
  spores: {
    color: 0xb8ff5a,
    size: 6,
    vel: [0.1, 0.25, 0],
    sway: 0.8,
    additive: true,
    alpha: 0.8,
    count: 400,
  },
  rain: {
    color: 0x9fb4d8,
    size: 3,
    vel: [1.5, -16, 0],
    sway: 0,
    additive: false,
    alpha: 0.5,
    count: 1400,
    streak: true,
  },
  fireflies: {
    color: 0xe8ff7a,
    size: 9,
    vel: [0.1, 0.1, 0],
    sway: 1.4,
    additive: true,
    alpha: 1,
    count: 200,
  },
  dust: {
    color: 0xd8c8a8,
    size: 4,
    vel: [0.2, -0.05, 0],
    sway: 0.5,
    additive: false,
    alpha: 0.35,
    count: 400,
  },
  sparks: { color: 0xffd05a, size: 4, vel: [0.3, -2.5, 0], sway: 0.3, additive: true, alpha: 1, count: 300 },
  snow: { color: 0xffffff, size: 5, vel: [0.3, -1.2, 0], sway: 0.8, additive: false, alpha: 0.8, count: 700 },
};

const BOX = { w: 36, h: 12, d: 18 };

/** Partículas de ambiente animadas inteiramente na GPU (sem custo de CPU). */
export function buildEnvParticles(
  kind: EnvParticles,
  density: number,
): { points: Points; update(camX: number, t: number): void } | null {
  if (kind === 'none' || density <= 0) return null;
  const c = CFG[kind];
  const n = Math.max(20, Math.round(c.count * density));
  const rng = new Rng(n);
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = rng.next() * BOX.w;
    pos[i * 3 + 1] = rng.next() * BOX.h;
    pos[i * 3 + 2] = rng.next() * BOX.d;
    seed[i] = rng.next();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('seed', new BufferAttribute(seed, 1));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: c.additive ? AdditiveBlending : NormalBlending,
    uniforms: {
      time: { value: 0 },
      camX: { value: 0 },
      color: { value: new Color(c.color).multiplyScalar(c.additive ? 2.2 : 1) },
      vel: { value: c.vel },
      sway: { value: c.sway },
      size: { value: c.size },
      alpha: { value: c.alpha },
      box: { value: [BOX.w, BOX.h, BOX.d] },
      streak: { value: c.streak ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      uniform float time; uniform float camX; uniform vec3 vel; uniform float sway; uniform float size; uniform vec3 box;
      attribute float seed;
      varying float vA;
      void main() {
        vec3 p = position + vel * time * (0.7 + seed * 0.6);
        p.x += sin(time * (0.5 + seed) + seed * 40.0) * sway;
        p.z += cos(time * (0.4 + seed) + seed * 17.0) * sway * 0.5;
        float left = camX - box.x * 0.5;
        float lx = mod(p.x - left, box.x);
        p.y = mod(p.y, box.y);
        p.z = mod(p.z, box.z);
        vec3 w = vec3(left + lx, p.y - 0.5, p.z - box.z * 0.75);
        vec4 mv = modelViewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * (0.6 + seed * 0.8) * (14.0 / -mv.z);
        float edge = min(min(lx, box.x - lx), min(p.y, box.y - p.y));
        vA = clamp(edge, 0.0, 1.0) * (0.5 + 0.5 * sin(time * 2.0 + seed * 20.0) * 0.5 + 0.25);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color; uniform float alpha; uniform float streak;
      varying float vA;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        if (streak > 0.5) d.x *= 6.0; else d *= 1.0;
        float a = smoothstep(0.5, 0.0, length(d));
        gl_FragColor = vec4(color, a * alpha * vA);
      }`,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  return {
    points,
    update(camX: number, t: number) {
      mat.uniforms.time!.value = t;
      mat.uniforms.camX!.value = camX;
    },
  };
}
