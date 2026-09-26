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
