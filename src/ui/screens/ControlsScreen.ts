import { actionKeyNames } from '../../input/keyLabels';
import { bindingsFrom, type Action } from '../../input/keymap';
import { el } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';
import { keyBindScreen } from './KeyBindScreen';

/**
 * [ação, teclas, gamepad]. Nas teclas, `@acao` vira a tecla atual da ação (configurável), `@a+@b` junta duas e o
 * resto é texto fixo (mouse, toque duplo...).
 */
export const ROWS: [string, string[], string][] = [
  ['Mover (frente/fundo e lados)', ['@move'], 'Analógico esquerdo'],
  ['Correr', ['@run', 'Rodinha do mouse', '2× ← →'], 'L3'],
  ['Pular / pulo duplo', ['@jump'], 'A'],
  ['Soco / arma branca / pegar item', ['@punch'], 'X'],
  ['Chute (correndo: voadora)', ['@kick'], 'Y'],
  ['Especial do personagem', ['@special', 'Mouse dir.', '@punch+@kick'], 'B'],
  ['Atirar / conjurar', ['Mouse esq.', '@fire'], 'RT'],
  ['Mirar (precisão, crítico)', ['@aim'], 'LT'],
  ['Recarregar', ['@reload'], 'D-pad ↓'],
  ['Arma / cajado anterior e próximo', ['@prev', '@next'], 'LB / RB'],
  ['Modo arma de fogo / cajado', ['@modeGun', '@modeStaff'], 'D-pad ↑'],
  ['Mapa ampliado', ['@map'], 'Back'],
  ['Pausa', ['Esc', '@pause'], 'Start'],
];

/** Textos fixos da coluna de teclas (traduzidos). */
export const ROW_KEY_TEXTS = ROWS.flatMap((r) => r[1]).filter((k) => !k.startsWith('@'));

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
  const fillKeys = () => {
    const n = actionKeyNames(bindingsFrom(host.profile.settings.controls.keys));
    const name = (a: string) =>
      a === 'move' ? [n.up, n.left, n.down, n.right].join(' ') : (n[a as Action] ?? '—');
    const label = (k: string) =>
      k.startsWith('@')
        ? k
            .split('+')
            .map((p) => name(p.slice(1)))
            .join('+')
        : t(k);
    keys.replaceChildren(el('b', {}, t('Ação')), el('b', {}, t('Teclado / mouse')), el('b', {}, 'Gamepad'));
    for (const [row, ks, pad] of ROWS) {
      const names = ks.map(label).filter((k) => !k.includes('—'));
      keys.append(
        el('span', {}, t(row)),
        el('span', {}, ...names.map((k) => el('kbd', {}, k))),
        el('span', { class: 'muted' }, t(pad)),
      );
    }
  };
  fillKeys();
  const rebindBtn = el(
    'button',
    { class: 'btn small', data: { nav: '' }, onclick: () => host.screens.push(keyBindScreen(host)) },
    `⌨️ ${t('Trocar teclas')}`,
  );
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
        el('div', { class: 'panel' }, keys, el('div', { class: 'row-btns' }, rebindBtn)),
      ]
    : [
        el('div', { class: 'panel' }, keys, el('div', { class: 'row-btns' }, rebindBtn)),
        el('h3', {}, t('Toque')),
        el('div', { class: 'panel' }, touch),
      ];
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
    // voltou da tela de teclas: mostra as teclas novas
    onShow: fillKeys,
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}
