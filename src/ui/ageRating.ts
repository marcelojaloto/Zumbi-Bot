import { t } from '../i18n';
import { el } from './dom';

/** Classificação indicativa sugerida; deve bater com a do questionário IARC das lojas. */
export const AGE_RATING = 6;

export function ageRating(): HTMLElement {
  return el(
    'div',
    { class: 'age-rating', title: t('Classificação indicativa') },
    el('b', { class: `age-badge age-${AGE_RATING}` }, String(AGE_RATING)),
    el(
      'div',
      {},
      el('span', {}, t('Não recomendado para')),
      el('span', {}, t('menores de {n} anos', { n: AGE_RATING })),
      el('small', {}, t('Violência fantasiosa')),
    ),
  );
}
