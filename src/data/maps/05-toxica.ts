import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

export const toxica: MapDef = {
  id: 'toxica',
  index: 4,
  name: 'Zona Tóxica',
  subtitle: 'O ar arde, o chão borbulha',
  color: 0xb5ff5a,
  music: 'toxica',
  wizardBias: 0.25,
  scaling: mapScaling(4),
  env: env({
    theme: 'toxica',
    fog: { color: 0x1d2a0c, density: 0.05 },
    sky: { top: 0x070c04, bottom: 0x24340e, moon: true, stars: 60, moonColor: 0xd8ff9a },
    hemi: { sky: 0xa8c878, ground: 0x2a2a14, intensity: 0.85 },
    sun: { color: 0xd8f0a0, intensity: 1.45, dir: [-0.5, 1, 0.45] },
    accent: { color: 0xb5ff5a, flicker: 0.2 },
    grade: {
      lift: [0.01, 0.02, 0],
      gamma: [1, 0.98, 1.05],
      gain: [1.03, 1.07, 0.9],
      saturation: 0.9,
      contrast: 1.08,
    },
    bloom: { intensity: 1.2, threshold: 0.72 },
    vignette: 0.6,
    grain: 0.08,
    particles: 'spores',
    particleDensity: 0.7,
    ground: { color: 0x2c2e26, color2: 0x363a2e, pattern: 'asphalt' },
    reverb: 'outdoor',
  }),
  levels: [
    {
      id: 'toxica-1',
      name: 'Usina Contaminada',
      length: 185,
      zBand: [-3.5, 2],
      parTimeS: 420,
      playerStart: { x: 3, z: 0 },
      hints: [
        { x: 4, text: 'Ar contaminado: evite as poças verdes e as saídas de gás' },
        { x: 158, text: 'Algo enorme borbulha à frente... mude de plano quando o vômito vier!' },
      ],
      segments: [
        {
          id: 's1',
          triggerX: 12,
          lock: { minX: 9, maxX: 27 },
          hazards: [{ kind: 'gasVent', x: 20, z: -1.4, periodS: 4 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'toxicWalker', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'runner', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'toxicWalker', count: 2, from: 'ground', intervalS: 0.7 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'exploder', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1.5 },
              ],
            },
          ],
        },
        {
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [
            { kind: 'toxicPool', x: 45.5, z: 0.6, w: 3 },
            { kind: 'gasVent', x: 51, z: -2.4, periodS: 4, offsetS: 2 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'toxicWalker', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'runner', count: 1, from: 'left', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'exploder', count: 2, from: 'sides', intervalS: 1.2 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              maxAlive: 8,
              spawns: [
                { enemy: 'toxicWalker', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'spitter', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'exploder', count: 1, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's3',
          triggerX: 70,
          lock: null,
          hazards: [
            { kind: 'gasVent', x: 76, z: 0.4, periodS: 3.5 },
            { kind: 'toxicPool', x: 84, z: -2.2, w: 3 },
            { kind: 'gasVent', x: 92, z: -1, periodS: 4, offsetS: 1.5 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'toxicWalker', count: 3, from: 'right', intervalS: 2.4 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'spitter', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'exploder', count: 2, from: 'left', intervalS: 2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'toxicWalker', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'brute', count: 1, from: 'left', intervalS: 1.5 },
              ],
            },
          ],
        },
        {
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'toxicPool', x: 108.5, z: -2.2, w: 3 },
            { kind: 'toxicPool', x: 115, z: 1, w: 3 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'toxicWalker', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'spitter', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'exploder', count: 2, from: 'left', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 1.5 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              maxAlive: 8,
              spawns: [
                { enemy: 'toxicWalker', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 1.3 },
                { enemy: 'runner', count: 1, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 138,
          lock: { minX: 135, maxX: 153 },
          hazards: [
            { kind: 'gasVent', x: 141, z: 0.8, periodS: 4 },
            { kind: 'gasVent', x: 149, z: -2.6, periodS: 4, offsetS: 2 },
            { kind: 'toxicPool', x: 145, z: -1.2, w: 3 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 10,
              spawns: [
                { enemy: 'toxicWalker', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'spitter', count: 3, from: 'right', intervalS: 1.1 },
                { enemy: 'exploder', count: 2, from: 'left', intervalS: 1.5 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 3, from: 'sides', intervalS: 1.6 },
                { enemy: 'spitter', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'exploder', count: 2, from: 'left', intervalS: 1.4 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'toxicWalker', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'spitter', count: 2, from: 'sides', intervalS: 1 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 9, z: -2.8, drop: 'medkitS' },
        { kind: 'barrel', x: 18, z: 1.3 },
        { kind: 'explosiveBarrel', x: 27, z: -2.6 },
        { kind: 'weaponCrate', x: 34, z: 1.2, drop: 'gun_gl' },
        { kind: 'explosiveBarrel', x: 49, z: 1.4 },
        { kind: 'crate', x: 58, z: -2.8, drop: 'melee_sledge' },
        { kind: 'barrel', x: 66, z: 1.3 },
        { kind: 'explosiveBarrel', x: 81, z: 1.3 },
        { kind: 'crate', x: 96, z: 1.2, drop: 'shield' },
        { kind: 'bin', x: 111, z: -3 },
        { kind: 'explosiveBarrel', x: 122, z: 1.3 },
        { kind: 'crate', x: 130, z: -2.8, drop: 'ammoGrenade' },
        { kind: 'barrel', x: 144, z: 1.4 },
        { kind: 'crate', x: 158, z: -2.6, drop: 'medkitL' },
      ],
      pickups: [
        { item: 'ammoGrenade', x: 38, z: -1 },
        { item: 'mana', x: 88, z: 0.5 },
        { item: 'medkitS', x: 126, z: 0 },
        { item: 'powerTurbo', x: 161, z: -0.5 },
      ],
      boss: { id: 'abominacao', triggerX: 165, lock: [162, 183] },
    },
  ],
};
