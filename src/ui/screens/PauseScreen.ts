import { el } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

export function pauseScreen(host: UiHost): Screen {
  const b = (label: string, fn: () => void, cls = 'btn') =>
    el('button', { class: cls, onclick: fn, data: { nav: '' } }, label);
  const e = el(
    'div',
    { class: 'screen dim' },
    el('h2', {}, t('PAUSA')),
    el(
      'div',
      { class: 'menu' },
      b(t('Continuar'), () => host.resume(), 'btn primary'),
      b(t('Reiniciar fase'), () => host.restartLevel()),
      b(t('Configurações'), () => host.openSettings()),
      b(t('Controles'), () => host.openControls()),
      b(t('Sair para o menu'), () => host.quitToMenu(), 'btn danger'),
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
