import { pracaEn } from './praca';
import { estudioEn } from './estudio';
import { pistaEn } from './pista';

/** Textos dos mundos da 2ª temporada, um arquivo por mundo. */
export const SEASON2_EN: Record<string, string> = {
  ...pracaEn,
  ...estudioEn,
  ...pistaEn,
};
