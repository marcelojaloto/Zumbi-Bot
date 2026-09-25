import { mapScaling } from '../balance';
import { env } from '../env';
import type { MapDef } from '../types';

// ESBOÇO (M7): substituir por conteúdo completo.
export const chamas: MapDef = {
  id: 'chamas',
  index: 7,
  name: 'Área em Chamas',
  subtitle: '',
  color: 0x8fa6ff,
  music: 'chamas',
  wizardBias: 0.3,
  scaling: mapScaling(7),
  env: env({ theme: 'chamas' }),
  levels: [
    {
      id: 'chamas-1',
      name: 'Área em Chamas',
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
      boss: { id: 'incandescente', triggerX: 40, lock: [37, 58] },
    },
  ],
};
