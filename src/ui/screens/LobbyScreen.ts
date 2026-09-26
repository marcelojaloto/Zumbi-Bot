import { CHARACTERS } from '../../data/characters';
import type { CharacterDef, CharacterId } from '../../data/types';
import { SLOT_COLORS, playerTag, type PartyMember } from '../../app/party';
import type { DeviceRef } from '../../input/devices';
import { connectedPads, padDir } from '../../input/pads';
import { MAX_PLAYERS, type PlayerSlot } from '../../sim/Entity';
import { el, hexColor } from '../dom';
import { t } from '../../i18n';
import { LobbyModel } from '../lobby/model';
import type { Screen } from '../ScreenManager';
import type { WardrobeHost } from './WardrobeScreen';

export interface LobbyHost extends WardrobeHost {
  /** Câmera do cenário 3D no modo "palco" (personagens de frente, acima dos cartões). */
  setMenuStage(on: boolean): void;
  /** Mostra os personagens escolhidos no cenário 3D atrás da tela (um só = close com o especial). */
  previewLineup(chars: CharacterId[]): void;
  /** Começa a fase com a equipe. */
  startParty(members: PartyMember[], mapId: string, levelIdx: number): void;
  /** Dispositivo que abriu a tela (vira o jogador 1). */
  readonly lastDevice: DeviceRef;
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

function deviceLabel(d: DeviceRef): string {
  switch (d.k) {
    case 'kb':
      return d.layout === 'left'
        ? `⌨️ ${t('Teclado (esquerda)')}`
        : d.layout === 'right'
          ? `⌨️ ${t('Teclado (direita)')}`
          : `⌨️ ${t('Teclado')}`;
    case 'pad':
      return `🎮 ${t('Controle {n}', { n: d.index + 1 })}`;
    case 'touch':
      return `👆 ${t('Toque')}`;
    default:
      return '';
  }
}

/** Teclas de jogo de quem divide o teclado (mostradas no cartão). */
function splitHelp(d: DeviceRef): string | null {
  if (d.k !== 'kb' || d.layout === 'full') return null;
  return d.layout === 'left'
    ? t('WASD andam • F soco • G chute • Espaço pula • R atira • T especial')
    : t('Setas andam • J soco • K chute • L pula • O atira • I especial');
}

/** Teclas da seleção para cada lado do teclado. */
const KB: Record<'full' | 'left' | 'right', { prev: string[]; next: string[]; ok: string[]; out: string[] }> =
  {
    full: {
      prev: ['ArrowLeft', 'KeyA'],
      next: ['ArrowRight', 'KeyD'],
      ok: ['Enter', 'NumpadEnter', 'Space'],
      out: ['Escape', 'Backspace'],
    },
    left: { prev: ['KeyA'], next: ['KeyD'], ok: ['Space', 'KeyF'], out: ['Escape'] },
    right: {
      prev: ['ArrowLeft'],
      next: ['ArrowRight'],
      ok: ['Enter', 'NumpadEnter', 'KeyJ', 'KeyL', 'Numpad0'],
      out: ['Backspace'],
    },
  };
/** Segunda pessoa no teclado (enquanto uma só usa o teclado inteiro). */
const SPLIT_JOIN = ['KeyJ', 'KeyL', 'Numpad0'];

/**
 * Seleção de jogadores e personagens antes da fase (até 5 no mesmo computador). O jogador 1 é quem abriu a tela;
 * outros entram apertando A/Start num controle ou J na metade direita do teclado. Cada um troca de personagem
 * (←/→), confirma (pronto) e pode sair. Com todos prontos, a partida começa.
 */
export function lobbyScreen(host: LobbyHost, target: { mapId: string; levelIdx: number }): Screen {
  const model = new LobbyModel(host.lastDevice, host.profile.save.profile.character);
  const padPrev = new Map<number, boolean[]>();
  const padRepeat = new Map<number, number>();
  let countdown = -1;
  let lastLineup = '';

  const help = el('div', { class: 'muted lobby-help' });
  const cards = el('div', { class: 'lobby-cards' });
  const count = el('div', { class: 'lobby-count' });

  const start = () => {
    countdown = -1;
    host.startParty(model.members(), target.mapId, target.levelIdx);
  };
  const close = () => {
    host.previewLineup([host.profile.save.profile.character]);
    host.screens.pop();
  };
  const changed = () => {
    render();
    const chars = model.slots.map((s) => model.character(s));
    const key = chars.join(',');
    if (key !== lastLineup) {
      lastLineup = key;
      host.previewLineup(chars);
    }
  };
  const cycle = (slot: PlayerSlot, dir: number) => {
    model.cycle(slot, dir);
    host.playUi('ui_hover');
    changed();
  };
  const ready = (slot: PlayerSlot) => {
    model.toggleReady(slot);
    host.playUi('ui_click');
    if (model.allReady() && model.slots.length === 1) {
      start();
      return;
    }
    countdown = model.allReady() ? 1.5 : -1;
    changed();
  };
  const leave = (slot: PlayerSlot) => {
    if (!model.leave(slot)) {
      close();
      return;
    }
    host.playUi('ui_back');
    countdown = -1;
    changed();
  };
  const join = (dev: DeviceRef) => {
    if (model.join(dev)) {
      host.playUi('ui_click');
      countdown = -1;
      changed();
    }
  };

  function card(i: number): HTMLElement {
    const s = model.get(i as PlayerSlot);
    const color = SLOT_COLORS[i]!;
    const tag = el('div', { class: 'lc-tag' }, playerTag(i));
    if (!s) {
      const kb = model.keyboardSlots();
      const hints: HTMLElement[] = [el('div', { class: 'lc-join' }, `+ ${t('Entrar')}`)];
      hints.push(el('div', { class: 'muted' }, `🎮 ${t('Aperte A no controle')}`));
      const k0 = kb[0]?.device;
      if (kb.length === 0 && model.slots[0]?.device.k !== 'touch')
        hints.push(el('div', { class: 'muted' }, `⌨️ ${t('Enter no teclado')}`));
      else if (kb.length === 1 && k0?.k === 'kb' && k0.layout === 'full')
        hints.push(
          el(
            'div',
            { class: 'muted' },
            `⌨️ ${t('J no teclado (divide com o P{n})', { n: kb[0]!.slot + 1 })}`,
          ),
        );
      return el('div', { class: 'lobby-card empty', style: `--pc:${color}` }, tag, ...hints);
    }
    const c = CHARACTERS[model.character(s)];
    const bars = characterBars(c).map(([label, v]) =>
      el(
        'div',
        { class: 'stat-row' },
        el('span', {}, label),
        el('div', { class: 'stat-bar' }, el('i', { style: `width:${Math.round(Math.min(1, v) * 100)}%` })),
      ),
    );
    const keys = splitHelp(s.device);
    return el(
      'div',
      {
        class: `lobby-card${s.ready ? ' ready' : ''}`,
        style: `--pc:${color};--cc:${hexColor(c.color)}`,
        data: { slot: String(s.slot), char: c.id },
      },
      el('div', { class: 'lc-head' }, tag, el('span', { class: 'lc-dev' }, deviceLabel(s.device))),
      el(
        'div',
        { class: 'lc-pick' },
        el('button', { class: 'lc-arrow', title: t('Anterior'), onclick: () => cycle(s.slot, -1) }, '◀'),
        el('div', { class: 'lc-name' }, t(c.name)),
        el('button', { class: 'lc-arrow', title: t('Próximo'), onclick: () => cycle(s.slot, 1) }, '▶'),
      ),
      el('div', { class: 'ci-title' }, t(c.title)),
      el('p', { class: 'ci-desc' }, t(c.desc)),
      el('div', { class: 'lc-stats' }, ...bars),
      el('div', { class: 'ci-special' }, el('b', {}, t(c.specialName)), el('span', {}, t(c.specialDesc))),
      keys ? el('div', { class: 'lc-keys muted' }, keys) : null,
      el(
        'button',
        { class: `btn small lc-ready${s.ready ? ' on' : ''}`, onclick: () => ready(s.slot) },
        s.ready ? `✓ ${t('Pronto!')}` : t('Pronto?'),
      ),
    );
  }

  function render(): void {
    const n = model.slots.length;
    cards.replaceChildren(...Array.from({ length: MAX_PLAYERS }, (_, i) => card(i)));
    cards.dataset.players = String(n);
    help.textContent =
      n > 1
        ? t('Cada jogador: ←/→ troca • confirmar = pronto • todos prontos começa')
        : t('←/→ trocam de personagem • Enter começa • Esc volta');
    count.textContent = countdown >= 0 ? t('Começando em {s}...', { s: Math.ceil(countdown) }) : '';
  }

  /** Teclado: cada tecla vale para o lado do teclado de quem a usa. */
  const onKey = (code: string, e?: KeyboardEvent): boolean => {
    if (e?.repeat) return true;
    const kbs = model.keyboardSlots();
    for (const s of kbs) {
      const layout = s.device.k === 'kb' ? s.device.layout : 'full';
      const k = KB[layout];
      if (layout === 'full' && SPLIT_JOIN.includes(code)) {
        if (model.splitKeyboard()) {
          host.playUi('ui_click');
          countdown = -1;
          changed();
        }
        return true;
      }
      if (k.prev.includes(code)) {
        cycle(s.slot, -1);
        return true;
      }
      if (k.next.includes(code)) {
        cycle(s.slot, 1);
        return true;
      }
      if (k.ok.includes(code)) {
        ready(s.slot);
        return true;
      }
      if (k.out.includes(code)) {
        leave(s.slot);
        return true;
      }
    }
    if (kbs.length === 0) {
      if (['Enter', 'NumpadEnter', 'Space'].includes(code)) {
        join({ k: 'kb', layout: 'full' });
        return true;
      }
      // jogador 1 no controle/toque: Esc (ou Voltar do Android) fecha
      if (code === 'Escape') {
        close();
        return true;
      }
    }
    return true;
  };

  /** Controles: entrar (A/Start), trocar (D-pad/analógico), pronto (A), sair (B). */
  const pollPads = (dt: number) => {
    for (const gp of connectedPads()) {
      // controle que apareceu agora: o navegador só o mostra depois do 1º botão, que já vale para entrar
      const prev = padPrev.get(gp.index) ?? [];
      const now = gp.buttons.map((b) => !!b.pressed);
      padPrev.set(gp.index, now);
      const edge = (i: number) => !!now[i] && !prev[i];
      const dev: DeviceRef = { k: 'pad', index: gp.index };
      const s = model.find(dev);
      if (!s) {
        if (edge(0) || edge(9)) join(dev);
        continue;
      }
      const d = padDir(gp).x;
      const rep = (padRepeat.get(gp.index) ?? 0) - dt;
      if (d && rep <= 0) {
        cycle(s.slot, d);
        padRepeat.set(gp.index, 0.22);
      } else padRepeat.set(gp.index, d ? rep : 0);
      if (edge(0) || edge(9)) ready(s.slot);
      if (edge(1)) leave(s.slot);
    }
  };

  const e = el(
    'div',
    { class: 'screen lobby' },
    el('div', { class: 'lobby-top' }, el('h2', {}, t('ESCOLHA SEU PERSONAGEM')), help, count),
    cards,
    el(
      'div',
      { class: 'row-btns lobby-btns' },
      el('button', { class: 'btn', data: { nav: '' }, onclick: close }, t('Voltar')),
      el('button', { class: 'btn primary', data: { nav: '', autofocus: '' }, onclick: start }, t('Começar')),
    ),
  );
  return {
    el: e,
    id: 'lobby',
    ownsInput: true,
    onShow: () => {
      // botões já apertados ao abrir a tela (o A que abriu a seleção) não contam
      for (const gp of connectedPads())
        padPrev.set(
          gp.index,
          gp.buttons.map((b) => !!b.pressed),
        );
      host.setMenuStage(true);
      lastLineup = '';
      changed();
    },
    onHide: () => host.setMenuStage(false),
    onBack: () => {
      close();
      return true;
    },
    onKey,
    update: (dt) => {
      pollPads(dt);
      if (countdown >= 0) {
        if (!model.allReady()) countdown = -1;
        else {
          const before = Math.ceil(countdown);
          countdown -= dt;
          if (countdown <= 0) start();
          else if (Math.ceil(countdown) !== before) render();
        }
      }
    },
  };
}
