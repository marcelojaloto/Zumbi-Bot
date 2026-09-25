import { el } from '../dom';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

const ROWS: [string, string[], string][] = [
  ['Mover (frente/fundo e lados)', ['W', 'A', 'S', 'D'], 'Analógico esquerdo'],
  ['Correr', ['Shift', '2× ← →'], 'L3'],
  ['Pular / pulo duplo', ['Espaço'], 'A'],
  ['Soco / arma branca / pegar item', ['J'], 'X'],
  ['Chute (correndo: voadora)', ['K'], 'Y'],
  ['Especial: Giro Turbo', ['U', 'J+K'], 'B'],
  ['Atirar / conjurar', ['Mouse esq.', 'L'], 'RT'],
  ['Mirar (precisão, crítico)', ['Mouse dir.', 'I'], 'LT'],
  ['Recarregar', ['R'], 'D-pad ↓'],
  ['Arma / cajado anterior e próximo', ['Q', 'E', 'Roda'], 'LB / RB'],
  ['Modo arma de fogo / cajado', ['1', '2'], 'D-pad ↑'],
  ['Mapa ampliado', ['M'], 'Back'],
  ['Pausa', ['Esc', 'P'], 'Start'],
];

export function controlsScreen(host: UiHost): Screen {
  const grid = el('div', { class: 'keys' });
  grid.append(el('b', {}, 'Ação'), el('b', {}, 'Teclado / mouse'), el('b', {}, 'Gamepad'));
  for (const [label, keys, pad] of ROWS) {
    grid.append(
      el('span', {}, label),
      el('span', {}, ...keys.map((k) => el('kbd', {}, k))),
      el('span', { class: 'muted' }, pad),
    );
  }
  const e = el(
    'div',
    { class: 'screen dim' },
    el('h2', {}, 'CONTROLES'),
    el('div', { class: 'panel' }, grid),
    el(
      'p',
      { class: 'muted' },
      'Combos: J, J, J, J (uppercut) • J, J, K (chute giratório) • correndo + K (voadora) • no ar: J/K',
    ),
    el('button', { class: 'btn', onclick: () => host.screens.pop(), data: { nav: '' } }, 'Voltar'),
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
