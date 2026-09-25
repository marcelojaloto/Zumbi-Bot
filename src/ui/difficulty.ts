import { DIFFICULTY_ORDER } from '../data/balance';
import type { Difficulty } from '../data/types';
import { t } from '../i18n';

/** Nomes das dificuldades (texto em português é a chave de tradução). */
export function difficultyName(d: Difficulty): string {
  return d === 'veryEasy'
    ? t('Muito fácil')
    : d === 'easy'
      ? t('Fácil')
      : d === 'hard'
        ? t('Difícil')
        : t('Normal');
}

/** Dificuldade um passo abaixo (ou null se já é a mais fácil). */
export function easierThan(d: Difficulty): Difficulty | null {
  const i = DIFFICULTY_ORDER.indexOf(d);
  return i > 0 ? DIFFICULTY_ORDER[i - 1]! : null;
}
