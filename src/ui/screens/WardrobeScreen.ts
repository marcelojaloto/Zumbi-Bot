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
  /** Veste o boneco do menu; `back` vira o boneco de costas. */
  previewCosmetics(eq: Partial<Record<CosmeticSlot, string>>, back?: boolean): void;
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
      data: { nav: '', id: c.id },
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
    host.previewCosmetics(prof.save.cosmetics.equipped, tab === 'back');
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
    onHide: () => {
      host.previewCosmetics(prof.save.cosmetics.equipped);
      host.setMenuFocus(0);
    },
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}

/**
 * Loja: ofertas do dia (-20%) e catálogo completo por encaixe, comprados com sucata. Tocar num item veste o
 * boneco com ele (prévia) e abre a barra de confirmação: nada é comprado sem apertar "Comprar".
 */
export function shopScreen(host: WardrobeHost): Screen {
  const prof = host.profile;
  const body = el('div', { class: 'wr-body' });
  const scrap = el('div', { class: 'scrap' });
  const msg = el('div', { class: 'shop-msg' });
  const bar = el('div', { class: 'buy-bar', hidden: true });
  /** Item em prévia (vestido no boneco, esperando a confirmação). */
  let sel: CosmeticDef | null = null;
  let msgTimer = 0;
  const say = (text: string) => {
    msg.textContent = text;
    msg.classList.add('show');
    clearTimeout(msgTimer);
    msgTimer = window.setTimeout(() => msg.classList.remove('show'), 3000);
  };
  const preview = () =>
    host.previewCosmetics(
      sel ? { ...prof.save.cosmetics.equipped, [sel.slot]: sel.id } : prof.save.cosmetics.equipped,
      sel?.slot === 'back',
    );
  const close = () => {
    sel = null;
    render();
  };
  const renderBar = () => {
    bar.hidden = !sel;
    bar.innerHTML = '';
    if (!sel) return;
    const c = sel;
    const col = hexColor(RARITY_COLORS[c.rarity]);
    const owned = prof.owns(c.id);
    const equipped = prof.save.cosmetics.equipped[c.slot] === c.id;
    const price = prof.priceOf(c.id) ?? 0;
    const have = prof.save.profile.scrap;
    let main: HTMLButtonElement;
    if (owned)
      main = el(
        'button',
        {
          class: 'btn primary small',
          data: { nav: '' },
          disabled: equipped,
          onclick: () => {
            prof.equip(c.slot, c.id);
            say(t('{name} equipado.', { name: t(c.name) }));
            close();
          },
        },
        equipped ? t('Equipado') : t('Equipar'),
      );
    else if (have >= price)
      main = el(
        'button',
        {
          class: 'btn primary small',
          data: { nav: '' },
          onclick: () => {
            if (!prof.buy(c.id)) {
              say(t('Sucata insuficiente.'));
              return;
            }
            prof.equip(c.slot, c.id);
            host.playUi('loot');
            say(t('Você comprou {name}!', { name: t(c.name) }));
            close();
          },
        },
        t('Comprar por ⚙ {n}', { n: fmtInt(price) }),
      );
    else
      main = el(
        'button',
        { class: 'btn small', disabled: true },
        t('Faltam ⚙ {n}', { n: fmtInt(price - have) }),
      );
    bar.append(
      el(
        'div',
        { class: 'bb-info' },
        el('b', { style: `color:${col}` }, t(c.name)),
        el(
          'span',
          {},
          `${t(RARITY_NAMES[c.rarity])} • ${t(SLOT_NAMES[c.slot])} • ${owned ? t('Já possui') : t('Prévia no boneco')}`,
        ),
      ),
      el(
        'div',
        { class: 'row-btns' },
        main,
        el('button', { class: 'btn small', data: { nav: '' }, onclick: close }, t('Cancelar')),
      ),
    );
    if (!main.disabled) main.focus();
  };
  const render = () => {
    scrap.textContent = t('Sucata: {n}', { n: fmtInt(prof.save.profile.scrap) });
    preview();
    const top = body.scrollTop;
    body.innerHTML = '';
    const pick = (c: CosmeticDef) => {
      sel = sel?.id === c.id ? null : c;
      render();
    };
    const shopCard = (c: CosmeticDef) => {
      const owned = prof.owns(c.id);
      const b = card(c, {
        owned,
        equipped: prof.save.cosmetics.equipped[c.slot] === c.id,
        price: owned ? undefined : prof.priceOf(c.id),
        note: owned ? t('Já possui') : undefined,
        onClick: () => pick(c),
      });
      if (sel?.id === c.id) b.classList.add('sel');
      return b;
    };
    body.appendChild(el('h3', {}, t('Ofertas do dia (−20%)')));
    const deals = el('div', { class: 'cos-grid' });
    for (const id of dailyDeals()) {
      const c = COSMETICS[id];
      if (c) deals.appendChild(shopCard(c));
    }
    body.appendChild(deals);
    for (const s of SLOTS) {
      const items = Object.values(COSMETICS)
        .filter((c) => c.slot === s && c.price !== null)
        .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
      body.appendChild(el('h3', {}, t(SLOT_NAMES[s])));
      const g = el('div', { class: 'cos-grid' });
      for (const c of items) g.appendChild(shopCard(c));
      body.appendChild(g);
    }
    body.scrollTop = top;
    renderBar();
  };
  const e = el(
    'div',
    { class: 'screen wardrobe' },
    el(
      'div',
      { class: 'wr-panel' },
      el('h2', {}, t('LOJA')),
      el('div', { class: 'shop-head' }, scrap, msg),
      el('p', { class: 'muted shop-tip' }, t('Escolha um item para ver no boneco antes de comprar.')),
      body,
      bar,
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
    onHide: () => {
      // sai sem comprar: o boneco volta com o que está equipado
      sel = null;
      host.previewCosmetics(prof.save.cosmetics.equipped);
      host.setMenuFocus(0);
    },
    onBack: () => {
      if (sel) {
        close();
        return true;
      }
      host.screens.pop();
      return true;
    },
  };
}
