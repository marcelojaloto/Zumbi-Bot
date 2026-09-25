import type { EnvironmentDef } from './types';

/** Ambiente base; os mapas sobrescrevem só o que muda. */
export function env(partial: Partial<EnvironmentDef> & Pick<EnvironmentDef, 'theme'>): EnvironmentDef {
  return {
    fog: { color: 0x1b2233, density: 0.03 },
    sky: { top: 0x05070d, bottom: 0x1b2233, moon: true, stars: 400, moonColor: 0xdfe6ff },
    hemi: { sky: 0x8fa6ff, ground: 0x2a2018, intensity: 0.9 },
    sun: { color: 0xa8bcff, intensity: 1.8, dir: [-0.45, 1, 0.55] },
    accent: { color: 0xffb35c, flicker: 0.25 },
    grade: { lift: [0, 0, 0.01], gamma: [1, 1, 1], gain: [1, 1, 1], saturation: 0.85, contrast: 1.05 },
    bloom: { intensity: 1.1, threshold: 0.75 },
    vignette: 0.55,
    grain: 0.07,
    particles: 'ash',
    particleDensity: 0.6,
    ground: { color: 0x2c2a26, color2: 0x3a342c, pattern: 'dirt' },
    reverb: 'outdoor',
    ...partial,
  };
}
