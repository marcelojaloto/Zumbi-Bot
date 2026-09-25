import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

export const centro: MapDef = {
  id: 'centro',
  index: 6,
  name: 'Centro da Cidade',
  subtitle: 'Neon, chuva e máquinas nas avenidas mortas',
  color: 0xff3ad7,
  music: 'centro',
  wizardBias: 0.2,
  scaling: mapScaling(6),
  env: env({
    theme: 'centro',
    fog: { color: 0x14121c, density: 0.022 },
    sky: { top: 0x040309, bottom: 0x1e1630, moon: false, stars: 60 },
    hemi: { sky: 0x8a80ff, ground: 0x1c1822, intensity: 0.95 },
    sun: { color: 0x9ab0ff, intensity: 1.5, dir: [-0.4, 1, 0.6] },
    accent: { color: 0xff3ad7, flicker: 0.2 },
    grade: {
      lift: [0.01, 0, 0.03],
      gamma: [1, 1, 0.98],
      gain: [1.02, 0.98, 1.06],
      saturation: 1.0,
      contrast: 1.1,
    },
    bloom: { intensity: 1.4, threshold: 0.68 },
    vignette: 0.58,
    grain: 0.08,
    particles: 'rain',
    particleDensity: 0.8,
    ground: { color: 0x1c1c22, color2: 0x2a2a32, pattern: 'asphalt' },
    reverb: 'outdoor',
  }),
  levels: [
    {
      id: 'centro-1',
      name: 'Avenida Neon',
      length: 188,
      zBand: [-3.5, 2],
      parTimeS: 440,
      playerStart: { x: 3, z: 0 },
      hints: [
        { x: 28, text: 'Carros abandonados explodem quando destruídos — atraia os robôs para perto!' },
        { x: 162, text: 'Algo enorme se aproxima... Pule os pulsos hacker e saia da mira do canhão!' },
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
                { enemy: 'walker', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'soldier', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 2, from: 'left', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'runner', count: 2, from: 'sides', intervalS: 0.8 },
                { enemy: 'walker', count: 1, from: 'ground', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's2',
          triggerX: 44,
          lock: { minX: 41, maxX: 59 },
          hazards: [{ kind: 'electricTile', x: 51, z: -2.9, w: 2.2, d: 1.2, periodS: 3.2 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'walker', count: 3, from: 'ground', intervalS: 0.6 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 1 },
                { enemy: 'walker', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's3',
          triggerX: 76,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'walker', count: 3, from: 'left', intervalS: 2.2 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 2 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [{ enemy: 'drone', count: 3, from: 'sky', intervalS: 1.2 }],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'walker', count: 2, from: 'left', intervalS: 1.5 },
                { enemy: 'brute', count: 2, from: 'right', intervalS: 2.5 },
              ],
            },
          ],
        },
        {
          id: 's4',
          triggerX: 110,
          lock: { minX: 107, maxX: 125 },
          hazards: [{ kind: 'electricTile', x: 121, z: 1.2, w: 2.2, d: 1.2, periodS: 2.8, offsetS: 1 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 10,
              spawns: [
                { enemy: 'soldier', count: 4, from: 'sides', intervalS: 1.2 },
                { enemy: 'walker', count: 3, from: 'ground', intervalS: 0.6 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 2 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 1 },
              maxAlive: 10,
              spawns: [
                { enemy: 'runner', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'soldier', count: 3, from: 'right', intervalS: 1.2 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
                { enemy: 'walker', count: 2, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 144,
          lock: { minX: 141, maxX: 159 },
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 11,
              spawns: [
                { enemy: 'walker', count: 3, from: 'sides', intervalS: 0.7 },
                { enemy: 'runner', count: 3, from: 'right', intervalS: 1 },
                { enemy: 'soldier', count: 2, from: 'left', intervalS: 1.5 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 3 },
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 2 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'walker', count: 2, from: 'ground', intervalS: 0.8 },
              ],
            },
            {
              // mini-chefe: mech de assalto com escolta
              start: { k: 'afterCleared', delayS: 1.2 },
              maxAlive: 12,
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 2 },
                { enemy: 'soldier', count: 2, from: 'sides', intervalS: 2 },
                { enemy: 'runner', count: 2, from: 'sides', intervalS: 1.2 },
                { enemy: 'brute', count: 2, from: 'left', intervalS: 3 },
                { enemy: 'walker', count: 2, from: 'left', intervalS: 1.5 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 20, z: -2.8, drop: 'medkitS' },
        { kind: 'bin', x: 26, z: 1.4 },
        { kind: 'car', x: 34, z: -2.3 },
        { kind: 'explosiveBarrel', x: 49, z: 1.3 },
        { kind: 'weaponCrate', x: 56, z: -2.9, drop: 'gun_mg' },
        { kind: 'bin', x: 66, z: -3 },
        { kind: 'crate', x: 72, z: 1.4, drop: 'ammoRifle' },
        { kind: 'atm', x: 86, z: -3.1 },
        { kind: 'car', x: 96, z: 1 },
        { kind: 'crate', x: 104, z: -2.8, drop: 'melee_pipe' },
        { kind: 'explosiveBarrel', x: 117, z: -2.9 },
        { kind: 'car', x: 132, z: -2.3 },
        { kind: 'bin', x: 139, z: 1.4 },
        { kind: 'crate', x: 152, z: -2.9, drop: 'shield' },
        { kind: 'crate', x: 163, z: 1.3, drop: 'medkitL' },
        { kind: 'explosiveBarrel', x: 175, z: -3.1 },
      ],
      pickups: [
        { item: 'ammoRifle', x: 61, z: -0.5 },
        { item: 'mana', x: 90, z: 0 },
        { item: 'medkitS', x: 128, z: -0.5 },
      ],
      boss: { id: 'mecha', triggerX: 167, lock: [164, 185] },
    },
  ],
};
