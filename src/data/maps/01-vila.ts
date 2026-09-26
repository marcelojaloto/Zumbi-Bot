import { env } from '../env';
import type { MapDef } from '../types';

export const vila: MapDef = {
  id: 'vila',
  index: 0,
  name: 'Vila Assombrada',
  subtitle: 'Casas abandonadas sob a lua cheia',
  color: 0x8fa6ff,
  music: 'vila',
  wizardBias: 0.3,
  scaling: { hp: 1, dmg: 1 },
  env: env({
    theme: 'vila',
    fog: { color: 0x1b2233, density: 0.032 },
    sky: { top: 0x04060c, bottom: 0x1e2a44, moon: true, stars: 600, moonColor: 0xe8eeff },
    hemi: { sky: 0x8fa6ff, ground: 0x2a2018, intensity: 0.85 },
    sun: { color: 0xa8bcff, intensity: 1.9, dir: [-0.5, 1, 0.5] },
    accent: { color: 0xffb35c, flicker: 0.35 },
    grade: {
      lift: [0, 0.01, 0.03],
      gamma: [1, 1, 1.02],
      gain: [1, 1, 1.05],
      saturation: 0.78,
      contrast: 1.08,
    },
    bloom: { intensity: 1.15, threshold: 0.72 },
    vignette: 0.6,
    grain: 0.07,
    particles: 'ash',
    particleDensity: 0.6,
    ground: { color: 0x2e2a24, color2: 0x3a3228, pattern: 'dirt' },
    reverb: 'outdoor',
  }),
  levels: [
    {
      id: 'vila-1',
      name: 'Rua das Lápides',
      length: 160,
      zBand: [-3.5, 2],
      parTimeS: 360,
      playerStart: { x: 3, z: 0 },
      hints: [
        { x: 2, text: 'A/D andam • W/S mudam de plano (profundidade)' },
        { x: 9, text: 'J = soco • K = chute • J, J, J, J = combo com uppercut' },
        { x: 22, text: 'Espaço pula — aperte de novo no ar para o pulo duplo' },
        { x: 30, text: 'Clique (ou L) atira • botão direito mira para crítico' },
        { x: 42, text: 'Quebre caixas e barris para achar itens' },
        { x: 60, text: 'Shift ou toque duplo corre • correndo + K = voadora' },
        { x: 78, text: '2 = modo cajado • 1 = armas • U (ou J+K) = {special}' },
        { x: 134, text: 'Chefe à frente! Pule as ondas de choque da pá' },
      ],
      segments: [
        {
          id: 's1',
          triggerX: 10,
          lock: { minX: 7, maxX: 25 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'walker', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'walker', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'walker', count: 2, from: 'right', intervalS: 1 },
                { enemy: 'runner', count: 1, from: 'left', intervalS: 1 },
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
              spawns: [{ enemy: 'walker', count: 4, from: 'ground', intervalS: 0.6 }],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'walker', count: 2, from: 'left', intervalS: 1.5 },
              ],
            },
          ],
        },
        {
          id: 's3',
          triggerX: 66,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'runner', count: 3, from: 'left', intervalS: 2.5 },
                { enemy: 'walker', count: 3, from: 'right', intervalS: 2 },
              ],
            },
          ],
        },
        {
          id: 's4',
          triggerX: 90,
          lock: { minX: 87, maxX: 105 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'walker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'exploder', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 2, from: 'ground', intervalS: 0.7 },
                { enemy: 'spitter', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [{ enemy: 'runner', count: 4, from: 'sides', intervalS: 0.9 }],
            },
          ],
        },
        {
          id: 's5',
          triggerX: 116,
          lock: { minX: 113, maxX: 131 },
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'walker', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'runner', count: 3, from: 'right', intervalS: 1.2 },
                { enemy: 'exploder', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'walker', count: 2, from: 'ground', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 18, z: -2.6, drop: 'medkitS' },
        { kind: 'barrel', x: 29, z: 1.3 },
        { kind: 'crate', x: 47, z: -2.8, drop: 'gun_shotgun' },
        { kind: 'tombstone', x: 51, z: 1.2 },
        { kind: 'explosiveBarrel', x: 63, z: -2 },
        { kind: 'crate', x: 74, z: 1.1 },
        { kind: 'crate', x: 96, z: -2.8, drop: 'melee_bat' },
        { kind: 'explosiveBarrel', x: 101, z: 1.2 },
        { kind: 'tombstone', x: 110, z: -2.5 },
        { kind: 'crate', x: 121, z: 1.2 },
        { kind: 'barrel', x: 128, z: -2.8 },
        { kind: 'crate', x: 136, z: -2.6, drop: 'medkitL' },
      ],
      pickups: [
        { item: 'ammoShell', x: 58, z: -1 },
        { item: 'mana', x: 84, z: 0.5 },
        { item: 'medkitS', x: 112, z: 0 },
      ],
      boss: { id: 'coveiro', triggerX: 140, lock: [137, 158] },
    },
  ],
};
