import { PerspectiveCamera, Vector3 } from 'three';
import { damp } from '../core/math';
import { VIEW_HALF_WIDTH } from '../data/balance';

const OFFSET = new Vector3(0, 4.4, 10.2);
const LOOK = new Vector3(0, 0.95, -1.2);
const BASE_FOV = 38;

/**
 * Câmera lateral 2.5D: segue a âncora X do sim com mola, acompanha levemente a altura e
 * aplica tremor por "trauma". Ajusta a distância para manter ~16,5 m visíveis em qualquer proporção.
 */
export class CameraRig {
  readonly camera: PerspectiveCamera;
  x = 0;
  y = 0;
  z = 0;
  trauma = 0;
  shakeScale = 1;
  private fovPunch = 0;
  private t = 0;
  private distScale = 1;
  private readonly tmp = new Vector3();
  /** Deslocamento extra (intro do boss, cinemáticas). */
  zoom = 1;

  constructor() {
    this.camera = new PerspectiveCamera(BASE_FOV, 16 / 9, 0.1, 400);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    const tanHalf = Math.tan((BASE_FOV * Math.PI) / 360);
    const need = (VIEW_HALF_WIDTH + 0.1) / (tanHalf * aspect);
    this.distScale = Math.max(1, need / OFFSET.length());
    this.camera.updateProjectionMatrix();
  }

  addTrauma(v: number): void {
    this.trauma = Math.min(1, this.trauma + v * this.shakeScale);
  }

  punch(deg: number): void {
    this.fovPunch = Math.min(this.fovPunch + deg, 6);
  }

  snap(x: number, y: number, z: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  update(targetX: number, targetY: number, targetZ: number, dt: number): void {
    this.t += dt;
    this.x = damp(this.x, targetX, 0.12, dt);
    this.y = damp(this.y, targetY, 0.35, dt);
    this.z = damp(this.z, targetZ, 0.5, dt);
    this.trauma = Math.max(0, this.trauma - dt * 1.5);
    this.fovPunch = Math.max(0, this.fovPunch - dt * 18);
    const s = this.trauma * this.trauma;
    const sx = (Math.sin(this.t * 37.3) + Math.sin(this.t * 71.1) * 0.5) * s * 0.35;
    const sy = (Math.sin(this.t * 43.7 + 1) + Math.sin(this.t * 91.3) * 0.5) * s * 0.3;
    const k = this.distScale * this.zoom;
    const c = this.camera;
    c.position.set(this.x + OFFSET.x * k + sx, this.y + OFFSET.y * k + sy, this.z + OFFSET.z * k);
    this.tmp.set(this.x + LOOK.x + sx * 0.5, this.y + LOOK.y + sy * 0.5, this.z + LOOK.z);
    c.lookAt(this.tmp);
    c.rotation.z += Math.sin(this.t * 29.1) * s * 0.03;
    const fov = BASE_FOV - this.fovPunch;
    if (Math.abs(c.fov - fov) > 0.01) {
      c.fov = fov;
      c.updateProjectionMatrix();
    }
  }
}
