import '../bosses/13-decibel';
import { season2Scaling } from '../balance';
import { brute, drone, move, registerEnemies, runner, variant, walker } from '../enemies';
import { env } from '../env';
import { MUSIC, SCALES } from '../music';
import type { MapDef } from '../types';

const R = -1;

// rock de garagem: baixo corrido e bumbo em todas as batidas
MUSIC.estudio = {
  id: 'estudio',
  bpm: 132,
  root: 52, // Mi
  scale: [...SCALES.minor],
  progression: [0, 5, 3, 6],
  bass: [0, 0, R, 0, 0, R, 2, 0, 0, 0, R, 0, 1, 1, 3, 1],
  lead: { wave: 'sawtooth', density: 0.4, octave: 2, seed: 131 },
  pad: { wave: 'square', detune: 9 },
  drums: {
    kick: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 1],
    snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
    hat: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 1],
  },
  bossBpm: 150,
};

const guitarrada = move({
  id: 'estudio_guitarrada',
  pose: 'slam',
  startup: 6,
  active: 5,
  recovery: 28,
  hitbox: { x0: 0.2, x1: 1.5, y0: 0, y1: 2, zTol: 0.55 },
  hit: { damage: 14, dtype: 'blunt', knockback: 4, hitstun: 20, hitstop: 5 },
});

registerEnemies(
  variant(walker, {
    id: 'estudioRocker',
    name: 'Zumbi Roqueiro',
    hp: 65,
    speed: 1.6,
    attacks: [
      {
        id: 'guitarrada',
        kind: 'melee',
        move: guitarrada,
        range: [0, 1.3],
        windup: 30,
        cooldownS: 2,
        weight: 1,
        token: 'melee',
      },
    ],
    rewards: { xp: 17, score: 190, scrap: [2, 5], drops: 'kill', cosmeticChance: 0.015 },
    rig: {
      ...walker.rig,
      cloth: 0x1c1c22,
      cloth2: 0x2a2a3a,
      eye: 0xff3ad8,
      hunch: 0.35,
      extra: 'estudio_guitar',
    },
  }),
  variant(runner, {
    id: 'estudioFan',
    name: 'Fã Zumbi',
    hp: 30,
    rig: { ...runner.rig, cloth: 0xd83a8a, cloth2: 0x2a3c7a, eye: 0x5affe0, extra: 'estudio_fan' },
  }),
  variant(brute, {
    id: 'estudioRoadie',
    name: 'Roadie',
    hp: 260,
    rig: { ...brute.rig, cloth: 0x14141a, cloth2: 0x22222a, eye: 0xffd24a, extra: 'estudio_roadie' },
  }),
  variant(drone, {
    id: 'estudioCam',
    name: 'Drone de Câmera',
    hp: 34,
    rig: {
      ...drone.rig,
      skin: 0x22242a,
      cloth: 0x14161a,
      cloth2: 0xff2a2a,
      eye: 0x5ad8ff,
      extra: 'estudio_cam',
    },
  }),
);

/** Mapa 13 (Estúdio de Gravação): o show não parou, e as caixas de som viraram arma. */
export const estudio: MapDef = {
  id: 'estudio',
  index: 12,
  season: 2,
  name: 'Estúdio de Gravação',
  subtitle: 'A luz de NO AR nunca apagou, e a plateia não foi embora',
  color: 0x8a5ae8,
  music: 'estudio',
  wizardBias: 0.5,
  scaling: season2Scaling(2),
  env: env({
    theme: 'estudio',
    fog: { color: 0x120e1c, density: 0.018 },
    sky: { top: 0x06040a, bottom: 0x120e1c, moon: false, stars: 0 },
    hemi: { sky: 0xd8c8ff, ground: 0x221a2c, intensity: 0.85 },
    sun: { color: 0xe8d8ff, intensity: 1.3, dir: [-0.3, 1, 0.55] },
    accent: { color: 0xff3ad8, flicker: 0.4 },
    grade: {
      lift: [0.012, 0, 0.024],
      gamma: [1, 1, 1],
      gain: [1.03, 0.98, 1.06],
      saturation: 0.95,
      contrast: 1.1,
    },
    bloom: { intensity: 1.3, threshold: 0.68 },
    vignette: 0.6,
    grain: 0.07,
    particles: 'dust',
    particleDensity: 0.25,
    ground: { color: 0x3a2c30, color2: 0x2c2226, pattern: 'planks' },
    indoor: true,
    reverb: 'room',
  }),
  levels: [
    {
      id: 'estudio-1',
      name: 'Gravação ao Vivo',
      length: 192,
      zBand: [-3, 1.5],
      parTimeS: 480,
      playerStart: { x: 3, z: -0.5 },
      hazards: [
        { kind: 'laserTrip', x: 62, z: -0.75, d: 6 },
        // corredor das caixas de som: sopram alternadas, do fundo e da frente
        { kind: 'gust', x: 78, z: -2.6, w: 4, d: 6, periodS: 3 },
        { kind: 'gust', x: 86, z: 1.1, w: 4, d: 6, periodS: 3, offsetS: 1 },
        { kind: 'gust', x: 94, z: -2.6, w: 4, d: 6, periodS: 3, offsetS: 2 },
      ],
      hints: [
        { x: 36, text: 'Cabos soltos dão choque: o piso pisca antes, espere ou pule' },
        { x: 72, text: 'As caixas de som sopram rajadas que empurram para o lado: atravesse quando calarem' },
        { x: 156, text: 'DJ Decibel no palco! Pule as ondas de som no ritmo e bata quando der microfonia' },
      ],
      segments: [
        {
          // recepção
          id: 's1',
          triggerX: 12,
          lock: { minX: 9, maxX: 27 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'estudioRocker', count: 3, from: 'right', intervalS: 0.9 },
                { enemy: 'estudioFan', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'estudioFan', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'estudioCam', count: 1, from: 'back', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'estudioRocker', count: 2, from: 'left', intervalS: 1 },
                { enemy: 'soldier', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
        {
          // sala de ensaio: cabos soltos no chão
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [
            { kind: 'electricTile', x: 42.5, z: -2.1, w: 2.2, d: 1.8, periodS: 3 },
            { kind: 'electricTile', x: 46.5, z: 0.5, w: 2.2, d: 1.8, periodS: 3, offsetS: 1 },
            { kind: 'electricTile', x: 50.5, z: -1.2, w: 2.2, d: 1.8, periodS: 3, offsetS: 2 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'estudioRocker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'estudioCam', count: 2, from: 'back', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'estudioFan', count: 4, from: 'right', intervalS: 0.6 },
                { enemy: 'soldier', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'estudioRoadie', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'estudioRocker', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
          ],
        },
        {
          // corredor das caixas de som (sem trava)
          id: 's3',
          triggerX: 70,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'estudioRocker', count: 3, from: 'right', intervalS: 2.2 },
                { enemy: 'estudioCam', count: 2, from: 'front', intervalS: 2.5 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'estudioFan', count: 4, from: 'left', intervalS: 1.2 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [{ enemy: 'estudioRoadie', count: 1, from: 'right', intervalS: 1 }],
            },
          ],
        },
        {
          // palco de ensaio: a pirotecnia dispara sozinha
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'fireJet', x: 106, z: -1.9, w: 1.6, periodS: 3.4 },
            { kind: 'fireJet', x: 110, z: 0.6, w: 1.6, periodS: 3.4, offsetS: 1.1 },
            { kind: 'fireJet', x: 114, z: -1.9, w: 1.6, periodS: 3.4, offsetS: 2.2 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'estudioRocker', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'estudioFan', count: 3, from: 'right', intervalS: 0.8 },
                { enemy: 'estudioCam', count: 1, from: 'front', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'estudioRoadie', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'estudioCam', count: 2, from: 'back', intervalS: 1.4 },
                { enemy: 'soldier', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'estudioFan', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'estudioRocker', count: 2, from: 'sides', intervalS: 0.9 },
              ],
            },
          ],
        },
        {
          // sala de mixagem: cabos e uma caixa de som no meio da briga
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'electricTile', x: 135.5, z: 0.4, w: 2.2, d: 1.8, periodS: 3.2 },
            { kind: 'gust', x: 140, z: -2.6, w: 4, d: 6, periodS: 4, offsetS: 1.5 },
            { kind: 'electricTile', x: 144.5, z: -2, w: 2.2, d: 1.8, periodS: 3.2, offsetS: 1.6 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'estudioRocker', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'estudioFan', count: 3, from: 'left', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'estudioRoadie', count: 2, from: 'sides', intervalS: 2.5 },
                { enemy: 'estudioCam', count: 2, from: 'back', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'estudioFan', count: 4, from: 'sides', intervalS: 0.6 },
                { enemy: 'estudioRocker', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 17, z: 1.2, drop: 'medkitS' },
        { kind: 'bin', x: 24, z: -2.6 },
        { kind: 'crate', x: 33, z: -2.6, drop: 'gun_rifle' },
        { kind: 'explosiveBarrel', x: 45, z: 1.3 },
        { kind: 'crate', x: 58, z: 1.2, drop: 'mana' },
        { kind: 'weaponCrate', x: 67, z: -2.6 },
        { kind: 'bin', x: 82, z: 1.3, drop: 'melee_pipe' },
        { kind: 'crate', x: 99, z: -2.6, drop: 'shield' },
        { kind: 'explosiveBarrel', x: 108, z: 1.3 },
        { kind: 'crate', x: 123, z: 1.2, drop: 'medkitL' },
        { kind: 'bin', x: 128, z: -2.6 },
        { kind: 'explosiveBarrel', x: 147, z: 1.3 },
        { kind: 'crate', x: 153, z: -2.6, drop: 'medkitL' },
        { kind: 'crate', x: 157, z: 1.2, drop: 'mana' },
      ],
      pickups: [
        { item: 'ammoRifle', x: 60, z: -0.5 },
        { item: 'mana', x: 98, z: 0.6 },
        { item: 'medkitS', x: 127, z: -0.5 },
      ],
      boss: { id: 'decibel', triggerX: 164, lock: [161, 183] },
    },
  ],
};
