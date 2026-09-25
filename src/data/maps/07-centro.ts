import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

// ESBOÇO (M7): substituir por conteúdo completo.
export const centro: MapDef = {
  id: 'centro',
  index: 6,
  name: 'Centro da Cidade',
  subtitle: '',
  color: 0x8fa6ff,
  music: 'centro',
  wizardBias: 0.3,
  scaling: mapScaling(6),
  env: env({ theme: 'centro' }),
  levels: [
    {
      id: 'centro-1',
      name: 'Centro da Cidade',
      length: 60,
      zBand: [-3.5, 2],
      parTimeS: 400,
      playerStart: { x: 3, z: 0 },
      segments: [
        {
          id: 's1',
          triggerX: 10,
          lock: { minX: 7, maxX: 25 },
          waves: [
            {
              start: { k: 'segmentStart' },
              spawns: [{ enemy: 'walker', count: 2, from: 'right', intervalS: 1 }],
            },
          ],
        },
      ],
      props: [],
      pickups: [],
      boss: { id: 'mecha', triggerX: 40, lock: [37, 58] },
    },
  ],
};
