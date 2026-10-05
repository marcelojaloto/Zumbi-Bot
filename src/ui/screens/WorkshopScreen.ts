import { CHARACTERS } from '../../data/characters';
import { MOVES } from '../../data/melee';
import { xpForLevel } from '../../data/balance';
import {
  ATTR_ORDER,
  ATTRS,
  perksOf,
  type PerkBranch,
  type PerkDef,
  type StatBonus,
} from '../../data/workshop';
import type { CharacterId } from '../../data/types';
import { el, fmtInt, hexColor } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import { HeroSpin, nextCharacter, type PickerHost } from './CharacterPicker';

const BRANCHES: [PerkBranch, string][] = [
  ['attr', 'Atributos'],
  ['combo', 'Combos'],
  ['special', 'Especiais'],
  ['defense', 'Defesas'],
];

/** O que uma melhoria de atributo dá, em texto. */
export function bonusText(b: StatBonus): string {
  const pct = (v: number) => Math.round(v * 100);
  const out: string[] = [];
  if (b.hp) out.push(t('+{n} de vida', { n: b.hp }));
  if (b.mana) out.push(t('+{n} de mana', { n: b.mana }));
  if (b.manaRegen) out.push(t('+{n}% de recuperação de mana', { n: pct(b.manaRegen) }));
  if (b.dmg?.melee) out.push(t('+{n}% de dano em golpes, armas brancas e especial', { n: pct(b.dmg.melee) }));
  if (b.dmg?.gun) out.push(t('+{n}% de dano com armas de fogo', { n: pct(b.dmg.gun) }));
  if (b.dmg?.staff) out.push(t('+{n}% de dano com cajados', { n: pct(b.dmg.staff) }));
  if (b.speed) out.push(t('+{n}% de velocidade', { n: pct(b.speed) }));
  if (b.jump) out.push(t('+{n}% de pulo', { n: pct(b.jump) }));
  if (b.reload) out.push(t('+{n}% de velocidade de recarga', { n: pct(b.reload) }));
  return out.join(' | ');
}

const ROMAN = ['I', 'II', 'III'];

/** Nome de uma melhoria (atributos com o nível em romano). */
function perkName(p: PerkDef): string {
  return p.attr ? `${t(p.name)} ${ROMAN[p.attr.level - 1]}` : t(p.name);
}

/**
 * Oficina: escolhe o personagem (◀ ▶) e vê a árvore de melhorias dele em quatro ramos (Atributos, Combos,
 * Especiais e Defesas). Cada melhoria libera com XP (a soma de tudo o que o jogador já ganhou) e se compra com
 * sucata; algumas pedem a anterior do mesmo ramo. Nos especiais, escolhe-se qual fica em uso.
 */
export function workshopScreen(host: PickerHost): Screen {
  const prof = host.profile;
  const roster = prof.roster;
  let cur: CharacterId = roster.includes(prof.save.profile.character) ? prof.save.profile.character : 'robot';
  let tab: PerkBranch = 'attr';
  /** Melhoria selecionada (detalhes e compra na barra de baixo); 'base' = especial original. */
  let sel: string | null = null;

  const name = el('b', { class: 'cs-nav-name' });
  const sub = el('div', { class: 'cs-sub' });
  const wallet = el('div', { class: 'ws-wallet' });
  const msg = el('div', { class: 'shop-msg' });
  const tabs = el('div', { class: 'tabs' });
  const body = el('div', { class: 'wr-body ws-body' });
  const bar = el('div', { class: 'buy-bar', hidden: true });
  let msgTimer = 0;
  const say = (text: string) => {
    msg.textContent = text;
    msg.classList.add('show');
    clearTimeout(msgTimer);
    msgTimer = window.setTimeout(() => msg.classList.remove('show'), 3000);
  };

  const choose = (c: CharacterId) => {
    if (c === cur) return;
    cur = c;
    sel = null;
    host.playUi('ui_hover');
    host.previewLineup([c]);
    render();
  };
  const arrow = (dir: number, text: string, title: string) =>
    el(
      'button',
      { class: 'lc-arrow', title, data: { nav: '' }, onclick: () => choose(nextCharacter(cur, dir, roster)) },
      text,
    );

  for (const [k, label] of BRANCHES)
    tabs.appendChild(
      el(
        'button',
        {
          class: 'btn',
          data: { nav: '', k },
          onclick: () => {
            tab = k;
            sel = null;
            render();
          },
        },
        t(label),
      ),
    );

  /** Situação de uma melhoria em texto curto (no cartão). */
  const statusLine = (p: PerkDef): { cls: string; text: string } => {
    const st = prof.perkStatus(p.id);
    if (st === 'owned') return { cls: 'owned', text: `✓ ${t('Comprado')}` };
    if (st === 'requires') return { cls: 'locked', text: `🔒 ${t('Antes: {name}', { name: reqName(p) })}` };
    if (st === 'xp') return { cls: 'locked', text: `🔒 ${t('{n} XP', { n: fmtInt(xpForLevel(p.level)) })}` };
    return { cls: 'available', text: `⚙ ${fmtInt(p.price)}` };
  };
  const reqName = (p: PerkDef): string => {
    const r = perksOf(p.character).find((x) => x.id === p.requires);
    return r ? perkName(r) : '';
  };

  const node = (
    id: string,
    title: string,
    line: { cls: string; text: string },
    extra?: string,
  ): HTMLElement => {
    const b = el(
      'button',
      {
        class: `cos-card ws-node ${line.cls} ${sel === id ? 'sel' : ''}`,
        data: { nav: '', id },
        onclick: () => {
          sel = sel === id ? null : id;
          render();
        },
      },
      el('b', {}, title),
      el('span', { class: 'ws-st' }, line.text),
      extra ? el('span', { class: 'muted' }, extra) : null,
    );
    return b;
  };

  const renderBody = () => {
    const top = body.scrollTop;
    body.replaceChildren();
    const mine = perksOf(cur);
    const special = prof.specialOf(cur);
    if (tab === 'attr') {
      body.appendChild(
        el(
          'p',
          { class: 'muted ws-intro' },
          t('Cada personagem cresce mais no que já é bom e menos no que é fraco.'),
        ),
      );
      for (const a of ATTR_ORDER) {
        const levels = mine.filter((p) => p.attr?.id === a);
        if (!levels.length) continue;
        const row = el('div', { class: 'ws-row' }, el('b', { class: 'ws-attr' }, t(ATTRS[a].name)));
        levels.forEach((p, i) => {
          if (i > 0) row.appendChild(el('i', { class: 'ws-link' }));
          row.appendChild(node(p.id, ROMAN[i]!, statusLine(p)));
        });
        body.appendChild(row);
      }
    } else {
      const list = mine.filter((p) => p.branch === tab).sort((a, b) => a.tier - b.tier);
      const tree = el('div', { class: 'ws-tree' });
      if (tab === 'special') {
        const c = CHARACTERS[cur];
        tree.appendChild(
          node(
            'base',
            t(c.specialName),
            { cls: 'owned', text: special === c.special ? `★ ${t('Em uso')}` : `✓ ${t('Original')}` },
            t(c.specialDesc),
          ),
        );
      }
      for (const p of list) {
        if (tree.childElementCount) tree.appendChild(el('i', { class: 'ws-link down' }));
        const line = statusLine(p);
        if (p.special && line.cls === 'owned' && special === p.special) line.text = `★ ${t('Em uso')}`;
        tree.appendChild(node(p.id, perkName(p), line, t(p.desc)));
      }
      body.appendChild(tree);
    }
    body.scrollTop = top;
  };

  const renderBar = () => {
    bar.replaceChildren();
    bar.hidden = !sel;
    if (!sel) return;
    const c = CHARACTERS[cur];
    let title: string;
    let info: string;
    let main: HTMLButtonElement;
    const btn = (label: string, fn?: () => void, primary = true) =>
      el(
        'button',
        { class: `btn small ${primary ? 'primary' : ''}`, data: { nav: '' }, disabled: !fn, onclick: fn },
        label,
      );
    if (sel === 'base') {
      title = t(c.specialName);
      info = t(c.specialDesc);
      const using = prof.specialOf(cur) === c.special;
      main = btn(
        using ? t('Em uso') : t('Usar este especial'),
        using
          ? undefined
          : () => {
              prof.chooseSpecial(cur, null);
              say(t('{name} em uso.', { name: t(c.specialName) }));
              render();
            },
      );
    } else {
      const p = perksOf(cur).find((x) => x.id === sel);
      if (!p) return;
      title = perkName(p);
      info = p.attr ? bonusText(p.attr.bonus) : t(p.desc);
      const st = prof.perkStatus(p.id);
      const have = prof.save.profile.scrap;
      if (st === 'owned') {
        if (p.special) {
          const using = prof.specialOf(cur) === p.special;
          main = btn(
            using ? t('Em uso') : t('Usar este especial'),
            using
              ? undefined
              : () => {
                  prof.chooseSpecial(cur, p.special!);
                  say(t('{name} em uso.', { name: t(p.name) }));
                  render();
                },
          );
        } else main = btn(t('Comprado'));
      } else if (st === 'requires')
        main = btn(t('Compre antes: {name}', { name: reqName(p) }), undefined, false);
      else if (st === 'xp')
        main = btn(
          t('Libera com {need} XP (você tem {have})', {
            need: fmtInt(xpForLevel(p.level)),
            have: fmtInt(prof.totalXp),
          }),
          undefined,
          false,
        );
      else if (have < p.price) main = btn(t('Faltam ⚙ {n}', { n: fmtInt(p.price - have) }), undefined, false);
      else
        main = btn(t('Comprar por ⚙ {n}', { n: fmtInt(p.price) }), () => {
          if (!prof.buyPerk(p.id)) {
            say(t('Sucata insuficiente.'));
            return;
          }
          host.playUi('unlock');
          say(t('{name} liberado!', { name: perkName(p) }));
          render();
        });
      // especial novo: dá para ver o golpe na ficha do personagem depois; aqui, só o custo extra de mana
      const mv = p.special ? MOVES[p.special] : undefined;
      if (mv?.manaCost) info += ` | ${t('Custa {n} de mana', { n: mv.manaCost })}`;
    }
    bar.append(
      el('div', { class: 'bb-info' }, el('b', {}, title), el('span', {}, info)),
      el(
        'div',
        { class: 'row-btns' },
        main,
        el(
          'button',
          { class: 'btn small', data: { nav: '' }, onclick: () => ((sel = null), render()) },
          t('Fechar'),
        ),
      ),
    );
    if (!main.disabled) main.focus();
  };

  const render = () => {
    const c = CHARACTERS[cur];
    panel.style.setProperty('--cc', hexColor(c.color));
    name.textContent = t(c.name);
    sub.textContent = t(c.title);
    wallet.replaceChildren(
      el('span', { class: 'scrap' }, t('Sucata: {n}', { n: fmtInt(prof.save.profile.scrap) })),
      el('span', { class: 'ws-xp' }, t('XP total: {n}', { n: fmtInt(prof.totalXp) })),
    );
    for (const b of tabs.children) b.classList.toggle('on', (b as HTMLElement).dataset.k === tab);
    renderBody();
    renderBar();
  };

  const panel = el(
    'div',
    { class: 'wr-panel cs-sheet ws-panel' },
    el('h2', {}, t('OFICINA')),
    el(
      'div',
      { class: 'cs-nav cs-head' },
      el('div', { class: 'cs-nav-row' }, arrow(-1, '◀', t('Anterior')), name, arrow(1, '▶', t('Próximo'))),
      sub,
    ),
    el('div', { class: 'shop-head' }, wallet, msg),
    el(
      'p',
      { class: 'muted shop-tip' },
      t('Melhorias liberam com XP e se compram com sucata. Cada personagem tem a própria árvore.'),
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
  const root = el('div', { class: 'screen wardrobe char-select' }, panel);
  // arrastar o boneco gira (as setas andam pela árvore)
  const spin = new HeroSpin(host, { left: [], right: [] });
  spin.bind(root, panel);
  render();
  return {
    el: root,
    id: 'workshop',
    onShow: () => {
      spin.start();
      host.setMenuFocus(1);
      host.previewLineup([cur]);
      render();
    },
    onHide: () => {
      spin.end();
      host.setMenuFocus(0);
      host.previewLineup([prof.save.profile.character]);
    },
    onKey: (code) => {
      // Q/E trocam de personagem
      if (code === 'KeyQ') choose(nextCharacter(cur, -1, roster));
      else if (code === 'KeyE') choose(nextCharacter(cur, 1, roster));
      else return false;
      return true;
    },
    update: (dt) => spin.update(dt, 0),
    onBack: () => {
      if (sel) {
        sel = null;
        render();
        return true;
      }
      host.screens.pop();
      return true;
    },
  };
}
