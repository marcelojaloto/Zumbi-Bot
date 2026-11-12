import '../bosses/15-manequim';
import { season2Scaling } from '../balance';
import { brute, registerEnemies, soldier, variant, walker } from '../enemies';
import { env } from '../env';
import { MUSIC, SCALES } from '../music';
import type { MapDef } from '../types';

const R = -1;

// música ambiente de shopping, desafinada
MUSIC.shopping = {
  id: 'shopping',
  bpm: 104,
  root: 53, // Fá
  scale: [...SCALES.dorian],
  progression: [0, 3, 1, 4],
  bass: [0, R, R, 0, R, 1, R, R, 0, R, 3, R, 1, R, 2, R],
  lead: { wave: 'triangle', density: 0.36, octave: 2, seed: 127 },
  pad: { wave: 'sine', detune: 13 },
  drums: {
    kick: [2, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 0, 0, 1, 0, 0],
    snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    hat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  },
  bossBpm: 134,
};

registerEnemies(
  // manequim de vitrine: plástico branco, sem rosto
  variant(walker, {
    id: 'shopping_mannequin',
    name: 'Manequim Vivo',
    hp: 55,
    speed: 1.5,
    groan: false,
    statusImmune: ['poison'],
    resist: { fire: 1.4, blunt: 1.2, blade: 0.9, toxic: 0.3 },
    rewards: { xp: 16, score: 180, scrap: [2, 5], drops: 'kill', cosmeticChance: 0.015 },
    rig: {
      ...walker.rig,
      skin: 0xe8e4de,
      cloth: 0xe8e4de,
      cloth2: 0xdedad4,
      eye: 0xe8e4de,
      hunch: 0.05,
      variants: 1,
      extra: 'shopping_mannequin',
    },
  }),
  variant(walker, {
    id: 'shopping_shopper',
    name: 'Zumbi Consumista',
    hp: 62,
    speed: 1.3,
    rewards: { xp: 16, score: 180, scrap: [3, 6], drops: 'kill', cosmeticChance: 0.02 },
    rig: { ...walker.rig, cloth: 0x8a3a6a, cloth2: 0x2a3a5a, extra: 'shopping_bags' },
  }),
  variant(soldier, {
    id: 'shopping_guard',
    name: 'Segurança do Shopping',
    hp: 85,
    rig: {
      ...soldier.rig,
      skin: 0x2a3a5c,
      cloth: 0x161c2c,
      cloth2: 0xffd23a,
      eye: 0x5ad8ff,
      extra: 'shopping_guard',
    },
  }),
  // carregador: investe empurrando o carrinho
  variant(brute, {
    id: 'shopping_porter',
    name: 'Carregador',
    hp: 240,
    rig: { ...brute.rig, cloth: 0xd86a1a, cloth2: 0x2a2e36, extra: 'shopping_cart' },
  }),
);

/** Mapa 15 (Shopping): esteiras rolantes, alarmes de loja e painéis em curto; no fim, o Manequim-Rei. */
export const shopping: MapDef = {
  id: 'shopping',
  index: 14,
  season: 2,
  name: 'Shopping',
  subtitle: 'As lojas fecharam, mas as vitrines continuam olhando',
  color: 0x5ad8ff,
  music: 'shopping',
  wizardBias: 0.5,
  scaling: season2Scaling(4),
  env: env({
    theme: 'shopping',
    fog: { color: 0x141a24, density: 0.016 },
    sky: { top: 0x06080c, bottom: 0x141a24, moon: false, stars: 0 },
    hemi: { sky: 0xdcecff, ground: 0x2a2c34, intensity: 0.9 },
    sun: { color: 0xdcecff, intensity: 1.35, dir: [-0.3, 1, 0.55] },
    accent: { color: 0xff3ad8, flicker: 0.4 },
    grade: {
      lift: [0.004, 0.008, 0.022],
      gamma: [1, 1, 1],
      gain: [0.98, 1.02, 1.06],
      saturation: 0.9,
      contrast: 1.1,
    },
    bloom: { intensity: 1.25, threshold: 0.7 },
    vignette: 0.55,
    grain: 0.06,
    particles: 'dust',
    particleDensity: 0.25,
    ground: { color: 0x8a8e96, color2: 0x6c7078, pattern: 'marble' },
    indoor: true,
    reverb: 'hall',
  }),
  levels: [
    {
      id: 'shopping-1',
      name: 'Corredor das Vitrines',
      length: 196,
      zBand: [-3, 1.5],
      parTimeS: 480,
      playerStart: { x: 3, z: -0.5 },
      hazards: [
        { kind: 'laserTrip', x: 63, z: -0.75, d: 6 },
        { kind: 'electricTile', x: 86, z: -2, w: 2.2, d: 1.8, periodS: 3 },
        { kind: 'electricTile', x: 91, z: 0.4, w: 2.2, d: 1.8, periodS: 3, offsetS: 1.5 },
        { kind: 'laserTrip', x: 97, z: -0.75, d: 6 },
      ],
      hints: [
        { x: 34, text: 'A esteira rolante leva quem pisa nela: pule para sair ou ande contra ela' },
        { x: 56, text: 'Alarme de loja! Cruzar o feixe vermelho chama os robôs da segurança' },
        {
          x: 158,
          text: 'O Manequim-Rei desceu da vitrine! Quando ele faz pose, fica parado: bata nessa hora',
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
                { enemy: 'shopping_mannequin', count: 3, from: 'right', intervalS: 0.9 },
                { enemy: 'shopping_shopper', count: 1, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'shopping_shopper', count: 2, from: 'sides', intervalS: 0.9 },
                { enemy: 'runner', count: 2, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.6 },
              spawns: [
                { enemy: 'shopping_mannequin', count: 2, from: 'ground', intervalS: 0.8 },
                { enemy: 'shopping_guard', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
        {
          // esteira rolante na faixa do fundo
          id: 's2',
          triggerX: 40,
          lock: { minX: 37, maxX: 55 },
          hazards: [{ kind: 'conveyor', x: 46, z: -2.1, w: 14, d: 1.6, dir: 1 }],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'shopping_mannequin', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'shopping_guard', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'runner', count: 3, from: 'right', intervalS: 0.7 },
                { enemy: 'drone', count: 1, from: 'back', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [
                { enemy: 'shopping_porter', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'shopping_shopper', count: 2, from: 'left', intervalS: 1.2 },
              ],
            },
          ],
        },
        {
          // corredor dos alarmes e painéis em curto (sem trava)
          id: 's3',
          triggerX: 72,
          lock: null,
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'shopping_mannequin', count: 3, from: 'right', intervalS: 2.2 },
                { enemy: 'shopping_guard', count: 2, from: 'right', intervalS: 3 },
              ],
            },
            {
              start: { k: 'timeS', s: 6 },
              spawns: [
                { enemy: 'runner', count: 2, from: 'left', intervalS: 1.4 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              spawns: [{ enemy: 'shopping_porter', count: 1, from: 'right', intervalS: 1 }],
            },
          ],
        },
        {
          // praça de alimentação: esteira na frente e painéis no fundo
          id: 's4',
          triggerX: 106,
          lock: { minX: 103, maxX: 121 },
          hazards: [
            { kind: 'conveyor', x: 112, z: 0.7, w: 16, d: 1.4, dir: -1 },
            { kind: 'electricTile', x: 108.5, z: -2.1, w: 2.2, d: 1.6, periodS: 3.2 },
            { kind: 'electricTile', x: 115.5, z: -2.1, w: 2.2, d: 1.6, periodS: 3.2, offsetS: 1.6 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 8,
              spawns: [
                { enemy: 'shopping_shopper', count: 4, from: 'sides', intervalS: 0.7 },
                { enemy: 'shopping_guard', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'shopping_mannequin', count: 2, from: 'left', intervalS: 1 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'runner', count: 3, from: 'sides', intervalS: 0.6 },
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.4 },
                { enemy: 'shopping_porter', count: 1, from: 'right', intervalS: 1 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'shopping_mannequin', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'shopping_guard', count: 2, from: 'sides', intervalS: 0.9 },
              ],
            },
          ],
        },
        {
          // átrio: duas esteiras em sentidos opostos, faixa do meio livre
          id: 's5',
          triggerX: 136,
          lock: { minX: 133, maxX: 151 },
          hazards: [
            { kind: 'conveyor', x: 142, z: -2.2, w: 16, d: 1.4, dir: -1 },
            { kind: 'conveyor', x: 142, z: 0.7, w: 16, d: 1.4, dir: 1 },
          ],
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'shopping_mannequin', count: 4, from: 'ground', intervalS: 0.6 },
                { enemy: 'shopping_guard', count: 2, from: 'right', intervalS: 1.5 },
                { enemy: 'shopping_shopper', count: 3, from: 'left', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'runner', count: 3, from: 'sides', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'drone', count: 2, from: 'back', intervalS: 1.2 },
                { enemy: 'shopping_guard', count: 2, from: 'left', intervalS: 1.2 },
                { enemy: 'shopping_mannequin', count: 3, from: 'right', intervalS: 0.6 },
                { enemy: 'shopping_porter', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'bin', x: 17, z: -2.6, drop: 'medkitS' },
        { kind: 'gift', x: 24, z: 1.2 },
        { kind: 'atm', x: 32, z: -2.8, drop: 'gun_smg' },
        { kind: 'gift', x: 44, z: 1.2, drop: 'mana' },
        { kind: 'bin', x: 58, z: -2.6 },
        { kind: 'weaponCrate', x: 68, z: 1.2 },
        { kind: 'gift', x: 78, z: 1.2, drop: 'melee_bat' },
        { kind: 'explosiveBarrel', x: 100, z: 1.3 },
        { kind: 'atm', x: 124, z: -2.8, drop: 'shield' },
        { kind: 'crate', x: 128, z: 1.2, drop: 'medkitL' },
        { kind: 'explosiveBarrel', x: 142, z: -0.7 },
        { kind: 'gift', x: 155, z: -2.6, drop: 'medkitL' },
        { kind: 'bin', x: 159, z: 1.2, drop: 'mana' },
      ],
      pickups: [
        { item: 'ammoLight', x: 60, z: 0.5 },
        { item: 'mana', x: 99, z: -1 },
        { item: 'medkitS', x: 127, z: -0.5 },
      ],
      boss: { id: 'manequim', triggerX: 166, lock: [163, 185] },
    },
  ],
};
