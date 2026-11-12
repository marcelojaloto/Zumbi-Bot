import '../bosses/19-abissal';
import { season2Scaling } from '../balance';
import { brute, drone, exploder, registerEnemies, soldier, variant, walker } from '../enemies';
import { env } from '../env';
import { MUSIC, SCALES } from '../music';
import type { MapDef } from '../types';

const R = -1;
MUSIC.mar = {
  id: 'mar',
  bpm: 104,
  root: 44, // Sol sustenido
  scale: [...SCALES.phrygian],
  progression: [0, 5, 1, 4],
  bass: [0, R, R, 0, R, R, 1, R, 0, R, R, 2, R, R, 1, R],
  lead: { wave: 'sine', density: 0.3, octave: 2, seed: 191 },
  pad: { wave: 'sawtooth', detune: 16 },
  drums: {
    kick: [2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    hat: [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0],
  },
  bossBpm: 148,
};

registerEnemies(
  variant(walker, {
    id: 'mar_swimmer',
    name: 'Zumbi Nadador',
    hp: 70,
    speed: 2.1,
    resist: { water: 0.5, electric: 1.4 },
    rewards: { xp: 18, score: 200, scrap: [2, 5], drops: 'kill', cosmeticChance: 0.015 },
    rig: {
      ...walker.rig,
      skin: 0x5a8a86,
      cloth: 0x1a3a4a,
      cloth2: 0x12242e,
      eye: 0x7affea,
      hunch: 0.9,
      extra: 'mar_swimmer',
    },
  }),
  // voa baixo em cardume e morde de perto
  variant(drone, {
    id: 'mar_piranha',
    name: 'Piranha Zumbi',
    family: 'zombie',
    hp: 22,
    speed: 4.6,
    fly: 0.9,
    radius: 0.3,
    keepDistance: [1, 2.4],
    statusImmune: ['root'],
    resist: { water: 0.5, electric: 1.5, blade: 1.1, blunt: 1, cyber: 1, holy: 1.3 },
    attacks: [
      {
        id: 'bite',
        kind: 'ranged',
        projectile: {
          visual: 'blade',
          speed: 14,
          radius: 0.3,
          lifeS: 0.22,
          y: 0.9,
          hit: { damage: 7, dtype: 'blade', knockback: 1, hitstun: 12, hitstop: 2 },
        },
        range: [0.4, 3],
        windup: 14,
        cooldownS: 1.1,
        weight: 1,
        token: 'ranged',
      },
    ],
    rewards: { xp: 8, score: 120, scrap: [1, 2], drops: 'kill', cosmeticChance: 0.01 },
    rig: {
      kind: 'drone',
      scale: 0.8,
      skin: 0x6a8a5a,
      cloth: 0x3a5a3a,
      cloth2: 0xff3a3a,
      eye: 0xff2a2a,
      extra: 'mar_piranha',
    },
  }),
  variant(brute, {
    id: 'mar_diver',
    name: 'Mergulhador Afogado',
    hp: 300,
    resist: { water: 0.5, bullet: 0.7, electric: 1.3 },
    rig: {
      ...brute.rig,
      skin: 0x6a7a70,
      cloth: 0x8a6a3a,
      cloth2: 0x4a3a22,
      eye: 0xffd24a,
      extra: 'mar_diver',
    },
  }),
  variant(exploder, {
    id: 'mar_puffer',
    name: 'Baiacu Bomba',
    hp: 36,
    speed: 2.5,
    rig: {
      ...exploder.rig,
      skin: 0xc8b85a,
      cloth: 0xa8983a,
      cloth2: 0x6a5a2a,
      eye: 0xff3a1a,
      accessory: 'none',
      bulk: 1.5,
      extra: 'mar_puffer',
    },
  }),
  variant(soldier, {
    id: 'mar_harpoon',
    name: 'Arpoador',
    hp: 90,
    rig: {
      ...soldier.rig,
      skin: 0x2a5a6a,
      cloth: 0x14303a,
      cloth2: 0xffb02a,
      eye: 0x39e6ff,
      extra: 'mar_harpoon',
    },
  }),
);

export const mar: MapDef = {
  id: 'mar',
  index: 18,
  season: 2,
  name: 'Fundo do Mar',
  subtitle: 'Lá embaixo, onde a luz não chega, um pulso vermelho ainda bate',
  color: 0x39c8ff,
  music: 'mar',
  wizardBias: 0.5,
  scaling: season2Scaling(8),
  underwater: true,
  env: env({
    theme: 'mar',
    fog: { color: 0x06202c, density: 0.03 },
    sky: { top: 0x020a12, bottom: 0x0a3040, moon: false, stars: 0 },
    hemi: { sky: 0x6ad8ff, ground: 0x0a2028, intensity: 1 },
    sun: { color: 0x8ae0ff, intensity: 1.5, dir: [-0.2, 1, 0.4] },
    accent: { color: 0x39e6ff, flicker: 0.4 },
    grade: {
      lift: [0, 0.012, 0.03],
      gamma: [1, 1, 1],
      gain: [0.92, 1.02, 1.1],
      saturation: 0.9,
      contrast: 1.1,
    },
    bloom: { intensity: 1.35, threshold: 0.66 },
    vignette: 0.65,
    grain: 0.06,
    particles: 'snow',
    particleDensity: 0.35,
    ground: { color: 0x3a5a5a, color2: 0x2a4648, pattern: 'sand' },
    reverb: 'cave',
  }),
  levels: [
    {
      id: 'mar-1',
      name: 'Laboratório Abissal',
      length: 200,
      zBand: [-3.2, 1.8],
      parTimeS: 560,
      playerStart: { x: 3, z: -0.5 },
      hazards: [
        { kind: 'gust', x: 76, z: 1.6, w: 5, d: 5 },
        { kind: 'gust', x: 86, z: -3, w: 5, d: 5 },
        { kind: 'mine', x: 81, z: -0.6 },
        { kind: 'mine', x: 91, z: 0.6 },
        { kind: 'mine', x: 95, z: -2 },
      ],
      hints: [
        {
          x: 5,
          text: "Debaixo d'água o pulo vai mais alto e a queda é lenta: use isso para passar por cima",
        },
        { x: 68, text: 'Correntes empurram de lado e as minas flutuam paradas: não encoste nelas' },
        { x: 158, text: 'A cópia do OMEGA-Z! Abata os torpedos e bata quando o núcleo superaquecer' },
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
                { enemy: 'mar_swimmer', count: 3, from: 'right', intervalS: 0.9 },
                { enemy: 'mar_piranha', count: 3, from: 'back', intervalS: 0.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'mar_piranha', count: 4, from: 'front', intervalS: 0.4 },
                { enemy: 'mar_swimmer', count: 2, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'mar_puffer', count: 2, from: 'sides', intervalS: 0.8 },
                { enemy: 'mar_swimmer', count: 2, from: 'ground', intervalS: 0.8 },
              ],
            },
          ],
        },
        {
          // floresta de algas: deixa todo mundo lento
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [
            { kind: 'swamp', x: 43, z: -1.8, w: 3.6 },
            { kind: 'swamp', x: 49.5, z: 0.4, w: 3.6 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'mar_swimmer', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'mar_harpoon', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'mar_piranha', count: 5, from: 'back', intervalS: 0.4 },
                { enemy: 'mar_puffer', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'mar_diver', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'mar_swimmer', count: 2, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          // campo minado com correntes (sem trava)
          id: 's3',
          triggerX: 70,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'mar_swimmer', count: 3, from: 'right', intervalS: 2.2 },
                { enemy: 'mar_harpoon', count: 2, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'mar_piranha', count: 5, from: 'back', intervalS: 0.6 },
                { enemy: 'mar_puffer', count: 2, from: 'left', intervalS: 1.6 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [{ enemy: 'mar_diver', count: 1, from: 'right', intervalS: 1 }],
            },
          ],
        },
        {
          // fontes termais
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'gasVent', x: 106, z: -2, periodS: 4 },
            { kind: 'gasVent', x: 111, z: 0.6, periodS: 4, offsetS: 1.3 },
            { kind: 'gasVent', x: 115.5, z: -1.4, periodS: 4, offsetS: 2.6 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'mar_swimmer', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'mar_harpoon', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'mar_piranha', count: 3, from: 'front', intervalS: 0.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'mar_diver', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'mar_puffer', count: 3, from: 'sides', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'mar_piranha', count: 6, from: 'back', intervalS: 0.35 },
                { enemy: 'mar_harpoon', count: 2, from: 'sides', intervalS: 0.9 },
              ],
            },
          ],
        },
        {
          // antessala do laboratório
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'electricTile', x: 136, z: -2, w: 2.2, d: 1.8, periodS: 3 },
            { kind: 'electricTile', x: 140.5, z: 0.5, w: 2.2, d: 1.8, periodS: 3, offsetS: 1 },
            { kind: 'electricTile', x: 145, z: -1.2, w: 2.2, d: 1.8, periodS: 3, offsetS: 2 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'mar_harpoon', count: 3, from: 'right', intervalS: 1.2 },
                { enemy: 'mar_swimmer', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'drone', count: 2, from: 'front', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'mar_piranha', count: 5, from: 'back', intervalS: 0.4 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'mar_diver', count: 2, from: 'sides', intervalS: 2 },
                { enemy: 'mar_puffer', count: 2, from: 'left', intervalS: 1.2 },
                { enemy: 'mar_harpoon', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 18, z: 1.4, drop: 'medkitS' },
        { kind: 'barrel', x: 30, z: -2.8 },
        { kind: 'weaponCrate', x: 34, z: 1.4 },
        { kind: 'explosiveBarrel', x: 46, z: 1.5 },
        { kind: 'crate', x: 58, z: -2.8, drop: 'mana' },
        { kind: 'crate', x: 66, z: 1.4, drop: 'gun_rifle' },
        { kind: 'explosiveBarrel', x: 99, z: -2.8 },
        { kind: 'crate', x: 100, z: 1.4, drop: 'shield' },
        { kind: 'barrel', x: 122, z: -2.8 },
        { kind: 'crate', x: 126, z: 1.4, drop: 'medkitL' },
        { kind: 'explosiveBarrel', x: 139, z: 1.5 },
        { kind: 'crate', x: 153, z: -2.8, drop: 'medkitL' },
        { kind: 'crate', x: 157, z: 1.4, drop: 'mana' },
      ],
      pickups: [
        { item: 'ammoRifle', x: 62, z: -0.5 },
        { item: 'mana', x: 98, z: 0.4 },
        { item: 'medkitS', x: 128, z: -0.5 },
      ],
      boss: { id: 'abissal', triggerX: 166, lock: [163, 189] },
    },
  ],
};
