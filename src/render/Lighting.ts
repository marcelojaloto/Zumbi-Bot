import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Object3D,
  PCFShadowMap,
  PointLight,
  type Scene,
  type WebGLRenderer,
} from 'three';
import type { EnvironmentDef } from '../data/types';
import type { QualityPreset } from './quality';

export interface LightRequest {
  x: number;
  y: number;
  z: number;
  color: number;
  intensity: number;
  distance: number;
  /** 3 = clarão/explosão, 2 = magia, 1 = cenário. */
  priority: number;
  flicker?: number;
}

/**
 * Luz direcional (lua/sol) com sombra que segue a câmera + hemisférica + um pool FIXO de PointLights
 * (a contagem nunca muda, para não recompilar shaders). A cada frame as N luzes mais importantes
 * são atribuídas.
 */
export class Lighting {
  readonly sun: DirectionalLight;
  readonly hemi: HemisphereLight;
  /** Luz de preenchimento vinda da câmera (legibilidade dos personagens). */
  readonly fill: DirectionalLight;
  readonly target = new Object3D();
  private pool: PointLight[] = [];
  private requests: LightRequest[] = [];
  private staticLights: LightRequest[] = [];
  private shadowFrame = 0;
  private dir: [number, number, number] = [-0.45, 1, 0.55];
  private time = 0;

  constructor(
    private scene: Scene,
    private renderer: WebGLRenderer,
    private q: QualityPreset,
  ) {
    this.hemi = new HemisphereLight(0x8fa6ff, 0x1a1410, 0.55);
    this.sun = new DirectionalLight(0x9fb4ff, 1.3);
    this.sun.target = this.target;
    this.fill = new DirectionalLight(0xffe8d0, 0.8);
    this.fill.target = this.target;
    scene.add(this.hemi, this.sun, this.target, this.fill);
    this.configureShadows(q);
    for (let i = 0; i < q.pointLights; i++) {
      const l = new PointLight(0xffffff, 0, 8, 2);
      l.castShadow = false;
      this.pool.push(l);
      scene.add(l);
    }
  }

  private configureShadows(q: QualityPreset): void {
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.sun.castShadow = q.shadows;
    if (q.shadows) {
      const s = this.sun.shadow;
      s.mapSize.set(q.shadowMapSize, q.shadowMapSize);
      s.camera.left = -18;
      s.camera.right = 18;
      s.camera.top = 12;
      s.camera.bottom = -8;
      s.camera.near = 1;
      s.camera.far = 60;
      s.bias = -0.0006;
      s.normalBias = 0.03;
      s.radius = q.softShadows ? 3 : 1;
      s.camera.updateProjectionMatrix();
    }
    this.renderer.shadowMap.autoUpdate = !q.shadowEveryOther;
  }

  applyEnv(env: EnvironmentDef): void {
    this.hemi.color.setHex(env.hemi.sky);
    this.hemi.groundColor.setHex(env.hemi.ground);
    this.hemi.intensity = env.hemi.intensity;
    this.sun.color.setHex(env.sun.color);
    this.sun.intensity = env.sun.intensity;
    this.dir = env.sun.dir;
  }

  /** Luzes fixas do cenário (lanternas, tochas, neon). */
  setStaticLights(list: LightRequest[]): void {
    this.staticLights = list;
  }

  request(r: LightRequest): void {
    this.requests.push(r);
  }

  /** Atualiza posição da sombra e atribui o pool de luzes pontuais. */
  update(camX: number, camZ: number, dt: number): void {
    this.time += dt;
    // sombra segue a câmera, alinhada a texels para evitar tremulação
    const snap = this.q.shadowMapSize > 0 ? 36 / this.q.shadowMapSize : 0.05;
    const cx = Math.round(camX / snap) * snap;
    const d = this.dir;
    this.target.position.set(cx, 0, camZ - 1);
    this.sun.position.set(cx + d[0] * 25, d[1] * 25, camZ - 1 + d[2] * 25);
    this.fill.position.set(cx - 3, 6, camZ + 14);
    if (this.q.shadows && this.q.shadowEveryOther) {
      this.shadowFrame++;
      // nos primeiros quadros o mapa precisa existir (evita amostrar textura inválida)
      this.renderer.shadowMap.needsUpdate = this.shadowFrame < 4 || this.shadowFrame % 2 === 0;
    }

    // candidatos: pedidos do frame + luzes estáticas próximas
    const cands: LightRequest[] = this.requests;
    for (const s of this.staticLights) {
      if (Math.abs(s.x - camX) < 16) cands.push(s);
    }
    cands.sort((a, b) => b.priority - a.priority || Math.abs(a.x - camX) - Math.abs(b.x - camX));
    for (let i = 0; i < this.pool.length; i++) {
      const l = this.pool[i]!;
      const r = cands[i];
      // nunca alterar `visible`: mudaria a contagem de luzes e recompilaria os shaders
      if (!r) {
        l.intensity = 0;
        continue;
      }
      l.position.set(r.x, r.y, r.z);
      l.color.setHex(r.color);
      let I = r.intensity;
      if (r.flicker) {
        const f = Math.sin(this.time * 17 + r.x * 3) * 0.5 + Math.sin(this.time * 31 + r.z * 7) * 0.5;
        I *= 1 + f * r.flicker * 0.5;
      }
      l.intensity = I;
      l.distance = r.distance;
    }
    this.requests = [];
  }

  dispose(): void {
    for (const l of this.pool) {
      this.scene.remove(l);
      l.dispose();
    }
    this.pool = [];
    this.scene.remove(this.hemi, this.sun, this.target, this.fill);
    this.sun.dispose();
    this.fill.dispose();
    this.hemi.dispose();
  }
}

export const tmpColor = new Color();
