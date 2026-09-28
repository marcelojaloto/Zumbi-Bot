import { CHARACTERS, CHARACTER_ORDER } from '../../data/characters';
import type { CharacterDef, CharacterId } from '../../data/types';
import { connectedPads, padDir } from '../../input/pads';
import { el, hexColor } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

/** O que a escolha de personagem precisa do aplicativo (cenário 3D atrás da tela). */
export interface PickerHost extends UiHost {
  /** Close no boneco ao lado do painel (1) ou plano do menu (0). */
  setMenuFocus(f: number): void;
  /** Mostra os personagens escolhidos no cenário 3D atrás da tela (um só = close com o especial). */
  previewLineup(chars: CharacterId[]): void;
  /** Gira o boneco em exibição (radianos). */
  turnMenuHero(delta: number): void;
}

/** Barras de atributos (rótulo já traduzido, valor 0..1; null = não usa) mostradas na seleção. */
export function characterBars(c: CharacterDef): [string, number | null][] {
  const s = c.stats;
  return [
    [t('Vida'), s.hp / 150],
    [t('Força'), s.dmg.melee / 1.4],
    [t('Armas'), c.arms.guns ? s.dmg.gun / 1.4 : null],
    [t('Magia'), c.arms.staff ? s.dmg.staff / 1.4 : null],
    [t('Velocidade'), s.speed / 1.2],
  ];
}

export function statBars(c: CharacterDef): HTMLElement {
  return el(
    'div',
    { class: 'lc-stats' },
    ...characterBars(c).map(([label, v]) =>
      el(
        'div',
        { class: 'stat-row' },
        el('span', {}, label),
        v === null
          ? el('div', { class: 'stat-bar none' }, el('em', {}, t('não usa')))
          : el(
              'div',
              { class: 'stat-bar' },
              el('i', { style: `width:${Math.round(Math.min(1, v) * 100)}%` }),
            ),
      ),
    ),
  );
}

/** Personagem vizinho na lista dos que dá para escolher (dir = ±1, dá a volta). */
export function nextCharacter(
  c: CharacterId,
  dir: number,
  roster: CharacterId[] = CHARACTER_ORDER,
): CharacterId {
  const n = roster.length;
  const i = roster.indexOf(c);
  return roster[(((i < 0 ? 0 : i + dir) % n) + n) % n]!;
}

/** Giro por pixel arrastado e por segundo com a tecla (ou o direcional) segurada. */
const TURN_PER_PX = 0.012;
const TURN_SPEED = 2.8;
/** Teclas de giro: na escolha de personagem ←/→ (e A/D); na loja e no guarda-roupa, onde as setas andam pela lista, Q/E. */
export const SPIN_ARROWS = { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'] };
export const SPIN_QE = { left: ['KeyQ'], right: ['KeyE'] };

/**
 * Girar o boneco: arrastando para os lados (dedo ou mouse) no espaço livre ao lado do painel, segurando ←/→ (ou A/D)
 * no teclado, ou o direcional/analógico do controle para os lados.
 */
export class HeroSpin {
  /** Teclas de giro seguradas e quando o giro delas foi contado pela última vez (ms). */
  private held = new Map<string, number>();
  private drag: { id: number; x: number } | null = null;
  private stop: (() => void) | null = null;

  constructor(
    private host: Pick<PickerHost, 'turnMenuHero'>,
    private keys: { left: string[]; right: string[] } = SPIN_ARROWS,
  ) {}

  /**
   * Arrastar em `area` gira o boneco; o que começa dentro de `except` (o painel) fica de fora, e nada gira
   * enquanto `enabled` diz que não.
   */
  bind(area: HTMLElement, except: HTMLElement, enabled: () => boolean = () => true): void {
    area.addEventListener('pointerdown', (e) => {
      const target = e.target as Element;
      if (
        !enabled() ||
        except.contains(target) ||
        target.closest?.('button') ||
        (e.pointerType === 'mouse' && e.button !== 0)
      )
        return;
      this.drag = { id: e.pointerId, x: e.clientX };
      area.classList.add('turning');
    });
    area.addEventListener('pointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.host.turnMenuHero((e.clientX - this.drag.x) * TURN_PER_PX);
      this.drag.x = e.clientX;
    });
    const end = (e: PointerEvent) => {
      if (this.drag?.id !== e.pointerId) return;
      this.drag = null;
      area.classList.remove('turning');
    };
    area.addEventListener('pointerup', end);
    area.addEventListener('pointercancel', end);
    area.addEventListener('pointerleave', end);
  }

  /** Tecla de giro apertada (true = era de giro). As repetições do teclado são ignoradas: vale o tempo segurado. */
  keyDown(code: string): boolean {
    if (!this.keys.left.includes(code) && !this.keys.right.includes(code)) return false;
    if (!this.held.has(code)) this.held.set(code, performance.now());
    return true;
  }

  /** Gira pelo tempo (de verdade) que a tecla ficou segurada desde a última conta. */
  private spend(code: string, now: number): void {
    const t0 = this.held.get(code);
    if (t0 === undefined) return;
    const secs = Math.min(0.5, Math.max(0, now - t0) / 1000);
    this.held.set(code, now);
    this.host.turnMenuHero((this.keys.right.includes(code) ? 1 : -1) * TURN_SPEED * secs);
  }

  /** Começa a acompanhar o soltar das teclas (enquanto a tela está aberta). */
  start(): void {
    this.end();
    const up = (e: KeyboardEvent) => {
      this.spend(e.code, performance.now());
      this.held.delete(e.code);
    };
    const blur = () => this.held.clear();
    addEventListener('keyup', up);
    addEventListener('blur', blur);
    this.stop = () => {
      removeEventListener('keyup', up);
      removeEventListener('blur', blur);
    };
  }

  end(): void {
    this.stop?.();
    this.stop = null;
    this.held.clear();
    this.drag = null;
  }

  /** Gira com as teclas seguradas e com `padX` (−1..1, direcional do controle). */
  update(dt: number, padX = 0): void {
    const now = performance.now();
    for (const code of [...this.held.keys()]) this.spend(code, now);
    if (padX) this.host.turnMenuHero(Math.max(-1, Math.min(1, padX)) * TURN_SPEED * dt);
  }
}

/**
 * Ficha de personagem, no jeito da loja: o personagem em 3D no espaço livre e, à direita, a ficha com ◀ nome ▶, o
 * título, os atributos, o especial e a história. A ficha rola quando não cabe na tela (qualquer aparelho).
 */
export interface CharacterSheet {
  /** A tela inteira (espaço livre do boneco + ficha). */
  el: HTMLElement;
  /** O painel da ficha (arrastar nele não gira o boneco). */
  panel: HTMLElement;
  render: () => void;
  /** Rola a ficha (teclado: Page Up/Down; controle: analógico direito). */
  scroll: (dy: number) => void;
}

export function characterSheet(o: {
  title: string;
  get: () => CharacterId;
  pick: (c: CharacterId) => void;
  /** Dica embaixo da ficha (girar e trocar). */
  tip: string;
  extra?: HTMLElement[];
  buttons: HTMLElement[];
  /** Personagens das setas (o secreto só depois de liberado). */
  roster: CharacterId[];
}): CharacterSheet {
  const name = el('b', { class: 'cs-nav-name' });
  const sub = el('div', { class: 'cs-sub' });
  const arrow = (dir: number, text: string, title: string) =>
    el(
      'button',
      {
        class: 'lc-arrow',
        title,
        data: { nav: '' },
        onclick: () => o.pick(nextCharacter(o.get(), dir, o.roster)),
      },
      text,
    );
  const head = el(
    'div',
    { class: 'cs-nav cs-head' },
    el('div', { class: 'cs-nav-row' }, arrow(-1, '◀', t('Anterior')), name, arrow(1, '▶', t('Próximo'))),
    sub,
  );
  const body = el('div', { class: 'wr-body cs-body', tabIndex: -1 });
  const panel = el(
    'div',
    { class: 'wr-panel cs-sheet' },
    el('h2', {}, o.title),
    head,
    body,
    el('p', { class: 'muted shop-tip' }, o.tip),
    ...(o.extra ?? []),
    el('div', { class: 'row-btns' }, ...o.buttons),
  );
  const root = el('div', { class: 'screen wardrobe char-select' }, panel);
  let shown: CharacterId | null = null;
  const render = () => {
    const id = o.get();
    const c = CHARACTERS[id];
    panel.style.setProperty('--cc', hexColor(c.color));
    name.textContent = t(c.name);
    sub.textContent = t(c.title);
    if (shown === id) return;
    shown = id;
    body.replaceChildren(
      el('div', { class: 'cs-full' }, c.fullName),
      el('p', { class: 'ci-desc' }, t(c.desc)),
      statBars(c),
      el('h4', { class: 'cs-h' }, t('Especial')),
      el('div', { class: 'ci-special' }, el('b', {}, t(c.specialName)), el('span', {}, t(c.specialDesc))),
      el('h4', { class: 'cs-h' }, t('História')),
      el('p', { class: 'cs-story' }, t(c.story)),
    );
    body.scrollTop = 0;
  };
  return {
    el: root,
    panel,
    render,
    scroll: (dy) => body.scrollBy({ top: dy, behavior: 'smooth' }),
  };
}

/** Dica do giro e da troca (toque ou teclado/controle). */
export function spinTip(touch: boolean): string {
  return touch
    ? t('Arraste o personagem para os lados para girar • ◀ ▶ trocam de personagem')
    : t('←/→ ou arrastar: girar • ↑/↓ ou ◀ ▶: trocar • Page Up/Down: rolar a ficha');
}

/** Rolagem da ficha pelo teclado. */
export function sheetScrollKey(code: string): number {
  return code === 'PageDown' ? 220 : code === 'PageUp' ? -220 : 0;
}

/**
 * Tela da ficha de personagem (sala online e menu Personagens): girar com o dedo, o mouse, ←/→ ou o controle;
 * trocar com ◀ ▶ ou ↑/↓; Enter (ou A no controle) faz a ação principal.
 */
function sheetScreen(
  host: PickerHost,
  o: {
    id: string;
    title: string;
    char: CharacterId;
    buttons: (cur: () => CharacterId) => HTMLElement[];
    main: (c: CharacterId) => void;
    onChange?: (c: CharacterId) => void;
  },
): Screen {
  let cur = o.char;
  const roster = host.profile.roster;
  const spin = new HeroSpin(host);
  const padPrev = new Map<number, boolean[]>();
  let padRepeat = 0;
  const choose = (c: CharacterId) => {
    if (c === cur) return;
    cur = c;
    host.playUi('ui_hover');
    host.previewLineup([c]);
    sheet.render();
    o.onChange?.(c);
  };
  const back = () => host.screens.pop();
  const sheet = characterSheet({
    title: o.title,
    get: () => cur,
    pick: choose,
    tip: spinTip(host.touchActive),
    roster,
    buttons: o.buttons(() => cur),
  });
  spin.bind(sheet.el, sheet.panel);
  return {
    el: sheet.el,
    id: o.id,
    ownsInput: true,
    onShow: () => {
      for (const gp of connectedPads())
        padPrev.set(
          gp.index,
          gp.buttons.map((b) => !!b.pressed),
        );
      spin.start();
      host.setMenuFocus(1);
      host.previewLineup([cur]);
      sheet.render();
    },
    onHide: () => {
      spin.end();
      host.setMenuFocus(0);
    },
    onBack: () => {
      back();
      return true;
    },
    onKey: (code, ev) => {
      if (spin.keyDown(code)) return true;
      const dy = sheetScrollKey(code);
      if (dy) {
        sheet.scroll(dy);
        return true;
      }
      if (ev?.repeat && !['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(code)) return true;
      if (code === 'ArrowUp' || code === 'KeyW') choose(nextCharacter(cur, -1, roster));
      else if (code === 'ArrowDown' || code === 'KeyS') choose(nextCharacter(cur, 1, roster));
      else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') o.main(cur);
      else if (code === 'Escape' || code === 'Backspace') back();
      return true;
    },
    update: (dt) => {
      let px = 0;
      for (const gp of connectedPads()) {
        const prev = padPrev.get(gp.index) ?? [];
        const now = gp.buttons.map((b) => !!b.pressed);
        padPrev.set(gp.index, now);
        const edge = (i: number) => !!now[i] && !prev[i];
        const d = padDir(gp);
        px += d.x;
        padRepeat -= dt;
        if (d.y && padRepeat <= 0) {
          choose(nextCharacter(cur, d.y, roster));
          padRepeat = 0.25;
        } else if (!d.y) padRepeat = Math.min(padRepeat, 0);
        // analógico direito: rola a ficha
        const ry = gp.axes[3] ?? 0;
        if (Math.abs(ry) > 0.3) sheet.scroll(ry * 600 * dt);
        if (edge(0) || edge(9)) return o.main(cur);
        if (edge(1)) return back();
      }
      spin.update(dt, px);
    },
  };
}

/** Escolha de personagem da sala online: "Escolher" confirma e volta para a sala. */
export function characterScreen(
  host: PickerHost,
  opts: { char: CharacterId; onPick: (c: CharacterId) => void },
): Screen {
  const confirm = (c: CharacterId) => {
    host.playUi('ui_click');
    host.screens.pop();
    opts.onPick(c);
  };
  return sheetScreen(host, {
    id: 'character',
    title: t('ESCOLHA SEU PERSONAGEM'),
    char: opts.char,
    main: confirm,
    buttons: (cur) => [
      el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
      el(
        'button',
        { class: 'btn primary', data: { nav: '', autofocus: '' }, onclick: () => confirm(cur()) },
        t('Escolher'),
      ),
    ],
  });
}

/** O que o menu Personagens precisa do aplicativo. */
export interface CharactersHost extends PickerHost {
  /** Começa a jogar com o personagem (na próxima fase da campanha). */
  playAs(c: CharacterId): void;
  /** Abre os mapas já com o personagem escolhido. */
  mapsAs(c: CharacterId): void;
  /** Rosto do personagem (imagem) para os cartões; ainda não pronto: null, e `onReady` avisa quando ficar. */
  portrait(c: CharacterId, onReady?: () => void): string | null;
}

/** Ficha de Personagem aberta pelo menu Personagens: Voltar, Mapas e Começar (com o personagem da ficha). */
export function characterSheetScreen(host: CharactersHost, char: CharacterId): Screen {
  return sheetScreen(host, {
    id: 'sheet',
    title: t('FICHA DE PERSONAGEM'),
    char,
    main: (c) => host.playAs(c),
    buttons: (cur) => [
      el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
      el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.mapsAs(cur()) }, t('Mapas')),
      el(
        'button',
        { class: 'btn primary', data: { nav: '', autofocus: '' }, onclick: () => host.playAs(cur()) },
        t('Começar'),
      ),
    ],
  });
}

/**
 * Menu Personagens: todos os personagens, cada um num cartão com o rosto, o apelido, o nome e o título. Tocar num
 * cartão abre a Ficha de Personagem. O secreto aparece trancado até o jogo ser terminado. Em telas grandes (PC,
 * tablet) cabem quantos der, quebrando a linha (e rolando para baixo se passar da tela); no celular é um carrossel
 * que anda com o dedo ou com as setas ◀ ▶ nas pontas, na altura do Voltar.
 */
export function charactersScreen(host: CharactersHost): Screen {
  const unlocked = new Set(host.profile.roster);
  // rosto de cada um: aparece assim que é fotografado (sem refazer os cartões, que perderiam o foco)
  const faces = new Map<CharacterId, HTMLElement>();
  const showFace = (id: CharacterId) => {
    const box = faces.get(id);
    const url = host.portrait(id, () => showFace(id));
    if (box && url && !box.firstChild)
      box.appendChild(el('img', { src: url, alt: t(CHARACTERS[id].name), draggable: false }));
  };
  const card = (id: CharacterId) => {
    const c = CHARACTERS[id];
    if (!unlocked.has(id))
      return el(
        'button',
        {
          class: 'char-card locked',
          data: { nav: '', char: id },
          title: t('Termine o jogo para liberar'),
          onclick: () => host.playUi('ui_back'),
        },
        el('div', { class: 'char-face' }, el('span', { class: 'char-lock' }, '?')),
        el('b', { class: 'char-nick' }, '???'),
        el('span', { class: 'char-name' }, t('Personagem secreto')),
        el('span', { class: 'char-title' }, `🔒 ${t('Termine o jogo para liberar')}`),
      );
    const face = el('div', { class: 'char-face' });
    faces.set(id, face);
    return el(
      'button',
      {
        class: 'char-card',
        style: `--cc:${hexColor(c.color)}`,
        data: { nav: '', char: id },
        onclick: () => host.screens.push(characterSheetScreen(host, id)),
      },
      face,
      el('b', { class: 'char-nick' }, t(c.name)),
      el('span', { class: 'char-name' }, c.fullName),
      el('span', { class: 'char-title' }, t(c.title)),
    );
  };
  const grid = el('div', { class: 'chars-grid' }, ...CHARACTER_ORDER.map(card));
  const render = () => {
    for (const id of CHARACTER_ORDER) if (unlocked.has(id)) showFace(id);
  };

  // setas do carrossel: com mais de 5 personagens e só quando não cabem todos na tela
  const arrow = (dir: -1 | 1) =>
    el(
      'button',
      {
        class: `btn chars-arrow ${dir < 0 ? 'left' : 'right'}`,
        title: dir < 0 ? t('Anterior') : t('Próximo'),
        onclick: () => page(dir),
      },
      dir < 0 ? '◀' : '▶',
    );
  const prev = arrow(-1);
  const next = arrow(1);
  const horizontal = () => grid.scrollWidth > grid.clientWidth + 2;
  const page = (dir: number) => {
    const first = grid.firstElementChild as HTMLElement | null;
    if (!first) return;
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 8;
    if (horizontal()) grid.scrollBy({ left: dir * (first.offsetWidth + gap), behavior: 'smooth' });
    else grid.scrollBy({ top: dir * (first.offsetHeight + gap), behavior: 'smooth' });
  };
  const syncArrows = () => {
    const many = CHARACTER_ORDER.length > 5;
    const h = horizontal();
    const v = grid.scrollHeight > grid.clientHeight + 2;
    const show = many && (h || v);
    prev.hidden = next.hidden = !show;
    if (!show) return;
    const pos = h ? grid.scrollLeft : grid.scrollTop;
    const max = h ? grid.scrollWidth - grid.clientWidth : grid.scrollHeight - grid.clientHeight;
    prev.disabled = pos <= 6;
    next.disabled = pos >= max - 6;
  };
  grid.addEventListener('scroll', syncArrows, { passive: true });

  const e = el(
    'div',
    { class: 'screen dim chars-screen' },
    el('h2', {}, t('PERSONAGENS')),
    el('p', { class: 'muted' }, t('Toque num personagem para ver a ficha completa.')),
    grid,
    el(
      'div',
      { class: 'chars-nav' },
      prev,
      el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
      next,
    ),
  );
  return {
    el: e,
    id: 'characters',
    onShow: () => {
      render();
      addEventListener('resize', syncArrows);
      requestAnimationFrame(syncArrows);
    },
    onHide: () => removeEventListener('resize', syncArrows),
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}
