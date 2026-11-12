import { pracaEn } from './praca';
import { estudioEn } from './estudio';
import { pistaEn } from './pista';
import { shoppingEn } from './shopping';
import { bunkerEn } from './bunker';
import { lojaEn } from './loja';

/** Textos dos mundos da 2ª temporada, um arquivo por mundo. */
export const SEASON2_EN: Record<string, string> = {
  ...pracaEn,
  ...estudioEn,
  ...pistaEn,
  ...shoppingEn,
  ...bunkerEn,
  ...lojaEn,
};
