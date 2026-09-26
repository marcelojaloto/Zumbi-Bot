import { CHARACTERS, CHARACTER_ORDER } from '../../data/characters';
import type { CharacterDef, CharacterId } from '../../data/types';
import { el, hexColor } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { WardrobeHost } from './WardrobeScreen';

export interface LobbyHost extends WardrobeHost {
  /** Mostra o personagem no cenário 3D atrás da tela. */
  previewCharacter(id: CharacterId): void;
}

/** Barras de atributos (rótulo já traduzido, valor 0..1) mostradas na seleção. */
export function characterBars(c: CharacterDef): [string, number][] {
  const s = c.stats;
  return [
    [t('Vida'), s.hp / 150],
    [t('Força'), s.dmg.melee / 1.4],
    [t('Armas'), s.dmg.gun / 1.4],
    [t('Magia'), s.dmg.staff / 1.4],
    [t('Velocidade'), s.speed / 1.2],
  ];
}

/** Painel com nome, descrição, atributos e especial de um personagem. */
export function characterInfo(c: CharacterDef): HTMLElement {
  const bars = characterBars(c).map(([label, v]) =>
    el(
      'div',
      { class: 'stat-row' },
      el('span', {}, label),
      el('div', { class: 'stat-bar' }, el('i', { style: `width:${Math.round(Math.min(1, v) * 100)}%` })),
    ),
  );
  return el(
    'div',
    { class: 'char-info', style: `--cc:${hexColor(c.color)}` },
    el('h3', {}, t(c.name)),
    el('div', { class: 'ci-title' }, t(c.title)),
    el('p', { class: 'ci-desc' }, t(c.desc)),
    el('div', { class: 'ci-stats' }, ...bars),
    el(
      'div',
      { class: 'ci-special' },
      el('b', {}, t('Especial'), ': ', t(c.specialName)),
      el('span', {}, t(c.specialDesc)),
    ),
  );
}

/**
 * Seleção de personagem antes de começar a fase: ←/→ (ou D-pad) trocam, Enter/A começa, Esc/B volta.
 * O personagem escolhido aparece em 3D ao lado e fica salvo para a próxima partida.
 */
export function lobbyScreen(host: LobbyHost, target: { mapId: string; levelIdx: number }): Screen {
  const saved = host.profile.save.profile.character;
  let idx = Math.max(0, CHARACTER_ORDER.indexOf(saved));
  const cur = () => CHARACTER_ORDER[idx]!;

  const info = el('div', { class: 'char-slot' });
  const chips = CHARACTER_ORDER.map((id, i) =>
    el(
      'button',
      {
        class: 'btn small char-chip',
        style: `--cc:${hexColor(CHARACTERS[id].color)}`,
        data: { nav: '', char: id },
        onclick: () => select(i),
      },
      t(CHARACTERS[id].name),
    ),
  );
  const render = () => {
    const id = cur();
    info.replaceChildren(characterInfo(CHARACTERS[id]));
    for (const c of chips) c.classList.toggle('on', c.dataset.char === id);
    host.previewCharacter(id);
  };
  const select = (i: number) => {
    const n = CHARACTER_ORDER.length;
    const next = ((i % n) + n) % n;
    if (next === idx) return;
    idx = next;
    host.playUi('ui_hover');
    render();
  };
  const start = () => {
    host.profile.setCharacter(cur());
    host.startLevel(target.mapId, target.levelIdx);
  };
  const leave = () => {
    host.previewCharacter(host.profile.save.profile.character);
    host.screens.pop();
  };

  const e = el(
    'div',
    { class: 'screen lobby' },
    el(
      'div',
      { class: 'wr-panel lobby-panel' },
      el('h2', {}, t('ESCOLHA SEU PERSONAGEM')),
      el('div', { class: 'char-chips' }, ...chips),
      info,
      el('div', { class: 'muted lobby-help' }, t('←/→ trocam de personagem • Enter começa • Esc volta')),
      el(
        'div',
        { class: 'row-btns' },
        el('button', { class: 'btn', data: { nav: '' }, onclick: leave }, t('Voltar')),
        el(
          'button',
          { class: 'btn primary', data: { nav: '', autofocus: '' }, onclick: start },
          t('Começar'),
        ),
      ),
    ),
  );
  return {
    el: e,
    id: 'lobby',
    onShow: () => {
      // plano médio: o personagem inteiro aparece ao lado do painel
      host.setMenuFocus(0.55);
      render();
    },
    onHide: () => host.setMenuFocus(0),
    onBack: () => {
      leave();
      return true;
    },
    onNav: (dx) => {
      if (!dx) return false;
      select(idx + dx);
      return true;
    },
  };
}
