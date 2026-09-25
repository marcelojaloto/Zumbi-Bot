import { COSMETICS, RARITY_COLORS, RARITY_NAMES, RARITY_ORDER, SELL_VALUE } from '../../data/cosmetics';
import { STAFFS, STAFF_ORDER } from '../../data/staffs';
import type { CosmeticDef, CosmeticSlot } from '../../data/types';
import { FIREARMS, WEAPON_ORDER } from '../../data/weapons';
import { BOSSES } from '../../data/bosses';
import { dailyDeals } from '../../app/Profile';
import { el, fmtInt, hexColor } from '../dom';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

const SLOT_NAMES: Record<CosmeticSlot, string> = {
  head: 'Cabeça',
  eyes: 'Olhos',
  mask: 'Máscara',
  body: 'Corpo',
  back: 'Costas',
};
const SLOTS: CosmeticSlot[] = ['head', 'eyes', 'mask', 'body', 'back'];

export interface WardrobeHost extends UiHost {
  previewCosmetics(eq: Partial<Record<CosmeticSlot, string>>): void;
  setMenuFocus(f: number): void;
}

function card(
  c: CosmeticDef,
  opts: { equipped?: boolean; owned?: boolean; price?: number | null; onClick: () => void; note?: string },
): HTMLElement {
  const col = hexColor(RARITY_COLORS[c.rarity]);
  return el(
    'button',
    {
      class: `cos-card ${opts.equipped ? 'on' : ''} ${opts.owned === false ? 'unowned' : ''}`,
      style: `--rc:${col}`,
      data: { nav: '' },
      onclick: opts.onClick,
      title: c.desc ?? c.name,
    },
    el('b', {}, c.name),
    el(
      'span',
      { style: `color:${col}` },
      `${RARITY_NAMES[c.rarity]} • ${c.set === 'wizard' ? 'Mago' : c.set === 'zombie' ? 'Zumbi' : 'Chefe'}`,
    ),
    opts.price !== undefined && opts.price !== null
      ? el('span', { class: 'price' }, `⚙ ${fmtInt(opts.price)}`)
      : null,
    opts.note ? el('span', { class: 'muted' }, opts.note) : null,
    opts.equipped ? el('i', { class: 'eq' }, 'EQUIPADO') : null,
  );
}

/** Guarda-roupa: equipar cosméticos com prévia 3D, vender repetidos e ver o arsenal. */
export function wardrobeScreen(host: WardrobeHost): Screen {
  const prof = host.profile;
  const body = el('div', { class: 'wr-body' });
  const tabs = el('div', { class: 'tabs' });
  const scrap = el('div', { class: 'scrap' });
  let tab: CosmeticSlot | 'arsenal' = 'head';
  const refreshScrap = () => (scrap.textContent = `Sucata: ${fmtInt(prof.save.profile.scrap)}`);

  const render = () => {
    refreshScrap();
    host.previewCosmetics(prof.save.cosmetics.equipped);
    body.innerHTML = '';
    for (const b of tabs.children) b.classList.toggle('on', (b as HTMLElement).dataset.k === tab);
    if (tab === 'arsenal') {
      const g = el('div', { class: 'arsenal' });
      for (const id of WEAPON_ORDER) {
        const w = FIREARMS[id];
        const has = prof.save.unlocks.firearms.includes(id);
        g.appendChild(
          el(
            'div',
            { class: `ars ${has ? '' : 'locked'}` },
            el('b', {}, has ? w.name : '??? (arma bloqueada)'),
            has
              ? el(
                  'span',
                  {},
                  `Dano ${w.damage}${w.pellets > 1 ? `×${w.pellets}` : ''} • ${w.rpm} tiros/min • pente ${w.mag} • recarga ${w.reload.kind === 'mag' ? `${w.reload.s}s` : 'cartucho a cartucho'}`,
                )
              : el('span', { class: 'muted' }, 'Encontre-a em caixas pelos mapas'),
            has ? el('span', { class: 'muted' }, w.desc) : null,
          ),
        );
      }
      for (const id of STAFF_ORDER) {
        const s = STAFFS[id];
        const has = prof.save.unlocks.staffs.includes(id);
        const boss = s.unlock.kind === 'boss' ? BOSSES[s.unlock.bossId] : undefined;
        g.appendChild(
          el(
            'div',
            { class: `ars ${has ? '' : 'locked'}`, style: `border-left-color:${hexColor(s.color)}` },
            el(
              'b',
              { style: has ? `color:${hexColor(s.color)}` : '' },
              has ? s.name : `${s.name} (bloqueado)`,
            ),
            el('span', {}, `Mana ${s.manaCost} • recarga ${s.cooldownS}s`),
            el('span', { class: 'muted' }, has ? s.desc : `Derrote ${boss?.name ?? 'o chefe'} para liberar`),
          ),
        );
      }
      body.appendChild(g);
      return;
    }
    const slot = tab;
    const owned = prof.save.cosmetics.owned
      .map((id) => COSMETICS[id])
      .filter((c): c is CosmeticDef => !!c && c.slot === slot);
    owned.sort(
      (a, b) =>
        RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) || a.name.localeCompare(b.name),
    );
    const eq = prof.save.cosmetics.equipped[slot];
    const grid = el('div', { class: 'cos-grid' });
    grid.appendChild(
      el(
        'button',
        {
          class: `cos-card ${!eq ? 'on' : ''}`,
          data: { nav: '' },
          onclick: () => (prof.equip(slot, null), render()),
        },
        el('b', {}, 'Nenhum'),
        el('span', { class: 'muted' }, 'Tirar o item'),
      ),
    );
    for (const c of owned) {
      grid.appendChild(
        card(c, {
          equipped: eq === c.id,
          onClick: () => {
            prof.equip(slot, eq === c.id ? null : c.id);
            render();
          },
        }),
      );
    }
    body.appendChild(grid);
    if (owned.length === 0)
      body.appendChild(
        el(
          'p',
          { class: 'muted' },
          'Nenhum item deste tipo ainda. Derrote zumbis e chefes ou visite a Loja!',
        ),
      );
    // vender
    if (eq) {
      const c = COSMETICS[eq]!;
      body.appendChild(
        el(
          'div',
          { class: 'row-btns', style: 'margin-top:10px' },
          el(
            'button',
            {
              class: 'btn small danger',
              data: { nav: '' },
              onclick: () => {
                prof.sell(eq);
                render();
              },
            },
            `Vender ${c.name} (+${SELL_VALUE[c.rarity]} sucata)`,
          ),
        ),
      );
    }
  };

  for (const s of SLOTS)
    tabs.appendChild(
      el(
        'button',
        { class: 'btn', data: { nav: '', k: s }, onclick: () => ((tab = s), render()) },
        SLOT_NAMES[s],
      ),
    );
  tabs.appendChild(
    el(
      'button',
      { class: 'btn', data: { nav: '', k: 'arsenal' }, onclick: () => ((tab = 'arsenal'), render()) },
      'Arsenal',
    ),
  );

  const e = el(
    'div',
    { class: 'screen wardrobe' },
    el(
      'div',
      { class: 'wr-panel' },
      el('h2', {}, 'GUARDA-ROUPA'),
      scrap,
      tabs,
      body,
      el(
        'div',
        { class: 'row-btns' },
        el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, 'Voltar'),
      ),
    ),
  );
  render();
  return {
    el: e,
    id: 'wardrobe',
    onShow: () => {
      host.setMenuFocus(1);
      render();
    },
    onHide: () => host.setMenuFocus(0),
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}

/** Loja: ofertas do dia (-20%) e catálogo completo por encaixe, comprados com sucata. */
export function shopScreen(host: WardrobeHost): Screen {
  const prof = host.profile;
  const body = el('div', { class: 'wr-body' });
  const scrap = el('div', { class: 'scrap' });
  const msg = el('div', { class: 'muted' });
  const render = () => {
    scrap.textContent = `Sucata: ${fmtInt(prof.save.profile.scrap)}`;
    host.previewCosmetics(prof.save.cosmetics.equipped);
    body.innerHTML = '';
    const buy = (c: CosmeticDef) => {
      if (prof.owns(c.id)) {
        prof.equip(c.slot, c.id);
        msg.textContent = `${c.name} equipado.`;
      } else if (prof.buy(c.id)) {
        prof.equip(c.slot, c.id);
        host.playUi('loot');
        msg.textContent = `Você comprou ${c.name}!`;
      } else msg.textContent = 'Sucata insuficiente.';
      render();
    };
    body.appendChild(el('h3', {}, 'Ofertas do dia (−20%)'));
    const deals = el('div', { class: 'cos-grid' });
    for (const id of dailyDeals()) {
      const c = COSMETICS[id];
      if (!c) continue;
      deals.appendChild(
        card(c, {
          owned: prof.owns(id),
          price: prof.owns(id) ? undefined : prof.priceOf(id),
          note: prof.owns(id) ? 'Já possui' : undefined,
          onClick: () => buy(c),
        }),
      );
    }
    body.appendChild(deals);
    for (const s of SLOTS) {
      const items = Object.values(COSMETICS)
        .filter((c) => c.slot === s && c.price !== null)
        .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      body.appendChild(el('h3', {}, SLOT_NAMES[s]));
      const g = el('div', { class: 'cos-grid' });
      for (const c of items)
        g.appendChild(
          card(c, {
            owned: prof.owns(c.id),
            price: prof.owns(c.id) ? undefined : prof.priceOf(c.id),
            note: prof.owns(c.id) ? 'Já possui' : undefined,
            onClick: () => buy(c),
          }),
        );
      body.appendChild(g);
    }
  };
  const e = el(
    'div',
    { class: 'screen wardrobe' },
    el(
      'div',
      { class: 'wr-panel' },
      el('h2', {}, 'LOJA'),
      scrap,
      msg,
      body,
      el(
        'div',
        { class: 'row-btns' },
        el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, 'Voltar'),
      ),
    ),
  );
  render();
  return {
    el: e,
    id: 'shop',
    onShow: () => {
      host.setMenuFocus(1);
      render();
    },
    onHide: () => host.setMenuFocus(0),
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}
