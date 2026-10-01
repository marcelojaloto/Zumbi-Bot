/** Tamanho da tela (px CSS). */
export interface Size {
  w: number;
  h: number;
}

/** Tempo que o jogo segura o tamanho antigo quando a tela encolhe sem o jogador querer. */
export const HOLD_MS = 3000;

/**
 * A tela encolheu "sozinha" (barra do navegador voltou ao sair da tela cheia, gesto de sair do app, janela de
 * instalar)? Então o jogo segura o tamanho antigo por um tempo em vez de se rearrumar na hora: quase sempre ela
 * volta logo. Crescer, girar o aparelho, digitar (teclado na tela) e o computador reajustam na hora.
 */
export function holdOnResize(
  prev: Size,
  next: Size,
  o: { desktop: boolean; typing: boolean; frozen?: boolean },
): boolean {
  if (next.w === prev.w && next.h === prev.h) return false;
  const rotated = prev.w > prev.h !== next.w > next.h;
  if (rotated || o.typing) return false;
  if (o.frozen) return true;
  if (o.desktop) return false;
  return next.w < prev.w || next.h < prev.h;
}

const typing = (): boolean => {
  const a = document.activeElement;
  return a instanceof HTMLTextAreaElement || (a instanceof HTMLInputElement && a.type === 'text');
};

/**
 * Guarda o tamanho da tela do jogo: quando ela se deforma (encolhe), espera {@link HOLD_MS} antes de reajustar;
 * se voltar ao tamanho de antes nesse tempo, nada muda. Enquanto segura, o canvas e as telas ficam no tamanho
 * antigo (classe `hold-size` no <html>).
 */
export class ViewportKeeper {
  /** Tamanho em uso pelo jogo (o canvas e as telas). */
  size: Size = { w: innerWidth, h: innerHeight };
  private timer: ReturnType<typeof setTimeout> | null = null;
  private frozen = false;

  constructor(private o: { desktop: () => boolean; apply: () => void }) {
    addEventListener('resize', this.check);
    // o teclado na tela abre depois do foco: reajusta assim que o campo de texto é tocado
    addEventListener('focusin', this.check);
  }

  /** Segura o tamanho enquanto uma janela do navegador está aberta (instalar); ao soltar, espera o tempo normal. */
  freeze(on: boolean): void {
    this.frozen = on;
    this.check();
  }

  private check = (): void => {
    const next = { w: innerWidth, h: innerHeight };
    if (next.w === this.size.w && next.h === this.size.h) {
      // voltou ao tamanho de antes (ex.: tela cheia de novo): nada a reajustar
      this.release();
      return;
    }
    if (holdOnResize(this.size, next, { desktop: this.o.desktop(), typing: typing(), frozen: this.frozen })) {
      this.hold();
      if (!this.frozen) {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(this.apply, HOLD_MS);
      }
      return;
    }
    this.apply();
  };

  private hold(): void {
    const r = document.documentElement;
    if (r.classList.contains('hold-size')) return;
    r.style.setProperty('--hold-w', `${this.size.w}px`);
    r.style.setProperty('--hold-h', `${this.size.h}px`);
    r.classList.add('hold-size');
  }

  private release(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    document.documentElement.classList.remove('hold-size');
  }

  private apply = (): void => {
    this.release();
    const next = { w: innerWidth, h: innerHeight };
    if (next.w === this.size.w && next.h === this.size.h) return;
    this.size = next;
    this.o.apply();
  };
}
