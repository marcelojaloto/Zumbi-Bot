import { el } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

/** Pausa. Online (`online` = papel na sala) o jogo não para: é só um menu por cima. */
export function pauseScreen(host: UiHost, online?: 'host' | 'guest'): Screen {
  const b = (label: string, fn: () => void, cls = 'btn') =>
    el('button', { class: cls, onclick: fn, data: { nav: '' } }, label);
  const e = el(
    'div',
    { class: 'screen dim' },
    el('h2', {}, online ? t('MENU') : t('PAUSA')),
    online ? el('p', { class: 'muted' }, t('O jogo continua rodando para os outros jogadores.')) : null,
    el(
      'div',
      { class: 'menu' },
      b(t('Continuar'), () => host.resume(), 'btn primary'),
      online === 'guest'
        ? null
        : b(online ? t('Reiniciar fase (para todos)') : t('Reiniciar fase'), () => host.restartLevel()),
      b(t('Configurações'), () => host.openSettings()),
      b(t('Controles'), () => host.openControls()),
      b(
        online === 'host'
          ? t('Voltar para a sala (todos)')
          : online === 'guest'
            ? t('Sair da sala')
            : t('Sair para o menu'),
        () => host.quitToMenu(),
        'btn danger',
      ),
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
