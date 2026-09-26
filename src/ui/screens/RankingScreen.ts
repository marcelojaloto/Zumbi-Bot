import { MAPS, getMap } from '../../data/maps';
import { filterByMap } from '../../save/ranking';
import { el, fmtInt } from '../dom';
import { locale, t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtDate(ts: number): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString(locale());
  } catch {
    return '—';
  }
}

function fmtPlay(ms: number): string {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

/** Ranking local (top 20) com filtro por mapa e estatísticas da carreira. */
export function rankingScreen(host: UiHost): Screen {
  const prof = host.profile;
  const tabs = el('div', { class: 'tabs rk-tabs' });
  const body = el('div', { class: 'rk-body' });
  let filter: string | null = null;

  const render = () => {
    for (const b of tabs.children)
      b.classList.toggle('on', ((b as HTMLElement).dataset.k || null) === (filter ?? null));
    body.innerHTML = '';
    const rows = filterByMap(prof.ranking, filter);
    if (rows.length === 0) {
      body.appendChild(
        el(
          'p',
          { class: 'muted rk-empty' },
          filter
            ? t('Ninguém registrou pontos neste mapa ainda.')
            : t('O ranking está vazio. Termine uma partida e registre seu nome!'),
        ),
      );
      return;
    }
    const table = el(
      'table',
      { class: 'rk-table' },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          ...['#', t('Nome'), t('Pontos'), t('Mapa'), t('Tempo'), t('Abates'), t('Nível'), t('Data')].map(
            (h) => el('th', {}, h),
          ),
        ),
      ),
    );
    const tb = el('tbody', {});
    rows.forEach((r, i) => {
      let mapName = r.mapId;
      try {
        const m = getMap(r.mapId);
        mapName = `${m.index + 1}. ${t(m.name)}`;
      } catch {
        /* mapa removido */
      }
      tb.appendChild(
        el(
          'tr',
          { class: i < 3 ? `top${i + 1}` : '' },
          el('td', {}, String(i + 1)),
          el(
            'td',
            {},
            r.name,
            r.ngPlus ? el('i', { class: 'rk-tag' }, 'NG+') : null,
            (r.chars?.length ?? 0) > 1 ? el('i', { class: 'rk-tag team' }, `👥${r.chars!.length}`) : null,
          ),
          el('td', { class: 'num' }, fmtInt(r.score)),
          el('td', {}, mapName, r.victory ? '' : el('i', { class: 'rk-tag lose' }, t('derrota'))),
          el('td', { class: 'num' }, fmtTime(r.timeMs)),
          el('td', { class: 'num' }, String(r.kills)),
          el('td', { class: 'num' }, String(r.playerLevel)),
          el('td', { class: 'muted' }, fmtDate(r.date)),
        ),
      );
    });
    table.appendChild(tb);
    body.appendChild(el('div', { class: 'rk-scroll' }, table));
  };

  const tab = (label: string, k: string | null) =>
    el(
      'button',
      {
        class: 'btn small',
        data: { nav: '', k: k ?? '' },
        onclick: () => {
          filter = k;
          render();
        },
      },
      label,
    );
  tabs.appendChild(tab(t('Geral'), null));
  for (const m of MAPS) if (prof.isMapUnlocked(m.id)) tabs.appendChild(tab(String(m.index + 1), m.id));

  const s = prof.save.stats;
  const done = Object.values(prof.save.progress.levels).filter((l) => l.completed).length;
  const stars = Object.values(prof.save.progress.levels).reduce((a, l) => a + l.stars, 0);
  const totalLevels = MAPS.reduce((a, m) => a + m.levels.length, 0);
  const career = el(
    'div',
    { class: 'rk-career' },
    ...(
      [
        [t('Abates'), fmtInt(s.kills)],
        [t('Chefes'), fmtInt(s.bosses)],
        [t('Mortes'), fmtInt(s.deaths)],
        [t('Partidas'), fmtInt(s.runs)],
        [t('Tempo de jogo'), fmtPlay(s.playTimeMs)],
        [t('Níveis'), `${done}/${totalLevels}`],
        [t('Estrelas'), `${stars}/${totalLevels * 3}`],
      ] as const
    ).map(([k, v]) => el('div', {}, el('span', { class: 'muted' }, k), el('b', {}, v))),
  );

  const e = el(
    'div',
    { class: 'screen dim ranking' },
    el('h2', {}, t('RANKING')),
    career,
    tabs,
    body,
    el(
      'div',
      { class: 'row-btns' },
      el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
    ),
  );
  render();
  return {
    el: e,
    id: 'ranking',
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}
