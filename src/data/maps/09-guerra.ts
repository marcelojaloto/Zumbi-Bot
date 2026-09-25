import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

/**
 * Campo de Guerra: terra de ninguém ao entardecer. Crateras, trincheiras, arame farpado,
 * tanques destruídos, artilharia caindo, minas nas faixas e muitas caixas de munição.
 */
export const guerra: MapDef = {
  id: 'guerra',
  index: 8,
  name: 'Campo de Guerra',
  subtitle: 'A guerra acabou. Ninguém avisou os mortos — nem as máquinas',
  color: 0xc8a86a,
  music: 'guerra',
  wizardBias: 0.3,
  scaling: mapScaling(8),
  env: env({
    theme: 'guerra',
    fog: { color: 0x1f1c16, density: 0.03 },
    sky: { top: 0x2a2824, bottom: 0x7a6650, moon: false, stars: 0 },
    hemi: { sky: 0xc8bca4, ground: 0x3a3024, intensity: 1.2 },
    sun: { color: 0xd8c8a8, intensity: 2, dir: [-0.6, 0.8, 0.5] },
    accent: { color: 0xfff0c0, flicker: 0.4 },
    grade: {
      lift: [0.03, 0.02, 0.005],
      gamma: [1, 1, 1],
      gain: [1.06, 1.0, 0.88],
      saturation: 0.6,
      contrast: 1.1,
    },
    bloom: { intensity: 1.05, threshold: 0.75 },
    vignette: 0.55,
    grain: 0.1,
    particles: 'dust',
    particleDensity: 0.7,
    ground: { color: 0x4a4032, color2: 0x3a3024, pattern: 'dirt' },
    reverb: 'outdoor',
  }),
  levels: [
    {
      id: 'guerra-1',
      name: 'Terra de Ninguém',
      length: 184,
      zBand: [-4, 2],
      parTimeS: 480,
      playerStart: { x: 3, z: -1 },
      hints: [
        { x: 4, text: 'Minas no chão (luz vermelha): desvie mudando de faixa' },
        { x: 70, text: 'Artilharia! Saia do círculo vermelho antes do impacto' },
      ],
      hazards: [
        { kind: 'mine', x: 8, z: 0.3 },
        { kind: 'mine', x: 31, z: -2.2 },
        { kind: 'mine', x: 34, z: 0.4 },
        { kind: 'mine', x: 37.5, z: -3.2 },
        { kind: 'mine', x: 61, z: -1 },
        { kind: 'mine', x: 64, z: 1.2 },
        { kind: 'mine', x: 66.5, z: -3 },
        { kind: 'mine', x: 93, z: -1.8 },
        { kind: 'mine', x: 96, z: 0.9 },
        { kind: 'mine', x: 122, z: -0.6 },
        { kind: 'mine', x: 125.5, z: -3.1 },
        { kind: 'mine', x: 128, z: 1.4 },
        { kind: 'mine', x: 153, z: -2.4 },
        { kind: 'mine', x: 155, z: 0.6 },
      ],
      segments: [
        {
          id: 's1',
          triggerX: 12,
          lock: { minX: 9, maxX: 27 },
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 12,
              spawns: [
                { enemy: 'soldierZombie', count: 4, from: 'right', intervalS: 0.9 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              maxAlive: 12,
              spawns: [
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'soldierZombie', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              maxAlive: 12,
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'soldier', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's2',
          triggerX: 42,
          lock: { minX: 39, maxX: 57 },
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 12,
              spawns: [
                { enemy: 'soldierZombie', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'soldier', count: 3, from: 'right', intervalS: 1.2 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 3 },
              maxAlive: 12,
              spawns: [
                { enemy: 'mech', count: 1, from: 'sky', intervalS: 1 },
                { enemy: 'soldierZombie', count: 3, from: 'ground', intervalS: 0.8 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 12,
              spawns: [
                { enemy: 'soldier', count: 3, from: 'sides', intervalS: 1 },
                { enemy: 'mech', count: 1, from: 'sky', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's3',
          triggerX: 72,
          lock: null,
          hazards: [{ kind: 'artillery', x: 78, z: -1, periodS: 4.5 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 12,
              spawns: [
                { enemy: 'soldierZombie', count: 4, from: 'right', intervalS: 1.6 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 2.4 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 2.2 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'timeS', s: 8 },
              maxAlive: 12,
              spawns: [
                { enemy: 'soldierZombie', count: 2, from: 'ground', intervalS: 1.5 },
                { enemy: 'soldier', count: 2, from: 'left', intervalS: 2 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.8 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's4',
          triggerX: 102,
          lock: { minX: 99, maxX: 117 },
          hazards: [
            { kind: 'artillery', x: 108, z: -1, periodS: 5.5, offsetS: 2 },
            { kind: 'mine', x: 110, z: -3.2 },
            { kind: 'mine', x: 113, z: 1.3 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 13,
              spawns: [
                { enemy: 'soldier', count: 3, from: 'right', intervalS: 1 },
                { enemy: 'soldierZombie', count: 3, from: 'sides', intervalS: 0.7 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.2 },
                { enemy: 'brute', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 3 },
              maxAlive: 13,
              spawns: [
                { enemy: 'mech', count: 2, from: 'sky', intervalS: 2.5 },
                { enemy: 'soldierZombie', count: 3, from: 'ground', intervalS: 0.8 },
                { enemy: 'soldier', count: 1, from: 'left', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              maxAlive: 13,
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 1.5 },
                { enemy: 'mech', count: 1, from: 'sky', intervalS: 1 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'artillery', x: 140, z: -1, periodS: 4.5, offsetS: 0.5 },
            { kind: 'mine', x: 136, z: 1.2 },
            { kind: 'mine', x: 145, z: -3.3 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 14,
              spawns: [
                { enemy: 'soldier', count: 3, from: 'sides', intervalS: 0.9 },
                { enemy: 'soldierZombie', count: 3, from: 'right', intervalS: 0.7 },
                { enemy: 'mech', count: 1, from: 'sky', intervalS: 1 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 3 },
              maxAlive: 14,
              spawns: [
                { enemy: 'mech', count: 2, from: 'sky', intervalS: 2 },
                { enemy: 'brute', count: 2, from: 'ground', intervalS: 1.2 },
                { enemy: 'soldierZombie', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 1 },
              maxAlive: 14,
              spawns: [
                { enemy: 'mech', count: 2, from: 'sky', intervalS: 2.5 },
                { enemy: 'soldier', count: 3, from: 'sides', intervalS: 0.9 },
                { enemy: 'brute', count: 2, from: 'left', intervalS: 1.5 },
                { enemy: 'runner', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'drone', count: 1, from: 'sky', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'weaponCrate', x: 18, z: -3.2, drop: 'ammoShell' },
        { kind: 'crate', x: 24, z: 1.3, drop: 'medkitS' },
        { kind: 'weaponCrate', x: 33, z: -3.3, drop: 'gun_rifle' },
        { kind: 'explosiveBarrel', x: 47, z: 1.4 },
        { kind: 'weaponCrate', x: 52, z: -3.4, drop: 'ammoRifle' },
        { kind: 'crate', x: 68, z: 1.3, drop: 'shield' },
        { kind: 'weaponCrate', x: 76, z: -3.3, drop: 'ammoGrenade' },
        { kind: 'weaponCrate', x: 89, z: 1.4, drop: 'gun_gl' },
        { kind: 'explosiveBarrel', x: 105, z: -3.4 },
        { kind: 'weaponCrate', x: 112, z: 1.4, drop: 'ammoLight' },
        { kind: 'crate', x: 120, z: -3.2, drop: 'medkitL' },
        { kind: 'weaponCrate', x: 137, z: -3.4, drop: 'gun_mg' },
        { kind: 'explosiveBarrel', x: 142, z: 1.4 },
        { kind: 'weaponCrate', x: 147, z: -3.2, drop: 'powerInvuln' },
        { kind: 'weaponCrate', x: 158, z: 1.3, drop: 'ammoCurrent' },
        { kind: 'crate', x: 159.5, z: -3.3, drop: 'medkitL' },
      ],
      pickups: [
        { item: 'ammoRifle', x: 40, z: -1 },
        { item: 'mana', x: 98, z: -0.5 },
        { item: 'medkitS', x: 129, z: -1.5 },
        { item: 'ammoShell', x: 152, z: -1 },
      ],
      boss: { id: 'criotanque', triggerX: 164, lock: [161, 182] },
    },
  ],
};
