import { BOSSES } from '../../data/bosses';
import { MAPS } from '../../data/maps';
import { el, fmtInt, hexColor } from '../dom';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

/** Seleção de mapas e níveis: cadeado, estrelas, recorde e chefe de cada mapa. */
export function mapSelectScreen(host: UiHost): Screen {
  const grid = el('div', { class: 'map-grid' });
  const prof = host.profile;
  for (const m of MAPS) {
    const unlocked = prof.isMapUnlocked(m.id);
    const levels = m.levels.map((l, i) => {
      const lp = prof.save.progress.levels[l.id];
      const open = prof.isLevelUnlocked(l.id);
      const stars = lp ? '★'.repeat(lp.stars) + '☆'.repeat(3 - lp.stars) : '☆☆☆';
      return el(
        'button',
        {
          class: 'btn small level-btn',
          disabled: !open,
          data: { nav: '' },
          onclick: () => host.startLevel(m.id, i),
          title: l.name,
        },
        open ? `${m.levels.length > 1 ? `${i + 1}. ` : ''}${l.name}` : '🔒 Bloqueado',
        el('span', { class: 'lv-stars' }, stars),
      );
    });
    const best = m.levels.reduce((a, l) => Math.max(a, prof.save.progress.levels[l.id]?.bestScore ?? 0), 0);
    const bossId = m.levels[m.levels.length - 1]?.boss?.id;
    const boss = bossId ? BOSSES[bossId] : undefined;
    const card = el(
      'div',
      { class: `map-card ${unlocked ? '' : 'locked'}`, style: `--mc:${hexColor(m.color)}` },
      el('div', { class: 'mc-num' }, String(m.index + 1)),
      el('div', { class: 'mc-name' }, unlocked ? m.name : '???'),
      el('div', { class: 'mc-sub' }, unlocked ? m.subtitle : 'Conclua o mapa anterior'),
      el('div', { class: 'mc-boss' }, unlocked && boss ? `Chefe: ${boss.name}` : ''),
      el('div', { class: 'mc-best' }, best > 0 ? `Recorde: ${fmtInt(best)}` : ''),
      el('div', { class: 'mc-levels' }, ...levels),
    );
    grid.appendChild(card);
  }
  let ng: HTMLElement | null = null;
  if (prof.save.flags.ngPlus) {
    const label = () => (prof.save.flags.ngPlusOn ? 'Novo Jogo+: LIGADO' : 'Novo Jogo+: desligado');
    const btn = el(
      'button',
      {
        class: `btn small ng-toggle ${prof.save.flags.ngPlusOn ? 'on' : ''}`,
        data: { nav: '' },
        onclick: () => {
          prof.save.flags.ngPlusOn = !prof.save.flags.ngPlusOn;
          prof.persist();
          btn.textContent = label();
          btn.classList.toggle('on', prof.save.flags.ngPlusOn);
        },
      },
      label(),
    );
    ng = el(
      'div',
      { class: 'ng-row' },
      btn,
      el('span', { class: 'muted' }, 'Inimigos +50% vida e +30% dano • pontos e sucata ×1,5'),
    );
  }
  const e = el(
    'div',
    { class: 'screen dim' },
    el('h2', {}, 'ESCOLHA O MAPA'),
    ng,
    grid,
    el('button', { class: 'btn', onclick: () => host.screens.pop(), data: { nav: '' } }, 'Voltar'),
  );
  return {
    el: e,
    id: 'maps',
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}
