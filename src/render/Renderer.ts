import {
  ACESFilmicToneMapping,
  NoToneMapping,
  Plane,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CameraRig } from './CameraRig';
import { PostFX } from './PostFX';
import { QUALITY, type QualityLevel, type QualityPreset } from './quality';
import { setMeshQuality } from './meshCache';

const _ray = new Raycaster();
const _ndc = new Vector2();
const _plane = new Plane(new Vector3(0, 1, 0), 0);
const _hit = new Vector3();

/** Renderer WebGL2 + cena + câmera + pós-processamento. Uma instância para o app inteiro. */
export class Renderer {
  readonly gl: WebGLRenderer;
  readonly scene = new Scene();
  readonly cam = new CameraRig();
  readonly post: PostFX;
  quality: QualityPreset;
  renderScale = 1;
  width = 1;
  height = 1;
  contextLost = false;
  onContextLost: (() => void) | null = null;

  constructor(
    readonly canvas: HTMLCanvasElement,
    level: QualityLevel,
  ) {
    this.quality = QUALITY[level];
    this.gl = new WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      preserveDrawingBuffer: false,
    });
    this.gl.outputColorSpace = SRGBColorSpace;
    this.gl.info.autoReset = false;
    this.post = new PostFX(this.gl, this.scene, this.cam.camera);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
      this.onContextLost?.();
    });
    this.applyQualityBasics();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  private applyQualityBasics(): void {
    const q = this.quality;
    this.gl.toneMapping = q.post ? NoToneMapping : ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.45;
    this.gl.shadowMap.enabled = q.shadows;
    setMeshQuality(q.standardMaterials);
  }

  async setQuality(level: QualityLevel): Promise<void> {
    this.quality = QUALITY[level];
    this.applyQualityBasics();
    this.resize();
    await this.post.build(this.quality);
    this.resize();
  }

  resize(): void {
    const w = Math.max(1, innerWidth);
    const h = Math.max(1, innerHeight);
    this.width = w;
    this.height = h;
    const pr =
      Math.min(devicePixelRatio || 1, this.quality.pixelRatioCap) *
      this.quality.renderScale *
      this.renderScale;
    this.gl.setPixelRatio(pr);
    this.gl.setSize(w, h, false);
    this.cam.setAspect(w / h);
    this.post.setSize(w, h);
  }

  render(dt: number): void {
    if (this.contextLost) return;
    this.post.render(dt);
  }

  /**
   * Converte um ponto da tela em ângulo de mira no plano XZ, projetando no plano horizontal
   * na altura do ombro do robô.
   */
  projectAim(sx: number, sy: number, originX: number, originY: number, originZ: number): number | null {
    _ndc.set((sx / this.width) * 2 - 1, -(sy / this.height) * 2 + 1);
    _ray.setFromCamera(_ndc, this.cam.camera);
    _plane.constant = -originY;
    if (!_ray.ray.intersectPlane(_plane, _hit)) return null;
    const dx = _hit.x - originX;
    const dz = _hit.z - originZ;
    if (Math.abs(dx) < 1e-3 && Math.abs(dz) < 1e-3) return null;
    return Math.atan2(dz, dx);
  }

  /** Projeta um ponto do mundo para a tela (números de dano, barras). */
  toScreen(x: number, y: number, z: number, out: { x: number; y: number; visible: boolean }): void {
    _hit.set(x, y, z).project(this.cam.camera);
    out.x = (_hit.x * 0.5 + 0.5) * this.width;
    out.y = (-_hit.y * 0.5 + 0.5) * this.height;
    out.visible = _hit.z < 1 && _hit.z > -1;
  }

  captureFrame(): string {
    this.post.render(0);
    return this.canvas.toDataURL('image/png');
  }
}
