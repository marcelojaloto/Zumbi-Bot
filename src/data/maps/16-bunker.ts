import '../bosses/16-casamata';
import { season2Scaling } from '../balance';
import { brute, registerEnemies, runner, soldier, variant, walker } from '../enemies';
import { env } from '../env';
import { MUSIC, SCALES } from '../music';
import type { MapDef } from '../types';

const R = -1;

// marcha militar lenta, com caixa em rufo
MUSIC.bunker = {
  id: 'bunker',
  bpm: 104,
  root: 41, // Fá
  scale: [...SCALES.phrygian],
  progression: [0, 1, 0, 5],
  bass: [0, R, 0, R, 0, R, 1, R, 0, R, 0, R, 2, R, 1, 1],
  lead: { wave: 'square', density: 0.24, octave: 2, seed: 127 },
  pad: { wave: 'sawtooth', detune: 13 },
  drums: {
    kick: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 1, 0],
    snare: [0, 0, 1, 0, 2, 0, 1, 1, 0, 0, 1, 0, 2, 1, 1, 1],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  },
  bossBpm: 132,
};

registerEnemies(
  variant(walker, {
    id: 'bunker_sentry',
    name: 'Zumbi Sentinela',
    hp: 80,
    speed: 1.4,
    resist: { bullet: 0.75 },
    rewards: { xp: 18, score: 200, scrap: [2, 5], drops: 'kill', cosmeticChance: 0.015 },
    rig: {
      ...walker.rig,
      cloth: 0x3e4a34,
      cloth2: 0x2c3426,
      eye: 0x8aff5a,
      accessory: 'helmet',
      extra: 'bunker_vest',
    },
  }),
  variant(runner, {
    id: 'bunker_gasmask',
    name: 'Zumbi do Filtro',
    hp: 42,
    statusImmune: ['poison'],
    resist: { toxic: 0 },
    rig: {
      ...runner.rig,
      cloth: 0x5a5a3a,
      cloth2: 0x33362a,
      eye: 0xd8ff3a,
      accessory: 'gasmask',
      extra: 'bunker_tank',
    },
  }),
  variant(soldier, {
    id: 'bunker_gunner',
    name: 'Robô Artilheiro',
    hp: 100,
    rig: { ...soldier.rig, skin: 0x4e5a42, cloth: 0x2c3228, cloth2: 0xffc21a, extra: 'bunker_turret' },
  }),
  variant(brute, {
    id: 'bunker_shield',
    name: 'Zumbi Blindado',
    hp: 260,
    resist: { bullet: 0.5, explosive: 0.8 },
    rig: { ...brute.rig, cloth: 0x2a2e36, cloth2: 0x1e2228, eye: 0xff5a3a, extra: 'bunker_shield' },
  }),
);

export const bunker: MapDef = {
  id: 'bunker',
  index: 15,
  season: 2,
  name: 'Bunker',
  subtitle: 'Concreto, alarmes e a única saída para o mar',
  color: 0x8a9a5a,
  music: 'bunker',
  wizardBias: 0.3,
  scaling: season2Scaling(5),
  env: env({
    theme: 'bunker',
    fog: { color: 0x12160f, density: 0.02 },
    sky: { top: 0x050604, bottom: 0x12160f, moon: false, stars: 0 },
    hemi: { sky: 0xd8e0c8, ground: 0x24281e, intensity: 0.8 },
    sun: { color: 0xd8e4c8, intensity: 1.25, dir: [-0.3, 1, 0.55] },
    accent: { color: 0xff3b30, flicker: 0.6 },
    grade: {
      lift: [0.01, 0.014, 0],
      gamma: [1, 1, 1],
      gain: [1.02, 1.04, 0.94],
      saturation: 0.72,
      contrast: 1.12,
    },
    bloom: { intensity: 1.15, threshold: 0.72 },
    vignette: 0.62,
    grain: 0.08,
    particles: 'dust',
    particleDensity: 0.35,
    ground: { color: 0x565a52, color2: 0x44483f, pattern: 'stone' },
    indoor: true,
    reverb: 'cave',
  }),
  levels: [
    {
      id: 'bunker-1',
      name: 'Corredor Blindado',
      length: 196,
      zBand: [-3, 1.5],
      parTimeS: 500,
      playerStart: { x: 3, z: -0.5 },
      hazards: [
        { kind: 'laserTrip', x: 32, z: -0.75, d: 6 },
        // portas blindadas: fecham o corredor inteiro
        { kind: 'press', x: 80, z: -0.75, w: 1.2, d: 4.5, periodS: 3.8 },
        { kind: 'press', x: 92, z: -0.75, w: 1.2, d: 4.5, periodS: 3.8, offsetS: 1.9 },
        { kind: 'mine', x: 85, z: -2.1 },
        { kind: 'mine', x: 87.5, z: 0.6 },
        { kind: 'laserTrip', x: 124, z: -0.75, d: 6 },
      ],
      hints: [
        { x: 36, text: 'Respiradouros soltam gás em ciclos: espere fechar ou dê a volta' },
        { x: 70, text: 'As portas blindadas descem em ciclos: passe quando subirem' },
        { x: 158, text: 'Comandante Casamata na mira! Abata os mísseis e bata quando o mech superaquecer' },
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
                { enemy: 'soldierZombie', count: 3, from: 'right', intervalS: 0.9 },
                { enemy: 'bunker_sentry', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'bunker_gasmask', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'soldier', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'bunker_sentry', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'drone', count: 1, from: 'back', intervalS: 1 },
              ],
            },
          ],
        },
        {
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [
            { kind: 'gasVent', x: 43, z: -2, periodS: 4 },
            { kind: 'gasVent', x: 50, z: 0.5, periodS: 4, offsetS: 2 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'toxicWalker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'bunker_gunner', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'bunker_gasmask', count: 3, from: 'right', intervalS: 0.7 },
                { enemy: 'drone', count: 1, from: 'back', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'bunker_shield', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'soldier', count: 1, from: 'left', intervalS: 1.2 },
              ],
            },
          ],
        },
        {
          // corredor das portas blindadas (sem trava)
          id: 's3',
          triggerX: 70,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'bunker_sentry', count: 3, from: 'right', intervalS: 2.2 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'bunker_gasmask', count: 2, from: 'left', intervalS: 1.4 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [{ enemy: 'mech', count: 1, from: 'right', intervalS: 1 }],
            },
          ],
        },
        {
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'electricTile', x: 106.5, z: -2.1, w: 2.2, d: 1.8, periodS: 3 },
            { kind: 'electricTile', x: 110.5, z: 0.5, w: 2.2, d: 1.8, periodS: 3, offsetS: 1 },
            { kind: 'electricTile', x: 114.5, z: -1.2, w: 2.2, d: 1.8, periodS: 3, offsetS: 2 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'bunker_sentry', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'bunker_gunner', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'drone', count: 1, from: 'front', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'bunker_shield', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'bunker_gasmask', count: 3, from: 'sides', intervalS: 0.6 },
                { enemy: 'soldier', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'soldierZombie', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'exploder', count: 2, from: 'sides', intervalS: 0.9 },
              ],
            },
          ],
        },
        {
          // paiol: minas no chão e gás
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'mine', x: 136, z: -2.2 },
            { kind: 'mine', x: 139.5, z: 0.7 },
            { kind: 'mine', x: 143, z: -1 },
            { kind: 'mine', x: 146, z: 0.9 },
            { kind: 'gasVent', x: 141, z: -2.3, periodS: 4.4 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'bunker_sentry', count: 3, from: 'ground', intervalS: 0.6 },
                { enemy: 'bunker_gunner', count: 2, from: 'right', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'bunker_shield', count: 2, from: 'sides', intervalS: 2.5 },
                { enemy: 'drone', count: 2, from: 'front', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'bunker_gasmask', count: 3, from: 'left', intervalS: 0.7 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 18, z: 1.2, drop: 'medkitS' },
        { kind: 'barrel', x: 24, z: -2.6 },
        { kind: 'weaponCrate', x: 34, z: 1.2 },
        { kind: 'explosiveBarrel', x: 47, z: 1.3 },
        { kind: 'crate', x: 58, z: -2.6, drop: 'gun_rifle' },
        { kind: 'crate', x: 66, z: 1.2, drop: 'mana' },
        { kind: 'barrel', x: 76, z: -2.6, drop: 'shield' },
        { kind: 'explosiveBarrel', x: 97, z: 1.3 },
        { kind: 'crate', x: 100, z: -2.6, drop: 'melee_pipe' },
        { kind: 'weaponCrate', x: 122, z: 1.2 },
        { kind: 'crate', x: 128, z: -2.6, drop: 'medkitL' },
        { kind: 'explosiveBarrel', x: 138, z: 1.3 },
        { kind: 'crate', x: 153, z: -2.6, drop: 'medkitL' },
        { kind: 'crate', x: 157, z: 1.2, drop: 'mana' },
      ],
      pickups: [
        { item: 'ammoRifle', x: 62, z: -0.5 },
        { item: 'mana', x: 98, z: 0.6 },
        { item: 'medkitS', x: 127, z: -0.5 },
      ],
      boss: { id: 'casamata', triggerX: 166, lock: [163, 185] },
    },
  ],
};
