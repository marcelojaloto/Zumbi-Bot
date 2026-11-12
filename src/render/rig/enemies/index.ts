import type { EnemyExtra } from './types';
import { pracaExtras } from './praca';
import { estudioExtras } from './estudio';
import { pistaExtras } from './pista';
import { shoppingExtras } from './shopping';

export const ENEMY_EXTRAS: Record<string, EnemyExtra> = {
  ...pracaExtras,
  ...estudioExtras,
  ...pistaExtras,
  ...shoppingExtras,
};
