import type { ChestPrize } from '../../app/chest';
import { COSMETICS, RARITY_COLORS, RARITY_NAMES } from '../../data/cosmetics';
import { MELEE_WEAPONS } from '../../data/melee';
import { REVIVE_ITEMS } from '../../data/revive';
import { STAFFS } from '../../data/staffs';
import { FIREARMS } from '../../data/weapons';
import { CHARACTERS } from '../../data/characters';
import { el, fmtInt, hexColor } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

/** O que o baú precisa do aplicativo: a foto 3D de cada prêmio (null = usa o ícone). */
export interface ChestHost extends UiHost {
  prizeThumb(p: ChestPrize): string | null;
}

/** Toques para abrir o baú. */
export const CHEST_TAPS = 3;

const SLOT_ICONS: Record<string, string> = { head: '🎩', eyes: '🕶️', mask: '🎭', body: '👕', back: '🧥' };

/** Nome, tipo, cor e ícone de reserva de cada prêmio. */
function prizeInfo(p: ChestPrize): { name: string; kind: string; color: string; icon: string } {
  switch (p.k) {
    case 'scrap':
      return {
        name: t('{n} de sucata', { n: fmtInt(p.n) }),
        kind: t('Sucata'),
        color: '#ffd24a',
        icon: '⚙️',
      };
    case 'cosmetic': {
      const c = COSMETICS[p.id]!;
      return {
        name: t(c.name),
        kind: t(RARITY_NAMES[c.rarity]),
        color: hexColor(RARITY_COLORS[c.rarity]),
        icon: SLOT_ICONS[c.slot] ?? '🎁',
      };
    }
    case 'staff': {
      const s = STAFFS[p.id];
      return { name: t(s.name), kind: t('Novo cajado!'), color: hexColor(s.color), icon: '🔮' };
    }
    case 'gun':
      return { name: t(FIREARMS[p.id].name), kind: t('Nova arma!'), color: '#ffb02a', icon: '🔫' };
    case 'melee':
      return { name: t(MELEE_WEAPONS[p.id].name), kind: t('Arma branca'), color: '#e0e0e0', icon: '🗡️' };
    case 'revive': {
      const it = REVIVE_ITEMS[p.c];
      return {
        name: t(it.name),
        kind: t('Item de reviver de {name}', { name: t(CHARACTERS[p.c].name) }),
        color: hexColor(it.color),
        icon: it.icon,
      };
    }
  }
}

/**
 * Baú do fim de fase: fica balançando e brilhando; três bolinhas embaixo mostram que precisa de três toques (cada
 * toque sacode o baú e acende uma bolinha). No terceiro ele abre e os prêmios saem voando para os lados, cada um
 * com o objeto e o nome embaixo. Enter, espaço ou o botão A do controle também tocam.
 */
export function chestScreen(host: ChestHost, prizes: ChestPrize[], onDone: () => void): Screen {
  let taps = 0;
  let done = false;
  const dots = el(
    'div',
    { class: 'chest-dots', ariaHidden: 'true' },
    ...Array.from({ length: CHEST_TAPS }, () => el('span')),
  );
  const chest = el(
    'button',
    {
      class: 'chest',
      title: t('Toque três vezes para abrir'),
      data: { nav: '', autofocus: '' },
      onclick: () => tap(),
    },
    el('i', { class: 'chest-rays' }),
    el('i', { class: 'chest-lid' }, el('i', { class: 'chest-band' })),
    el('i', { class: 'chest-body' }, el('i', { class: 'chest-band' }), el('i', { class: 'chest-lock' })),
  );
  const ring = el('div', { class: 'chest-prizes' });
  const hint = el('p', { class: 'chest-hint' }, t('Toque três vezes no baú para abrir'));
  const cont = el(
    'button',
    { class: 'btn primary chest-continue', data: { nav: '' }, hidden: true, onclick: () => finish() },
    t('Pegar prêmios'),
  );
  const finish = () => {
    if (done) return;
    done = true;
    onDone();
  };

  const open = () => {
    chest.classList.add('open');
    hint.textContent =
      prizes.length === 1 ? t('Você ganhou!') : t('Você ganhou {n} prêmios!', { n: prizes.length });
    host.playUi('unlock');
    setTimeout(() => host.playUi('loot'), 350);
    // prêmios numa elipse em volta do baú, começando no alto
    const n = prizes.length;
    const rx = Math.min(330, window.innerWidth * 0.36);
    const ry = Math.min(150, window.innerHeight * 0.26);
    prizes.forEach((p, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + (n % 2 ? 0 : Math.PI / n);
      const info = prizeInfo(p);
      const url = host.prizeThumb(p);
      const item = el(
        'div',
        {
          class: 'prize',
          style: `--px:${Math.round(Math.cos(a) * rx)}px;--py:${Math.round(Math.sin(a) * ry)}px;--pc:${info.color};animation-delay:${0.25 + i * 0.12}s`,
        },
        el(
          'div',
          { class: 'prize-obj' },
          url ? el('img', { src: url, alt: '' }) : el('span', { class: 'prize-icon' }, info.icon),
        ),
        el('b', {}, info.name),
        el('span', {}, info.kind),
      );
      ring.appendChild(item);
    });
    cont.hidden = false;
    setTimeout(() => cont.focus(), 400);
  };

  const tap = () => {
    if (taps >= CHEST_TAPS) return;
    taps++;
    dots.children[taps - 1]?.classList.add('on');
    chest.classList.remove('hit');
    void chest.offsetWidth;
    chest.classList.add('hit');
    // depois do tremor, volta a balançar
    setTimeout(() => chest.classList.remove('hit'), 340);
    if (taps < CHEST_TAPS) {
      host.playUi('ui_click');
      chest.style.setProperty('--glow', String(taps / CHEST_TAPS));
      return;
    }
    dots.classList.add('full');
    open();
  };

  const e = el(
    'div',
    { class: 'screen chest-screen' },
    el('h1', { class: 'chest-title' }, t('BAÚ DA FASE')),
    el('div', { class: 'chest-stage' }, ring, chest, dots),
    hint,
    cont,
  );
  return {
    el: e,
    id: 'chest',
    onKey: (code) => {
      if (taps < CHEST_TAPS && (code === 'Space' || code === 'Enter' || code === 'NumpadEnter')) {
        tap();
        return true;
      }
      return false;
    },
    // sair antes de abrir: abre na hora (os prêmios já estão no perfil)
    onBack: () => {
      if (taps < CHEST_TAPS) {
        taps = CHEST_TAPS - 1;
        tap();
        return true;
      }
      finish();
      return true;
    },
  };
}
