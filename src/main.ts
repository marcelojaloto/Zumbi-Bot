import './ui/styles/base.css';
import { App } from './app/App';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLDivElement;

const app = new App(canvas, ui);
app.boot().catch((err) => {
  console.error(err);
  ui.innerHTML = `<div class="splash"><h1>Erro</h1><p>Não foi possível iniciar o jogo: ${String(err?.message ?? err)}</p></div>`;
});
