import type { PlayerSlot } from './Entity';

/** Bits de botões do quadro de entrada (compacto e serializável para rede). */
export const Btn = {
  Jump: 1,
  Punch: 2,
  Kick: 4,
  Special: 8,
  Fire: 16,
  Aim: 32,
  Reload: 64,
  Run: 128,
  Prev: 256,
  Next: 512,
  ModeGun: 1024,
  ModeStaff: 2048,
  ToggleMode: 4096,
} as const;

export interface InputFrame {
  tick: number;
  buttons: number;
  /** Eixos quantizados em [-1, 1] (múltiplos de 1/127). */
  moveX: number;
  moveZ: number;
  /** Direção de mira no plano XZ (rad; 0 = +X, π/2 = +Z / em direção à câmera). */
  aimYaw: number;
  /** 0 = direcional (teclado/gamepad sem mira), 1 = ponteiro (mouse). */
  aimMode: 0 | 1;
}

export interface InputSource {
  readonly slot: PlayerSlot;
  sample(tick: number): InputFrame;
}

export function emptyFrame(tick = 0): InputFrame {
  return { tick, buttons: 0, moveX: 0, moveZ: 0, aimYaw: 0, aimMode: 0 };
}

export function quantizeAxis(v: number): number {
  const c = Math.max(-1, Math.min(1, v));
  return Math.round(c * 127) / 127;
}

export function quantizeYaw(a: number): number {
  const step = (Math.PI * 2) / 1024;
  return Math.round(a / step) * step;
}

export function pressed(buttons: number, prev: number, b: number): boolean {
  return (buttons & b) !== 0 && (prev & b) === 0;
}

export function held(buttons: number, b: number): boolean {
  return (buttons & b) !== 0;
}
