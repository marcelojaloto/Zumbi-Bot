import type { EnemyExtra } from './types';
import { pracaExtras } from './praca';
import { estudioExtras } from './estudio';
import { pistaExtras } from './pista';

export const ENEMY_EXTRAS: Record<string, EnemyExtra> = {
  ...pracaExtras,
  ...estudioExtras,
  ...pistaExtras,
};
