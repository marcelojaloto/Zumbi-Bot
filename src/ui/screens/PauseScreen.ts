import { el } from '../dom';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

export function pauseScreen(host: UiHost): Screen {
  const b = (label: string, fn: () => void, cls = 'btn') =>
    el('button', { class: cls, onclick: fn, data: { nav: '' } }, label);
  const e = el(
    'div',
    { class: 'screen dim' },
    el('h2', {}, 'PAUSA'),
    el(
      'div',
      { class: 'menu' },
      b('Continuar', () => host.resume(), 'btn primary'),
      b('Reiniciar fase', () => host.restartLevel()),
      b('Configurações', () => host.openSettings()),
      b('Controles', () => host.openControls()),
      b('Sair para o menu', () => host.quitToMenu(), 'btn danger'),
    ),
  );
  return {
    el: e,
    id: 'pause',
    onBack: () => {
      host.resume();
      return false;
    },
  };
}
