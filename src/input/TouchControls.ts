import { Btn } from '../sim/InputFrame';
import { t } from '../i18n';
import { isStandalone } from './device';

type BtnId = 'punch' | 'jump' | 'kick' | 'fire' | 'special' | 'next' | 'mode';

interface BtnSpec {
  id: BtnId;
  bit: number;
  label: string;
  size: 'big' | 'mid' | 'small';
  /** Centro do botão a partir do canto inferior direito (px, antes da escala). */
  right: number;
  bottom: number;
  /** Só o toque conta (troca de arma/modo): não fica "segurado". */
  tapOnly?: boolean;
}

/** Arco ao alcance do polegar direito: os mais usados (Soco e Pular) perto do canto. */
const BUTTONS: BtnSpec[] = [
  { id: 'jump', bit: Btn.Jump, label: 'PULAR', size: 'big', right: 62, bottom: 62 },
  { id: 'punch', bit: Btn.Punch, label: 'SOCO', size: 'big', right: 152, bottom: 50 },
  { id: 'kick', bit: Btn.Kick, label: 'CHUTE', size: 'mid', right: 138, bottom: 138 },
  { id: 'fire', bit: Btn.Fire, label: 'ATIRAR', size: 'mid', right: 52, bottom: 150 },
  { id: 'special', bit: Btn.Special, label: 'ESPECIAL', size: 'small', right: 232, bottom: 42 },
  // sem botão de recarregar: a arma recarrega sozinha quando o pente acaba
  { id: 'next', bit: Btn.Next, label: '▶▶', size: 'small', right: 222, bottom: 118, tapOnly: true },
  { id: 'mode', bit: Btn.ToggleMode, label: '⇄', size: 'small', right: 118, bottom: 214, tapOnly: true },
];

/** Raio do direcional (px, antes da escala). */
const STICK_R = 58;

type Ptr = { kind: 'stick' } | { kind: 'btn'; id: BtnId | null };

export interface TouchRead {
  mx: number;
  mz: number;
  buttons: number;
}

/**
 * Controles de toque transparentes: direcional com setas à esquerda (flutuante: aparece onde o polegar
 * pousa) e botões de ação em arco à direita, com áreas de toque generosas e troca deslizando o dedo.
 */
export class TouchControls {
  readonly root: HTMLDivElement;
  private zone: HTMLDivElement;
  private base: HTMLDivElement;
  private knob: HTMLDivElement;
  private pad: HTMLDivElement;
  private btnEls = new Map<BtnId, HTMLDivElement>();
  private ptrs = new Map<number, Ptr>();
  private stickId: number | null = null;
  private cx = 0;
  private cy = 0;
  private dx = 0;
  private dy = 0;
  private tapped = 0;
  private visible = false;
  private scale = 1;
  private micBtn: HTMLButtonElement;
  private mapBtn: HTMLButtonElement;
  private top: HTMLDivElement;
  haptics = true;

  constructor(
    parent: HTMLElement,
    private hooks: { onPause: () => void; onFullscreen: () => void; onMic?: () => void; onMap?: () => void },
  ) {
    const div = (cls: string) => {
      const d = document.createElement('div');
      d.className = cls;
      return d;
    };
    this.root = div('touch');
    this.root.hidden = true;
    this.zone = div('t-zone');
    this.base = div('t-stick');
    for (const a of ['up', 'down', 'left', 'right']) this.base.appendChild(div(`t-arrow ${a}`));
    this.knob = div('t-knob');
    this.base.appendChild(this.knob);
    this.zone.appendChild(this.base);
    this.pad = div('t-pad');
    for (const b of BUTTONS) {
      const el = div(`t-btn ${b.size} b-${b.id}`);
      el.style.setProperty('--r', String(b.right));
      el.style.setProperty('--b', String(b.bottom));
      el.dataset.id = b.id;
      this.btnEls.set(b.id, el);
      this.pad.appendChild(el);
    }
    // canto superior esquerdo, um abaixo do outro: pausa, microfone (online), tela cheia (navegador) e minimapa
    const top = div('t-top');
    this.top = top;
    const mk = (cls: string, text: string, fn: () => void) => {
      const b = document.createElement('button');
      b.className = `t-mini ${cls}`;
      b.textContent = text;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
      });
      top.appendChild(b);
      return b;
    };
    mk('t-pause', '⏸', () => this.hooks.onPause());
    this.micBtn = mk('t-mic', '🔇', () => this.hooks.onMic?.());
    this.micBtn.hidden = true;
    // aberto pela Tela de Início já está em tela cheia
    if (!__NATIVE__ && !isStandalone()) mk('t-fs', '⛶', () => this.hooks.onFullscreen());
    this.mapBtn = mk('t-map', '🗺', () => this.hooks.onMap?.());
    this.root.append(this.zone, this.pad, top);
    parent.appendChild(this.root);
    this.relabel();
    this.syncTop();

    this.zone.addEventListener('pointerdown', this.stickDown);
    this.zone.addEventListener('pointermove', this.stickMove);
    this.zone.addEventListener('pointerup', this.stickUp);
    this.zone.addEventListener('pointercancel', this.stickUp);
    this.pad.addEventListener('pointerdown', this.padDown);
    this.pad.addEventListener('pointermove', this.padMove);
    this.pad.addEventListener('pointerup', this.padUp);
    this.pad.addEventListener('pointercancel', this.padUp);
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Textos dos botões no idioma atual. */
  relabel(): void {
    for (const b of BUTTONS) {
      const el = this.btnEls.get(b.id)!;
      el.textContent = t(b.label);
    }
    const top = this.root.querySelector('.t-top');
    top?.querySelector('.t-pause')?.setAttribute('aria-label', t('Pausa'));
    top?.querySelector('.t-fs')?.setAttribute('aria-label', t('Tela cheia'));
    this.micBtn?.setAttribute('aria-label', t('Microfone'));
    this.mapBtn?.setAttribute('aria-label', t('Minimapa'));
  }

  /** Quantos botões há na coluna do canto (o HUD põe o FPS e outras infos logo abaixo deles). */
  private syncTop(): void {
    const n = [...this.top.children].filter((b) => !(b as HTMLElement).hidden).length;
    document.documentElement.style.setProperty('--t-top-n', String(n));
  }

  /** Botão do minimapa aceso quando o minimapa está à mostra. */
  setMap(on: boolean): void {
    this.mapBtn.classList.toggle('on', on);
  }

  /** Botão do microfone (chat de voz online): null esconde. */
  setMic(on: boolean | null, talking = false): void {
    if (this.micBtn.hidden !== (on === null)) {
      this.micBtn.hidden = on === null;
      this.syncTop();
    }
    this.micBtn.textContent = on ? '🎤' : '🔇';
    this.micBtn.classList.toggle('on', !!on);
    this.micBtn.classList.toggle('talking', talking);
  }

  setVisible(v: boolean): void {
    if (v === this.visible) return;
    this.visible = v;
    this.root.hidden = !v;
    if (!v) this.reset();
  }

  setLook(scale: number, opacity: number): void {
    this.scale = scale;
    this.root.style.setProperty('--ts', String(scale));
    this.root.style.setProperty('--to', String(opacity));
  }

  /** Botão Atirar mostra o modo atual (arma de fogo ou cajado). */
  setFireMode(mode: 'gun' | 'staff'): void {
    const el = this.btnEls.get('fire')!;
    const want = mode === 'staff' ? t('CONJURAR') : t('ATIRAR');
    if (el.textContent !== want) {
      el.textContent = want;
      el.classList.toggle('staff', mode === 'staff');
    }
  }

  /** Estado do quadro: eixos do direcional e botões (segurados + toques curtos). */
  read(): TouchRead {
    let held = 0;
    for (const p of this.ptrs.values()) {
      if (p.kind !== 'btn' || !p.id) continue;
      const spec = BUTTONS.find((b) => b.id === p.id)!;
      if (!spec.tapOnly) held |= spec.bit;
    }
    const buttons = held | this.tapped;
    this.tapped = 0;
    const R = STICK_R * this.scale;
    const d = Math.hypot(this.dx, this.dy) / R;
    let mx = 0;
    let mz = 0;
    let run = false;
    if (this.stickId !== null && d > 0.18) {
      // velocidade cheia a 60% do raio; empurrar até a borda corre
      const m = Math.min(1, (d - 0.18) / 0.42);
      mx = (this.dx / (d * R)) * m;
      mz = (this.dy / (d * R)) * m;
      run = d > 0.94;
    }
    return { mx, mz, buttons: buttons | (run ? Btn.Run : 0) };
  }

  dispose(): void {
    this.root.remove();
  }

  // ------------------------------------------------------------------ direcional
  private stickDown = (e: PointerEvent): void => {
    if (this.stickId !== null) return;
    e.preventDefault();
    this.stickId = e.pointerId;
    this.ptrs.set(e.pointerId, { kind: 'stick' });
    try {
      this.zone.setPointerCapture(e.pointerId);
    } catch {
      /* sem captura */
    }
    const r = this.zone.getBoundingClientRect();
    const R = STICK_R * this.scale;
    const m = R + 14 * this.scale;
    this.cx = Math.min(Math.max(e.clientX, r.left + m), r.right - m);
    this.cy = Math.min(Math.max(e.clientY, r.top + m), r.bottom - m);
    this.base.classList.add('active');
    this.base.style.left = `${this.cx - r.left}px`;
    this.base.style.top = `${this.cy - r.top}px`;
    this.base.style.bottom = 'auto';
    this.moveKnob(e.clientX, e.clientY);
    this.buzz();
  };

  private stickMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.stickId) return;
    e.preventDefault();
    this.moveKnob(e.clientX, e.clientY);
  };

  private stickUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.stickId) return;
    this.stickId = null;
    this.ptrs.delete(e.pointerId);
    this.dx = 0;
    this.dy = 0;
    this.knob.style.transform = '';
    this.base.classList.remove('active');
    this.base.style.left = '';
    this.base.style.top = '';
    this.base.style.bottom = '';
    this.updateArrows();
  };

  private moveKnob(x: number, y: number): void {
    const R = STICK_R * this.scale;
    let dx = x - this.cx;
    let dy = y - this.cy;
    const d = Math.hypot(dx, dy);
    this.dx = dx;
    this.dy = dy;
    if (d > R) {
      dx *= R / d;
      dy *= R / d;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.updateArrows();
  }

  private updateArrows(): void {
    const R = STICK_R * this.scale;
    const on = (el: Element | null, v: boolean) => el?.classList.toggle('on', v);
    on(this.base.querySelector('.up'), this.dy < -R * 0.3);
    on(this.base.querySelector('.down'), this.dy > R * 0.3);
    on(this.base.querySelector('.left'), this.dx < -R * 0.3);
    on(this.base.querySelector('.right'), this.dx > R * 0.3);
  }

  // ------------------------------------------------------------------ botões
  /** Botão mais próximo do dedo, com área de toque maior que o desenho. */
  private hit(x: number, y: number): BtnId | null {
    let best: BtnId | null = null;
    let bd = Infinity;
    for (const b of BUTTONS) {
      const r = this.btnEls.get(b.id)!.getBoundingClientRect();
      const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) / (r.width / 2);
      if (d < 1.35 && d < bd) {
        bd = d;
        best = b.id;
      }
    }
    return best;
  }

  private press(id: BtnId | null, prev: BtnId | null): void {
    if (id === prev) return;
    if (prev && ![...this.ptrs.values()].some((p) => p.kind === 'btn' && p.id === prev))
      this.btnEls.get(prev)!.classList.remove('on');
    if (id) {
      this.tapped |= BUTTONS.find((b) => b.id === id)!.bit;
      this.btnEls.get(id)!.classList.add('on');
      this.buzz();
    }
  }

  private padDown = (e: PointerEvent): void => {
    e.preventDefault();
    try {
      this.pad.setPointerCapture(e.pointerId);
    } catch {
      /* sem captura */
    }
    const id = this.hit(e.clientX, e.clientY);
    this.ptrs.set(e.pointerId, { kind: 'btn', id });
    this.press(id, null);
  };

  private padMove = (e: PointerEvent): void => {
    const p = this.ptrs.get(e.pointerId);
    if (!p || p.kind !== 'btn') return;
    e.preventDefault();
    const id = this.hit(e.clientX, e.clientY);
    if (id === p.id) return;
    const prev = p.id;
    p.id = id;
    this.press(id, prev);
  };

  private padUp = (e: PointerEvent): void => {
    const p = this.ptrs.get(e.pointerId);
    if (!p || p.kind !== 'btn') return;
    this.ptrs.delete(e.pointerId);
    if (p.id && ![...this.ptrs.values()].some((q) => q.kind === 'btn' && q.id === p.id))
      this.btnEls.get(p.id)!.classList.remove('on');
  };

  private reset(): void {
    this.ptrs.clear();
    this.stickId = null;
    this.dx = 0;
    this.dy = 0;
    this.tapped = 0;
    this.knob.style.transform = '';
    this.base.classList.remove('active');
    this.base.style.left = '';
    this.base.style.top = '';
    this.base.style.bottom = '';
    for (const el of this.btnEls.values()) el.classList.remove('on');
    this.updateArrows();
  }

  private buzz(): void {
    if (this.haptics) navigator.vibrate?.(10);
  }
}
