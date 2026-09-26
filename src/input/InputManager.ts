import {
  Btn,
  emptyFrame,
  quantizeAxis,
  quantizeYaw,
  type InputFrame,
  type InputSource,
} from '../sim/InputFrame';
import type { PlayerSlot } from '../sim/Entity';
import type { TouchControls } from './TouchControls';

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
  | 'map'
  | 'pause';

export const DEFAULT_KEYS: Record<Action, string[]> = {
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
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
};

export const ACTION_LABELS: Record<Action, string> = {
  left: 'Mover para a esquerda',
  right: 'Mover para a direita',
  up: 'Mover para o fundo',
  down: 'Mover para a frente',
  jump: 'Pular / pulo duplo',
  punch: 'Soco / arma branca / pegar',
  kick: 'Chute',
  special: 'Especial do personagem',
  fire: 'Atirar / conjurar',
  aim: 'Mirar (precisão)',
  reload: 'Recarregar',
  run: 'Correr (segurar)',
  prev: 'Arma anterior',
  next: 'Próxima arma',
  modeGun: 'Modo arma de fogo',
  modeStaff: 'Modo cajado',
  map: 'Mapa ampliado',
  pause: 'Pausa',
};

/** Projeção da mira: converte a posição do cursor na tela em ângulo no plano XZ (fornecida pelo render). */
export type AimProjector = (screenX: number, screenY: number) => number | null;

/**
 * Teclado + mouse + gamepad do jogador local. Produz um InputFrame por tick.
 * Mira com mouse: posição do cursor projetada no plano do ombro do robô.
 */
export class InputManager implements InputSource {
  readonly slot: PlayerSlot = 0;
  private keys = new Set<string>();
  private pressedOnce = new Set<string>();
  private mouseButtons = 0;
  private wheel = 0;
  cursorX = 0;
  cursorY = 0;
  /** Cursor virtual quando o ponteiro está travado. */
  private lockedX = 0;
  private lockedY = 0;
  pointerLocked = false;
  sensitivity = 1;
  bindings: Record<Action, string[]> = { ...DEFAULT_KEYS };
  aimProjector: AimProjector | null = null;
  enabled = true;
  mouseActive = false;
  private lastMouseMove = 0;
  private lastAimYaw = 0;
  private gpPrev: boolean[] = [];
  gamepadConnected = false;
  onPause: (() => void) | null = null;
  onMap: (() => void) | null = null;
  /** Ações de interface (tecla pressionada) ouvidas pelo menu. */
  onKeyDown: ((code: string, e: KeyboardEvent) => void) | null = null;
  /** Controles de toque ativos (celular/tablet). */
  touch: TouchControls | null = null;
  /** Último toque na tela: eventos de mouse "de compatibilidade" logo depois são ignorados. */
  private lastTouch = -1e9;

  constructor(private readonly target: HTMLElement) {
    addEventListener('keydown', this.kd);
    addEventListener('keyup', this.ku);
    addEventListener('blur', this.clear);
    target.addEventListener('mousedown', this.md);
    addEventListener('mouseup', this.mu);
    addEventListener('mousemove', this.mm);
    target.addEventListener('wheel', this.wh, { passive: true });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', this.plc);
    addEventListener('touchstart', this.ts, { passive: true, capture: true });
    addEventListener('gamepadconnected', () => (this.gamepadConnected = true));
    addEventListener('gamepaddisconnected', () => (this.gamepadConnected = false));
  }

  dispose(): void {
    removeEventListener('keydown', this.kd);
    removeEventListener('keyup', this.ku);
    removeEventListener('blur', this.clear);
    this.target.removeEventListener('mousedown', this.md);
    removeEventListener('mouseup', this.mu);
    removeEventListener('mousemove', this.mm);
    document.removeEventListener('pointerlockchange', this.plc);
    removeEventListener('touchstart', this.ts, { capture: true });
  }

  private ts = (): void => {
    this.lastTouch = performance.now();
  };

  private fromTouch(): boolean {
    return performance.now() - this.lastTouch < 1200;
  }

  private kd = (e: KeyboardEvent): void => {
    this.onKeyDown?.(e.code, e);
    if (!this.enabled) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code))
      e.preventDefault();
    if (!this.keys.has(e.code)) this.pressedOnce.add(e.code);
    this.keys.add(e.code);
    if (this.bindings.pause.includes(e.code) && !e.repeat) this.onPause?.();
    if (this.bindings.map.includes(e.code) && !e.repeat) this.onMap?.();
  };

  private ku = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private clear = (): void => {
    this.keys.clear();
    this.mouseButtons = 0;
  };

  private md = (e: MouseEvent): void => {
    if (this.fromTouch()) return;
    this.mouseButtons |= 1 << e.button;
    this.mouseActive = true;
  };

  private mu = (e: MouseEvent): void => {
    this.mouseButtons &= ~(1 << e.button);
  };

  private mm = (e: MouseEvent): void => {
    if (this.fromTouch()) return;
    if (this.pointerLocked) {
      this.lockedX = Math.max(0, Math.min(innerWidth, this.lockedX + e.movementX * this.sensitivity));
      this.lockedY = Math.max(0, Math.min(innerHeight, this.lockedY + e.movementY * this.sensitivity));
      this.cursorX = this.lockedX;
      this.cursorY = this.lockedY;
    } else {
      this.cursorX = e.clientX;
      this.cursorY = e.clientY;
    }
    this.lastMouseMove = performance.now();
    this.mouseActive = true;
  };

  private wh = (e: WheelEvent): void => {
    this.wheel += Math.sign(e.deltaY);
  };

  private plc = (): void => {
    const was = this.pointerLocked;
    this.pointerLocked = document.pointerLockElement === this.target;
    if (this.pointerLocked && !was) {
      this.lockedX = this.cursorX || innerWidth / 2;
      this.lockedY = this.cursorY || innerHeight / 2;
    }
    if (was && !this.pointerLocked) this.onPause?.();
  };

  requestPointerLock(): void {
    try {
      const r = this.target.requestPointerLock?.() as unknown;
      if (r && typeof (r as Promise<void>).catch === 'function') (r as Promise<void>).catch(() => {});
    } catch {
      /* navegador sem suporte */
    }
  }

  exitPointerLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private down(a: Action): boolean {
    for (const k of this.bindings[a]) if (this.keys.has(k)) return true;
    return false;
  }

  private tapped(a: Action): boolean {
    for (const k of this.bindings[a]) if (this.pressedOnce.has(k)) return true;
    return false;
  }

  /** Amostra o quadro de entrada do tick. */
  sample(tick: number): InputFrame {
    const f = emptyFrame(tick);
    if (!this.enabled) {
      this.pressedOnce.clear();
      return f;
    }
    let mx = (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
    let mz = (this.down('down') ? 1 : 0) - (this.down('up') ? 1 : 0);
    let b = 0;
    // botões são "segurados"; taps curtos entre ticks não se perdem
    if (this.down('jump') || this.tapped('jump')) b |= Btn.Jump;
    if (this.down('punch') || this.tapped('punch')) b |= Btn.Punch;
    if (this.down('kick') || this.tapped('kick')) b |= Btn.Kick;
    if (this.down('special') || this.tapped('special')) b |= Btn.Special;
    if (this.down('fire') || this.tapped('fire') || this.mouseButtons & 1) b |= Btn.Fire;
    if (this.down('aim') || this.mouseButtons & 2) b |= Btn.Aim;
    if (this.down('reload') || this.tapped('reload')) b |= Btn.Reload;
    if (this.down('run')) b |= Btn.Run;
    if (this.tapped('prev') || this.wheel < 0) b |= Btn.Prev;
    if (this.tapped('next') || this.wheel > 0) b |= Btn.Next;
    if (this.tapped('modeGun')) b |= Btn.ModeGun;
    if (this.tapped('modeStaff')) b |= Btn.ModeStaff;
    this.wheel = 0;
    this.pressedOnce.clear();

    // toque (celular/tablet): mesmo papel do gamepad
    if (this.touch) {
      const tc = this.touch.read();
      if (Math.abs(tc.mx) > Math.abs(mx)) mx = tc.mx;
      if (Math.abs(tc.mz) > Math.abs(mz)) mz = tc.mz;
      b |= tc.buttons;
    }

    // gamepad
    const gp = this.readGamepad();
    if (gp) {
      if (Math.abs(gp.mx) > Math.abs(mx)) mx = gp.mx;
      if (Math.abs(gp.mz) > Math.abs(mz)) mz = gp.mz;
      b |= gp.buttons;
    }

    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    f.moveX = quantizeAxis(mx);
    f.moveZ = quantizeAxis(mz);
    f.buttons = b;

    // mira
    const useMouse = this.mouseActive && !gp?.aiming && performance.now() - this.lastMouseMove < 8000;
    if (useMouse && this.aimProjector) {
      const yaw = this.aimProjector(this.cursorX, this.cursorY);
      if (yaw !== null) {
        this.lastAimYaw = yaw;
        f.aimMode = 1;
      }
    } else if (gp?.aiming) {
      this.lastAimYaw = gp.aimYaw;
      f.aimMode = 1;
    } else {
      f.aimMode = 0;
      if (Math.abs(mx) > 0.2 || Math.abs(mz) > 0.2) this.lastAimYaw = Math.atan2(mz * 0.7, mx || 0.0001);
    }
    f.aimYaw = quantizeYaw(this.lastAimYaw);
    return f;
  }

  private readGamepad(): { mx: number; mz: number; buttons: number; aiming: boolean; aimYaw: number } | null {
    const pads = navigator.getGamepads?.() ?? [];
    const gp = pads.find((p) => p && p.connected);
    if (!gp) return null;
    const dz = (v: number) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);
    const lx = dz(gp.axes[0] ?? 0);
    const ly = dz(gp.axes[1] ?? 0);
    const rx = dz(gp.axes[2] ?? 0);
    const ry = dz(gp.axes[3] ?? 0);
    const bt = (i: number) => !!gp.buttons[i]?.pressed;
    const edge = (i: number) => bt(i) && !this.gpPrev[i];
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
    if (edge(9)) this.onPause?.();
    if (edge(8)) this.onMap?.();
    this.gpPrev = gp.buttons.map((x) => x.pressed);
    const aiming = Math.hypot(rx, ry) > 0.3;
    return { mx: lx, mz: ly, buttons: b, aiming, aimYaw: Math.atan2(ry * 0.8, rx) };
  }

  /** Vibração em golpes pesados. */
  rumble(strength: number, ms = 120): void {
    const gp = (navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
    const act = (gp as unknown as { vibrationActuator?: { playEffect(t: string, o: object): Promise<void> } })
      ?.vibrationActuator;
    act
      ?.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 })
      .catch(() => {});
  }
}
