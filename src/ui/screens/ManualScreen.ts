import { getLang, t } from '../../i18n';
import { el } from '../dom';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

/**
 * Manual aberto dentro do próprio jogo (numa moldura), e não numa aba nova: assim o jogo não sai da tela cheia
 * nem mostra a barra do navegador ao voltar. "Jogar agora" do manual só fecha a moldura; links de fora abrem
 * no navegador.
 */
export function manualScreen(host: UiHost): Screen {
  const frame = el('iframe', {
    class: 'manual-frame',
    title: t('Manual'),
    src: `manual/index.html?lang=${getLang()}`,
  }) as HTMLIFrameElement;
  const close = () => host.screens.pop();
  frame.addEventListener('load', () => {
    let doc: Document | null = null;
    try {
      doc = frame.contentDocument;
    } catch {
      return;
    }
    doc?.addEventListener('click', (ev) => {
      const a = (ev.target as Element | null)?.closest?.('a');
      if (!a || !a.getAttribute('href') || a.getAttribute('href')!.startsWith('#')) return;
      const url = new URL(a.href, doc!.baseURI);
      ev.preventDefault();
      // o próprio jogo ("Jogar agora"): só volta para ele
      if (url.origin === location.origin && url.pathname === location.pathname) close();
      else if (url.origin === location.origin) frame.src = url.href;
      else window.open(url.href, '_blank', 'noopener');
    });
  });
  const e = el(
    'div',
    { class: 'screen solid manual-view' },
    el(
      'div',
      { class: 'manual-top' },
      el('h2', {}, t('MANUAL')),
      el('button', { class: 'btn', data: { nav: '', autofocus: '' }, onclick: close }, t('Voltar')),
    ),
    frame,
  );
  return {
    el: e,
    id: 'manual',
    onBack: () => {
      close();
      return true;
    },
  };
}
