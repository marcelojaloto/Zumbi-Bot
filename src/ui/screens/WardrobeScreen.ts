import { COSMETICS, RARITY_COLORS, RARITY_NAMES, RARITY_ORDER, SELL_VALUE } from '../../data/cosmetics';
import { STAFFS, STAFF_ORDER } from '../../data/staffs';
import type { CharacterId, CosmeticDef, CosmeticSlot, MeleeId, WeaponId } from '../../data/types';
import { FIREARMS, WEAPON_ORDER } from '../../data/weapons';
import { MELEE_WEAPONS } from '../../data/melee';
import { FIREARM_PRICES, MELEE_ORDER, MELEE_PRICES, REVIVE_PRICE } from '../../data/shop';
import { REVIVE_ITEMS } from '../../data/revive';
import { CHARACTERS } from '../../data/characters';
import { BOSSES } from '../../data/bosses';
import { dailyDeals } from '../../app/Profile';
import { el, fmtInt, hexColor } from '../dom';
import { dec, locale, t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';
import { HeroSpin, SPIN_QE } from './CharacterPicker';

const SET_NAMES: Record<CosmeticDef['set'], string> = {
  wizard: 'Mago',
  zombie: 'Zumbi',
  boss: 'Chefe',
  secret: 'Disfarce',
};
import { connectedPads } from '../../input/pads';

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
  /** Gira o boneco em exibição (radianos). */
  turnMenuHero(delta: number): void;
}

/**
 * Girar o boneco na loja e no guarda-roupa, para ver o visual todo: arrastar para os lados no espaço livre, Q/E no
 * teclado ou o analógico direito do controle (as setas continuam andando pela lista).
 */
function spinner(host: WardrobeHost, screen: HTMLElement, panel: HTMLElement) {
  const spin = new HeroSpin(host, SPIN_QE);
  spin.bind(screen, panel);
  return {
    start: () => spin.start(),
    end: () => spin.end(),
    key: (code: string) => spin.keyDown(code),
    update: (dt: number) => {
      let x = 0;
      for (const gp of connectedPads()) {
        const a = gp.axes[2] ?? 0;
        if (Math.abs(a) > 0.3) x += a;
      }
      spin.update(dt, x);
    },
  };
}

/** Dica do giro (toque ou teclado/controle). */
function spinHint(host: WardrobeHost): string {
  return host.touchActive
    ? t('Arraste o boneco para os lados para girar.')
    : t('Arraste o boneco para os lados (ou Q/E) para girar.');
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
    el('span', { style: `color:${col}` }, `${t(RARITY_NAMES[c.rarity])} | ${t(SET_NAMES[c.set])}`),
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
                  t('Dano {dmg} | {rpm} tiros/min | pente {mag} | recarga {reload}', {
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
            el('span', {}, t('Mana {mana} | recarga {cd}s', { mana: s.manaCost, cd: dec(s.cooldownS) })),
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
    // vender (o disfarce do Prodígio vem com ele e não se vende)
    if (eq && COSMETICS[eq]?.set !== 'secret') {
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

  const panel = el(
    'div',
    { class: 'wr-panel' },
    el('h2', {}, t('GUARDA-ROUPA')),
    scrap,
    el('p', { class: 'muted shop-tip' }, spinHint(host)),
    tabs,
    body,
    el(
      'div',
      { class: 'row-btns' },
      el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
    ),
  );
  const e = el('div', { class: 'screen wardrobe spin-area' }, panel);
  const spin = spinner(host, e, panel);
  render();
  return {
    el: e,
    id: 'wardrobe',
    onShow: () => {
      host.setMenuFocus(1);
      spin.start();
      render();
    },
    onHide: () => {
      spin.end();
      host.previewCosmetics(prof.save.cosmetics.equipped);
      host.setMenuFocus(0);
    },
    onKey: (code) => spin.key(code),
    update: (dt) => spin.update(dt),
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}

/** Item da loja selecionado (prévia e barra de confirmação). */
type ShopSel =
  | { kind: 'cos'; c: CosmeticDef }
  | { kind: 'gun'; id: WeaponId }
  | { kind: 'melee'; id: MeleeId }
  | { kind: 'revive'; c: CharacterId };

const SHOP_TABS: [ShopTab, string][] = [
  ['visual', 'Visual'],
  ['weapons', 'Armas'],
  ['special', 'Itens especiais'],
];
type ShopTab = 'visual' | 'weapons' | 'special';

/**
 * Loja, em três abas. Visual: ofertas do dia (-20%) e catálogo completo por encaixe; tocar num item veste o boneco
 * com ele (prévia). Armas: armas de fogo (ficam no arsenal para sempre) e armas brancas (a escolhida começa cada
 * fase na mão). Itens especiais: o item de reviver de cada personagem. Tudo com sucata, e nada é comprado sem
 * apertar "Comprar" na barra de confirmação.
 */
export function shopScreen(host: WardrobeHost): Screen {
  const prof = host.profile;
  const body = el('div', { class: 'wr-body' });
  const scrap = el('div', { class: 'scrap' });
  const msg = el('div', { class: 'shop-msg' });
  const bar = el('div', { class: 'buy-bar', hidden: true });
  const tabs = el('div', { class: 'tabs' });
  let tab: ShopTab = 'visual';
  /** Item em prévia ou esperando a confirmação. */
  let sel: ShopSel | null = null;
  let msgTimer = 0;
  const say = (text: string) => {
    msg.textContent = text;
    msg.classList.add('show');
    clearTimeout(msgTimer);
    msgTimer = window.setTimeout(() => msg.classList.remove('show'), 3000);
  };
  const preview = () => {
    const c = sel?.kind === 'cos' ? sel.c : null;
    host.previewCosmetics(
      c ? { ...prof.save.cosmetics.equipped, [c.slot]: c.id } : prof.save.cosmetics.equipped,
      c?.slot === 'back',
    );
  };
  const close = () => {
    sel = null;
    render();
  };
  const same = (a: ShopSel | null, b: ShopSel): boolean =>
    !!a &&
    a.kind === b.kind &&
    (a.kind === 'cos'
      ? a.c.id === (b as typeof a).c.id
      : a.kind === 'revive'
        ? a.c === (b as typeof a).c
        : a.id === (b as typeof a).id);
  const pick = (s: ShopSel) => {
    sel = same(sel, s) ? null : s;
    render();
  };
  const btn = (label: string, fn?: () => void) =>
    el(
      'button',
      { class: `btn small ${fn ? 'primary' : ''}`, data: { nav: '' }, disabled: !fn, onclick: fn },
      label,
    );
  /** Botão de comprar (ou quanto falta). */
  const buyBtn = (price: number, buy: () => boolean, done: string) => {
    const have = prof.save.profile.scrap;
    if (have < price) return btn(t('Faltam ⚙ {n}', { n: fmtInt(price - have) }));
    return btn(t('Comprar por ⚙ {n}', { n: fmtInt(price) }), () => {
      if (!buy()) {
        say(t('Sucata insuficiente.'));
        return;
      }
      host.playUi('loot');
      say(done);
      close();
    });
  };

  const renderBar = () => {
    bar.hidden = !sel;
    bar.innerHTML = '';
    if (!sel) return;
    let title: string;
    let color = '#ffd24a';
    let info: string;
    let main: HTMLButtonElement;
    const s = sel;
    if (s.kind === 'cos') {
      const c = s.c;
      color = hexColor(RARITY_COLORS[c.rarity]);
      title = t(c.name);
      const owned = prof.owns(c.id);
      const equipped = prof.save.cosmetics.equipped[c.slot] === c.id;
      info = `${t(RARITY_NAMES[c.rarity])} | ${t(SLOT_NAMES[c.slot])} | ${owned ? t('Já possui') : t('Prévia no boneco')}`;
      main = owned
        ? btn(
            equipped ? t('Equipado') : t('Equipar'),
            equipped
              ? undefined
              : () => {
                  prof.equip(c.slot, c.id);
                  say(t('{name} equipado.', { name: t(c.name) }));
                  close();
                },
          )
        : buyBtn(
            prof.priceOf(c.id) ?? 0,
            () => prof.buy(c.id) && (prof.equip(c.slot, c.id), true),
            t('Você comprou {name}!', { name: t(c.name) }),
          );
    } else if (s.kind === 'gun') {
      const w = FIREARMS[s.id];
      title = t(w.name);
      info = t(w.desc);
      main = prof.save.unlocks.firearms.includes(s.id)
        ? btn(t('Já possui'))
        : buyBtn(
            FIREARM_PRICES[s.id] ?? 0,
            () => prof.buyFirearm(s.id),
            t('Você comprou {name}!', { name: t(w.name) }),
          );
    } else if (s.kind === 'melee') {
      const m = MELEE_WEAPONS[s.id];
      title = t(m.name);
      info = t('Começa cada fase na mão, inteira. Quebrando ou trocando, só volta na próxima fase.');
      const on = prof.save.profile.melee === s.id;
      main = prof.ownsMelee(s.id)
        ? btn(on ? t('Guardar (começar sem ela)') : t('Levar para as fases'), () => {
            prof.setMelee(on ? null : s.id);
            say(on ? t('{name} guardada.', { name: t(m.name) }) : t('{name} na mão!', { name: t(m.name) }));
            close();
          })
        : buyBtn(MELEE_PRICES[s.id], () => prof.buyMelee(s.id), t('{name} na mão!', { name: t(m.name) }));
    } else {
      const it = REVIVE_ITEMS[s.c];
      color = hexColor(it.color);
      title = `${it.icon} ${t(it.name)}`;
      info = t(it.story);
      main = prof.hasRevive(s.c)
        ? btn(t('Já carrega'))
        : buyBtn(REVIVE_PRICE, () => prof.buyRevive(s.c), t('Você comprou {name}!', { name: t(it.name) }));
    }
    bar.append(
      el('div', { class: 'bb-info' }, el('b', { style: `color:${color}` }, title), el('span', {}, info)),
      el(
        'div',
        { class: 'row-btns' },
        main,
        el('button', { class: 'btn small', data: { nav: '' }, onclick: close }, t('Cancelar')),
      ),
    );
    if (!main.disabled) main.focus();
  };

  /** Cartão simples (armas e itens especiais). */
  const itemCard = (
    s: ShopSel,
    title: string,
    lines: (string | null)[],
    opts: { color?: string; price?: number; owned?: boolean; on?: boolean; onLabel?: string },
  ) => {
    const b = el(
      'button',
      {
        class: `cos-card ${opts.on ? 'on' : ''} ${opts.owned === false ? 'unowned' : ''}`,
        style: `--rc:${opts.color ?? '#ffb02a'}`,
        data: { nav: '' },
        onclick: () => pick(s),
      },
      el('b', {}, title),
      ...lines.filter((l): l is string => !!l).map((l) => el('span', { class: 'muted' }, l)),
      opts.owned ? el('span', { class: 'muted' }, t('Já possui')) : null,
      !opts.owned && opts.price !== undefined
        ? el('span', { class: 'price' }, `⚙ ${fmtInt(opts.price)}`)
        : null,
      opts.on ? el('i', { class: 'eq' }, opts.onLabel ?? t('EQUIPADO')) : null,
    );
    if (same(sel, s)) b.classList.add('sel');
    return b;
  };

  const renderVisual = () => {
    const shopCard = (c: CosmeticDef) => {
      const owned = prof.owns(c.id);
      const b = card(c, {
        owned,
        equipped: prof.save.cosmetics.equipped[c.slot] === c.id,
        price: owned ? undefined : prof.priceOf(c.id),
        note: owned ? t('Já possui') : undefined,
        onClick: () => pick({ kind: 'cos', c }),
      });
      if (sel?.kind === 'cos' && sel.c.id === c.id) b.classList.add('sel');
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
  };

  const renderWeapons = () => {
    body.appendChild(el('h3', {}, t('Armas de fogo')));
    body.appendChild(
      el(
        'p',
        { class: 'muted shop-tip' },
        t('Ficam no arsenal para sempre (quem não atira guarda para quem atira).'),
      ),
    );
    const g = el('div', { class: 'cos-grid' });
    for (const id of WEAPON_ORDER) {
      const price = FIREARM_PRICES[id];
      if (price === undefined) continue;
      const w = FIREARMS[id];
      g.appendChild(
        itemCard(
          { kind: 'gun', id },
          t(w.name),
          [`${t('Dano')} ${w.damage}${w.pellets > 1 ? `×${w.pellets}` : ''}`],
          {
            price,
            owned: prof.save.unlocks.firearms.includes(id),
          },
        ),
      );
    }
    body.appendChild(g);
    body.appendChild(el('h3', {}, t('Armas brancas')));
    body.appendChild(el('p', { class: 'muted shop-tip' }, t('A escolhida começa cada fase na mão.')));
    const m = el('div', { class: 'cos-grid' });
    for (const id of MELEE_ORDER)
      m.appendChild(
        itemCard({ kind: 'melee', id }, t(MELEE_WEAPONS[id].name), [], {
          color: '#e0e0e0',
          price: MELEE_PRICES[id],
          owned: prof.ownsMelee(id),
          on: prof.save.profile.melee === id,
          onLabel: t('NA MÃO'),
        }),
      );
    body.appendChild(m);
  };

  const renderSpecial = () => {
    body.appendChild(el('h3', {}, t('Item de reviver')));
    body.appendChild(
      el(
        'p',
        { class: 'muted shop-tip' },
        t(
          'Cada personagem carrega um só. Se ele cair, o item o levanta ali mesmo, sem gastar vida, e se gasta.',
        ),
      ),
    );
    const g = el('div', { class: 'cos-grid' });
    for (const c of prof.roster) {
      const it = REVIVE_ITEMS[c];
      g.appendChild(
        itemCard({ kind: 'revive', c }, `${it.icon} ${t(it.name)}`, [t(CHARACTERS[c].name)], {
          color: hexColor(it.color),
          price: REVIVE_PRICE,
          owned: prof.hasRevive(c),
        }),
      );
    }
    body.appendChild(g);
  };

  const render = () => {
    scrap.textContent = t('Sucata: {n}', { n: fmtInt(prof.save.profile.scrap) });
    for (const b of tabs.children) b.classList.toggle('on', (b as HTMLElement).dataset.k === tab);
    preview();
    const top = body.scrollTop;
    body.innerHTML = '';
    if (tab === 'visual') renderVisual();
    else if (tab === 'weapons') renderWeapons();
    else renderSpecial();
    body.scrollTop = top;
    renderBar();
  };
  for (const [k, label] of SHOP_TABS)
    tabs.appendChild(
      el(
        'button',
        {
          class: 'btn',
          data: { nav: '', k },
          onclick: () => {
            tab = k;
            sel = null;
            body.scrollTop = 0;
            render();
          },
        },
        t(label),
      ),
    );
  const panel = el(
    'div',
    { class: 'wr-panel' },
    el('h2', {}, t('LOJA')),
    el('div', { class: 'shop-head' }, scrap, msg),
    el(
      'p',
      { class: 'muted shop-tip' },
      `${t('Escolha um item para ver no boneco antes de comprar.')} ${spinHint(host)}`,
    ),
    tabs,
    body,
    bar,
    el(
      'div',
      { class: 'row-btns' },
      el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
    ),
  );
  const e = el('div', { class: 'screen wardrobe spin-area' }, panel);
  const spin = spinner(host, e, panel);
  render();
  return {
    el: e,
    id: 'shop',
    onShow: () => {
      host.setMenuFocus(1);
      spin.start();
      render();
    },
    onHide: () => {
      // sai sem comprar: o boneco volta com o que está equipado
      sel = null;
      spin.end();
      host.previewCosmetics(prof.save.cosmetics.equipped);
      host.setMenuFocus(0);
    },
    onKey: (code) => spin.key(code),
    update: (dt) => spin.update(dt),
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
