import { Btn } from '../sim/InputFrame';

/** O que usamos de um Gamepad (facilita testes com controles falsos). */
export interface PadLike {
  index: number;
  connected: boolean;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}

export interface PadRead {
  mx: number;
  mz: number;
  buttons: number;
  /** Analógico direito inclinado: mira. */
  aiming: boolean;
  aimYaw: number;
  /** Bordas de Start (pausa) e Select (mapa). */
  pause: boolean;
  map: boolean;
  pressed: boolean[];
}

const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);

/**
 * Lê um controle no mapeamento padrão (Xbox/PlayStation): A pula, X soco, Y chute, B especial, RT atira,
 * LT mira, D-pad ↓ recarrega, LB/RB trocam de arma, D-pad ↑ troca arma/cajado, L3 ou analógico no fim corre.
 * `prev` = botões apertados na leitura anterior (para as bordas).
 */
export function padFrame(gp: PadLike, prev: readonly boolean[]): PadRead {
  const lx = dz(gp.axes[0] ?? 0);
  const ly = dz(gp.axes[1] ?? 0);
  const rx = dz(gp.axes[2] ?? 0);
  const ry = dz(gp.axes[3] ?? 0);
  const bt = (i: number) => !!gp.buttons[i]?.pressed;
  const edge = (i: number) => bt(i) && !prev[i];
  let b = 0;
  if (bt(0)) b |= Btn.Jump;
  if (bt(2)) b |= Btn.Punch;
  if (bt(3)) b |= Btn.Kick;
  if (bt(1)) b |= Btn.Special;
  if (bt(7) || (gp.buttons[7]?.value ?? 0) > 0.3) b |= Btn.Fire;
  if (bt(6) || (gp.buttons[6]?.value ?? 0) > 0.3) b |= Btn.Aim;
  if (bt(13)) b |= Btn.Reload;
  if (bt(10) || Math.hypot(lx, ly) > 0.95) b |= Btn.Run;
  if (edge(4)) b |= Btn.Prev;
  if (edge(5)) b |= Btn.Next;
  if (edge(12)) b |= Btn.ToggleMode;
  return {
    mx: lx,
    mz: ly,
    buttons: b,
    aiming: Math.hypot(rx, ry) > 0.3,
    aimYaw: Math.atan2(ry * 0.8, rx),
    pause: edge(9),
    map: edge(8),
    pressed: gp.buttons.map((x) => !!x.pressed),
  };
}

/** Direção de navegação (D-pad ou analógico esquerdo) de um controle: -1, 0 ou 1 em cada eixo. */
export function padDir(gp: PadLike): { x: number; y: number } {
  const bt = (i: number) => !!gp.buttons[i]?.pressed;
  const ax = gp.axes[0] ?? 0;
  const ay = gp.axes[1] ?? 0;
  return {
    x: bt(15) || ax > 0.6 ? 1 : bt(14) || ax < -0.6 ? -1 : 0,
    y: bt(13) || ay > 0.6 ? 1 : bt(12) || ay < -0.6 ? -1 : 0,
  };
}

/** Controles conectados (lista densa, com o índice original). */
export function connectedPads(): PadLike[] {
  const out: PadLike[] = [];
  for (const p of navigator.getGamepads?.() ?? []) if (p && p.connected) out.push(p);
  return out;
}
