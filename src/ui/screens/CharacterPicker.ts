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

/** Barras de atributos (rótulo já traduzido, valor 0..1) mostradas na seleção. */
export function characterBars(c: CharacterDef): [string, number][] {
  const s = c.stats;
  return [
    [t('Vida'), s.hp / 150],
    [t('Força'), s.dmg.melee / 1.4],
    [t('Armas'), s.dmg.gun / 1.4],
    [t('Magia'), s.dmg.staff / 1.4],
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
        el('div', { class: 'stat-bar' }, el('i', { style: `width:${Math.round(Math.min(1, v) * 100)}%` })),
      ),
    ),
  );
}

/** Personagem vizinho na lista (dir = ±1, dá a volta). */
export function nextCharacter(c: CharacterId, dir: number): CharacterId {
  const n = CHARACTER_ORDER.length;
  return CHARACTER_ORDER[(((CHARACTER_ORDER.indexOf(c) + dir) % n) + n) % n]!;
}

/** Giro por pixel arrastado e por segundo com a tecla (ou o direcional) segurada. */
const TURN_PER_PX = 0.012;
const TURN_SPEED = 2.8;
const LEFT = ['ArrowLeft', 'KeyA'];
const RIGHT = ['ArrowRight', 'KeyD'];

/**
 * Girar o boneco: arrastando para os lados (dedo ou mouse) no espaço livre ao lado do painel, segurando ←/→ (ou A/D)
 * no teclado, ou o direcional/analógico do controle para os lados.
 */
export class HeroSpin {
  /** Teclas de giro seguradas e quando o giro delas foi contado pela última vez (ms). */
  private held = new Map<string, number>();
  private drag: { id: number; x: number } | null = null;
  private stop: (() => void) | null = null;

  constructor(private host: Pick<PickerHost, 'turnMenuHero'>) {}

  /**
   * Arrastar em `area` gira o boneco; o que começa dentro de `except` (o painel) fica de fora, e nada gira
   * enquanto `enabled` diz que não.
   */
  bind(area: HTMLElement, except: HTMLElement, enabled: () => boolean = () => true): void {
    area.addEventListener('pointerdown', (e) => {
      if (!enabled() || except.contains(e.target as Node) || (e.pointerType === 'mouse' && e.button !== 0))
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
    if (!LEFT.includes(code) && !RIGHT.includes(code)) return false;
    if (!this.held.has(code)) this.held.set(code, performance.now());
    return true;
  }

  /** Gira pelo tempo (de verdade) que a tecla ficou segurada desde a última conta. */
  private spend(code: string, now: number): void {
    const t0 = this.held.get(code);
    if (t0 === undefined) return;
    const secs = Math.min(0.5, Math.max(0, now - t0) / 1000);
    this.held.set(code, now);
    this.host.turnMenuHero((RIGHT.includes(code) ? 1 : -1) * TURN_SPEED * secs);
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
 * Painel da direita da seleção, no jeito da loja: a lista de personagens (tocar/clicar escolhe; ↑/↓ trocam) e os
 * detalhes do escolhido (atributos e especial). O personagem aparece em 3D no espaço livre ao lado.
 */
export function characterList(opts: {
  get: () => CharacterId;
  pick: (c: CharacterId) => void;
  disabled?: () => boolean;
}): { list: HTMLElement; info: HTMLElement; render: () => void } {
  const list = el('div', { class: 'cs-list' });
  const info = el('div', { class: 'cs-info' });
  const render = () => {
    const cur = opts.get();
    const off = !!opts.disabled?.();
    list.replaceChildren(
      ...CHARACTER_ORDER.map((id) => {
        const c = CHARACTERS[id];
        return el(
          'button',
          {
            class: `cs-card${id === cur ? ' on' : ''}`,
            style: `--cc:${hexColor(c.color)}`,
            disabled: off,
            data: { nav: '', char: id },
            onclick: () => opts.pick(id),
          },
          el('b', {}, t(c.name)),
          el('span', {}, t(c.title)),
        );
      }),
    );
    const c = CHARACTERS[cur];
    info.style.setProperty('--cc', hexColor(c.color));
    info.replaceChildren(
      el('div', { class: 'cs-name' }, t(c.name)),
      el('p', { class: 'ci-desc' }, t(c.desc)),
      statBars(c),
      el('div', { class: 'ci-special' }, el('b', {}, t(c.specialName)), el('span', {}, t(c.specialDesc))),
    );
  };
  return { list, info, render };
}

/** Dica do giro e da troca (toque ou teclado/controle). */
export function spinTip(touch: boolean): string {
  return touch
    ? t('Arraste o personagem para os lados para girar • toque num nome para trocar')
    : t('←/→ ou arrastar: girar • ↑/↓: trocar de personagem');
}

/**
 * Escolha de personagem em tela cheia, como a loja (usada na sala online): boneco em 3D girando com o dedo ou
 * ←/→, lista e detalhes à direita; "Escolher" confirma e volta.
 */
export function characterScreen(
  host: PickerHost,
  opts: { char: CharacterId; onPick: (c: CharacterId) => void },
): Screen {
  let cur = opts.char;
  const spin = new HeroSpin(host);
  const padPrev = new Map<number, boolean[]>();
  let padRepeat = 0;
  const choose = (c: CharacterId) => {
    if (c === cur) return;
    cur = c;
    host.playUi('ui_hover');
    host.previewLineup([c]);
    panel.render();
  };
  const panel = characterList({ get: () => cur, pick: choose });
  const confirm = () => {
    host.playUi('ui_click');
    host.screens.pop();
    opts.onPick(cur);
  };
  const back = () => host.screens.pop();
  const box = el(
    'div',
    { class: 'wr-panel' },
    el('h2', {}, t('ESCOLHA SEU PERSONAGEM')),
    el('p', { class: 'muted shop-tip' }, spinTip(host.touchActive)),
    el('div', { class: 'wr-body' }, panel.list, panel.info),
    el(
      'div',
      { class: 'row-btns' },
      el('button', { class: 'btn', data: { nav: '' }, onclick: back }, t('Voltar')),
      el(
        'button',
        { class: 'btn primary', data: { nav: '', autofocus: '' }, onclick: confirm },
        t('Escolher'),
      ),
    ),
  );
  const e = el('div', { class: 'screen wardrobe char-select' }, box);
  spin.bind(e, box);
  return {
    el: e,
    id: 'character',
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
      panel.render();
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
      if (ev?.repeat && !['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(code)) return true;
      if (code === 'ArrowUp' || code === 'KeyW') choose(nextCharacter(cur, -1));
      else if (code === 'ArrowDown' || code === 'KeyS') choose(nextCharacter(cur, 1));
      else if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') confirm();
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
          choose(nextCharacter(cur, d.y));
          padRepeat = 0.25;
        } else if (!d.y) padRepeat = Math.min(padRepeat, 0);
        if (edge(0) || edge(9)) return confirm();
        if (edge(1)) return back();
      }
      spin.update(dt, px);
    },
  };
}
