import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

/**
 * Área em Chamas: quarteirão industrial em chamas. Corredor apertado (faixa Z [-1, 1]) entre
 * escombros, jatos de fogo cronometrados, vigas incandescentes caindo e muitos zumbis em chamas.
 */
export const chamas: MapDef = {
  id: 'chamas',
  index: 7,
  name: 'Área em Chamas',
  subtitle: 'A cidade virou fornalha — e algo gigante a alimenta',
  color: 0xff6a2a,
  music: 'chamas',
  wizardBias: 0.3,
  scaling: mapScaling(7),
  env: env({
    theme: 'chamas',
    fog: { color: 0x2a0e05, density: 0.04 },
    sky: { top: 0x0e0303, bottom: 0x6a1e08, moon: false, stars: 0 },
    hemi: { sky: 0xc4b4a6, ground: 0x3a2618, intensity: 1.3 },
    sun: { color: 0xffdcc4, intensity: 2, dir: [0.4, 1, 0.6] },
    accent: { color: 0xff6a2a, flicker: 0.8 },
    grade: {
      lift: [0.02, 0.005, 0],
      gamma: [1, 1, 1],
      gain: [1.04, 1, 0.96],
      saturation: 1.05,
      contrast: 1.15,
    },
    bloom: { intensity: 1.3, threshold: 0.7 },
    vignette: 0.6,
    grain: 0.08,
    particles: 'embers',
    particleDensity: 0.9,
    ground: { color: 0x4a4542, color2: 0x3a3532, pattern: 'ash' },
    reverb: 'room',
  }),
  levels: [
    {
      id: 'chamas-1',
      name: 'Corredor da Fornalha',
      length: 182,
      zBand: [-1, 1],
      parTimeS: 420,
      playerStart: { x: 3, z: 0 },
      hints: [
        { x: 30, text: 'Jatos de fogo acendem em ciclos: espere apagar e passe correndo' },
        { x: 66, text: 'Vigas em chamas caem do teto — saia do círculo vermelho!' },
      ],
      hazards: [
        { kind: 'fire', x: 8, z: -1.15, w: 1 },
        { kind: 'fireJet', x: 33, z: 0, w: 1.8, periodS: 3.5, offsetS: 0 },
        { kind: 'fireJet', x: 37, z: 0, w: 1.8, periodS: 3.5, offsetS: 1.75 },
        { kind: 'fire', x: 39.5, z: 1.15, w: 1 },
        { kind: 'fire', x: 63, z: -1.15, w: 1 },
        { kind: 'fireJet', x: 91, z: 0, w: 1.8, periodS: 3, offsetS: 0 },
        { kind: 'fireJet', x: 94, z: 0, w: 1.8, periodS: 3, offsetS: 1 },
        { kind: 'fireJet', x: 97, z: 0, w: 1.8, periodS: 3, offsetS: 2 },
        { kind: 'fire', x: 124, z: 1.15, w: 1 },
        { kind: 'fireJet', x: 127.5, z: 0, w: 1.8, periodS: 4, offsetS: 0.6 },
        { kind: 'fireJet', x: 153, z: 0, w: 1.8, periodS: 3.4, offsetS: 1.2 },
      ],
      segments: [
        {
          id: 's1',
          triggerX: 12,
          lock: { minX: 9, maxX: 27 },
          hazards: [{ kind: 'fire', x: 21, z: 1.15, w: 1 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 10,
              spawns: [
                { enemy: 'burningWalker', count: 3, from: 'right', intervalS: 1.1 },
                { enemy: 'runner', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 10,
              spawns: [
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 1.4 },
                { enemy: 'burningWalker', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              maxAlive: 10,
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'exploder', count: 1, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's2',
          triggerX: 44,
          lock: { minX: 41, maxX: 59 },
          hazards: [{ kind: 'fireJet', x: 50, z: 0, w: 1.6, periodS: 4, offsetS: 1 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 10,
              spawns: [
                { enemy: 'burningWalker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              maxAlive: 10,
              spawns: [
                { enemy: 'runner', count: 3, from: 'left', intervalS: 0.9 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'burningWalker', count: 2, from: 'ground', intervalS: 0.9 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 10,
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 2.5 },
                { enemy: 'burningWalker', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 1.6 },
              ],
            },
          ],
        },
        {
          id: 's3',
          triggerX: 70,
          lock: null,
          hazards: [{ kind: 'debris', x: 76, z: 0, periodS: 5 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 10,
              spawns: [
                { enemy: 'burningWalker', count: 3, from: 'right', intervalS: 2 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 2.6 },
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 7 },
              maxAlive: 10,
              spawns: [
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'burningWalker', count: 2, from: 'ground', intervalS: 1.8 },
                { enemy: 'exploder', count: 2, from: 'left', intervalS: 2.2 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'fireJet', x: 108, z: -0.4, w: 1.4, periodS: 3.2, offsetS: 0 },
            { kind: 'fireJet', x: 113, z: 0.4, w: 1.4, periodS: 3.2, offsetS: 1.6 },
            { kind: 'debris', x: 110, z: 0, periodS: 5.5, offsetS: 2 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 10,
              spawns: [
                { enemy: 'burningWalker', count: 3, from: 'sides', intervalS: 0.7 },
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 1.3 },
                { enemy: 'runner', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              maxAlive: 10,
              spawns: [
                { enemy: 'brute', count: 2, from: 'right', intervalS: 2 },
                { enemy: 'spitter', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'exploder', count: 2, from: 'left', intervalS: 1.5 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              maxAlive: 10,
              spawns: [
                { enemy: 'burningWalker', count: 3, from: 'ground', intervalS: 0.6 },
                { enemy: 'brute', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'exploder', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'fire', x: 137, z: -1.15, w: 1 },
            { kind: 'fire', x: 144, z: 1.15, w: 1 },
            { kind: 'fireJet', x: 146, z: 0, w: 1.6, periodS: 3.8, offsetS: 0.5 },
            { kind: 'debris', x: 140, z: 0, periodS: 5, offsetS: 1 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 10,
              spawns: [
                { enemy: 'burningWalker', count: 3, from: 'sides', intervalS: 0.7 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1 },
                { enemy: 'exploder', count: 2, from: 'left', intervalS: 1.4 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              maxAlive: 10,
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 2.2 },
                { enemy: 'spitter', count: 2, from: 'right', intervalS: 1.4 },
                { enemy: 'burningWalker', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'exploder', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 1 },
              maxAlive: 10,
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 1.5 },
                { enemy: 'burningWalker', count: 1, from: 'ground', intervalS: 1 },
                { enemy: 'exploder', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 17, z: -0.8, drop: 'medkitS' },
        { kind: 'explosiveBarrel', x: 25, z: 0.8 },
        { kind: 'barrel', x: 29.5, z: -0.8, drop: 'ammoShell' },
        { kind: 'crate', x: 47, z: 0.8, drop: 'melee_sledge' },
        { kind: 'explosiveBarrel', x: 56, z: -0.8 },
        { kind: 'crate', x: 68, z: 0.8, drop: 'mana' },
        { kind: 'explosiveBarrel', x: 80, z: -0.8 },
        { kind: 'barrel', x: 86, z: 0.8, drop: 'ammoLight' },
        { kind: 'crate', x: 106, z: 0.8, drop: 'powerDouble' },
        { kind: 'explosiveBarrel', x: 116, z: -0.8 },
        { kind: 'crate', x: 121, z: -0.8, drop: 'medkitL' },
        { kind: 'barrel', x: 139, z: 0.8, drop: 'ammoCurrent' },
        { kind: 'explosiveBarrel', x: 147.5, z: -0.8 },
        { kind: 'crate', x: 156, z: 0.8, drop: 'shield' },
        { kind: 'crate', x: 158.5, z: -0.8, drop: 'medkitL' },
      ],
      pickups: [
        { item: 'ammoShell', x: 41, z: 0 },
        { item: 'mana', x: 99.5, z: 0.4 },
        { item: 'medkitS', x: 130, z: -0.3 },
      ],
      boss: { id: 'incandescente', triggerX: 162, lock: [159, 180], zBand: [-2.5, 1.5] },
    },
  ],
};
