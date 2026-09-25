import type { MusicDef, MusicId } from './types';

/** Escalas em semitons a partir da raiz. */
export const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  hungarian: [0, 2, 3, 6, 7, 8, 11],
} as const;

// Padrões de 16 passos (semicolcheias). Bateria: 0 = nada, 1 = normal, 2 = acento.
// Baixo: -1 = pausa, 0 = raiz do acorde, 1 = quinta, 2 = raiz uma oitava acima, 3 = terça.
const R = -1;

export const MUSIC: Record<MusicId, MusicDef> = {
  menu: {
    id: 'menu',
    bpm: 84,
    root: 45, // Lá
    scale: [...SCALES.minor],
    progression: [0, 5, 3, 4],
    bass: [0, R, R, R, R, R, R, R, 1, R, R, R, R, R, R, R],
    lead: { wave: 'triangle', density: 0.18, octave: 2, seed: 7 },
    pad: { wave: 'sawtooth', detune: 9 },
    drums: {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    },
  },
  vila: {
    id: 'vila',
    bpm: 96,
    root: 50, // Ré
    scale: [...SCALES.harmonic],
    progression: [0, 5, 3, 4],
    bass: [0, R, R, 0, R, R, 1, R, 0, R, R, 0, R, 2, 1, R],
    lead: { wave: 'triangle', density: 0.3, octave: 2, seed: 11 },
    pad: { wave: 'sawtooth', detune: 8 },
    drums: {
      kick: [2, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
      hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    },
    bossBpm: 118,
  },
  torre: {
    id: 'torre',
    bpm: 102,
    root: 48, // Dó
    scale: [...SCALES.phrygian],
    progression: [0, 1, 0, 6],
    bass: [0, R, 0, R, R, 0, R, R, 0, R, 0, R, 1, R, 2, R],
    lead: { wave: 'square', density: 0.28, octave: 2, seed: 23 },
    pad: { wave: 'triangle', detune: 12 },
    drums: {
      kick: [2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      hat: [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
    },
    bossBpm: 124,
  },
  banco: {
    id: 'banco',
    bpm: 112,
    root: 52, // Mi
    scale: [...SCALES.minor],
    progression: [0, 0, 5, 6],
    bass: [0, 0, R, 0, R, 0, 1, R, 0, 0, R, 0, 2, R, 1, R],
    lead: { wave: 'square', density: 0.34, octave: 2, seed: 31 },
    pad: { wave: 'square', detune: 6 },
    drums: {
      kick: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      hat: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0],
    },
    bossBpm: 132,
  },
  castelo: {
    id: 'castelo',
    bpm: 88,
    root: 47, // Si
    scale: [...SCALES.harmonic],
    progression: [0, 3, 5, 4],
    bass: [0, R, R, R, 1, R, R, R, 0, R, R, R, 2, R, 1, R],
    lead: { wave: 'sawtooth', density: 0.26, octave: 2, seed: 41 },
    pad: { wave: 'sawtooth', detune: 14 },
    drums: {
      kick: [2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      hat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    },
    bossBpm: 110,
  },
  toxica: {
    id: 'toxica',
    bpm: 100,
    root: 46, // Si bemol
    scale: [...SCALES.locrian],
    progression: [0, 1, 4, 1],
    bass: [0, R, 0, 0, R, 0, R, 1, 0, R, 0, 0, R, 2, R, 1],
    lead: { wave: 'square', density: 0.22, octave: 1, seed: 53 },
    pad: { wave: 'sawtooth', detune: 20 },
    drums: {
      kick: [2, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 0],
      hat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    },
    bossBpm: 120,
  },
  floresta: {
    id: 'floresta',
    bpm: 92,
    root: 45, // Lá
    scale: [...SCALES.dorian],
    progression: [0, 3, 6, 4],
    bass: [0, R, R, 1, R, R, 0, R, R, 3, R, R, 1, R, R, R],
    lead: { wave: 'triangle', density: 0.32, octave: 2, seed: 61 },
    pad: { wave: 'triangle', detune: 10 },
    drums: {
      kick: [2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
    },
    bossBpm: 116,
  },
  centro: {
    id: 'centro',
    bpm: 120,
    root: 49, // Dó sustenido
    scale: [...SCALES.minor],
    progression: [0, 5, 2, 6],
    bass: [0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2, 0, 1, 1, 3, 1],
    lead: { wave: 'sawtooth', density: 0.36, octave: 2, seed: 71 },
    pad: { wave: 'sawtooth', detune: 7 },
    drums: {
      kick: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
      snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      hat: [0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 1],
    },
    bossBpm: 138,
  },
  chamas: {
    id: 'chamas',
    bpm: 128,
    root: 51, // Ré sustenido
    scale: [...SCALES.phrygian],
    progression: [0, 1, 0, 5],
    bass: [0, 0, R, 0, 0, R, 1, R, 0, 0, R, 0, 2, 1, 0, R],
    lead: { wave: 'sawtooth', density: 0.3, octave: 2, seed: 83 },
    pad: { wave: 'square', detune: 16 },
    drums: {
      kick: [2, 0, 1, 0, 2, 0, 0, 1, 2, 0, 1, 0, 2, 0, 0, 0],
      snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
      hat: [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1],
    },
    bossBpm: 146,
  },
  guerra: {
    id: 'guerra',
    bpm: 108,
    root: 43, // Sol
    scale: [...SCALES.minor],
    progression: [0, 6, 5, 4],
    bass: [0, R, 0, 0, R, 0, 0, R, 0, R, 0, 0, 1, R, 2, R],
    lead: { wave: 'square', density: 0.25, octave: 2, seed: 97 },
    pad: { wave: 'sawtooth', detune: 11 },
    drums: {
      kick: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 1, 0],
      snare: [0, 0, 1, 0, 2, 0, 1, 0, 0, 0, 1, 0, 2, 0, 1, 1],
      hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    },
    bossBpm: 128,
  },
  arena: {
    id: 'arena',
    bpm: 126,
    root: 45, // Lá
    scale: [...SCALES.hungarian],
    progression: [0, 1, 5, 4],
    bass: [0, 0, 2, 0, R, 0, 1, 0, 0, 0, 2, 0, 3, 1, 0, 1],
    lead: { wave: 'sawtooth', density: 0.4, octave: 2, seed: 101 },
    pad: { wave: 'sawtooth', detune: 18 },
    drums: {
      kick: [2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 1],
      snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 0],
      hat: [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1],
    },
    bossBpm: 150,
  },
};

export function getMusic(id: MusicId): MusicDef {
  return MUSIC[id] ?? MUSIC.vila!;
}
