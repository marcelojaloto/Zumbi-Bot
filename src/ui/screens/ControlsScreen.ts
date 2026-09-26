import { el } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

export const ROWS: [string, string[], string][] = [
  ['Mover (frente/fundo e lados)', ['W', 'A', 'S', 'D'], 'Analógico esquerdo'],
  ['Correr', ['Shift', '2× ← →'], 'L3'],
  ['Pular / pulo duplo', ['Espaço'], 'A'],
  ['Soco / arma branca / pegar item', ['J'], 'X'],
  ['Chute (correndo: voadora)', ['K'], 'Y'],
  ['Especial do personagem', ['U', 'J+K'], 'B'],
  ['Atirar / conjurar', ['Mouse esq.', 'L'], 'RT'],
  ['Mirar (precisão, crítico)', ['Mouse dir.', 'I'], 'LT'],
  ['Recarregar', ['R'], 'D-pad ↓'],
  ['Arma / cajado anterior e próximo', ['Q', 'E', 'Roda'], 'LB / RB'],
  ['Modo arma de fogo / cajado', ['1', '2'], 'D-pad ↑'],
  ['Mapa ampliado', ['M'], 'Back'],
  ['Pausa', ['Esc', 'P'], 'Start'],
];

/** Controles de toque: [botão na tela, o que faz]. */
export const TOUCH_ROWS: [string, string][] = [
  ['Direcional (esquerda)', 'Anda e muda de plano; empurrar até a borda corre'],
  ['SOCO', 'Soco, arma branca e pegar itens; 4 seguidos = combo'],
  ['CHUTE', 'Chute; correndo = voadora'],
  ['PULAR', 'Pulo; toque de novo no ar para o pulo duplo'],
  ['ATIRAR', 'Atira ou conjura o cajado, mirando sozinho no inimigo à frente'],
  ['ESPECIAL', 'Especial do personagem (gasta mana)'],
  ['⟳', 'Recarregar'],
  ['▶▶', 'Próxima arma ou cajado'],
  ['⇄', 'Alterna entre arma de fogo e cajado'],
  ['⏸', 'Pausa'],
];

export function controlsScreen(host: UiHost): Screen {
  const keys = el('div', { class: 'keys' });
  keys.append(el('b', {}, t('Ação')), el('b', {}, t('Teclado / mouse')), el('b', {}, 'Gamepad'));
  for (const [label, ks, pad] of ROWS) {
    keys.append(
      el('span', {}, t(label)),
      el('span', {}, ...ks.map((k) => el('kbd', {}, t(k)))),
      el('span', { class: 'muted' }, t(pad)),
    );
  }
  const touch = el('div', { class: 'keys touch-keys' });
  touch.append(el('b', {}, t('Botão')), el('b', {}, t('O que faz')));
  for (const [btn, what] of TOUCH_ROWS)
    touch.append(el('span', {}, el('kbd', {}, t(btn))), el('span', {}, t(what)));

  // multijogador local: duas pessoas no mesmo teclado
  const split = el(
    'div',
    { class: 'panel split-keys' },
    el(
      'p',
      {},
      el('b', {}, t('Esquerda')),
      ' — ',
      t('WASD andam • F soco • G chute • Espaço pula • R atira • T especial'),
    ),
    el(
      'p',
      {},
      el('b', {}, t('Direita')),
      ' — ',
      t('Setas andam • J soco • K chute • L pula • O atira • I especial'),
    ),
    el(
      'p',
      { class: 'muted' },
      t(
        'Até 5 jogadores: na seleção, cada controle entra com A e uma segunda pessoa no teclado entra com J.',
      ),
    ),
  );

  const panels = host.touchActive
    ? [
        el('h3', {}, t('Toque')),
        el('div', { class: 'panel' }, touch),
        el('h3', {}, t('Teclado e gamepad')),
        el('div', { class: 'panel' }, keys),
      ]
    : [el('div', { class: 'panel' }, keys), el('h3', {}, t('Toque')), el('div', { class: 'panel' }, touch)];
  const e = el(
    'div',
    { class: 'screen dim controls-screen' },
    el('h2', {}, t('CONTROLES')),
    ...panels,
    el('h3', {}, t('Multijogador: teclado dividido')),
    split,
    el(
      'p',
      { class: 'muted' },
      t('Combos: J, J, J, J (uppercut) • J, J, K (chute giratório) • correndo + K (voadora) • no ar: J/K'),
    ),
    el('button', { class: 'btn', onclick: () => host.screens.pop(), data: { nav: '' } }, t('Voltar')),
  );
  return {
    el: e,
    id: 'controls',
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}
