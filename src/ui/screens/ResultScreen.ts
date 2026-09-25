import { COSMETICS, RARITY_COLORS, RARITY_NAMES } from '../../data/cosmetics';
import { getMap } from '../../data/maps';
import { STAFFS } from '../../data/staffs';
import { FIREARMS } from '../../data/weapons';
import { rankPosition } from '../../save/ranking';
import type { RunStats } from '../../sim/events';
import { el, fmtInt, hexColor } from '../dom';
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
    el('span', {}, 'Pontuação'),
    el('b', {}, fmtInt(s.score)),
    el('span', {}, 'Abates'),
    el('b', {}, String(s.kills)),
    el('span', {}, 'Combo máximo'),
    el('b', {}, `x${s.maxCombo}`),
    el('span', {}, 'Tempo'),
    el('b', {}, fmtTime(s.timeMs)),
    el('span', {}, 'Vidas perdidas'),
    el('b', {}, String(s.livesLost)),
    el('span', {}, 'XP ganho'),
    el('b', {}, `+${fmtInt(s.xpGained)}${r.levelsGained > 0 ? ` (Nível ${r.playerLevel}!)` : ''}`),
    el('span', {}, 'Sucata'),
    el('b', {}, `+${fmtInt(s.scrap)}`),
  );
  const rewards = el('div', { class: 'rewards' });
  if (s.unlockedStaff) {
    const st = STAFFS[s.unlockedStaff];
    rewards.appendChild(
      el(
        'div',
        { class: 'reward', style: `border-color:${hexColor(st.color)}` },
        el('b', {}, 'Novo cajado!'),
        el('span', {}, st.name),
      ),
    );
  }
  for (const g of s.unlockedGuns)
    rewards.appendChild(
      el(
        'div',
        { class: 'reward', style: 'border-color:#ffb02a' },
        el('b', {}, 'Nova arma!'),
        el('span', {}, FIREARMS[g].name),
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
        el('b', { style: `color:${col}` }, c.name),
        el('span', {}, RARITY_NAMES[c.rarity]),
      ),
    );
  }
  if (r.unlockedNext) {
    const nm = r.next ? getMap(r.next.mapId) : null;
    rewards.appendChild(
      el(
        'div',
        { class: 'reward', style: 'border-color:#5aff9a' },
        el('b', {}, 'Mapa desbloqueado!'),
        el('span', {}, nm?.name ?? r.unlockedNext),
      ),
    );
  }

  // ranking
  const rankBox = el('div', { class: 'rank-entry' });
  const pos = rankPosition(host.profile.ranking, s.score);
  if (pos >= 0) {
    const input = el('input', {
      type: 'text',
      maxLength: 16,
      value: host.profile.save.profile.name,
      data: { nav: '' },
    });
    const save = el(
      'button',
      {
        class: 'btn small primary',
        data: { nav: '' },
        onclick: () => {
          const name = input.value.trim() || 'Anônimo';
          host.profile.save.profile.name = name;
          host.profile.persist();
          const p = host.profile.addRank(name, s, r.playerLevel);
          rankBox.innerHTML = '';
          rankBox.appendChild(el('span', {}, `Registrado em ${p + 1}º lugar no ranking!`));
        },
      },
      'Salvar no ranking',
    );
    rankBox.append(el('span', {}, `Nova pontuação no ranking (${pos + 1}º)! Seu nome: `), input, save);
  }

  const btns = el('div', { class: 'row-btns' });
  const b = (label: string, fn: () => void, cls = 'btn') =>
    el('button', { class: cls, onclick: fn, data: { nav: '' } }, label);
  if (win && r.next)
    btns.appendChild(
      b('Próximo mapa', () => host.startLevel(r.next!.mapId, r.next!.levelIdx), 'btn primary'),
    );
  btns.appendChild(
    b(
      win ? 'Jogar de novo' : 'Tentar novamente',
      () => host.restartLevel(),
      win && r.next ? 'btn' : 'btn primary',
    ),
  );
  btns.appendChild(b('Menu principal', () => host.quitToMenu()));

  const e = el(
    'div',
    { class: `screen dim result ${win ? 'win' : 'lose'}` },
    el(
      'h1',
      { style: win ? '' : 'color:#ff4a3a;text-shadow:0 0 24px rgba(255,60,40,.6),0 5px 0 #400' },
      win ? 'MAPA CONCLUÍDO!' : 'VOCÊ FOI DESATIVADO',
    ),
    el('div', { class: 'subtitle' }, `${map.index + 1}. ${map.name}${r.newRecord ? ' • NOVO RECORDE!' : ''}`),
    win ? stars : null,
    el('div', { class: 'panel', style: 'max-width:520px' }, stats),
    rewards.childElementCount ? rewards : null,
    rankBox,
    btns,
  );
  return { el: e, id: win ? 'victory' : 'gameover', onBack: () => false };
}
