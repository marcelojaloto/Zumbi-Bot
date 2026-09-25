import { BOSSES } from '../../data/bosses';
import { MAPS } from '../../data/maps';
import { el } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

/** Créditos com rolagem (automática; setas/rolagem aceleram). `final` = depois do OMEGA-Z. */
export function creditsScreen(
  host: UiHost,
  opts: { final?: boolean; ngPlusUnlocked?: boolean } = {},
): Screen {
  const block = (title: string, ...lines: string[]) =>
    el('div', { class: 'cr-block' }, el('h3', {}, title), ...lines.map((l) => el('p', {}, l)));
  const bosses = MAPS.map((m) => {
    const id = m.levels[m.levels.length - 1]?.boss?.id;
    const b = id ? BOSSES[id] : undefined;
    return b ? `${m.index + 1}. ${t(m.name)} — ${t(b.name)}, ${t(b.title)}` : `${m.index + 1}. ${t(m.name)}`;
  });
  const roll = el(
    'div',
    { class: 'cr-roll' },
    el('h1', {}, 'ZUMBI BOT'),
    el('div', { class: 'subtitle' }, t('A revolução dos robôs no apocalipse zumbi')),
    opts.final
      ? el(
          'p',
          { class: 'cr-story' },
          t(
            'O núcleo do OMEGA-Z se apagou. Pela primeira vez desde o apocalipse, o silêncio tomou as ruas. Os robôs ainda vigiam as cidades em ruínas — mas agora, quem manda é a revolução.',
          ),
        )
      : null,
    block(
      t('Ideia e direção'),
      'Marcelo Jaloto',
      'Nathan Jaloto',
      'Pedro Henrique dos Passos Gomes',
      'Leo Becker',
    ),
    block(t('Desenvolvimento'), t('Criado com Claude Code')),
    block(
      t('Tecnologia'),
      t('Three.js — renderização 3D'),
      t('postprocessing (pmndrs) e N8AO — bloom, cor e oclusão'),
      t('Vite, TypeScript, Vitest e Playwright'),
    ),
    block(
      t('Tudo feito em código'),
      t('Modelos low-poly montados com primitivas'),
      t('Texturas pintadas em canvas'),
      t('Efeitos sonoros e música sintetizados com Web Audio'),
    ),
    block(t('Mapas e chefes'), ...bosses),
    block(t('Agradecimentos'), t('A você, que jogou até o fim.')),
    opts.ngPlusUnlocked
      ? block(
          t('Novo Jogo+ desbloqueado!'),
          t('Ative-o na tela de mapas: inimigos mais fortes, mais pontos e sucata.'),
        )
      : null,
    el('h2', { class: 'cr-end' }, t('Obrigado por jogar!')),
  );
  const viewport = el('div', { class: 'cr-viewport' }, roll);
  let y = 0;
  let boost = 0;
  let last = 0;
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    host.screens.pop();
  };
  const e = el(
    'div',
    { class: 'screen credits' },
    viewport,
    el(
      'button',
      { class: 'btn small cr-skip', data: { nav: '', autofocus: '' }, onclick: close },
      t('Fechar'),
    ),
  );
  viewport.addEventListener('wheel', (ev) => {
    boost += Math.sign(ev.deltaY) * 60;
    ev.preventDefault();
  });
  return {
    el: e,
    id: 'credits',
    onShow: () => {
      y = -viewport.clientHeight * 0.85;
      last = performance.now();
    },
    onKey: (code) => {
      if (code === 'ArrowDown' || code === 'KeyS') boost += 80;
      else if (code === 'ArrowUp' || code === 'KeyW') boost -= 80;
      else return false;
      return true;
    },
    onBack: () => {
      close();
      return true;
    },
    update: () => {
      // tempo real (o quadro do jogo pode estar lento ou pausado)
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const step = 42 * dt + boost * dt * 4;
      boost *= Math.max(0, 1 - dt * 4);
      y = Math.max(-viewport.clientHeight, y + step);
      roll.style.transform = `translateY(${-y}px)`;
      if (y > roll.scrollHeight + 40) y = -viewport.clientHeight;
    },
  };
}
