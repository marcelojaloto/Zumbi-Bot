import type { EnvironmentDef } from './types';

/** Ambiente base (dia claro); os mapas sobrescrevem só o que muda. */
export function env(partial: Partial<EnvironmentDef> & Pick<EnvironmentDef, 'theme'>): EnvironmentDef {
  return {
    fog: { color: 0xb8c8dc, density: 0.014 },
    sky: { top: 0x5a8ad0, bottom: 0xc8dcf0, moon: false, stars: 0 },
    hemi: { sky: 0xd8e8ff, ground: 0x5a5040, intensity: 1.1 },
    sun: { color: 0xfff0d8, intensity: 2, dir: [-0.45, 1, 0.55] },
    accent: { color: 0xffb35c, flicker: 0.15 },
    grade: { lift: [0, 0, 0.01], gamma: [1, 1, 1], gain: [1, 1, 1], saturation: 1, contrast: 1.03 },
    bloom: { intensity: 0.9, threshold: 0.8 },
    vignette: 0.4,
    grain: 0.04,
    particles: 'dust',
    particleDensity: 0.3,
    ground: { color: 0x6a6a5e, color2: 0x7a7868, pattern: 'dirt' },
    reverb: 'outdoor',
    ...partial,
  };
}
