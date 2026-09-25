import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

/**
 * Mapa 10 — Arena Final: o ninho do OMEGA-Z, onde restos de todos os mapas se misturam.
 * Cada trecho ecoa dois mapas anteriores (inimigos, perigos e cenário) até a arena do chefe final.
 */
export const arena: MapDef = {
  id: 'arena',
  index: 9,
  name: 'Arena Final',
  subtitle: 'O ninho do OMEGA-Z, onde todos os pesadelos se encontram',
  color: 0xff3a5a,
  music: 'arena',
  wizardBias: 0.5,
  scaling: mapScaling(9),
  env: env({
    theme: 'arena',
    fog: { color: 0x1e1622, density: 0.026 },
    sky: { top: 0x06040a, bottom: 0x3a1628, moon: true, stars: 300, moonColor: 0xff6a5a },
    hemi: { sky: 0x9a9cc0, ground: 0x2a2024, intensity: 1.1 },
    sun: { color: 0xd8c4cc, intensity: 2.1, dir: [-0.4, 1, 0.6] },
    accent: { color: 0xff3a4a, flicker: 0.3 },
    grade: {
      lift: [0.012, 0, 0.018],
      gamma: [1, 1, 1],
      gain: [1.04, 1, 1.02],
      saturation: 0.8,
      contrast: 1.12,
    },
    bloom: { intensity: 1.3, threshold: 0.68 },
    vignette: 0.62,
    grain: 0.08,
    particles: 'embers',
    particleDensity: 0.7,
    ground: { color: 0x3a363c, color2: 0x4a4248, pattern: 'metal' },
    reverb: 'hall',
  }),
  levels: [
    {
      id: 'arena-1',
      name: 'O Ninho do Ômega',
      length: 200,
      zBand: [-3.5, 2],
      parTimeS: 540,
      playerStart: { x: 3, z: 0 },
      hints: [
        { x: 4, text: 'Tudo o que você enfrentou está aqui. Use todos os cajados!' },
        { x: 170, text: 'OMEGA-Z: a blindagem resiste a balas — eletricidade e golpes fortes a rompem' },
      ],
      hazards: [
        { kind: 'toxicPool', x: 72, z: -2.6, w: 2.2 },
        { kind: 'gasVent', x: 84, z: 1, periodS: 4, offsetS: 1 },
        { kind: 'fireJet', x: 132, z: -1.8, w: 1.6, periodS: 3.4, offsetS: 0 },
        { kind: 'fireJet', x: 138, z: 0.8, w: 1.6, periodS: 3.4, offsetS: 1.7 },
        { kind: 'electricTile', x: 46, z: -1, w: 2, d: 2, periodS: 4, offsetS: 0.5 },
      ],
      segments: [
        {
          // Vila + Torre: mortos-vivos clássicos e o vento das janelas
          id: 's1',
          triggerX: 10,
          lock: { minX: 7, maxX: 25 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'walker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'ghoul', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'runner', count: 3, from: 'sides', intervalS: 0.9 },
                { enemy: 'spitter', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
          hazards: [{ kind: 'gust', x: 16, z: -0.8, w: 3, d: 5, periodS: 5, offsetS: 1 }],
        },
        {
          // Banco: segurança robótica e mortos engravatados
          id: 's2',
          triggerX: 38,
          lock: { minX: 35, maxX: 53 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'bankWalker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.4 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'soldier', count: 2, from: 'right', intervalS: 1.4 },
                { enemy: 'bankWalker', count: 2, from: 'left', intervalS: 1 },
              ],
            },
          ],
          hazards: [{ kind: 'laserTrip', x: 44, z: 0, d: 6, periodS: 3, offsetS: 0 }],
        },
        {
          // Castelo + Zona Tóxica: pêndulos e poças corrosivas
          id: 's3',
          triggerX: 66,
          lock: { minX: 63, maxX: 81 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'toxicWalker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'ghoul', count: 2, from: 'ground', intervalS: 0.7 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'exploder', count: 2, from: 'right', intervalS: 1.2 },
                { enemy: 'spitter', count: 2, from: 'left', intervalS: 1.4 },
                { enemy: 'brute', count: 1, from: 'right', intervalS: 1 },
              ],
            },
          ],
          hazards: [{ kind: 'pendulum', x: 76, z: 0, periodS: 3.2 }],
        },
        {
          // Floresta + Centro: lenhadores, pântano e o primeiro mech
          id: 's4',
          triggerX: 96,
          lock: { minX: 93, maxX: 111 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'lumberjack', count: 2, from: 'sides', intervalS: 1 },
                { enemy: 'runner', count: 3, from: 'left', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 1 },
              maxAlive: 8,
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1.2 },
                { enemy: 'walker', count: 3, from: 'ground', intervalS: 0.6 },
              ],
            },
          ],
          hazards: [{ kind: 'swamp', x: 102, z: -2.4, w: 4 }],
        },
        {
          // Chamas + Guerra: fogo, artilharia e minas; a faixa aperta
          id: 's5',
          triggerX: 126,
          lock: { minX: 123, maxX: 141 },
          zBand: [-2.2, 1.4],
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [
                { enemy: 'burningWalker', count: 3, from: 'sides', intervalS: 0.8 },
                { enemy: 'soldierZombie', count: 2, from: 'right', intervalS: 1.2 },
              ],
            },
            {
              start: { k: 'aliveAtMost', n: 2 },
              spawns: [
                { enemy: 'soldier', count: 2, from: 'sides', intervalS: 1.2 },
                { enemy: 'exploder', count: 1, from: 'left', intervalS: 1 },
              ],
            },
          ],
          hazards: [
            { kind: 'artillery', x: 132, z: 0, periodS: 5, offsetS: 2 },
            { kind: 'mine', x: 136, z: -1.5 },
            { kind: 'mine', x: 129, z: 0.9 },
          ],
        },
        {
          // Corredor da morte: tudo junto antes do ninho
          id: 's6',
          triggerX: 152,
          lock: { minX: 149, maxX: 167 },
          waves: [
            {
              start: { k: 'segmentStart' },
              maxAlive: 9,
              spawns: [
                { enemy: 'brute', count: 2, from: 'sides', intervalS: 1.6 },
                { enemy: 'ghoul', count: 3, from: 'ground', intervalS: 0.6 },
                { enemy: 'runner', count: 3, from: 'sides', intervalS: 0.8 },
              ],
            },
            {
              start: { k: 'afterCleared', delayS: 0.8 },
              spawns: [
                { enemy: 'mech', count: 1, from: 'right', intervalS: 1 },
                { enemy: 'soldier', count: 2, from: 'left', intervalS: 1.2 },
                { enemy: 'drone', count: 2, from: 'sky', intervalS: 1 },
              ],
            },
          ],
        },
      ],
      props: [
        { kind: 'crate', x: 18, z: -2.6, drop: 'medkitS' },
        { kind: 'tombstone', x: 24, z: 1.2 },
        { kind: 'weaponCrate', x: 31, z: -2.5 },
        { kind: 'atm', x: 49, z: -2.9 },
        { kind: 'explosiveBarrel', x: 56, z: 1.2 },
        { kind: 'barrel', x: 61, z: -2.7, drop: 'mana' },
        { kind: 'explosiveBarrel', x: 79, z: -1.8 },
        { kind: 'crate', x: 88, z: 1.2, drop: 'medkitL' },
        { kind: 'car', x: 108, z: -2.9 },
        { kind: 'crate', x: 115, z: 1.2, drop: 'powerDouble' },
        { kind: 'explosiveBarrel', x: 120, z: -2.6 },
        { kind: 'weaponCrate', x: 145, z: -1.8 },
        { kind: 'crate', x: 158, z: 1.2, drop: 'shield' },
        { kind: 'barrel', x: 164, z: -2.8, drop: 'ammoCurrent' },
        { kind: 'crate', x: 170, z: -2.6, drop: 'medkitL' },
        { kind: 'crate', x: 172, z: 1.3, drop: 'mana' },
      ],
      pickups: [
        { item: 'mana', x: 34, z: 0 },
        { item: 'ammoCurrent', x: 58, z: -1 },
        { item: 'medkitS', x: 90, z: 0 },
        { item: 'ammoCurrent', x: 118, z: 0.5 },
        { item: 'mana', x: 146, z: 0 },
      ],
      boss: { id: 'omega', triggerX: 176, lock: [173, 197] },
    },
  ],
};
