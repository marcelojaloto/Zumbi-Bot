import './ui/styles/base.css';
import './ui/styles/hud.css';
import './ui/styles/menus.css';
import './ui/styles/touch.css';
import { App } from './app/App';
import { el } from './ui/dom';
import { t } from './i18n';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;

const app = new App(canvas, ui);
app.boot().catch((err) => {
  console.error(err);
  ui.replaceChildren(
    el(
      'div',
      { class: 'splash' },
      el('h1', {}, t('Erro')),
      el('p', {}, t('Não foi possível iniciar o jogo: {msg}', { msg: String(err?.message ?? err) })),
    ),
  );
});
