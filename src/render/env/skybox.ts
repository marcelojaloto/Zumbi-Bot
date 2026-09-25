import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { Rng } from '../../core/rng';
import type { EnvironmentDef } from '../../data/types';
import { radialTexture } from './textures';

/** Céu em gradiente + estrelas + lua. Acompanha a câmera em X (fica "no infinito"). */
export function buildSky(env: EnvironmentDef): Group {
  const g = new Group();
  const mat = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new Color(env.sky.top) },
      bottom: { value: new Color(env.sky.bottom) },
      fogc: { value: new Color(env.fog.color) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 bottom; uniform vec3 fogc;
      varying vec3 vPos;
      void main() {
        float h = normalize(vPos).y;
        vec3 c = mix(bottom, top, smoothstep(-0.05, 0.6, h));
        c = mix(c, fogc, smoothstep(0.25, -0.02, h) * 0.85);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new Mesh(new SphereGeometry(300, 24, 12), mat);
  dome.renderOrder = -10;
  g.add(dome);

  if (env.sky.stars) {
    const rng = new Rng(77);
    const n = env.sky.stars;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const h = rng.range(0.08, 1);
      const r = 280;
      pos[i * 3] = Math.cos(a) * Math.sqrt(1 - h * h) * r;
      pos[i * 3 + 1] = h * r;
      pos[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - h * h) * r;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    const stars = new Points(
      geo,
      new PointsMaterial({
        color: 0xcfd8ff,
        size: 1.6,
        sizeAttenuation: false,
        fog: false,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    g.add(stars);
  }
  if (env.sky.moon) {
    const moonC = new Color(env.sky.moonColor ?? 0xdfe6ff).multiplyScalar(2.2);
    const moon = new Mesh(
      new PlaneGeometry(26, 26),
      new MeshBasicMaterial({
        color: moonC,
        map: radialTexture('spark', 128),
        transparent: true,
        fog: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    moon.position.set(60, 120, -240);
    moon.lookAt(0, 0, 0);
    const halo = new Mesh(
      new PlaneGeometry(110, 110),
      new MeshBasicMaterial({
        color: new Color(env.sky.moonColor ?? 0xdfe6ff).multiplyScalar(0.35),
        map: radialTexture('glow', 128),
        transparent: true,
        fog: false,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    halo.position.copy(moon.position).multiplyScalar(1.01);
    halo.lookAt(0, 0, 0);
    g.add(halo, moon);
  }
  return g;
}
