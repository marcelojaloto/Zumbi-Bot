import { clear } from './dom';

export interface Screen {
  readonly el: HTMLElement;
  /** Nome curto (debug / testes). */
  readonly id: string;
  onShow?(): void;
  onHide?(): void;
  /** Retorna true se tratou a tecla. */
  onKey?(code: string): boolean;
  /** Esc / B: voltar. Retorna false para impedir. */
  onBack?(): boolean;
  /** Setas / D-pad antes da navegação padrão por foco. Retorna true se tratou. */
  onNav?(dx: number, dy: number): boolean;
  update?(dt: number): void;
}

/** Pilha de telas em HTML sobre o jogo, com navegação por foco (teclado/gamepad). */
export class ScreenManager {
  readonly root: HTMLDivElement;
  private stack: Screen[] = [];
  onNavSound: ((kind: 'hover' | 'click' | 'back') => void) | null = null;
  private gpPrev: boolean[] = [];
  private gpRepeat = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'screens';
    parent.appendChild(this.root);
    addEventListener('keydown', this.onKeyDown, true);
    this.root.addEventListener('mouseover', (e) => {
      const t = (e.target as HTMLElement).closest('[data-nav]') as HTMLElement | null;
      if (t && document.activeElement !== t) {
        t.focus({ preventScroll: true });
        this.onNavSound?.('hover');
      }
    });
    this.root.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, [data-nav]')) this.onNavSound?.('click');
    });
  }

  get top(): Screen | undefined {
    return this.stack[this.stack.length - 1];
  }

  get depth(): number {
    return this.stack.length;
  }

  push(s: Screen): void {
    const cur = this.top;
    if (cur) {
      cur.onHide?.();
      cur.el.style.display = 'none';
    }
    this.stack.push(s);
    this.root.appendChild(s.el);
    s.el.style.display = '';
    s.onShow?.();
    this.focusFirst();
  }

  pop(): void {
    const s = this.stack.pop();
    if (s) {
      s.onHide?.();
      s.el.remove();
    }
    const cur = this.top;
    if (cur) {
      cur.el.style.display = '';
      cur.onShow?.();
      this.focusFirst();
    }
  }

  replace(s: Screen): void {
    const old = this.stack.pop();
    if (old) {
      old.onHide?.();
      old.el.remove();
    }
    this.push(s);
  }

  clear(): void {
    while (this.stack.length) {
      const s = this.stack.pop()!;
      s.onHide?.();
      s.el.remove();
    }
    clear(this.root);
  }

  focusFirst(): void {
    const t = this.top;
    if (!t) return;
    const first =
      t.el.querySelector<HTMLElement>('[data-autofocus]') ??
      t.el.querySelector<HTMLElement>('[data-nav]:not([disabled])');
    first?.focus({ preventScroll: true });
  }

  private navItems(): HTMLElement[] {
    const t = this.top;
    if (!t) return [];
    return [...t.el.querySelectorAll<HTMLElement>('[data-nav]:not([disabled])')].filter(
      (e) => e.offsetParent !== null,
    );
  }

  /** Move o foco espacialmente (setas / D-pad). */
  move(dx: number, dy: number): void {
    if (this.top?.onNav?.(dx, dy)) {
      this.onNavSound?.('hover');
      return;
    }
    const items = this.navItems();
    if (!items.length) return;
    const cur = document.activeElement as HTMLElement | null;
    if (!cur || !items.includes(cur)) {
      items[0]!.focus();
      return;
    }
    const r0 = cur.getBoundingClientRect();
    const cx = r0.left + r0.width / 2;
    const cy = r0.top + r0.height / 2;
    let best: HTMLElement | null = null;
    let bd = Infinity;
    for (const it of items) {
      if (it === cur) continue;
      const r = it.getBoundingClientRect();
      const x = r.left + r.width / 2 - cx;
      const y = r.top + r.height / 2 - cy;
      const along = x * dx + y * dy;
      if (along <= 4) continue;
      const across = Math.abs(x * dy) + Math.abs(y * dx);
      const d = along + across * 2.5;
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    if (best) {
      best.focus({ preventScroll: false });
      this.onNavSound?.('hover');
    }
  }

  back(): void {
    const t = this.top;
    if (!t) return;
    if (t.onBack && t.onBack() === false) return;
    this.onNavSound?.('back');
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const t = this.top;
    if (!t) return;
    const target = e.target as HTMLElement;
    const typing = target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text';
    if (t.onKey?.(e.code)) {
      e.preventDefault();
      return;
    }
    if (typing && e.code !== 'Escape' && e.code !== 'Enter') return;
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.move(0, -1);
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.move(0, 1);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        if ((document.activeElement as HTMLInputElement | null)?.type === 'range') return;
        this.move(-1, 0);
        break;
      case 'ArrowRight':
      case 'KeyD':
        if ((document.activeElement as HTMLInputElement | null)?.type === 'range') return;
        this.move(1, 0);
        break;
      case 'Escape':
      case 'Backspace':
        if (typing && e.code === 'Backspace') return;
        this.back();
        break;
      case 'KeyQ':
      case 'KeyE':
        if (typing || !this.cycleTab(e.code === 'KeyQ' ? -1 : 1)) return;
        break;
      case 'Enter':
      case 'Space':
      case 'KeyJ':
        if (document.activeElement && (document.activeElement as HTMLElement).dataset.nav !== undefined) {
          (document.activeElement as HTMLElement).click();
        } else return;
        break;
      default:
        return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  /** Atualização por quadro da tela do topo (animações de telas como os créditos). */
  update(dt: number): void {
    this.top?.update?.(dt);
  }

  /** Troca a aba ativa (LB/RB no gamepad, Q/E no teclado) em telas com `.tabs`. */
  cycleTab(dir: number): boolean {
    const tabs = this.top?.el.querySelector('.tabs');
    if (!tabs) return false;
    const btns = [...tabs.querySelectorAll<HTMLElement>('button:not([disabled])')];
    if (btns.length < 2) return false;
    const cur = btns.findIndex((b) => b.classList.contains('on'));
    const next = btns[(Math.max(0, cur) + dir + btns.length) % btns.length]!;
    next.click();
    next.focus({ preventScroll: true });
    this.onNavSound?.('hover');
    return true;
  }

  /** Navegação por gamepad (chamada a cada quadro). */
  pollGamepad(dt: number): void {
    if (!this.top) return;
    const gp = (navigator.getGamepads?.() ?? []).find((p) => p && p.connected);
    if (!gp) return;
    const bt = (i: number) => !!gp.buttons[i]?.pressed;
    const edge = (i: number) => bt(i) && !this.gpPrev[i];
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    this.gpRepeat -= dt;
    const dirX = bt(15) || ax > 0.6 ? 1 : bt(14) || ax < -0.6 ? -1 : 0;
    const dirY = bt(13) || ay > 0.6 ? 1 : bt(12) || ay < -0.6 ? -1 : 0;
    if ((dirX || dirY) && this.gpRepeat <= 0) {
      const a = document.activeElement as HTMLInputElement | null;
      if (dirX && a?.type === 'range') {
        a.value = String(Number(a.value) + dirX * Number(a.step || 0.05));
        a.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (dirX && a instanceof HTMLSelectElement) {
        const n = a.options.length;
        a.selectedIndex = (a.selectedIndex + dirX + n) % n;
        a.dispatchEvent(new Event('change', { bubbles: true }));
      } else this.move(dirX, dirY);
      this.gpRepeat = 0.18;
    }
    if (!dirX && !dirY) this.gpRepeat = 0;
    if (edge(0)) (document.activeElement as HTMLElement | null)?.click();
    if (edge(1)) this.back();
    if (edge(4)) this.cycleTab(-1);
    if (edge(5)) this.cycleTab(1);
    this.gpPrev = gp.buttons.map((b) => b.pressed);
  }
}
