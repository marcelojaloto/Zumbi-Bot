import { COSMETICS, RARITY_COLORS, RARITY_NAMES, RARITY_ORDER, SELL_VALUE } from '../../data/cosmetics';
import { STAFFS, STAFF_ORDER } from '../../data/staffs';
import type { CosmeticDef, CosmeticSlot } from '../../data/types';
import { FIREARMS, WEAPON_ORDER } from '../../data/weapons';
import { BOSSES } from '../../data/bosses';
import { dailyDeals } from '../../app/Profile';
import { el, fmtInt, hexColor } from '../dom';
import { dec, locale, t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

export const SLOT_NAMES: Record<CosmeticSlot, string> = {
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
      title: t(c.desc ?? c.name),
    },
    el('b', {}, t(c.name)),
    el(
      'span',
      { style: `color:${col}` },
      `${t(RARITY_NAMES[c.rarity])} • ${c.set === 'wizard' ? t('Mago') : c.set === 'zombie' ? t('Zumbi') : t('Chefe')}`,
    ),
    opts.price !== undefined && opts.price !== null
      ? el('span', { class: 'price' }, `⚙ ${fmtInt(opts.price)}`)
      : null,
    opts.note ? el('span', { class: 'muted' }, opts.note) : null,
    opts.equipped ? el('i', { class: 'eq' }, t('EQUIPADO')) : null,
  );
}

/** Guarda-roupa: equipar cosméticos com prévia 3D, vender repetidos e ver o arsenal. */
export function wardrobeScreen(host: WardrobeHost): Screen {
  const prof = host.profile;
  const body = el('div', { class: 'wr-body' });
  const tabs = el('div', { class: 'tabs' });
  const scrap = el('div', { class: 'scrap' });
  let tab: CosmeticSlot | 'arsenal' = 'head';
  const refreshScrap = () => (scrap.textContent = t('Sucata: {n}', { n: fmtInt(prof.save.profile.scrap) }));

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
            el('b', {}, has ? t(w.name) : t('??? (arma bloqueada)')),
            has
              ? el(
                  'span',
                  {},
                  t('Dano {dmg} • {rpm} tiros/min • pente {mag} • recarga {reload}', {
                    dmg: `${w.damage}${w.pellets > 1 ? `×${w.pellets}` : ''}`,
                    rpm: w.rpm,
                    mag: w.mag,
                    reload: w.reload.kind === 'mag' ? `${dec(w.reload.s)}s` : t('cartucho a cartucho'),
                  }),
                )
              : el('span', { class: 'muted' }, t('Encontre-a em caixas pelos mapas')),
            has ? el('span', { class: 'muted' }, t(w.desc)) : null,
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
              has ? t(s.name) : t('{name} (bloqueado)', { name: t(s.name) }),
            ),
            el('span', {}, t('Mana {mana} • recarga {cd}s', { mana: s.manaCost, cd: dec(s.cooldownS) })),
            el(
              'span',
              { class: 'muted' },
              has
                ? t(s.desc)
                : t('Derrote {boss} para liberar', { boss: boss ? t(boss.name) : t('o chefe') }),
            ),
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
        RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) ||
        t(a.name).localeCompare(t(b.name), locale()),
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
        el('b', {}, t('Nenhum')),
        el('span', { class: 'muted' }, t('Tirar o item')),
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
          t('Nenhum item deste tipo ainda. Derrote zumbis e chefes ou visite a Loja!'),
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
            t('Vender {name} (+{n} sucata)', { name: t(c.name), n: SELL_VALUE[c.rarity] }),
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
        t(SLOT_NAMES[s]),
      ),
    );
  tabs.appendChild(
    el(
      'button',
      { class: 'btn', data: { nav: '', k: 'arsenal' }, onclick: () => ((tab = 'arsenal'), render()) },
      t('Arsenal'),
    ),
  );

  const e = el(
    'div',
    { class: 'screen wardrobe' },
    el(
      'div',
      { class: 'wr-panel' },
      el('h2', {}, t('GUARDA-ROUPA')),
      scrap,
      tabs,
      body,
      el(
        'div',
        { class: 'row-btns' },
        el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
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
    scrap.textContent = t('Sucata: {n}', { n: fmtInt(prof.save.profile.scrap) });
    host.previewCosmetics(prof.save.cosmetics.equipped);
    body.innerHTML = '';
    const buy = (c: CosmeticDef) => {
      if (prof.owns(c.id)) {
        prof.equip(c.slot, c.id);
        msg.textContent = t('{name} equipado.', { name: t(c.name) });
      } else if (prof.buy(c.id)) {
        prof.equip(c.slot, c.id);
        host.playUi('loot');
        msg.textContent = t('Você comprou {name}!', { name: t(c.name) });
      } else msg.textContent = t('Sucata insuficiente.');
      render();
    };
    body.appendChild(el('h3', {}, t('Ofertas do dia (−20%)')));
    const deals = el('div', { class: 'cos-grid' });
    for (const id of dailyDeals()) {
      const c = COSMETICS[id];
      if (!c) continue;
      deals.appendChild(
        card(c, {
          owned: prof.owns(id),
          price: prof.owns(id) ? undefined : prof.priceOf(id),
          note: prof.owns(id) ? t('Já possui') : undefined,
          onClick: () => buy(c),
        }),
      );
    }
    body.appendChild(deals);
    for (const s of SLOTS) {
      const items = Object.values(COSMETICS)
        .filter((c) => c.slot === s && c.price !== null)
        .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      body.appendChild(el('h3', {}, t(SLOT_NAMES[s])));
      const g = el('div', { class: 'cos-grid' });
      for (const c of items)
        g.appendChild(
          card(c, {
            owned: prof.owns(c.id),
            price: prof.owns(c.id) ? undefined : prof.priceOf(c.id),
            note: prof.owns(c.id) ? t('Já possui') : undefined,
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
      el('h2', {}, t('LOJA')),
      scrap,
      msg,
      body,
      el(
        'div',
        { class: 'row-btns' },
        el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
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
