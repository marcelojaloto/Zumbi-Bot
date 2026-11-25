import { MAPS, getMap } from '../../data/maps';
import { getCharacter } from '../../data/characters';
import type { CharacterId } from '../../data/types';
import type { GlobalEntry, GlobalRanking } from '../../net/globalRanking';
import { el, fmtInt } from '../dom';
import { parentGate } from '../parentGate';
import { PRIVACY_URL } from '../links';
import { locale, t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

/** O que a tela de ranking precisa além do básico: o ranking global (Firebase). */
export interface RankingHost extends UiHost {
  readonly global: GlobalRanking;
}

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

export type RankingMode = 'personal' | 'global';

/**
 * Ranking Pessoal (top 20 deste aparelho e a carreira) ou Ranking Global (o melhor resultado de cada aparelho). No
 * global só entra quem toca em Participar, e cada um aparece para os outros pelos apelidos dos personagens: o nome
 * escrito no ranking pessoal não sai do aparelho.
 */
export function rankingScreen(host: RankingHost, mode: RankingMode = 'personal'): Screen {
  const prof = host.profile;
  const global = host.global;
  let globalList: GlobalEntry[] | null = global.cached;
  /** O ranking global não respondeu. */
  let failed = false;
  let alive = true;
  /** Pedindo confirmação para sair do ranking global. */
  let leaving = false;
  /** Esperando o adulto responsável autorizar a entrada no ranking global. */
  let consenting = false;

  const title = el('h2', {});
  const body = el('div', { class: 'rk-body' });
  const note = el('p', { class: 'muted rk-note' });
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
      else void askConsent();
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

  // o código anônimo do aparelho é dado pessoal: menor de 18 ou idade desconhecida, só com um adulto autorizando
  // (GDPR art. 8, LGPD art. 14, COPPA). A faixa e a autorização não são guardadas nem enviadas.
  const consent = el('div', { class: 'row-btns rk-confirm rk-consent', hidden: true });
  const stopConsent = () => {
    consenting = false;
    render();
  };
  const enter = () => {
    consenting = false;
    busy(global.join(prof.ranking.entries[0]));
    render();
  };
  const ageBtn = (label: string) =>
    el(
      'button',
      {
        class: 'btn small',
        data: { nav: '' },
        onclick: () => {
          consent.replaceChildren(
            parentGate(
              t(
                'Você é o adulto responsável por quem joga neste aparelho e autoriza enviar o melhor resultado, com um código anônimo, para o ranking global?',
              ),
              enter,
              stopConsent,
            ),
          );
          consent.querySelector('input')?.focus();
        },
      },
      label,
    );
  const askConsent = async () => {
    await host.voiceGate.check();
    if (!alive || global.joined) return;
    if (host.voiceGate.adult) return enter();
    consenting = true;
    consent.replaceChildren(
      el(
        'p',
        { class: 'rk-consent-rule' },
        t(
          'O ranking global recebe o seu melhor resultado com um código anônimo do aparelho. Para menores de 18 anos, ou quando o jogo não sabe a idade, um adulto responsável precisa autorizar.',
        ),
      ),
      el('span', {}, t('Qual a idade de quem joga neste aparelho?')),
      ageBtn(t('Menos de 13 anos')),
      ageBtn(t('13 a 17 anos')),
      ageBtn(t('18 anos ou mais')),
      el('button', { class: 'btn small', data: { nav: '' }, onclick: stopConsent }, t('Cancelar')),
    );
    render();
    consent.querySelector<HTMLElement>('button')?.focus();
  };

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
    const rows = prof.ranking.entries;
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
          t('O ranking está vazio. Jogue até o fim da jornada para entrar nele!'),
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
            el('td', { class: 'rk-date' }, fmtDate(r.date)),
          ),
        ),
      ),
    );
  };

  const renderGlobal = () => {
    if (!globalList) {
      note.textContent = '';
      body.replaceChildren(
        el(
          'p',
          { class: 'muted rk-empty' },
          failed
            ? t('O ranking global não respondeu. Confira a internet e tente de novo mais tarde.')
            : t('Carregando...'),
        ),
      );
      return;
    }
    const list = globalList;
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
            el('td', { class: 'rk-date' }, fmtDate(g.date)),
          );
        }),
      ),
    );
  };

  const render = () => {
    const personal = mode === 'personal';
    title.textContent = personal ? t('RANKING PESSOAL') : t('RANKING GLOBAL');
    career.hidden = !personal;
    join.hidden = personal || !globalList || consenting;
    consent.hidden = personal || !consenting;
    join.textContent = global.joined ? t('Sair do ranking global') : t('Participar');
    join.classList.toggle('primary', !global.joined);
    confirmLeave.hidden = personal || !leaving;
    if (personal) renderPersonal();
    else renderGlobal();
  };

  const refreshGlobal = (force: boolean) =>
    void global.fetchTop(force).then((list) => {
      if (!alive) return;
      // falhou de novo: fica a última lista boa
      if (list || !globalList) globalList = list;
      failed = !list;
      render();
    });

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
    body,
    note,
    confirmLeave,
    consent,
    el('div', { class: 'row-btns' }, join),
  );
  render();
  if (mode === 'global') refreshGlobal(true);
  return {
    el: e,
    id: 'ranking',
    backArrow: true,
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
