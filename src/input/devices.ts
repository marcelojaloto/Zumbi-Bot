import type { KeyLayout } from './keymap';

/**
 * Dispositivo de entrada de um jogador local.
 * - auto: tudo junto (teclado + mouse + toque + 1º controle) — o jogo solo de sempre.
 * - kb: teclado inteiro (com mouse) ou metade dele (teclado dividido entre duas pessoas).
 * - pad: um controle específico (índice do navegador).
 * - touch: controles na tela.
 */
export type DeviceRef =
  { k: 'auto' } | { k: 'kb'; layout: KeyLayout } | { k: 'pad'; index: number } | { k: 'touch' };

export function sameDevice(a: DeviceRef, b: DeviceRef): boolean {
  if (a.k !== b.k) return false;
  if (a.k === 'kb' && b.k === 'kb') return a.layout === b.layout;
  if (a.k === 'pad' && b.k === 'pad') return a.index === b.index;
  return true;
}
