import { COSMETICS, RARITY_COLORS, RARITY_NAMES } from '../../data/cosmetics';
import { getMap } from '../../data/maps';
import { STAFFS } from '../../data/staffs';
import { FIREARMS } from '../../data/weapons';
import type { RankEntry } from '../../save/schema';
import type { CharacterId } from '../../data/types';
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
  /** Terminou o jogo pela primeira vez: o personagem secreto foi liberado. */
  secretUnlocked?: CharacterId;
  /** Online: o anfitrião escolhe o que vem depois; quem entrou espera. */
  online?: 'host' | 'guest';
  /** Jornada até aqui (os mapas vencidos seguem somando pontos). */
  run?: { score: number; maps: number };
  /**
   * Fim da jornada (perdeu todas as vidas ou terminou o jogo): o registro já foi salvo no ranking com o nome
   * sugerido; tocar no nome abre o teclado para trocar. `pos` = -1 se não entrou no top 20.
   */
  rank?: { entry: RankEntry; pos: number; team: boolean };
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

  if (r.secretUnlocked) {
    const sc = getCharacter(r.secretUnlocked);
    rewards.appendChild(
      el(
        'div',
        { class: 'reward', style: `border-color:${hexColor(sc.color)}` },
        el('b', { style: `color:${hexColor(sc.color)}` }, `🔓 ${t('Personagem secreto liberado!')}`),
        el('span', {}, `${t(sc.name)} — ${sc.fullName}`),
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

  // jornada e ranking: o nome só é pedido quando a jornada acaba (perdeu todas as vidas ou terminou o jogo)
  const rankBox = el('div', { class: 'rank-entry' });
  let commitName = () => {};
  let editor: HTMLElement | null = null;
  const runLine = (score: number, maps: number) =>
    maps === 1
      ? t('Jornada: {pts} pontos • 1 mapa vencido', { pts: fmtInt(score) })
      : t('Jornada: {pts} pontos • {n} mapas vencidos', { pts: fmtInt(score), n: maps });
  if (r.rank) {
    const { entry, pos, team } = r.rank;
    rankBox.classList.add('end');
    rankBox.append(el('div', { class: 'rank-run' }, runLine(entry.score, entry.maps ?? 0)));
    if (pos >= 0) {
      const label = el('span', {}, entry.name);
      // o teclado só aparece ao tocar no nome
      const nameBtn = el(
        'button',
        {
          class: 'rank-name',
          title: t('Tocar para mudar o nome'),
          data: { nav: '' },
          onclick: () => openEditor(),
        },
        label,
        el('i', { class: 'rank-pen' }, '✎'),
      );
      const input = el('input', {
        type: 'text',
        maxLength: 16,
        autocomplete: 'off',
        spellcheck: false,
        enterKeyHint: 'done',
      });
      const close = (save: boolean) => {
        if (!editor) return;
        if (save) {
          host.profile.renameRank(entry, input.value, team);
          label.textContent = entry.name;
          host.rankSaved();
        }
        const ed = editor;
        editor = null;
        input.blur();
        ed.remove();
      };
      // escrevendo o nome: a caixa fica no alto da tela, acima do teclado, com o nome sendo escrito à vista
      const openEditor = () => {
        if (editor) return;
        input.value = entry.name;
        const form = el(
          'form',
          { class: 'name-editor-box' },
          el('label', {}, t('Seu nome no ranking')),
          input,
          el('button', { class: 'btn small primary', type: 'submit' }, t('OK')),
        );
        form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          close(true);
        });
        editor = el('div', { class: 'name-editor' }, form);
        // tocar fora da caixa confirma
        editor.addEventListener('pointerdown', (ev) => {
          if (ev.target === editor) {
            ev.preventDefault();
            close(true);
          }
        });
        (document.getElementById('ui') ?? document.body).appendChild(editor);
        input.focus();
        input.select();
      };
      commitName = () => close(true);
      rankBox.append(
        el('div', { class: 'rank-pos' }, '🏆 ', t('{pos} lugar no ranking!', { pos: ordinal(pos + 1) })),
        el('div', { class: 'rank-name-row' }, el('span', { class: 'muted' }, t('Nome:')), nameBtn),
        el('p', { class: 'muted rank-note' }, t('Já está salvo. Toque no nome se quiser mudar.')),
      );
      host.rankSaved();
    } else
      rankBox.append(el('p', { class: 'muted rank-note' }, t('Não entrou no top 20 do ranking desta vez.')));
  } else if (r.run && r.run.score > 0)
    rankBox.append(el('div', { class: 'rank-run muted' }, runLine(r.run.score, r.run.maps)));

  const btns = el('div', { class: 'row-btns' });
  // sair da tela (avançar, tentar de novo, menu) confirma o nome que estiver sendo escrito
  const b = (label: string, fn: () => void, cls = 'btn') =>
    el(
      'button',
      {
        class: cls,
        onclick: () => {
          commitName();
          fn();
        },
        data: { nav: '' },
      },
      label,
    );
  const guest = r.online === 'guest';
  if (guest) btns.appendChild(b(t('Sair da sala'), () => host.quitToMenu()));
  else if (win && r.next)
    btns.appendChild(
      b(t('Próximo mapa'), () => host.startLevel(r.next!.mapId, r.next!.levelIdx), 'btn primary'),
    );
  if (!guest) {
    btns.appendChild(
      b(
        win ? t('Jogar de novo') : t('Tentar novamente'),
        () => host.restartLevel(),
        win && r.next ? 'btn' : 'btn primary',
      ),
    );
    btns.appendChild(
      b(r.online === 'host' ? t('Voltar para a sala') : t('Menu principal'), () => host.quitToMenu()),
    );
  }

  // derrota: oferece tentar de novo numa dificuldade menor
  let easier: HTMLElement | null = null;
  const lower = win || guest ? null : easierThan(host.profile.settings.gameplay.difficulty);
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
    guest ? el('p', { class: 'online-wait' }, t('Esperando o anfitrião escolher a próxima fase…')) : null,
    btns,
  );
  return {
    el: e,
    id: win ? 'victory' : 'gameover',
    onBack: () => false,
    // escrevendo o nome: Enter confirma, Esc desiste (sem mexer nos botões da tela)
    onKey: (code) => {
      if (!editor) return false;
      if (code === 'Enter' || code === 'NumpadEnter') commitName();
      else if (code === 'Escape') {
        editor.remove();
        editor = null;
      } else return false;
      return true;
    },
    onHide: () => commitName(),
  };
}
