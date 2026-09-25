import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

export const torre: MapDef = {
  id: 'torre',
  index: 1,
  name: 'Interior da Torre',
  subtitle: 'Engrenagens rangem e o vento uiva pelos vitrais',
  color: 0xff9a4a,
  music: 'torre',
  wizardBias: 0.3,
  scaling: mapScaling(1),
  env: env({
    theme: 'torre',
    fog: { color: 0x1a1410, density: 0.028 },
    sky: { top: 0x05060a, bottom: 0x1a1612, moon: false, stars: 0 },
    hemi: { sky: 0x9fb4ff, ground: 0x4a3222, intensity: 1.1 },
    sun: { color: 0xa8bcff, intensity: 1.7, dir: [-0.45, 1, 0.5] },
    accent: { color: 0xff8a3c, flicker: 0.45 },
    grade: {
      lift: [0.02, 0.012, 0],
      gamma: [1, 1, 1.02],
      gain: [1.08, 1.0, 0.92],
      saturation: 0.8,
      contrast: 1.08,
    },
    bloom: { intensity: 1.2, threshold: 0.7 },
    vignette: 0.6,
    grain: 0.07,
    particles: 'dust',
    particleDensity: 0.7,
    ground: { color: 0x4a423a, color2: 0x453d35, pattern: 'stone' },
    indoor: true,
    reverb: 'hall',
  }),
  levels: [
    {
      id: 'torre-1',
      name: 'Escadaria dos Sinos',
      length: 180,
      zBand: [-3, 1.5],
      parTimeS: 420,
      playerStart: { x: 3, z: -0.5 },
      hints: [
        { x: 38, text: 'Cuidado: destroços despencam do teto — saia do círculo!' },
        { x: 70, text: 'Rajadas de vento entram pelos vitrais e empurram para a frente' },
        { x: 150, text: 'Sentinela à frente! Saia da linha do rotor e pule as hélices' },
      ],
      segments: [
        {
          id: 's1',
          triggerX: 12,
          lock: { minX: 9, maxX: 27 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'walker', count: 3, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'runner', count: 2, from: 'sides', intervalS: 1 },
                { enemy: 'walker', count: 2, from: 'ground', intervalS: 0.7 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.2 },
                { enemy: 'runner', count: 1, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's2',
          triggerX: 42,
          lock: { minX: 39, maxX: 57 },
          hazards: [{ kind: 'debris', x: 48, z: -0.75, periodS: 4 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'walker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'drone', count: 2, from: 'front', intervalS: 1.2 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 2, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's3',
          triggerX: 72,
          lock: null,
          hazards: [
            { kind: 'gust', x: 78, z: -1.4, w: 3.5, d: 6, periodS: 5 },
            { kind: 'gust', x: 86, z: -1.4, w: 3.5, d: 6, periodS: 5, offsetS: 2.5 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'runner', count: 3, from: 'right', intervalS: 2.2 },
                { enemy: 'walker', count: 3, from: 'left', intervalS: 2.5 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'drone', count: 2, from: 'back', intervalS: 2 },
                { enemy: 'walker', count: 2, from: 'right', intervalS: 2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [{ enemy: 'brute', count: 1, from: 'right', intervalS: 1 }],
            },
          ],
        },
        {
          id: 's4',
          triggerX: 102,
          lock: { minX: 99, maxX: 117 },
          hazards: [
            { kind: 'gust', x: 102, z: -1.4, w: 3.5, d: 6, periodS: 5, offsetS: 1 },
            { kind: 'gust', x: 110, z: -1.4, w: 3.5, d: 6, periodS: 5, offsetS: 3.5 },
            { kind: 'debris', x: 109, z: -0.75, periodS: 4.5 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'walker', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'runner', count: 3, from: 'right', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'front', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.4 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'runner', count: 4, from: 'sides', intervalS: 0.8 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 1, from: 'ground', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 132,
          lock: { minX: 129, maxX: 147 },
          hazards: [{ kind: 'debris', x: 138, z: -0.75, periodS: 4.5, offsetS: 2 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'walker', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'drone', count: 2, from: 'front', intervalS: 1.5 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 2.5 },
                { enemy: 'walker', count: 2, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'drone', count: 3, from: 'back', intervalS: 1.2 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 2, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 20, z: -2.6, drop: 'medkitS' },
        { kind: 'barrel', x: 30, z: 1.2 },
        { kind: 'crate', x: 49, z: -2.7, drop: 'gun_smg' },
        { kind: 'explosiveBarrel', x: 55, z: 1.1 },
        { kind: 'crate', x: 64, z: -2.5, drop: 'melee_pipe' },
        { kind: 'barrel', x: 79, z: -2.7 },
        { kind: 'crate', x: 88, z: 1.2, drop: 'mana' },
        { kind: 'explosiveBarrel', x: 107, z: -2.6 },
        { kind: 'weaponCrate', x: 113, z: 1.1 },
        { kind: 'crate', x: 124, z: -2.6, drop: 'melee_machete' },
        { kind: 'barrel', x: 139, z: 1.2 },
        { kind: 'crate', x: 144, z: -2.6, drop: 'shield' },
        { kind: 'crate', x: 152, z: -2.6, drop: 'medkitL' },
      ],
      pickups: [
        { item: 'ammoLight', x: 60, z: -1 },
        { item: 'mana', x: 95, z: 0.5 },
        { item: 'medkitS', x: 127, z: -0.5 },
      ],
      boss: { id: 'sentinela', triggerX: 158, lock: [155, 176] },
    },
  ],
};
