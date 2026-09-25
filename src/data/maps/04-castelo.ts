import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

export const castelo: MapDef = {
  id: 'castelo',
  index: 3,
  name: 'Castelo Assustador',
  subtitle: 'Velas tremulam no salão do Conde',
  color: 0xb05aff,
  music: 'castelo',
  wizardBias: 0.7,
  scaling: mapScaling(3),
  env: env({
    theme: 'castelo',
    fog: { color: 0x180d1f, density: 0.04 },
    sky: { top: 0x06030a, bottom: 0x1e1030, moon: true, stars: 200, moonColor: 0xb09cff },
    hemi: { sky: 0x9a86d8, ground: 0x2a1a22, intensity: 0.85 },
    sun: { color: 0xb09cff, intensity: 1.6, dir: [-0.4, 1, 0.6] },
    accent: { color: 0xffcc88, flicker: 0.45 },
    grade: {
      lift: [0.02, 0, 0.035],
      gamma: [1, 1, 1.03],
      gain: [1.03, 0.97, 1.08],
      saturation: 0.85,
      contrast: 1.1,
    },
    bloom: { intensity: 1.2, threshold: 0.7 },
    vignette: 0.62,
    grain: 0.07,
    particles: 'dust',
    particleDensity: 0.55,
    ground: { color: 0x3a3440, color2: 0x2a2530, pattern: 'stone' },
    indoor: true,
    reverb: 'hall',
  }),
  levels: [
    {
      id: 'castelo-1',
      name: 'Salão do Conde',
      length: 180,
      zBand: [-3.5, 2],
      parTimeS: 420,
      playerStart: { x: 3, z: 0 },
      hints: [
        { x: 4, text: 'O castelo desperta... cuidado com as lâminas pendulares e as velas caídas' },
        { x: 152, text: 'O Conde aguarda! Corra dos crânios uivantes e fuja da foice' },
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
                { enemy: 'walker', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'ghoul', count: 2, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'ghoul', count: 2, from: 'right', intervalS: 0.9 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 1, from: 'ground', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 1, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's2',
          triggerX: 42,
          lock: { minX: 39, maxX: 57 },
          hazards: [
            { kind: 'fire', x: 45.5, z: -2.9, w: 1.4 },
            { kind: 'fire', x: 53, z: 1.4, w: 1.4 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'ghoul', count: 2, from: 'ground', intervalS: 0.6 },
                { enemy: 'walker', count: 2, from: 'sides', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'exploder', count: 1, from: 'right', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              maxAlive: 8,
              spawns: [
                { enemy: 'ghoul', count: 2, from: 'sides', intervalS: 0.8 },
                { enemy: 'walker', count: 2, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'brute', count: 1, from: 'left', intervalS: 2 },
              ],
            },
          ],
        },
        {
          id: 's3',
          triggerX: 72,
          lock: null,
          hazards: [
            { kind: 'pendulum', x: 79, z: 0, offsetS: 0 },
            { kind: 'pendulum', x: 90, z: 0, offsetS: 1.9 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'ghoul', count: 3, from: 'right', intervalS: 2.2 },
                { enemy: 'walker', count: 3, from: 'left', intervalS: 2.6 },
              ],
            },
            {
              start: { k: 'timeS', s: 7 },
              spawns: [
                { enemy: 'exploder', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'brute', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'ghoul', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'exploder', count: 1, from: 'right', intervalS: 1.5 },
              ],
            },
          ],
        },
        {
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'pendulum', x: 111.5, z: 0, offsetS: 0.9 },
            { kind: 'fire', x: 106, z: 1.4, w: 1.4 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'walker', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'ghoul', count: 3, from: 'ground', intervalS: 0.6 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 1.5 },
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              maxAlive: 8,
              spawns: [
                { enemy: 'walker', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'spitter', count: 2, from: 'sides', intervalS: 1 },
                { enemy: 'ghoul', count: 2, from: 'left', intervalS: 0.9 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 2 },
              ],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'fire', x: 137.5, z: -3, w: 1.4 },
            { kind: 'fire', x: 145.5, z: 1.4, w: 1.4 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 10,
              spawns: [
                { enemy: 'ghoul', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'walker', count: 3, from: 'right', intervalS: 1 },
                { enemy: 'exploder', count: 2, from: 'left', intervalS: 1.5 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 1.4 },
                { enemy: 'spitter', count: 2, from: 'right', intervalS: 1 },
                { enemy: 'exploder', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'ghoul', count: 2, from: 'ground', intervalS: 0.6 },
                { enemy: 'walker', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'brute', count: 2, from: 'right', intervalS: 2 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 8, z: -2.8, drop: 'medkitS' },
        { kind: 'barrel', x: 20, z: 1.3 },
        { kind: 'tombstone', x: 31, z: -2.9 },
        { kind: 'weaponCrate', x: 36, z: 1.2, drop: 'gun_sniper' },
        { kind: 'crate', x: 50, z: -2.9, drop: 'melee_katana' },
        { kind: 'barrel', x: 62, z: 1.3 },
        { kind: 'explosiveBarrel', x: 68, z: -2.4 },
        { kind: 'crate', x: 84, z: 1.3, drop: 'mana' },
        { kind: 'tombstone', x: 97, z: -2.9 },
        { kind: 'explosiveBarrel', x: 115, z: 1.3 },
        { kind: 'crate', x: 124, z: -2.8, drop: 'shield' },
        { kind: 'barrel', x: 141, z: 1.3 },
        { kind: 'crate', x: 153, z: -2.6, drop: 'medkitL' },
      ],
      pickups: [
        { item: 'ammoSniper', x: 58, z: -1 },
        { item: 'mana', x: 94, z: 0.5 },
        { item: 'medkitS', x: 128, z: 0 },
        { item: 'powerDouble', x: 156, z: -0.5 },
      ],
      boss: { id: 'conde', triggerX: 160, lock: [157, 178] },
    },
  ],
};
