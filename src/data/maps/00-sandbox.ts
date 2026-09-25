import { env } from '../env';
import type { MapDef } from '../types';

/** Área de testes (debug): nível plano, sem ondas. */
export const sandbox: MapDef = {
  id: 'sandbox',
  index: -1,
  name: 'Área de Testes',
  subtitle: 'Laboratório do Zumbi Bot',
  color: 0x39e6ff,
  music: 'vila',
  wizardBias: 0.5,
  scaling: { hp: 1, dmg: 1 },
  env: env({
    theme: 'sandbox',
    fog: { color: 0x151a26, density: 0.025 },
    ground: { color: 0x2a2f38, color2: 0x363c48, pattern: 'metal' },
    particles: 'dust',
  }),
  levels: [
    {
      id: 'sandbox-1',
      name: 'Laboratório',
      length: 80,
      zBand: [-3.5, 2],
      parTimeS: 600,
      playerStart: { x: 4, z: 0 },
      segments: [],
      props: [
        { kind: 'crate', x: 14, z: -1 },
        { kind: 'barrel', x: 18, z: 1 },
        { kind: 'explosiveBarrel', x: 24, z: -2 },
      ],
      pickups: [],
    },
  ],
};
