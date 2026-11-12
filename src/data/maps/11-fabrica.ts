import { season2Scaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

export const fabrica: MapDef = {
  id: 'fabrica',
  index: 10,
  season: 2,
  name: 'Fábrica de Brinquedos',
  subtitle: 'A linha de montagem religou sozinha, e os brinquedos saem dela com fome',
  color: 0xff5ac8,
  music: 'fabrica',
  wizardBias: 0.5,
  scaling: season2Scaling(0),
  env: env({
    theme: 'fabrica',
    fog: { color: 0x1a1422, density: 0.016 },
    sky: { top: 0x08060c, bottom: 0x1a1422, moon: false, stars: 0 },
    hemi: { sky: 0xffe8d8, ground: 0x2a2234, intensity: 0.95 },
    sun: { color: 0xffe2c8, intensity: 1.4, dir: [-0.3, 1, 0.55] },
    accent: { color: 0xff5ac8, flicker: 0.35 },
    grade: {
      lift: [0.012, 0, 0.02],
      gamma: [1, 1, 1],
      gain: [1.05, 1, 1.03],
      saturation: 1,
      contrast: 1.08,
    },
    bloom: { intensity: 1.2, threshold: 0.7 },
    vignette: 0.55,
    grain: 0.06,
    particles: 'dust',
    particleDensity: 0.3,
    ground: { color: 0x5c5664, color2: 0x443e50, pattern: 'tiles' },
    indoor: true,
    reverb: 'hall',
  }),
  levels: [
    {
      id: 'fabrica-1',
      name: 'Linha de Montagem',
      length: 190,
      zBand: [-3, 1.5],
      parTimeS: 480,
      playerStart: { x: 3, z: -0.5 },
      hazards: [
        // corredor das prensas
        { kind: 'conveyor', x: 86, z: -0.75, w: 18, d: 1.8, dir: 1 },
        { kind: 'press', x: 80, z: -0.75, w: 1.8, d: 1.8, periodS: 3 },
        { kind: 'press', x: 86, z: -0.75, w: 1.8, d: 1.8, periodS: 3, offsetS: 1 },
        { kind: 'press', x: 92, z: -0.75, w: 1.8, d: 1.8, periodS: 3, offsetS: 2 },
      ],
      hints: [
        { x: 34, text: 'Esteiras carregam quem pisa nelas: pule para sair ou ande contra a corrente' },
        {
          x: 70,
          text: 'As prensas descem em ciclos: passe quando subirem, ou deixe os brinquedos embaixo delas',
        },
        { x: 154, text: 'O Ursão de Corda acordou! Quando a corda acaba ele para: é a hora de bater' },
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
                { enemy: 'windupWalker', count: 3, from: 'right', intervalS: 0.9 },
                { enemy: 'teddy', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'teddy', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'tinSoldier', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'jackBox', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'windupWalker', count: 2, from: 'left', intervalS: 1 },
              ],
            },
          ],
        },
        {
          // primeira esteira
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [{ kind: 'conveyor', x: 46, z: -2.1, w: 14, d: 1.6, dir: -1 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'windupWalker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'tinSoldier', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'teddy', count: 3, from: 'right', intervalS: 0.7 },
                { enemy: 'drone', count: 1, from: 'back', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'jackBox', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
          ],
        },
        {
          // corredor das prensas
          id: 's3',
          triggerX: 70,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'windupWalker', count: 3, from: 'right', intervalS: 2.2 },
                { enemy: 'tinSoldier', count: 2, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'teddy', count: 3, from: 'left', intervalS: 1.4 },
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
          // duas esteiras em sentidos opostos, com a faixa do meio livre
          id: 's4',
          triggerX: 104,
          lock: { minX: 101, maxX: 119 },
          hazards: [
            { kind: 'conveyor', x: 110, z: -2.2, w: 16, d: 1.4, dir: 1 },
            { kind: 'conveyor', x: 110, z: 0.7, w: 16, d: 1.4, dir: -1 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'windupWalker', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'tinSoldier', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'jackBox', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'teddy', count: 4, from: 'sides', intervalS: 0.6 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.4 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'jackBox', count: 3, from: 'ground', intervalS: 0.7 },
                { enemy: 'tinSoldier', count: 2, from: 'sides', intervalS: 0.9 },
              ],
            },
          ],
        },
        {
          // sala de embalagem
          id: 's5',
          triggerX: 134,
          lock: { minX: 131, maxX: 149 },
          hazards: [
            { kind: 'press', x: 135.5, z: -2, w: 1.8, d: 1.8, periodS: 3.6 },
            { kind: 'press', x: 140, z: 0.4, w: 1.8, d: 1.8, periodS: 3.6, offsetS: 1.2 },
            { kind: 'press', x: 144.5, z: -2, w: 1.8, d: 1.8, periodS: 3.6, offsetS: 2.4 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'windupWalker', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'tinSoldier', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'teddy', count: 3, from: 'left', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'jackBox', count: 2, from: 'sides', intervalS: 1.5 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.2 },
                { enemy: 'tinSoldier', count: 2, from: 'left', intervalS: 1.2 },
                { enemy: 'teddy', count: 3, from: 'right', intervalS: 0.6 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'gift', x: 17, z: 1.2, drop: 'medkitS' },
        { kind: 'gift', x: 24, z: -2.6 },
        { kind: 'crate', x: 33, z: 1.2, drop: 'gun_smg' },
        { kind: 'explosiveBarrel', x: 44, z: 1.2 },
        { kind: 'gift', x: 57, z: -2.6, drop: 'mana' },
        { kind: 'weaponCrate', x: 64, z: 1.2 },
        { kind: 'gift', x: 76, z: 1.2, drop: 'melee_bat' },
        { kind: 'explosiveBarrel', x: 89, z: -2.7 },
        { kind: 'gift', x: 98, z: -2.6, drop: 'shield' },
        { kind: 'crate', x: 122, z: 1.2, drop: 'medkitL' },
        { kind: 'gift', x: 127, z: -2.6 },
        { kind: 'explosiveBarrel', x: 138, z: 1.3 },
        { kind: 'gift', x: 152, z: -2.6, drop: 'medkitL' },
        { kind: 'gift', x: 156, z: 1.2, drop: 'mana' },
      ],
      pickups: [
        { item: 'ammoLight', x: 60, z: -0.5 },
        { item: 'mana', x: 96, z: 0.8 },
        { item: 'medkitS', x: 126, z: -0.5 },
      ],
      boss: { id: 'ursao', triggerX: 162, lock: [159, 181] },
    },
  ],
};
