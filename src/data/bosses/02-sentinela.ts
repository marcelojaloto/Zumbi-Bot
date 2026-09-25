import type { BossDef } from '../types';
import { registerBoss } from './index';

// ESBOÇO (M7): substituir por conteúdo completo.
export const sentinela = registerBoss({
  id: 'sentinela',
  name: 'Sentinela dos Ventos',
  title: '',
  family: 'robot',
  element: 'wind',
  hp: 3600,
  scale: 2.2,
  radius: 1.0,
  height: 4.0,
  speed: 2,
  poise: 300,
  resist: {},
  statusDurationMult: 0.6,
  statusImmune: [],
  contact: { damage: 8, dtype: 'blunt', knockback: 6, hitstun: 14, hitstop: 2 },
  rewards: { xp: 600, score: 25000, scrap: 250, unlockStaff: 'wind', cosmetics: [] },
  music: 'torre',
  rig: {
    kind: 'mech',
    scale: 2.2,
    skin: 0x5a5e66,
    cloth: 0x3a3e46,
    cloth2: 0xffb02a,
    eye: 0xff3a1a,
    boss: 'sentinela',
  },
  phases: [
    {
      untilHpFrac: 0,
      speedMult: 1,
      damageMult: 1,
      idleBetweenS: [1, 2],
      patterns: [{ id: 'wait', weight: 1, cooldownS: 1, steps: [{ t: 'wait', s: 1 }] }],
    },
  ],
} satisfies BossDef);
