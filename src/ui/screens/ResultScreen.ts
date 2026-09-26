import { COSMETICS, RARITY_COLORS, RARITY_NAMES } from '../../data/cosmetics';
import { getMap } from '../../data/maps';
import { STAFFS } from '../../data/staffs';
import { FIREARMS } from '../../data/weapons';
import { rankPosition } from '../../save/ranking';
import type { RunStats } from '../../sim/events';
import { el, fmtInt, hexColor } from '../dom';
import { ordinal, t } from '../../i18n';
import { difficultyName, easierThan } from '../difficulty';
import { getCharacter } from '../../data/characters';
import { SLOT_COLORS, playerTag } from '../../app/party';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface ResultInfo {
  stats: RunStats;
  playerLevel: number;
  levelsGained: number;
  newRecord: boolean;
  next: { mapId: string; levelIdx: number } | null;
  unlockedNext: string | null;
  ngPlusUnlocked?: boolean;
}

/** Tela de vitória ("MAPA CONCLUÍDO!") ou derrota ("VOCÊ FOI DESATIVADO"). */
export function resultScreen(host: UiHost, r: ResultInfo): Screen {
  const s = r.stats;
  const win = s.victory;
  const map = getMap(s.mapId);
  const stars = el('div', { class: 'stars' });
  for (let i = 0; i < 3; i++) stars.appendChild(el('span', { class: i < s.stars ? '' : 'off' }, '★'));
  const stats = el(
    'div',
    { class: 'stats' },
    el('span', {}, t('Pontuação')),
    el('b', {}, fmtInt(s.score)),
    el('span', {}, t('Abates')),
    el('b', {}, String(s.kills)),
    el('span', {}, t('Combo máximo')),
    el('b', {}, `x${s.maxCombo}`),
    el('span', {}, t('Tempo')),
    el('b', {}, fmtTime(s.timeMs)),
    el('span', {}, t('Vidas perdidas')),
    el('b', {}, String(s.livesLost)),
    el('span', {}, t('XP ganho')),
    el(
      'b',
      {},
      `+${fmtInt(s.xpGained)}${r.levelsGained > 0 ? ` (${t('Nível {n}!', { n: r.playerLevel })})` : ''}`,
    ),
    el('span', {}, t('Sucata')),
    el('b', {}, `+${fmtInt(s.scrap)}`),
  );
  // multijogador: uma linha por jogador (os números de cima são da equipe)
  const team = (s.players?.length ?? 0) > 1 ? s.players! : null;
  const table = team
    ? el(
        'table',
        { class: 'party-table' },
        el(
          'tr',
          {},
          el('th', {}, ''),
          el('th', {}, t('Personagem')),
          el('th', {}, t('Pontuação')),
          el('th', {}, t('Abates')),
          el('th', {}, t('Combo')),
          el('th', {}, t('Vidas perdidas')),
        ),
        ...team.map((p) =>
          el(
            'tr',
            {},
            el('td', { style: `color:${SLOT_COLORS[p.slot]};font-weight:900` }, playerTag(p.slot)),
            el('td', {}, t(getCharacter(p.character).name)),
            el('td', {}, fmtInt(p.score)),
            el('td', {}, String(p.kills)),
            el('td', {}, `x${p.maxCombo}`),
            el('td', {}, String(p.livesLost)),
          ),
        ),
      )
    : null;
  const rewards = el('div', { class: 'rewards' });
  if (s.unlockedStaff) {
    const st = STAFFS[s.unlockedStaff];
    rewards.appendChild(
      el(
        'div',
        { class: 'reward', style: `border-color:${hexColor(st.color)}` },
        el('b', {}, t('Novo cajado!')),
        el('span', {}, t(st.name)),
      ),
    );
  }
  for (const g of s.unlockedGuns)
    rewards.appendChild(
      el(
        'div',
        { class: 'reward', style: 'border-color:#ffb02a' },
        el('b', {}, t('Nova arma!')),
        el('span', {}, t(FIREARMS[g].name)),
      ),
    );
  for (const id of s.loot) {
    const c = COSMETICS[id];
    if (!c) continue;
    const col = hexColor(RARITY_COLORS[c.rarity]);
    rewards.appendChild(
      el(
        'div',
        { class: 'reward', style: `border-color:${col}` },
        el('b', { style: `color:${col}` }, t(c.name)),
        el('span', {}, t(RARITY_NAMES[c.rarity])),
      ),
    );
  }
  if (r.unlockedNext) {
    const nm = r.next ? getMap(r.next.mapId) : null;
    rewards.appendChild(
      el(
        'div',
        { class: 'reward', style: 'border-color:#5aff9a' },
        el('b', {}, t('Mapa desbloqueado!')),
        el('span', {}, nm ? t(nm.name) : r.unlockedNext),
      ),
    );
  }

  if (r.ngPlusUnlocked)
    rewards.appendChild(
      el(
        'div',
        { class: 'reward', style: 'border-color:#ff3a5a' },
        el('b', { style: 'color:#ff3a5a' }, t('Novo Jogo+ desbloqueado!')),
        el('span', {}, t('Ative na tela de mapas')),
      ),
    );

  // ranking
  const rankBox = el('div', { class: 'rank-entry' });
  const pos = rankPosition(host.profile.ranking, s.score);
  if (pos >= 0) {
    const input = el('input', {
      type: 'text',
      maxLength: 16,
      value: team ? t('Equipe de {n}', { n: team.length }) : host.profile.save.profile.name,
      data: { nav: '' },
    });
    const save = el(
      'button',
      {
        class: 'btn small primary',
        data: { nav: '' },
        onclick: () => {
          const name = input.value.trim() || t('Anônimo');
          // o nome do perfil é o do jogador 1: uma equipe registra só no ranking
          if (!team) {
            host.profile.save.profile.name = name;
            host.profile.persist();
          }
          const p = host.profile.addRank(name, s, r.playerLevel);
          rankBox.innerHTML = '';
          rankBox.appendChild(
            el('span', {}, t('Registrado em {pos} lugar no ranking!', { pos: ordinal(p + 1) })),
          );
        },
      },
      t('Salvar no ranking'),
    );
    rankBox.append(
      el('span', {}, t('Nova pontuação no ranking ({pos})! Seu nome:', { pos: ordinal(pos + 1) }) + ' '),
      input,
      save,
    );
  }

  const btns = el('div', { class: 'row-btns' });
  const b = (label: string, fn: () => void, cls = 'btn') =>
    el('button', { class: cls, onclick: fn, data: { nav: '' } }, label);
  if (win && r.next)
    btns.appendChild(
      b(t('Próximo mapa'), () => host.startLevel(r.next!.mapId, r.next!.levelIdx), 'btn primary'),
    );
  btns.appendChild(
    b(
      win ? t('Jogar de novo') : t('Tentar novamente'),
      () => host.restartLevel(),
      win && r.next ? 'btn' : 'btn primary',
    ),
  );
  btns.appendChild(b(t('Menu principal'), () => host.quitToMenu()));

  // derrota: oferece tentar de novo numa dificuldade menor
  let easier: HTMLElement | null = null;
  const lower = win ? null : easierThan(host.profile.settings.gameplay.difficulty);
  if (lower)
    easier = el(
      'div',
      { class: 'easier' },
      el('span', { class: 'muted' }, t('Difícil demais? Tente de novo numa dificuldade menor.')),
      b(
        t('Tentar no {d}', { d: difficultyName(lower) }),
        () => {
          host.profile.settings.gameplay.difficulty = lower;
          host.profile.persistSettings();
          host.applySettings();
          host.restartLevel();
        },
        'btn small primary',
      ),
    );

  const e = el(
    'div',
    { class: `screen dim result ${win ? 'win' : 'lose'}` },
    el(
      'h1',
      { style: win ? '' : 'color:#ff4a3a;text-shadow:0 0 24px rgba(255,60,40,.6),0 5px 0 #400' },
      win ? t('MAPA CONCLUÍDO!') : team ? t('EQUIPE DESATIVADA') : t('VOCÊ FOI DESATIVADO'),
    ),
    el(
      'div',
      { class: 'subtitle' },
      `${map.index + 1}. ${t(map.name)}${s.ngPlus ? ' • NG+' : ''}${r.newRecord ? ` • ${t('NOVO RECORDE!')}` : ''}${win && !r.next ? ` • ${t('CAMPANHA CONCLUÍDA!')}` : ''}`,
    ),
    win ? stars : null,
    el('div', { class: 'panel', style: 'max-width:520px' }, stats),
    table ? el('div', { class: 'panel party-results' }, table) : null,
    rewards.childElementCount ? rewards : null,
    rankBox,
    easier,
    btns,
  );
  return { el: e, id: win ? 'victory' : 'gameover', onBack: () => false };
}
