import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

export const banco: MapDef = {
  id: 'banco',
  index: 2,
  name: 'Banco',
  subtitle: 'Alarmes, mármore e um cofre que ninguém devia abrir',
  color: 0x4ad8a0,
  music: 'banco',
  wizardBias: 0.3,
  scaling: mapScaling(2),
  env: env({
    theme: 'banco',
    fog: { color: 0x10161a, density: 0.018 },
    sky: { top: 0x05080a, bottom: 0x10161a, moon: false, stars: 0 },
    hemi: { sky: 0xd8f0ff, ground: 0x2a2e2a, intensity: 0.9 },
    sun: { color: 0xd8f0ff, intensity: 1.35, dir: [-0.3, 1, 0.55] },
    accent: { color: 0xd8f0ff, flicker: 0.3 },
    grade: {
      lift: [0, 0.015, 0.025],
      gamma: [1, 1, 1],
      gain: [0.95, 1.03, 1.06],
      saturation: 0.7,
      contrast: 1.1,
    },
    bloom: { intensity: 1.1, threshold: 0.72 },
    vignette: 0.55,
    grain: 0.06,
    particles: 'sparks',
    particleDensity: 0.2,
    ground: { color: 0x6e7470, color2: 0x4e5652, pattern: 'marble' },
    indoor: true,
    reverb: 'room',
  }),
  levels: [
    {
      id: 'banco-1',
      name: 'Agência Central',
      length: 185,
      zBand: [-3, 1.5],
      parTimeS: 450,
      playerStart: { x: 3, z: -0.5 },
      hazards: [
        { kind: 'laserTrip', x: 63, z: -0.75, d: 6 },
        { kind: 'laserTrip', x: 121, z: -0.75, d: 6 },
      ],
      hints: [
        { x: 56, text: 'Alarme a laser! Cruzar o feixe vermelho chama robôs de segurança' },
        { x: 96, text: 'Pisos energizados piscam antes do choque — espere ou pule' },
        { x: 152, text: 'O Guardião do Cofre desperta! Fuja das casas eletrificadas' },
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
                { enemy: 'bankWalker', count: 3, from: 'right', intervalS: 0.9 },
                { enemy: 'bankWalker', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'runner', count: 2, from: 'sides', intervalS: 1 },
                { enemy: 'soldier', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'bankWalker', count: 2, from: 'ground', intervalS: 0.7 },
                { enemy: 'drone', count: 1, from: 'back', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'bankWalker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'soldier', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'drone', count: 2, from: 'front', intervalS: 1.2 },
                { enemy: 'bankWalker', count: 2, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'runner', count: 1, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's3',
          triggerX: 72,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'bankWalker', count: 2, from: 'left', intervalS: 2.4 },
                { enemy: 'soldier', count: 3, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'drone', count: 2, from: 'back', intervalS: 2 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1.5 },
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
          triggerX: 100,
          lock: { minX: 97, maxX: 115 },
          hazards: [
            { kind: 'electricTile', x: 102.5, z: -2.1, w: 2.2, d: 1.8, periodS: 3 },
            { kind: 'electricTile', x: 106.5, z: 0.5, w: 2.2, d: 1.8, periodS: 3, offsetS: 1 },
            { kind: 'electricTile', x: 110.5, z: -1.2, w: 2.2, d: 1.8, periodS: 3, offsetS: 2 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'bankWalker', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'drone', count: 1, from: 'front', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.4 },
                { enemy: 'soldier', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'bankWalker', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'runner', count: 2, from: 'sides', intervalS: 0.9 },
              ],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 132,
          lock: { minX: 129, maxX: 147 },
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'bankWalker', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'drone', count: 2, from: 'front', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 2.5 },
                { enemy: 'bankWalker', count: 2, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'drone', count: 3, from: 'back', intervalS: 1.2 },
                { enemy: 'soldier', count: 2, from: 'left', intervalS: 1.2 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'bin', x: 18, z: -2.6, drop: 'medkitS' },
        { kind: 'atm', x: 26, z: -2.8 },
        { kind: 'crate', x: 46, z: 1.2, drop: 'gun_rifle' },
        { kind: 'bin', x: 52, z: -2.6 },
        { kind: 'explosiveBarrel', x: 59, z: 1.2 },
        { kind: 'atm', x: 67, z: -2.8, drop: 'melee_bat' },
        { kind: 'weaponCrate', x: 84, z: -2.6 },
        { kind: 'crate', x: 92, z: 1.2, drop: 'mana' },
        { kind: 'explosiveBarrel', x: 104, z: 1.3 },
        { kind: 'bin', x: 117, z: -2.6, drop: 'shield' },
        { kind: 'atm', x: 125, z: -2.8 },
        { kind: 'crate', x: 137, z: 1.2, drop: 'melee_pipe' },
        { kind: 'crate', x: 153, z: -2.6, drop: 'medkitL' },
      ],
      pickups: [
        { item: 'ammoRifle', x: 58, z: -1 },
        { item: 'mana', x: 88, z: 0.5 },
        { item: 'medkitS', x: 124, z: -0.5 },
      ],
      boss: { id: 'guardiao', triggerX: 160, lock: [157, 178] },
    },
  ],
};
