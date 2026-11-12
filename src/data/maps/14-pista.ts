import '../bosses/14-recordista';
import { season2Scaling } from '../balance';
import { brute, registerEnemies, runner, spitter, variant, walker } from '../enemies';
import { env } from '../env';
import { MUSIC, SCALES } from '../music';
import type { MapDef, ProjectileSpec } from '../types';

const R = -1;

MUSIC.pista = {
  id: 'pista',
  bpm: 134,
  root: 50, // Ré
  scale: [...SCALES.dorian],
  progression: [0, 3, 4, 3],
  bass: [0, 0, R, 0, 2, R, 0, R, 0, 0, R, 0, 1, R, 2, R],
  lead: { wave: 'square', density: 0.36, octave: 2, seed: 131 },
  pad: { wave: 'sawtooth', detune: 8 },
  drums: {
    kick: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 1, 0],
    snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    hat: [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1],
  },
  bossBpm: 156,
};

const dardo: ProjectileSpec = {
  visual: 'blade',
  speed: 15,
  radius: 0.2,
  lifeS: 1.6,
  y: 1.5,
  hit: { damage: 9, dtype: 'blade', knockback: 2, hitstun: 14, hitstop: 3 },
};

registerEnemies(
  variant(runner, {
    id: 'pista_sprinter',
    name: 'Zumbi Velocista',
    hp: 30,
    speed: 5.2,
    rewards: { xp: 14, score: 170, scrap: [1, 3], drops: 'kill', cosmeticChance: 0.015 },
    rig: { ...runner.rig, cloth: 0x2a6ad8, cloth2: 0x16161e, eye: 0xffe03a, extra: 'pista_sprinter' },
  }),
  variant(spitter, {
    id: 'pista_javelin',
    name: 'Lançador de Dardo',
    hp: 45,
    speed: 1.6,
    statusImmune: [],
    resist: { toxic: 0.8 },
    attacks: [
      {
        id: 'dardo',
        kind: 'ranged',
        projectile: dardo,
        range: [3.5, 11],
        windup: 36,
        cooldownS: 2.4,
        weight: 1,
        token: 'ranged',
      },
    ],
    rig: {
      ...spitter.rig,
      skin: 0x7f8f66,
      cloth: 0xd8d8d0,
      cloth2: 0x8a1a2a,
      eye: 0xff8a3a,
      bulk: 1.05,
      extra: 'pista_javelin',
    },
  }),
  variant(brute, {
    id: 'pista_shot',
    name: 'Arremessador de Peso',
    hp: 240,
    rig: { ...brute.rig, cloth: 0xc8a020, cloth2: 0x1e2230, extra: 'pista_shot' },
  }),
  variant(walker, {
    id: 'pista_referee',
    name: 'Juiz de Linha',
    hp: 55,
    speed: 1.5,
    rewards: { xp: 14, score: 150, scrap: [2, 4], drops: 'kill', cosmeticChance: 0.012 },
    rig: { ...walker.rig, cloth: 0xe8e4dc, cloth2: 0x1a1a1e, accessory: 'cap', extra: 'pista_referee' },
  }),
);

/** Mapa 14 (Pista de Corrida): estádio de atletismo ao entardecer; barreiras para pular e vento de través. */
export const pista: MapDef = {
  id: 'pista',
  index: 13,
  season: 2,
  name: 'Pista de Corrida',
  subtitle: 'A largada foi dada, e ninguém aqui para na linha de chegada',
  color: 0xff7a3a,
  music: 'pista',
  wizardBias: 0.4,
  scaling: season2Scaling(3),
  env: env({
    theme: 'pista',
    fog: { color: 0x4a3044, density: 0.012 },
    sky: { top: 0x2a2250, bottom: 0xff9a5a, moon: false, stars: 60 },
    hemi: { sky: 0xffc8a0, ground: 0x3a2a2c, intensity: 1.05 },
    sun: { color: 0xffb070, intensity: 2, dir: [-0.65, 0.55, 0.5] },
    accent: { color: 0xfff0c0, flicker: 0.1 },
    grade: {
      lift: [0.015, 0.004, 0.012],
      gamma: [1, 1, 1],
      gain: [1.06, 1, 0.96],
      saturation: 0.95,
      contrast: 1.08,
    },
    bloom: { intensity: 1.15, threshold: 0.72 },
    vignette: 0.5,
    grain: 0.06,
    particles: 'dust',
    particleDensity: 0.25,
    ground: { color: 0x9a3c2c, color2: 0x8a3226, pattern: 'asphalt' },
    reverb: 'outdoor',
  }),
  levels: [
    {
      id: 'pista-1',
      name: 'Reta Final',
      length: 192,
      zBand: [-3, 1.5],
      parTimeS: 480,
      playerStart: { x: 3, z: -0.75 },
      hazards: [
        { kind: 'hurdle', x: 78, z: -0.75, d: 4.5 },
        { kind: 'hurdle', x: 84, z: -0.75, d: 4.5 },
        { kind: 'hurdle', x: 90, z: -0.75, d: 4.5 },
      ],
      hints: [
        { x: 34, text: 'Barreiras na pista: pule por cima ou leve um tombo' },
        { x: 98, text: 'Vento de través empurra para fora da raia: espere a rajada passar' },
        {
          x: 156,
          text: 'O Recordista corre em linha reta: saia da raia marcada e bata quando ele perder o fôlego',
        },
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
                { enemy: 'pista_sprinter', count: 3, from: 'right', intervalS: 0.8 },
                { enemy: 'pista_referee', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'pista_referee', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'pista_javelin', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [{ enemy: 'pista_sprinter', count: 3, from: 'sides', intervalS: 0.7 }],
            },
          ],
        },
        {
          // barreiras nas raias de fora; a do meio fica livre
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [
            { kind: 'hurdle', x: 46, z: -2.2, d: 1.5 },
            { kind: 'hurdle', x: 46, z: 0.7, d: 1.5 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'pista_referee', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'pista_javelin', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'pista_sprinter', count: 3, from: 'right', intervalS: 0.7 },
                { enemy: 'drone', count: 1, from: 'back', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'pista_shot', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'pista_sprinter', count: 2, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          // corrida com barreiras, sem trava
          id: 's3',
          triggerX: 70,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'pista_sprinter', count: 3, from: 'right', intervalS: 2 },
                { enemy: 'pista_javelin', count: 2, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'pista_referee', count: 3, from: 'left', intervalS: 1.4 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [{ enemy: 'pista_shot', count: 1, from: 'right', intervalS: 1 }],
            },
          ],
        },
        {
          // vento de través, um para cada lado
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'gust', x: 106, z: -2, w: 3.5, d: 6, periodS: 5 },
            { kind: 'gust', x: 114, z: 0.5, w: 3.5, d: 6, periodS: 5, offsetS: 2.5 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'pista_referee', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'pista_javelin', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'pista_sprinter', count: 2, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'pista_sprinter', count: 4, from: 'sides', intervalS: 0.6 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.4 },
                { enemy: 'pista_shot', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'pista_referee', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'pista_javelin', count: 2, from: 'sides', intervalS: 0.9 },
              ],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'hurdle', x: 137, z: -2.2, d: 1.5 },
            { kind: 'hurdle', x: 143, z: 0.7, d: 1.5 },
            { kind: 'gust', x: 140, z: -2, w: 3.5, d: 6, periodS: 6 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'pista_referee', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'pista_javelin', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'pista_sprinter', count: 3, from: 'left', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'pista_shot', count: 2, from: 'sides', intervalS: 2.5 },
                { enemy: 'pista_sprinter', count: 2, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.2 },
                { enemy: 'pista_javelin', count: 2, from: 'left', intervalS: 1.2 },
                { enemy: 'pista_sprinter', count: 3, from: 'right', intervalS: 0.6 },
                { enemy: 'pista_shot', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'bin', x: 17, z: 1.2, drop: 'medkitS' },
        { kind: 'crate', x: 24, z: -2.6 },
        { kind: 'crate', x: 33, z: 1.2, drop: 'gun_shotgun' },
        { kind: 'barrel', x: 51, z: -2.6 },
        { kind: 'bin', x: 58, z: -2.6, drop: 'mana' },
        { kind: 'weaponCrate', x: 64, z: 1.2 },
        { kind: 'crate', x: 74, z: 1.2, drop: 'melee_bat' },
        { kind: 'explosiveBarrel', x: 96, z: -2.7 },
        { kind: 'bin', x: 99, z: 1.2, drop: 'shield' },
        { kind: 'crate', x: 122, z: 1.2, drop: 'medkitL' },
        { kind: 'barrel', x: 127, z: -2.6 },
        { kind: 'explosiveBarrel', x: 147, z: 1.3 },
        { kind: 'crate', x: 153, z: -2.6, drop: 'medkitL' },
        { kind: 'bin', x: 157, z: 1.2, drop: 'mana' },
      ],
      pickups: [
        { item: 'ammoShell', x: 60, z: -0.5 },
        { item: 'mana', x: 97, z: 0.4 },
        { item: 'medkitS', x: 126, z: -0.5 },
      ],
      boss: { id: 'recordista', triggerX: 164, lock: [161, 183] },
    },
  ],
};
