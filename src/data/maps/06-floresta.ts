import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

export const floresta: MapDef = {
  id: 'floresta',
  index: 5,
  name: 'Floresta',
  subtitle: 'Pinheiros sussurram e a lama respira sob a lua verde',
  color: 0x5ae0a0,
  music: 'floresta',
  wizardBias: 0.65,
  scaling: mapScaling(5),
  env: env({
    theme: 'floresta',
    fog: { color: 0x0f1a14, density: 0.045 },
    sky: { top: 0x020605, bottom: 0x12281e, moon: true, stars: 320, moonColor: 0xa0ffd8 },
    hemi: { sky: 0x7ad8b4, ground: 0x1c2616, intensity: 1.0 },
    sun: { color: 0xa0ffd8, intensity: 2.0, dir: [-0.4, 1, 0.55] },
    accent: { color: 0xe8ff7a, flicker: 0.3 },
    grade: {
      lift: [0, 0.02, 0.02],
      gamma: [1, 0.98, 1],
      gain: [0.96, 1.05, 1.03],
      saturation: 0.7,
      contrast: 1.08,
    },
    bloom: { intensity: 1.25, threshold: 0.7 },
    vignette: 0.62,
    grain: 0.07,
    particles: 'fireflies',
    particleDensity: 0.85,
    ground: { color: 0x1e2a18, color2: 0x2a3820, pattern: 'grass' },
    reverb: 'outdoor',
  }),
  levels: [
    {
      id: 'floresta-1',
      name: 'Trilha do Pântano',
      length: 186,
      zBand: [-4, 2],
      parTimeS: 440,
      playerStart: { x: 3, z: 0 },
      hints: [
        { x: 6, text: 'Poças de lama deixam tudo lento — inclusive os zumbis' },
        { x: 160, text: 'O chão borbulha... Pule as ondas de lama do colosso!' },
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
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'runner', count: 2, from: 'sides', intervalS: 0.8 },
                { enemy: 'walker', count: 2, from: 'ground', intervalS: 0.7 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'lumberjack', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's2',
          triggerX: 44,
          lock: { minX: 41, maxX: 59 },
          hazards: [{ kind: 'swamp', x: 50, z: -1.4, w: 4 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'walker', count: 3, from: 'ground', intervalS: 0.6 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'lumberjack', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'runner', count: 3, from: 'sides', intervalS: 0.9 },
                { enemy: 'walker', count: 2, from: 'left', intervalS: 1.2 },
                { enemy: 'lumberjack', count: 1, from: 'right', intervalS: 2 },
              ],
            },
          ],
        },
        {
          id: 's3',
          triggerX: 76,
          lock: null,
          hazards: [
            { kind: 'swamp', x: 84, z: 0.4, w: 5 },
            { kind: 'swamp', x: 96, z: -2.7, w: 4 },
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
              start: { k: 'timeS', s: 7 },
              spawns: [
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.5 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'lumberjack', count: 2, from: 'right', intervalS: 2.5 },
                { enemy: 'runner', count: 2, from: 'sides', intervalS: 1 },
                { enemy: 'walker', count: 1, from: 'right', intervalS: 1.5 },
              ],
            },
          ],
        },
        {
          id: 's4',
          triggerX: 110,
          lock: { minX: 107, maxX: 125 },
          hazards: [{ kind: 'swamp', x: 116, z: -1.2, w: 4.5 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 10,
              spawns: [
                { enemy: 'walker', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'runner', count: 3, from: 'right', intervalS: 1 },
                { enemy: 'spitter', count: 2, from: 'left', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'lumberjack', count: 2, from: 'sides', intervalS: 1.8 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 1 },
              maxAlive: 10,
              spawns: [
                { enemy: 'runner', count: 4, from: 'sides', intervalS: 0.8 },
                { enemy: 'walker', count: 2, from: 'ground', intervalS: 0.6 },
                { enemy: 'lumberjack', count: 2, from: 'sides', intervalS: 2 },
              ],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 142,
          lock: { minX: 139, maxX: 157 },
          hazards: [
            { kind: 'swamp', x: 145, z: 0.9, w: 3.5 },
            { kind: 'swamp', x: 153, z: -3, w: 3.5 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 11,
              spawns: [
                { enemy: 'runner', count: 4, from: 'sides', intervalS: 0.8 },
                { enemy: 'walker', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 3 },
              spawns: [
                { enemy: 'lumberjack', count: 2, from: 'right', intervalS: 2 },
                { enemy: 'spitter', count: 2, from: 'left', intervalS: 1.5 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              maxAlive: 12,
              spawns: [
                { enemy: 'runner', count: 3, from: 'sides', intervalS: 0.7 },
                { enemy: 'walker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'lumberjack', count: 2, from: 'sides', intervalS: 2 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.5 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 20, z: -3.1, drop: 'medkitS' },
        { kind: 'barrel', x: 30, z: 1.4 },
        { kind: 'crate', x: 38, z: -3.2, drop: 'melee_machete' },
        { kind: 'explosiveBarrel', x: 54, z: 1.3 },
        { kind: 'crate', x: 64, z: -3, drop: 'ammoShell' },
        { kind: 'crate', x: 70, z: 1.3 },
        { kind: 'barrel', x: 90, z: -3.3 },
        { kind: 'crate', x: 102, z: 1.4, drop: 'powerTurbo' },
        { kind: 'explosiveBarrel', x: 114, z: -3.2 },
        { kind: 'crate', x: 122, z: 1.3, drop: 'melee_katana' },
        { kind: 'barrel', x: 132, z: -3 },
        { kind: 'crate', x: 148, z: 1.4, drop: 'mana' },
        { kind: 'explosiveBarrel', x: 156, z: -3.1 },
        { kind: 'crate', x: 160, z: -3.1, drop: 'medkitL' },
        { kind: 'crate', x: 163, z: 1.3, drop: 'powerDouble' },
      ],
      pickups: [
        { item: 'ammoCurrent', x: 60, z: -1 },
        { item: 'mana', x: 92, z: 0 },
        { item: 'medkitS', x: 130, z: -0.5 },
      ],
      boss: { id: 'pantano', triggerX: 165, lock: [162, 183] },
    },
  ],
};
