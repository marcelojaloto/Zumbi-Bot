import '../bosses/18-artilheiro';
import { season2Scaling } from '../balance';
import { brute, exploder, registerEnemies, runner, variant, walker } from '../enemies';
import { env } from '../env';
import { MUSIC, SCALES } from '../music';
import type { MapDef } from '../types';

const R = -1;

// batucada de torcida
MUSIC.campo = {
  id: 'campo',
  bpm: 132,
  root: 50,
  scale: [...SCALES.dorian],
  progression: [0, 3, 4, 3],
  bass: [0, R, 0, 1, R, 0, R, 1, 0, R, 0, 1, R, 2, 1, R],
  lead: { wave: 'square', density: 0.36, octave: 2, seed: 173 },
  pad: { wave: 'sawtooth', detune: 9 },
  drums: {
    kick: [2, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 2, 0, 1, 0],
    snare: [0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1],
    hat: [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1],
  },
  bossBpm: 152,
};

registerEnemies(
  variant(runner, {
    id: 'campo_atacante',
    name: 'Zumbi Atacante',
    hp: 30,
    speed: 4.6,
    rig: { ...runner.rig, cloth: 0xc8202a, cloth2: 0xf2f2ea, eye: 0xff5a3a, extra: 'campo_player' },
  }),
  variant(runner, {
    id: 'campo_zagueiro',
    name: 'Zumbi Zagueiro',
    hp: 48,
    speed: 3.6,
    mass: 1.1,
    rewards: { xp: 16, score: 190, scrap: [2, 4], drops: 'kill', cosmeticChance: 0.015 },
    rig: { ...runner.rig, scale: 1.05, bulk: 1.05, cloth: 0x2050c8, cloth2: 0x14161c, extra: 'campo_player' },
  }),
  variant(brute, {
    id: 'campo_goleiro',
    name: 'Zumbi Goleiro',
    hp: 240,
    rig: { ...brute.rig, cloth: 0xf2c21a, cloth2: 0x14161c, extra: 'campo_keeper' },
  }),
  variant(walker, {
    id: 'campo_juiz',
    name: 'Zumbi Juiz',
    hp: 60,
    speed: 1.5,
    rewards: { xp: 14, score: 150, scrap: [2, 4], drops: 'kill', cosmeticChance: 0.012 },
    rig: { ...walker.rig, cloth: 0x14161c, cloth2: 0x14161c, hunch: 0.4, extra: 'campo_ref' },
  }),
  // torcedor com sinalizador: explode em fogo
  variant(exploder, {
    id: 'campo_torcedor',
    name: 'Torcedor do Sinalizador',
    hp: 32,
    speed: 2.6,
    onDeath: {
      explosion: {
        radius: 2.4,
        damage: 22,
        minMult: 0.4,
        dtype: 'fire',
        knockback: 6,
        launch: 4,
        selfMult: 1,
        status: { id: 'burn', chance: 0.6 },
        fx: 'explosion',
      },
    },
    rig: { ...exploder.rig, cloth: 0xc8202a, cloth2: 0x2a3a5a, accessory: 'none', extra: 'campo_flare' },
  }),
);

export const campo: MapDef = {
  id: 'campo',
  index: 17,
  season: 2,
  name: 'Campo de Futebol',
  subtitle: 'O placar parou, a torcida não foi embora e o artilheiro ainda quer o gol',
  color: 0x3ac85a,
  music: 'campo',
  wizardBias: 0.5,
  scaling: season2Scaling(7),
  env: env({
    theme: 'campo',
    fog: { color: 0x0e1a14, density: 0.014 },
    sky: { top: 0x04060c, bottom: 0x10202a, moon: true, stars: 250, moonColor: 0xf0f4ff },
    hemi: { sky: 0xcfe4ff, ground: 0x1c3a1e, intensity: 1 },
    sun: { color: 0xf4f8ff, intensity: 1.9, dir: [-0.35, 1, 0.6] },
    accent: { color: 0xff5a2a, flicker: 0.4 },
    grade: {
      lift: [0, 0.01, 0.005],
      gamma: [1, 1, 1],
      gain: [1, 1.04, 1],
      saturation: 0.95,
      contrast: 1.08,
    },
    bloom: { intensity: 1.25, threshold: 0.7 },
    vignette: 0.55,
    grain: 0.06,
    particles: 'embers',
    particleDensity: 0.25,
    ground: { color: 0x2f6a34, color2: 0x285c2e, pattern: 'grass' },
    reverb: 'outdoor',
  }),
  levels: [
    {
      id: 'campo-1',
      name: 'Estádio dos Mortos',
      length: 196,
      zBand: [-3.2, 1.6],
      parTimeS: 500,
      playerStart: { x: 3, z: -0.6 },
      hazards: [
        // treino abandonado no trecho sem trava
        { kind: 'hurdle', x: 78, z: -2.2, w: 0.5, d: 1.8 },
        { kind: 'hurdle', x: 84, z: 0.5, w: 0.5, d: 1.8 },
        { kind: 'hurdle', x: 90, z: -1, w: 0.5, d: 1.8 },
        { kind: 'gust', x: 96, z: -3, w: 4, d: 6, periodS: 5 },
        { kind: 'fire', x: 125, z: -2.6, w: 1.6 },
      ],
      hints: [
        { x: 34, text: 'A irrigação estourou: a poça deixa todo mundo lento, zumbi também' },
        { x: 68, text: 'Cones de treino no caminho: pule por cima ou leva um tombo' },
        {
          x: 156,
          text: 'O Artilheiro Infernal entrou em campo! Saia do círculo quando a bola em chamas subir',
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
                { enemy: 'campo_atacante', count: 3, from: 'right', intervalS: 0.8 },
                { enemy: 'campo_juiz', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'campo_zagueiro', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'campo_torcedor', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'campo_atacante', count: 2, from: 'left', intervalS: 0.7 },
                { enemy: 'campo_juiz', count: 2, from: 'ground', intervalS: 0.8 },
              ],
            },
          ],
        },
        {
          // irrigação estourada e um sinalizador caído
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [
            { kind: 'swamp', x: 45, z: -1.2, w: 4 },
            { kind: 'fire', x: 52, z: 0.9, w: 1.6 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'campo_zagueiro', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'campo_juiz', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'campo_atacante', count: 3, from: 'right', intervalS: 0.6 },
                { enemy: 'drone', count: 1, from: 'back', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'campo_goleiro', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'campo_torcedor', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
          ],
        },
        {
          // cones e vento, sem trava
          id: 's3',
          triggerX: 70,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'campo_atacante', count: 3, from: 'right', intervalS: 2 },
                { enemy: 'campo_juiz', count: 2, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'campo_zagueiro', count: 3, from: 'left', intervalS: 1.4 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [{ enemy: 'campo_goleiro', count: 1, from: 'right', intervalS: 1 }],
            },
          ],
        },
        {
          // a torcida invade com sinalizadores
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'fire', x: 106, z: -2.4, w: 1.6 },
            { kind: 'fire', x: 114, z: 0.8, w: 1.6 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'campo_torcedor', count: 3, from: 'sides', intervalS: 0.9 },
                { enemy: 'campo_atacante', count: 3, from: 'right', intervalS: 0.7 },
                { enemy: 'burningWalker', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'campo_zagueiro', count: 3, from: 'sides', intervalS: 0.7 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.4 },
                { enemy: 'campo_goleiro', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'burningWalker', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'campo_juiz', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'campo_torcedor', count: 2, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
        {
          // os dois times juntos na intermediária
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'swamp', x: 143, z: 0.2, w: 3.6 },
            { kind: 'hurdle', x: 137, z: -2.2, w: 0.5, d: 1.8 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'campo_atacante', count: 4, from: 'right', intervalS: 0.6 },
                { enemy: 'campo_zagueiro', count: 3, from: 'left', intervalS: 0.8 },
                { enemy: 'campo_juiz', count: 1, from: 'ground', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'campo_goleiro', count: 2, from: 'sides', intervalS: 2.5 },
                { enemy: 'campo_torcedor', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.2 },
                { enemy: 'campo_atacante', count: 3, from: 'right', intervalS: 0.6 },
                { enemy: 'campo_zagueiro', count: 2, from: 'left', intervalS: 1 },
                { enemy: 'burningWalker', count: 2, from: 'sides', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'bin', x: 17, z: 1.3, drop: 'medkitS' },
        { kind: 'crate', x: 24, z: -2.9 },
        { kind: 'crate', x: 33, z: 1.3, drop: 'gun_rifle' },
        { kind: 'explosiveBarrel', x: 49, z: -2.8 },
        { kind: 'bin', x: 58, z: -2.9, drop: 'mana' },
        { kind: 'weaponCrate', x: 64, z: 1.3 },
        { kind: 'crate', x: 74, z: 1.3, drop: 'melee_sledge' },
        { kind: 'barrel', x: 99, z: 1.3, drop: 'shield' },
        { kind: 'explosiveBarrel', x: 110, z: -0.8 },
        { kind: 'crate', x: 122, z: 1.3, drop: 'medkitL' },
        { kind: 'bin', x: 128, z: -2.9 },
        { kind: 'explosiveBarrel', x: 140, z: -2.8 },
        { kind: 'weaponCrate', x: 152, z: 1.3 },
        { kind: 'crate', x: 156, z: -2.9, drop: 'medkitL' },
        { kind: 'bin', x: 158, z: 1.3, drop: 'mana' },
      ],
      pickups: [
        { item: 'ammoShell', x: 60, z: -0.6 },
        { item: 'mana', x: 97, z: 0.6 },
        { item: 'medkitS', x: 126, z: -0.6 },
      ],
      boss: { id: 'artilheiro', triggerX: 164, lock: [161, 185] },
    },
  ],
};
