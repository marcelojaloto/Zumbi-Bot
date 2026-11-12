import '../bosses/17-v8';
import { season2Scaling } from '../balance';
import { brute, drone, registerEnemies, variant, walker } from '../enemies';
import { env } from '../env';
import { MUSIC, SCALES } from '../music';
import type { MapDef } from '../types';

const R = -1;

// rock de estrada: baixo galopando e bumbo reto
MUSIC.loja = {
  id: 'loja',
  bpm: 124,
  root: 40, // Mi
  scale: [...SCALES.dorian],
  progression: [0, 0, 3, 4],
  bass: [0, 0, R, 0, 0, R, 2, 0, 0, 0, R, 0, 1, R, 3, 1],
  lead: { wave: 'sawtooth', density: 0.34, octave: 2, seed: 167 },
  pad: { wave: 'square', detune: 9 },
  drums: {
    kick: [2, 0, 0, 0, 2, 0, 0, 1, 2, 0, 0, 0, 2, 0, 1, 0],
    snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    hat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  },
  bossBpm: 148,
};

registerEnemies(
  variant(walker, {
    id: 'lojaSalesman',
    name: 'Zumbi Vendedor',
    hp: 55,
    speed: 1.5,
    rewards: { xp: 15, score: 170, scrap: [2, 5], drops: 'kill', cosmeticChance: 0.015 },
    rig: {
      ...walker.rig,
      skin: 0x7a8a6a,
      cloth: 0x2c3e6a,
      cloth2: 0x1c2230,
      eye: 0xffe03a,
      hunch: 0.35,
      accessory: 'tie',
      extra: 'loja_salesman',
    },
  }),
  // feito para bater: aguenta pancada, mas não corte nem fogo
  variant(walker, {
    id: 'lojaDummy',
    name: 'Boneco de Teste',
    hp: 70,
    speed: 1.9,
    groan: false,
    resist: { blunt: 0.7, bullet: 0.9, blade: 1.2, fire: 1.3 },
    rewards: { xp: 17, score: 190, scrap: [2, 5], drops: 'kill', cosmeticChance: 0.015 },
    rig: {
      ...walker.rig,
      skin: 0xf2c21a,
      cloth: 0xf2c21a,
      cloth2: 0x16181c,
      eye: 0xff3a2a,
      hunch: 0.1,
      variants: 1,
      extra: 'loja_dummy',
    },
  }),
  variant(brute, {
    id: 'lojaMechanic',
    name: 'Zumbi Mecânico',
    hp: 240,
    rig: { ...brute.rig, cloth: 0x2a4a7a, cloth2: 0x223a60, eye: 0xff8a2a, extra: 'loja_mechanic' },
  }),
  variant(drone, {
    id: 'lojaTow',
    name: 'Drone Guincho',
    hp: 38,
    rig: {
      ...drone.rig,
      skin: 0xd8a01a,
      cloth: 0x2a2e36,
      cloth2: 0xff5a1a,
      eye: 0xffe03a,
      extra: 'loja_tow',
    },
  }),
);

export const loja: MapDef = {
  id: 'loja',
  index: 16,
  season: 2,
  name: 'Loja de Automóveis',
  subtitle: 'Queima de estoque: todos os carros saem andando sozinhos',
  color: 0xff8a2a,
  music: 'loja',
  wizardBias: 0.35,
  scaling: season2Scaling(6),
  env: env({
    theme: 'loja',
    fog: { color: 0x14181e, density: 0.016 },
    sky: { top: 0x06080c, bottom: 0x14181e, moon: false, stars: 0 },
    hemi: { sky: 0xe8f0ff, ground: 0x2a2a30, intensity: 0.95 },
    sun: { color: 0xf0f4ff, intensity: 1.45, dir: [-0.3, 1, 0.55] },
    accent: { color: 0xff8a2a, flicker: 0.3 },
    grade: {
      lift: [0.008, 0.008, 0.016],
      gamma: [1, 1, 1],
      gain: [1.04, 1.01, 1],
      saturation: 0.92,
      contrast: 1.1,
    },
    bloom: { intensity: 1.2, threshold: 0.7 },
    vignette: 0.55,
    grain: 0.06,
    particles: 'sparks',
    particleDensity: 0.25,
    ground: { color: 0x70747c, color2: 0x565a62, pattern: 'tiles' },
    indoor: true,
    reverb: 'hall',
  }),
  levels: [
    {
      id: 'loja-1',
      name: 'Salão de Exposição',
      length: 195,
      zBand: [-3, 1.5],
      parTimeS: 500,
      playerStart: { x: 3, z: -0.5 },
      hazards: [
        // corredor da oficina (sem trava)
        { kind: 'swamp', x: 78, z: -1.9, w: 3.2 },
        { kind: 'press', x: 84, z: 0.3, w: 2.2, d: 1.8, periodS: 3.4 },
        { kind: 'swamp', x: 90, z: 0.5, w: 3 },
        { kind: 'press', x: 95, z: -1.9, w: 2.2, d: 1.8, periodS: 3.4, offsetS: 1.7 },
      ],
      hints: [
        { x: 34, text: 'Poças de óleo deixam todo mundo lento: contorne ou pule' },
        { x: 70, text: 'Os elevadores da oficina descem em ciclos: não fique embaixo' },
        { x: 158, text: 'O Monstro V8 deu partida! Saia da faixa da investida e pule os pneus' },
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
                { enemy: 'lojaSalesman', count: 3, from: 'right', intervalS: 0.9 },
                { enemy: 'lojaDummy', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'lojaDummy', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'lojaSalesman', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'lojaTow', count: 1, from: 'back', intervalS: 1 },
              ],
            },
          ],
        },
        {
          // primeira poça de óleo
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [
            { kind: 'swamp', x: 44, z: -1.8, w: 3.6 },
            { kind: 'swamp', x: 50, z: 0.4, w: 3 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'lojaDummy', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'lojaSalesman', count: 2, from: 'right', intervalS: 1.1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'lojaTow', count: 2, from: 'back', intervalS: 1.2 },
                { enemy: 'runner', count: 2, from: 'left', intervalS: 0.9 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'lojaMechanic', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'exploder', count: 1, from: 'left', intervalS: 1.2 },
              ],
            },
          ],
        },
        {
          // oficina
          id: 's3',
          triggerX: 70,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'lojaDummy', count: 3, from: 'right', intervalS: 2.2 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'runner', count: 3, from: 'left', intervalS: 1.4 },
                { enemy: 'lojaTow', count: 2, from: 'back', intervalS: 2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [{ enemy: 'lojaMechanic', count: 1, from: 'right', intervalS: 1 }],
            },
          ],
        },
        {
          // pátio dos seminovos: fogo e carros que explodem
          id: 's4',
          triggerX: 106,
          lock: { minX: 103, maxX: 121 },
          hazards: [
            { kind: 'fire', x: 108, z: -2.2, w: 1.8 },
            { kind: 'fire', x: 116.5, z: 0.8, w: 1.8 },
            { kind: 'swamp', x: 112, z: -0.6, w: 2.6 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'lojaSalesman', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'lojaDummy', count: 2, from: 'right', intervalS: 1.1 },
                { enemy: 'exploder', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'runner', count: 3, from: 'sides', intervalS: 0.6 },
                { enemy: 'lojaTow', count: 2, from: 'back', intervalS: 1.4 },
                { enemy: 'lojaMechanic', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'exploder', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'soldier', count: 2, from: 'sides', intervalS: 0.9 },
              ],
            },
          ],
        },
        {
          // entrega técnica: dois elevadores no meio da briga
          id: 's5',
          triggerX: 136,
          lock: { minX: 133, maxX: 151 },
          hazards: [
            { kind: 'press', x: 138.5, z: -2, w: 2.2, d: 1.8, periodS: 3.6 },
            { kind: 'press', x: 145.5, z: 0.4, w: 2.2, d: 1.8, periodS: 3.6, offsetS: 1.8 },
            { kind: 'swamp', x: 142, z: -1, w: 2.8 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'lojaDummy', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'runner', count: 3, from: 'left', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'lojaSalesman', count: 2, from: 'sides', intervalS: 1.3 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'lojaTow', count: 2, from: 'back', intervalS: 1.2 },
                { enemy: 'lojaMechanic', count: 2, from: 'sides', intervalS: 2.2 },
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 0.9 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'bin', x: 17, z: 1.2, drop: 'medkitS' },
        { kind: 'crate', x: 24, z: -2.6 },
        { kind: 'car', x: 31, z: -2.3 },
        { kind: 'crate', x: 35, z: 1.2, drop: 'gun_rifle' },
        { kind: 'explosiveBarrel', x: 47, z: 1.3 },
        { kind: 'bin', x: 58, z: -2.6, drop: 'mana' },
        { kind: 'weaponCrate', x: 64, z: 1.2 },
        { kind: 'barrel', x: 74, z: 1.2, drop: 'melee_pipe' },
        { kind: 'explosiveBarrel', x: 88, z: -2.7 },
        { kind: 'crate', x: 100, z: -2.6, drop: 'shield' },
        { kind: 'car', x: 111, z: 1 },
        { kind: 'car', x: 118, z: -2.3 },
        { kind: 'crate', x: 124, z: 1.2, drop: 'medkitL' },
        { kind: 'barrel', x: 129, z: -2.6 },
        { kind: 'explosiveBarrel', x: 141, z: 1.3 },
        { kind: 'crate', x: 154, z: -2.6, drop: 'medkitL' },
        { kind: 'bin', x: 158, z: 1.2, drop: 'mana' },
      ],
      pickups: [
        { item: 'ammoShell', x: 60, z: -0.5 },
        { item: 'mana', x: 98, z: 0.8 },
        { item: 'medkitS', x: 128, z: -0.5 },
      ],
      boss: { id: 'v8', triggerX: 165, lock: [162, 186] },
    },
  ],
};
