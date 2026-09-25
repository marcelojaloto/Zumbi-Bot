import type { Element, MeshRecipe } from '../../data/types';

export const ELEMENT_COLORS: Record<Element, number> = {
  heal: 0x5aff9a,
  fire: 0xff6a1a,
  water: 0x3a9cff,
  ice: 0x9fe8ff,
  electric: 0xfff15a,
  toxic: 0x8cff3a,
  cyber: 0x39e6ff,
  wind: 0xc8f0e8,
  earth: 0xb08a4a,
  necro: 0xb05aff,
};

const cache = new Map<Element, MeshRecipe>();

/** Cajado: haste de madeira/metal + ornamento + orbe brilhante na cor do elemento. */
export function staffRecipe(el: Element): MeshRecipe {
  const hit = cache.get(el);
  if (hit) return hit;
  const c = ELEMENT_COLORS[el];
  const wood = el === 'cyber' || el === 'electric' ? 0x3a3e46 : el === 'necro' ? 0x2a1a2a : 0x5a3a22;
  const r: MeshRecipe = {
    parts: [
      { shape: 'cyl', size: [0.025, 0.03, 1.5, 6], pos: [0, 0.25, 0], color: wood },
      { shape: 'torus', size: [0.09, 0.02, 4, 8], pos: [0, 1.02, 0], color: 0x8a7a5a },
      { shape: 'cone', size: [0.05, 0.14, 4], pos: [0.07, 1.05, 0], rot: [0, 0, -0.6], color: wood },
      { shape: 'cone', size: [0.05, 0.14, 4], pos: [-0.07, 1.05, 0], rot: [0, 0, 0.6], color: wood },
      {
        shape: el === 'ice' ? 'oct' : el === 'earth' ? 'ico' : 'sphere',
        size: [0.085, 1],
        pos: [0, 1.1, 0],
        color: c,
        glow: true,
        glowIntensity: 3.5,
      },
    ],
  };
  cache.set(el, r);
  return r;
}
