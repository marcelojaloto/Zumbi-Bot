import { Btn } from '../sim/InputFrame';

export type Action =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'jump'
  | 'punch'
  | 'kick'
  | 'special'
  | 'fire'
  | 'aim'
  | 'reload'
  | 'run'
  | 'prev'
  | 'next'
  | 'modeGun'
  | 'modeStaff'
  | 'toggleMode'
  | 'map'
  | 'pause';

export type KeyMap = Record<Action, string[]>;

/** Teclado inteiro de um jogador só (padrão). */
export const DEFAULT_KEYS: KeyMap = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space'],
  punch: ['KeyJ'],
  kick: ['KeyK'],
  special: ['KeyU'],
  fire: ['KeyL'],
  aim: ['KeyI'],
  reload: ['KeyR'],
  run: ['ShiftLeft', 'ShiftRight'],
  prev: ['KeyQ'],
  next: ['KeyE'],
  modeGun: ['Digit1'],
  modeStaff: ['Digit2'],
  toggleMode: [],
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
};

export type KeyLayout = 'full' | 'left' | 'right';

/**
 * Teclado dividido entre duas pessoas: a da esquerda usa WASD e as letras perto dela; a da direita usa as setas,
 * as letras perto delas e o teclado numérico. Nenhuma tecla se repete entre os dois lados (nem com Esc/P/M).
 */
export const SPLIT_KEYS: Record<'left' | 'right', KeyMap> = {
  left: {
    left: ['KeyA'],
    right: ['KeyD'],
    up: ['KeyW'],
    down: ['KeyS'],
    jump: ['Space'],
    punch: ['KeyF'],
    kick: ['KeyG'],
    special: ['KeyT'],
    fire: ['KeyR'],
    aim: ['KeyV'],
    reload: ['KeyC'],
    run: ['ShiftLeft'],
    prev: ['KeyQ'],
    next: ['KeyE'],
    modeGun: ['Digit1'],
    modeStaff: ['Digit2'],
    toggleMode: [],
    map: [],
    pause: [],
  },
  right: {
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    jump: ['KeyL', 'Numpad0'],
    punch: ['KeyJ', 'Numpad1'],
    kick: ['KeyK', 'Numpad2'],
    special: ['KeyI', 'Numpad3'],
    fire: ['KeyO', 'Numpad4'],
    aim: ['Semicolon', 'Numpad5'],
    reload: ['KeyU', 'Numpad6'],
    run: ['ShiftRight'],
    prev: ['Comma', 'Numpad7'],
    next: ['Period', 'Numpad9'],
    modeGun: [],
    modeStaff: [],
    toggleMode: ['Slash', 'Numpad8'],
    map: [],
    pause: [],
  },
};

export function layoutKeys(layout: KeyLayout, full: KeyMap = DEFAULT_KEYS): KeyMap {
  return layout === 'full' ? full : SPLIT_KEYS[layout];
}

/**
 * Eixos e botões do teclado para um mapa de teclas. `held` = teclas seguradas; `taps` = apertadas desde o último
 * tick (toques curtos entre ticks não se perdem).
 */
export function keyboardFrame(
  held: ReadonlySet<string>,
  taps: ReadonlySet<string>,
  map: KeyMap,
): { mx: number; mz: number; buttons: number } {
  const down = (a: Action) => map[a].some((k) => held.has(k));
  const tap = (a: Action) => map[a].some((k) => taps.has(k));
  const mx = (down('right') ? 1 : 0) - (down('left') ? 1 : 0);
  const mz = (down('down') ? 1 : 0) - (down('up') ? 1 : 0);
  let b = 0;
  if (down('jump') || tap('jump')) b |= Btn.Jump;
  if (down('punch') || tap('punch')) b |= Btn.Punch;
  if (down('kick') || tap('kick')) b |= Btn.Kick;
  if (down('special') || tap('special')) b |= Btn.Special;
  if (down('fire') || tap('fire')) b |= Btn.Fire;
  if (down('aim')) b |= Btn.Aim;
  if (down('reload') || tap('reload')) b |= Btn.Reload;
  if (down('run')) b |= Btn.Run;
  if (tap('prev')) b |= Btn.Prev;
  if (tap('next')) b |= Btn.Next;
  if (tap('modeGun')) b |= Btn.ModeGun;
  if (tap('modeStaff')) b |= Btn.ModeStaff;
  if (tap('toggleMode')) b |= Btn.ToggleMode;
  return { mx, mz, buttons: b };
}

// ------------------------------------------------------------------ teclas configuráveis

const ACTIONS = Object.keys(DEFAULT_KEYS) as Action[];

/** Até duas teclas por ação (a principal e uma alternativa). */
export const MAX_KEYS_PER_ACTION = 2;
/** Esc sempre pausa e volta nos menus: não pode ser trocado nem usado em outra ação. */
export const RESERVED_KEYS: readonly string[] = ['Escape'];
/** Sem tecla nestas ações não dá para jogar: a tela de teclas avisa. */
export const ESSENTIAL_ACTIONS: readonly Action[] = ['left', 'right', 'up', 'down', 'jump', 'punch'];

const CODE_RE = /^[A-Za-z0-9]{1,24}$/;

function withReserved(a: Action, keys: string[]): string[] {
  return a === 'pause' ? ['Escape', ...keys] : keys;
}

/** Teclas de uma ação que o jogador pode trocar (sem o Esc da pausa). */
export function editableKeys(map: KeyMap, a: Action): string[] {
  return map[a].filter((k) => !RESERVED_KEYS.includes(k));
}

/** Tabela em uso: a padrão com as ações que o jogador trocou (o Esc sempre pausa). */
export function bindingsFrom(custom?: Partial<KeyMap> | null): KeyMap {
  const out = {} as KeyMap;
  for (const a of ACTIONS) {
    const keys = custom?.[a]
      ? custom[a]!.filter((k) => !RESERVED_KEYS.includes(k))
      : editableKeys(DEFAULT_KEYS, a);
    out[a] = withReserved(a, keys.slice(0, MAX_KEYS_PER_ACTION));
  }
  return out;
}

/**
 * Coloca `code` na posição `slot` da ação. Se a tecla estava em outra ação, sai de lá (`from` diz qual); se já
 * estava na mesma ação em outra posição, as duas trocam de lugar.
 */
export function rebind(
  map: KeyMap,
  action: Action,
  slot: number,
  code: string,
): { map: KeyMap; from: Action | null } {
  if (RESERVED_KEYS.includes(code)) return { map, from: null };
  const out = {} as KeyMap;
  let from: Action | null = null;
  for (const a of ACTIONS) {
    out[a] = [...map[a]];
    if (a !== action && out[a].includes(code)) {
      out[a] = out[a].filter((k) => k !== code);
      from = a;
    }
  }
  const cur = editableKeys(out, action);
  const j = cur.indexOf(code);
  if (j >= 0 && j !== slot) cur[j] = cur[slot] ?? '';
  if (slot < cur.length) cur[slot] = code;
  else cur.push(code);
  out[action] = withReserved(action, cur.filter(Boolean).slice(0, MAX_KEYS_PER_ACTION));
  return { map: out, from };
}

/** Tira a tecla da posição `slot` da ação. */
export function clearKey(map: KeyMap, action: Action, slot: number): KeyMap {
  const out = bindingsFrom(map);
  const cur = editableKeys(out, action);
  cur.splice(slot, 1);
  out[action] = withReserved(action, cur);
  return out;
}

/** O que guardar nas configurações: só existe se for diferente do padrão. */
export function customKeys(map: KeyMap): Partial<KeyMap> | undefined {
  const def = bindingsFrom();
  if (ACTIONS.every((a) => map[a].join() === def[a].join())) return undefined;
  const out: Partial<KeyMap> = {};
  for (const a of ACTIONS) out[a] = editableKeys(map, a);
  return out;
}

/** Valida as teclas salvas: ações conhecidas, códigos válidos, no máximo 2 por ação e sem repetir entre ações. */
export function sanitizeKeys(raw: unknown): Partial<KeyMap> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const r = raw as Record<string, unknown>;
  const used = new Set<string>();
  const out: Partial<KeyMap> = {};
  let any = false;
  for (const a of ACTIONS) {
    const v = r[a];
    if (!Array.isArray(v)) continue;
    const keys: string[] = [];
    for (const k of v)
      if (typeof k === 'string' && CODE_RE.test(k) && !RESERVED_KEYS.includes(k) && !used.has(k)) {
        if (keys.length >= MAX_KEYS_PER_ACTION) break;
        keys.push(k);
        used.add(k);
      }
    out[a] = keys;
    any = true;
  }
  return any ? out : undefined;
}

const KEY_NAMES: Record<string, string> = {
  Space: 'Espaço',
  ShiftLeft: 'Shift esq.',
  ShiftRight: 'Shift dir.',
  ControlLeft: 'Ctrl esq.',
  ControlRight: 'Ctrl dir.',
  AltLeft: 'Alt',
  AltRight: 'AltGr',
  MetaLeft: 'Win',
  MetaRight: 'Win',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Enter: 'Enter',
  NumpadEnter: 'Num Enter',
  Tab: 'Tab',
  CapsLock: 'Caps Lock',
  Escape: 'Esc',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  IntlBackslash: '\\',
  IntlRo: '/',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadDecimal: 'Num ,',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Insert: 'Ins',
  Delete: 'Del',
};

/** Rótulos que dependem do idioma (traduzidos pela interface). */
export const KEY_NAMES_TO_TRANSLATE = ['Espaço', 'Shift esq.', 'Shift dir.', 'Ctrl esq.', 'Ctrl dir.'];

/**
 * Nome curto de uma tecla (`KeyboardEvent.code`). `layout` (quando o navegador informa o teclado do jogador) mostra o
 * caractere impresso na tecla — num teclado ABNT2, "Semicolon" vira "Ç".
 */
export function keyLabel(code: string, layout?: ReadonlyMap<string, string> | null): string {
  const printed = layout?.get(code);
  if (
    printed &&
    printed.trim() &&
    /^(Key|Digit|Semicolon|Quote|Comma|Period|Slash|Backslash|Bracket|Minus|Equal|Backquote|Intl)/.test(code)
  )
    return printed.toUpperCase();
  let m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1]!;
  m = /^Digit(\d)$/.exec(code);
  if (m) return m[1]!;
  m = /^Numpad(\d)$/.exec(code);
  if (m) return `Num ${m[1]}`;
  return KEY_NAMES[code] ?? code;
}
