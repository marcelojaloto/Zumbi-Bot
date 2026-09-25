import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  SMAAEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  type Pass,
} from 'postprocessing';
import { HalfFloatType, Vector2, type Camera, type Scene, type WebGLRenderer } from 'three';
import type { EnvironmentDef } from '../data/types';
import { ExposureEffect, GradeEffect } from './effects/GradeEffect';
import type { QualityPreset } from './quality';

/**
 * Cadeia de pós-processamento: (SSAO) → Bloom + ToneMapping AgX + Grade + Vinheta + Grão (+ aberração) → SMAA.
 * No preset "baixa" não há composer (tone mapping do renderer + vinheta CSS).
 */
export class PostFX {
  composer: EffectComposer | null = null;
  grade: GradeEffect | null = null;
  bloom: BloomEffect | null = null;
  vignette: VignetteEffect | null = null;
  noise: NoiseEffect | null = null;
  chroma: ChromaticAberrationEffect | null = null;
  exposure: ExposureEffect | null = null;
  ssao: Pass | null = null;
  private chromaPulse = 0;

  constructor(
    private renderer: WebGLRenderer,
    private scene: Scene,
    private camera: Camera,
  ) {}

  async build(q: QualityPreset): Promise<void> {
    this.dispose();
    if (!q.post) return;
    const composer = new EffectComposer(this.renderer, { frameBufferType: HalfFloatType });
    composer.addPass(new RenderPass(this.scene, this.camera));
    if (q.ssao) {
      try {
        const { N8AOPostPass } = await import('n8ao');
        const size = this.renderer.getSize(new Vector2());
        const ao = new N8AOPostPass(this.scene, this.camera, size.x, size.y);
        ao.configuration.aoRadius = 1.5;
        ao.configuration.distanceFalloff = 1;
        ao.configuration.intensity = 2;
        ao.configuration.halfRes = true;
        ao.setQualityMode('Low');
        composer.addPass(ao);
        this.ssao = ao;
      } catch (err) {
        console.warn('SSAO indisponível', err);
      }
    }
    this.bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 0.75,
      luminanceSmoothing: 0.25,
      intensity: 1.2,
      radius: 0.7,
      levels: q.bloomLevels,
    });
    this.grade = new GradeEffect();
    this.vignette = new VignetteEffect({ offset: 0.3, darkness: 0.55 });
    this.noise = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
    this.noise.blendMode.opacity.value = 0.07;
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    this.exposure = new ExposureEffect(1.5);
    const effects = [this.bloom, this.exposure, tone, this.grade, this.vignette, this.noise];
    if (q.chromatic) {
      this.chroma = new ChromaticAberrationEffect({
        offset: new Vector2(0.0006, 0.0004),
        radialModulation: true,
        modulationOffset: 0.2,
      });
      effects.push(this.chroma as never);
    }
    composer.addPass(new EffectPass(this.camera, ...effects));
    if (q.smaa) composer.addPass(new EffectPass(this.camera, new SMAAEffect()));
    this.composer = composer;
  }

  applyEnv(env: EnvironmentDef): void {
    if (this.bloom) {
      this.bloom.intensity = env.bloom.intensity;
      this.bloom.luminanceMaterial.threshold = env.bloom.threshold;
    }
    if (this.vignette) this.vignette.darkness = env.vignette;
    if (this.noise) this.noise.blendMode.opacity.value = env.grain;
    if (this.grade) {
      const g = env.grade;
      this.grade.u('lift').value.set(...g.lift);
      this.grade.u('gammaV').value.set(...g.gamma);
      this.grade.u('gain').value.set(...g.gain);
      this.grade.u('saturation').value = g.saturation;
      this.grade.u('contrast').value = g.contrast;
    }
  }

  setDamagePulse(v: number): void {
    if (this.grade) this.grade.u('damagePulse').value = v;
  }

  setDesat(v: number): void {
    if (this.grade) this.grade.u('desat').value = v;
  }

  setFlash(v: number, r = 1, g = 1, b = 1): void {
    if (!this.grade) return;
    this.grade.u('flash').value = v;
    this.grade.u('flashColor').value.set(r, g, b);
  }

  pulseChroma(v: number): void {
    this.chromaPulse = Math.max(this.chromaPulse, v);
  }

  setSize(w: number, h: number): void {
    this.composer?.setSize(w, h, false);
  }

  render(dt: number): void {
    if (this.chroma) {
      this.chromaPulse = Math.max(0, this.chromaPulse - dt * 3);
      const o = 0.0006 + this.chromaPulse * 0.006;
      this.chroma.offset.set(o, o * 0.6);
    }
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.composer?.dispose();
    this.composer = null;
    this.grade = null;
    this.bloom = null;
    this.vignette = null;
    this.noise = null;
    this.chroma = null;
    this.ssao = null;
  }
}
