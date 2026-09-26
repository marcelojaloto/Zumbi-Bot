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
import type { DeviceRef } from './devices';
import { DEFAULT_KEYS, keyboardFrame, layoutKeys, type Action } from './keymap';
import { padFrame, type PadLike, type PadRead } from './pads';

export type { Action } from './keymap';
export { DEFAULT_KEYS } from './keymap';

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
  toggleMode: 'Arma ⇄ Cajado',
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
  /** Botões da leitura anterior de cada controle (índice do navegador). */
  private padPrev = new Map<number, boolean[]>();
  /** Última mira de cada dispositivo (multijogador). */
  private devAim = new Map<string, number>();
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

  /** Amostra o quadro de entrada do tick (jogo solo: todos os dispositivos juntos). */
  sample(tick: number): InputFrame {
    const f = this.sampleAuto(tick);
    this.endTick();
    return f;
  }

  /** Fim do tick: toques curtos e a roda do mouse já foram lidos por todos os jogadores. */
  endTick(): void {
    this.pressedOnce.clear();
    this.wheel = 0;
  }

  /** Fonte de entrada de um jogador local num dispositivo (multijogador). */
  source(slot: PlayerSlot, dev: DeviceRef): InputSource {
    return { slot, sample: (tick) => this.sampleFor(dev, tick) };
  }

  /** Quadro de um dispositivo. Não limpa os toques (use `endTick` depois de ler todos os jogadores). */
  sampleFor(dev: DeviceRef, tick: number): InputFrame {
    if (dev.k === 'auto') return this.sampleAuto(tick);
    const f = emptyFrame(tick);
    if (!this.enabled) return f;
    let mx = 0;
    let mz = 0;
    let b = 0;
    let key = 'touch';
    if (dev.k === 'kb') {
      key = `kb:${dev.layout}`;
      const kf = keyboardFrame(this.keys, this.pressedOnce, layoutKeys(dev.layout, this.bindings));
      mx = kf.mx;
      mz = kf.mz;
      b = kf.buttons;
      if (dev.layout === 'full') {
        if (this.mouseButtons & 1) b |= Btn.Fire;
        if (this.mouseButtons & 2) b |= Btn.Aim;
        if (this.wheel < 0) b |= Btn.Prev;
        if (this.wheel > 0) b |= Btn.Next;
      }
    } else if (dev.k === 'touch') {
      const tc = this.touch?.read();
      if (tc) {
        mx = tc.mx;
        mz = tc.mz;
        b = tc.buttons;
      }
    } else {
      key = `pad:${dev.index}`;
      const gp = this.readPad(dev.index);
      if (gp) {
        mx = gp.mx;
        mz = gp.mz;
        b = gp.buttons;
        if (gp.aiming) {
          this.devAim.set(key, gp.aimYaw);
          f.aimMode = 1;
        }
      }
    }
    const len = Math.hypot(mx, mz);
    if (len > 1) {
      mx /= len;
      mz /= len;
    }
    f.moveX = quantizeAxis(mx);
    f.moveZ = quantizeAxis(mz);
    f.buttons = b;
    // mira com o mouse só para quem está com o teclado inteiro
    if (dev.k === 'kb' && dev.layout === 'full' && this.mouseAiming() && this.aimProjector) {
      const yaw = this.aimProjector(this.cursorX, this.cursorY);
      if (yaw !== null) {
        this.devAim.set(key, yaw);
        f.aimMode = 1;
      }
    }
    if (f.aimMode === 0 && (Math.abs(mx) > 0.2 || Math.abs(mz) > 0.2))
      this.devAim.set(key, Math.atan2(mz * 0.7, mx || 0.0001));
    f.aimYaw = quantizeYaw(this.devAim.get(key) ?? 0);
    return f;
  }

  private mouseAiming(): boolean {
    return this.mouseActive && performance.now() - this.lastMouseMove < 8000;
  }

  private sampleAuto(tick: number): InputFrame {
    const f = emptyFrame(tick);
    if (!this.enabled) {
      this.pressedOnce.clear();
      return f;
    }
    const kf = keyboardFrame(this.keys, this.pressedOnce, this.bindings);
    let mx = kf.mx;
    let mz = kf.mz;
    // botões são "segurados"; taps curtos entre ticks não se perdem
    let b = kf.buttons;
    if (this.mouseButtons & 1) b |= Btn.Fire;
    if (this.mouseButtons & 2) b |= Btn.Aim;
    if (this.wheel < 0) b |= Btn.Prev;
    if (this.wheel > 0) b |= Btn.Next;

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
    const useMouse = this.mouseAiming() && !gp?.aiming;
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

  /** Primeiro controle conectado (jogo solo). */
  private readGamepad(): PadRead | null {
    const gp = (navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
    return gp ? this.readPad(gp.index) : null;
  }

  /** Lê o controle de índice `index`, com pausa/mapa pelo Start/Select. */
  private readPad(index: number): PadRead | null {
    const gp = (navigator.getGamepads?.() ?? [])[index] as PadLike | null | undefined;
    if (!gp || !gp.connected) return null;
    const r = padFrame(gp, this.padPrev.get(index) ?? []);
    this.padPrev.set(index, r.pressed);
    if (r.pause) this.onPause?.();
    if (r.map) this.onMap?.();
    return r;
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
