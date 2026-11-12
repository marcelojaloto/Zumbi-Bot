import '../bosses/12-halfpipe';
import { season2Scaling } from '../balance';
import { registerEnemies, runner, spitter, variant, walker } from '../enemies';
import { env } from '../env';
import { MUSIC, SCALES } from '../music';
import type { MapDef } from '../types';

// skate punk: rápido, baixo em colcheias e bateria reta
MUSIC.praca = {
  id: 'praca',
  bpm: 148,
  root: 52, // Mi
  scale: [...SCALES.dorian],
  progression: [0, 5, 3, 4],
  bass: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 1, 0],
  lead: { wave: 'sawtooth', density: 0.38, octave: 2, seed: 127 },
  pad: { wave: 'square', detune: 9 },
  drums: {
    kick: [2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 0, 1, 0],
    snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
  },
  bossBpm: 168,
};

registerEnemies(
  variant(runner, {
    id: 'pracaSkater',
    name: 'Zumbi Skatista',
    hp: 34,
    speed: 4.8,
    rewards: { xp: 14, score: 170, scrap: [1, 4], drops: 'kill', cosmeticChance: 0.015 },
    rig: {
      ...runner.rig,
      skin: 0x7c8c66,
      cloth: 0x3a4a8a,
      cloth2: 0x2a2a30,
      eye: 0x3affc8,
      hunch: 0.5,
      extra: 'praca_skater',
    },
  }),
  variant(walker, {
    id: 'pracaPunk',
    name: 'Punk Zumbi',
    hp: 62,
    speed: 1.5,
    rewards: { xp: 16, score: 180, scrap: [2, 5], drops: 'kill', cosmeticChance: 0.015 },
    rig: {
      ...walker.rig,
      skin: 0x74846a,
      cloth: 0x1c1c22,
      cloth2: 0x3a2a4a,
      eye: 0xff3ad7,
      hunch: 0.4,
      extra: 'praca_punk',
    },
  }),
  // cospe tinta tóxica de longe
  variant(spitter, {
    id: 'pracaTagger',
    name: 'Grafiteiro Zumbi',
    hp: 40,
    rig: {
      ...spitter.rig,
      skin: 0x7a9a5a,
      cloth: 0x5a2a6a,
      cloth2: 0x2a2a30,
      eye: 0xffd23a,
      extra: 'praca_tagger',
    },
  }),
);

export const praca: MapDef = {
  id: 'praca',
  index: 11,
  season: 2,
  name: 'Praça do Skate',
  subtitle: 'A pista nunca fecha: os skatistas é que não voltaram para casa',
  color: 0x3affc8,
  music: 'praca',
  wizardBias: 0.4,
  scaling: season2Scaling(1),
  env: env({
    theme: 'praca',
    fog: { color: 0x141a2a, density: 0.02 },
    sky: { top: 0x050814, bottom: 0x1c2440, moon: true, stars: 300, moonColor: 0xdfe6ff },
    hemi: { sky: 0x8fa6ff, ground: 0x221c18, intensity: 0.95 },
    sun: { color: 0xa8bcff, intensity: 1.7, dir: [-0.45, 1, 0.55] },
    accent: { color: 0x3affc8, flicker: 0.3 },
    grade: {
      lift: [0.005, 0.005, 0.02],
      gamma: [1, 1, 1],
      gain: [1, 1.02, 1.05],
      saturation: 1,
      contrast: 1.08,
    },
    bloom: { intensity: 1.25, threshold: 0.7 },
    vignette: 0.55,
    grain: 0.07,
    particles: 'fireflies',
    particleDensity: 0.35,
    ground: { color: 0x3c3c44, color2: 0x2e2e36, pattern: 'stone' },
    reverb: 'outdoor',
  }),
  levels: [
    {
      id: 'praca-1',
      name: 'Pista do Half-Pipe',
      length: 192,
      zBand: [-3.5, 2],
      parTimeS: 480,
      playerStart: { x: 3, z: -0.5 },
      hazards: [
        // trecho livre da pista: corrimãos ao comprido e fileiras de cones
        { kind: 'hurdle', x: 76, z: -2.4, w: 0.4, d: 1.8 },
        { kind: 'hurdle', x: 82, z: 0.2, w: 3.2, d: 0.4 },
        { kind: 'hurdle', x: 88, z: 1, w: 0.4, d: 1.8 },
        { kind: 'hurdle', x: 93, z: -1.8, w: 3.2, d: 0.4 },
      ],
      hints: [
        { x: 16, text: 'Cones, bancos e corrimãos derrubam quem esbarra neles: pule por cima' },
        { x: 100, text: 'O chafariz transbordou: na água todo mundo anda devagar, zumbi também' },
        {
          x: 156,
          text: 'O Rei do Half-Pipe tomou a ponte! Pule os skates soltos e bata quando ele cair do skate',
        },
      ],
      segments: [
        {
          id: 's1',
          triggerX: 12,
          lock: { minX: 9, maxX: 27 },
          hazards: [{ kind: 'hurdle', x: 21, z: -2.3, w: 0.4, d: 1.8 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'pracaPunk', count: 3, from: 'right', intervalS: 0.9 },
                { enemy: 'pracaSkater', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'pracaSkater', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'pracaTagger', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'pracaPunk', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'ghoul', count: 2, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          // latões em chamas: queimam jogador e zumbi
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [
            { kind: 'fire', x: 44, z: -2.5, w: 1.6 },
            { kind: 'fire', x: 51, z: 1.1, w: 1.6 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'pracaPunk', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'pracaTagger', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'pracaSkater', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'exploder', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'pracaPunk', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
          ],
        },
        {
          // pista livre: os skatistas vêm dos dois lados
          id: 's3',
          triggerX: 70,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'pracaSkater', count: 3, from: 'right', intervalS: 1.8 },
                { enemy: 'pracaTagger', count: 2, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'pracaSkater', count: 3, from: 'left', intervalS: 1.2 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [{ enemy: 'brute', count: 1, from: 'right', intervalS: 1 }],
            },
          ],
        },
        {
          // largo do chafariz: a poça no meio e um banco de cada lado
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'swamp', x: 110, z: -0.9, w: 4.4 },
            { kind: 'hurdle', x: 105, z: 1.2, w: 1.6, d: 0.5 },
            { kind: 'hurdle', x: 115, z: -2.7, w: 1.6, d: 0.5 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'pracaPunk', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'pracaTagger', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'exploder', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'pracaSkater', count: 4, from: 'sides', intervalS: 0.6 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.4 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'ghoul', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'pracaTagger', count: 2, from: 'sides', intervalS: 0.9 },
              ],
            },
          ],
        },
        {
          // pé do half-pipe
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'fire', x: 136, z: 1, w: 1.6 },
            { kind: 'fire', x: 145, z: -2.6, w: 1.6 },
            { kind: 'hurdle', x: 140.5, z: -0.8, w: 3.2, d: 0.4 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'pracaPunk', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'pracaTagger', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'pracaSkater', count: 3, from: 'left', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 2.5 },
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.2 },
                { enemy: 'pracaTagger', count: 2, from: 'left', intervalS: 1.2 },
                { enemy: 'pracaSkater', count: 4, from: 'right', intervalS: 0.6 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'bin', x: 17, z: 1.6, drop: 'medkitS' },
        { kind: 'crate', x: 25, z: -3.1 },
        { kind: 'bin', x: 33, z: 1.6, drop: 'gun_smg' },
        { kind: 'explosiveBarrel', x: 47, z: 1.7 },
        { kind: 'crate', x: 58, z: -3.1, drop: 'mana' },
        { kind: 'weaponCrate', x: 65, z: 1.6 },
        { kind: 'bin', x: 79, z: 1.7, drop: 'melee_bat' },
        { kind: 'explosiveBarrel', x: 90, z: -3.1 },
        { kind: 'crate', x: 98, z: -3.1, drop: 'shield' },
        { kind: 'bin', x: 122, z: 1.6, drop: 'medkitL' },
        { kind: 'crate', x: 127, z: -3.1 },
        { kind: 'explosiveBarrel', x: 142, z: 1.7 },
        { kind: 'bin', x: 152, z: -3.1, drop: 'medkitL' },
        { kind: 'crate', x: 156, z: 1.6, drop: 'mana' },
      ],
      pickups: [
        { item: 'ammoShell', x: 60, z: -0.5 },
        { item: 'mana', x: 97, z: 0.8 },
        { item: 'medkitS', x: 126, z: -0.5 },
      ],
      // a luta é na ponte: a faixa encolhe para o tabuleiro dela
      boss: { id: 'halfpipe', triggerX: 163, lock: [160, 182], zBand: [-2.4, 1.4] },
    },
  ],
};
