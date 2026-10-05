import { MAPS, getMap } from '../../data/maps';
import { getCharacter } from '../../data/characters';
import type { CharacterId } from '../../data/types';
import { filterByMap } from '../../save/ranking';
import type { GlobalEntry, GlobalRanking } from '../../net/globalRanking';
import { el, fmtInt } from '../dom';
import { locale, t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

/** O que a tela de ranking precisa além do básico: o ranking global (Firebase). */
export interface RankingHost extends UiHost {
  readonly global: GlobalRanking;
}

/** Política de privacidade publicada (a mesma das lojas). */
const PRIVACY_URL = 'https://marcelojaloto.github.io/Zumbi-Bot/privacy/';

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtDate(ts: number): string {
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleDateString(locale());
  } catch {
    return '-';
  }
}

function fmtPlay(ms: number): string {
  const m = Math.floor(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

function mapName(id: string): string {
  try {
    const m = getMap(id);
    return `${m.index + 1}. ${t(m.name)}`;
  } catch {
    return id || '-';
  }
}

/** Apelidos dos personagens da jornada (a equipe mostra quantos eram). */
function charsLabel(chars: CharacterId[] | undefined): string {
  if (!chars?.length) return '-';
  return chars.map((c) => t(getCharacter(c).name)).join(', ');
}

/** Onde a jornada terminou: fim do jogo (🏆), derrota, ou (registros antigos, de um mapa só) o mapa. */
function endTag(victory: boolean, run: boolean): HTMLElement | null {
  if (victory) return run ? el('i', { class: 'rk-tag win' }, `🏆 ${t('fim do jogo')}`) : null;
  return el('i', { class: 'rk-tag lose' }, t('derrota'));
}

/**
 * Ranking: abre no Ranking Pessoal (top 20 deste aparelho, com filtro por mapa e a carreira). O botão Ranking Global
 * (o melhor resultado de cada jogador/aparelho) só aparece quando o ranking global responde. Fora do ar, some.
 * No global só entra quem toca em Participar, e cada um aparece para os outros pelos apelidos dos personagens: o
 * nome escrito no ranking pessoal não sai do aparelho.
 */
export function rankingScreen(host: RankingHost): Screen {
  const prof = host.profile;
  const global = host.global;
  let mode: 'personal' | 'global' = 'personal';
  let filter: string | null = null;
  let globalList: GlobalEntry[] | null = global.cached;
  let alive = true;
  /** Pedindo confirmação para sair do ranking global. */
  let leaving = false;

  const title = el('h2', {});
  const tabs = el('div', { class: 'tabs rk-tabs' });
  const body = el('div', { class: 'rk-body' });
  const note = el('p', { class: 'muted rk-note' });
  const toggle = el('button', {
    class: 'btn rk-toggle',
    hidden: true,
    data: { nav: '' },
    onclick: () => setMode(mode === 'personal' ? 'global' : 'personal'),
  });
  // entrar e sair do ranking global (sair apaga o registro e a conta anônima do aparelho)
  const busy = (p: Promise<boolean>) => {
    join.disabled = true;
    void p.then(() => {
      join.disabled = false;
      refreshGlobal(true);
    });
  };
  const join = el('button', {
    class: 'btn rk-join',
    hidden: true,
    data: { nav: '' },
    onclick: () => {
      if (global.joined) leaving = true;
      else busy(global.join(prof.ranking.entries[0]));
      render();
    },
  });
  const confirmLeave = el(
    'div',
    { class: 'row-btns rk-confirm', hidden: true },
    el('span', {}, t('Sair do ranking global? O seu resultado é apagado de lá.')),
    el(
      'button',
      {
        class: 'btn small danger',
        data: { nav: '' },
        onclick: () => {
          leaving = false;
          busy(global.leave());
          render();
        },
      },
      t('Sim, sair'),
    ),
    el(
      'button',
      {
        class: 'btn small',
        data: { nav: '' },
        onclick: () => {
          leaving = false;
          render();
        },
      },
      t('Cancelar'),
    ),
  );

  const table = (heads: string[], rows: HTMLElement[]) =>
    el(
      'div',
      { class: 'rk-scroll' },
      el(
        'table',
        { class: 'rk-table' },
        el('thead', {}, el('tr', {}, ...heads.map((h) => el('th', {}, h)))),
        el('tbody', {}, ...rows),
      ),
    );

  const renderPersonal = () => {
    const rows = filterByMap(prof.ranking, filter);
    const run = prof.save.run;
    note.textContent =
      run && run.score > 0
        ? t(
            'Jornada em andamento: {pts} pontos | {n} mapas vencidos. Ela entra no ranking quando você perder todas as vidas ou terminar o jogo.',
            {
              pts: fmtInt(run.score),
              n: run.maps,
            },
          )
        : t('Os pontos de cada mapa se somam na jornada até você perder todas as vidas ou terminar o jogo.');
    if (rows.length === 0) {
      body.replaceChildren(
        el(
          'p',
          { class: 'muted rk-empty' },
          filter
            ? t('Ninguém registrou pontos neste mapa ainda.')
            : t('O ranking está vazio. Jogue até o fim da jornada para entrar nele!'),
        ),
      );
      return;
    }
    body.replaceChildren(
      table(
        [
          '#',
          t('Nome'),
          t('Pontos'),
          t('Mapas'),
          t('Onde parou'),
          t('Tempo'),
          t('Abates'),
          t('Nível'),
          t('Data'),
        ],
        rows.map((r, i) =>
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
            el('td', { class: 'num' }, r.maps === undefined ? '-' : String(r.maps)),
            el('td', {}, mapName(r.mapId), endTag(r.victory, r.maps !== undefined)),
            el('td', { class: 'num' }, fmtTime(r.timeMs)),
            el('td', { class: 'num' }, String(r.kills)),
            el('td', { class: 'num' }, String(r.playerLevel)),
            el('td', { class: 'muted' }, fmtDate(r.date)),
          ),
        ),
      ),
    );
  };

  const renderGlobal = () => {
    const list = globalList ?? [];
    const me = global.myUid;
    const mine = me ? list.findIndex((g) => g.uid === me) : -1;
    const status = !global.joined
      ? t('Toque em Participar para entrar com o seu melhor resultado.')
      : mine >= 0
        ? t('Você está em {pos}º lugar!', { pos: mine + 1 })
        : t('Você participa com o seu melhor resultado do Ranking Pessoal.');
    note.replaceChildren(
      `${status} ${t('Os outros jogadores não veem o seu nome, só os apelidos dos personagens.')} `,
      el('a', { href: PRIVACY_URL, target: '_blank', rel: 'noopener', data: { nav: '' } }, t('Privacidade')),
    );
    if (list.length === 0) {
      body.replaceChildren(
        el('p', { class: 'muted rk-empty' }, t('Ninguém entrou no ranking global ainda.')),
      );
      return;
    }
    const myName = prof.ranking.entries[0]?.name;
    body.replaceChildren(
      table(
        ['#', t('Jogador'), t('Pontos'), t('Mapas'), t('Onde parou'), t('Nível'), t('Data')],
        list.map((g, i) => {
          const own = g.uid === me;
          return el(
            'tr',
            { class: `${i < 3 ? `top${i + 1}` : ''}${own ? ' me' : ''}` },
            el('td', {}, String(i + 1)),
            el(
              'td',
              { class: 'rk-player' },
              // o nome escrito só aparece neste aparelho; os outros aparecem pelos personagens
              (own && myName) || charsLabel(g.chars),
              own ? el('i', { class: 'rk-tag you' }, t('você')) : null,
              g.ngPlus ? el('i', { class: 'rk-tag' }, 'NG+') : null,
              own && g.chars.length > 1 ? el('i', { class: 'rk-tag team' }, `👥${g.chars.length}`) : null,
            ),
            el('td', { class: 'num' }, fmtInt(g.score)),
            el('td', { class: 'num' }, String(g.maps)),
            el('td', {}, mapName(g.mapId), endTag(g.victory, true)),
            el('td', { class: 'num' }, String(g.level)),
            el('td', { class: 'muted' }, fmtDate(g.date)),
          );
        }),
      ),
    );
  };

  const render = () => {
    const personal = mode === 'personal';
    title.textContent = personal ? t('RANKING PESSOAL') : t('RANKING GLOBAL');
    toggle.textContent = personal ? `🌎 ${t('Ranking Global')}` : `👤 ${t('Ranking Pessoal')}`;
    career.hidden = !personal;
    tabs.hidden = !personal;
    join.hidden = personal || !globalList;
    join.textContent = global.joined ? t('Sair do ranking global') : t('Participar');
    join.classList.toggle('primary', !global.joined);
    confirmLeave.hidden = personal || !leaving;
    for (const b of tabs.children)
      b.classList.toggle('on', ((b as HTMLElement).dataset.k || null) === (filter ?? null));
    if (personal) renderPersonal();
    else renderGlobal();
  };

  // ranking global: só aparece se responder; ficou fora do ar, volta para o pessoal sem aviso
  const refreshGlobal = (force: boolean) =>
    void global.fetchTop(force).then((list) => {
      if (!alive) return;
      globalList = list;
      toggle.hidden = !list;
      if (!list && mode === 'global') mode = 'personal';
      render();
    });

  const setMode = (m: typeof mode) => {
    mode = m;
    leaving = false;
    render();
    if (m === 'global') refreshGlobal(true);
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
  tabs.appendChild(tab(t('Todos'), null));
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
    title,
    career,
    tabs,
    body,
    note,
    confirmLeave,
    el(
      'div',
      { class: 'row-btns' },
      el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
      toggle,
      join,
    ),
  );
  if (globalList) toggle.hidden = false;
  render();
  if (global.configured) refreshGlobal(false);
  return {
    el: e,
    id: 'ranking',
    onBack: () => {
      host.screens.pop();
      return true;
    },
    onHide: () => {
      alive = false;
    },
    onShow: () => {
      alive = true;
    },
  };
}
