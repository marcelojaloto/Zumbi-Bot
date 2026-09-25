/** Detecção simples do tipo de aparelho (usa `window`; só na camada de app/UI). */
export type DeviceKind = 'phone' | 'tablet' | 'desktop';

/** Tela de toque como entrada principal (celular, tablet, iPad que se apresenta como Mac). */
export function isTouchDevice(): boolean {
  try {
    if (matchMedia('(pointer: coarse)').matches) return true;
  } catch {
    /* navegador sem matchMedia */
  }
  return (navigator.maxTouchPoints ?? 0) > 1 && !matchMedia?.('(pointer: fine)')?.matches;
}

export function deviceKind(): DeviceKind {
  if (!isTouchDevice()) return 'desktop';
  const short = Math.min(screen.width, screen.height);
  return short < 600 ? 'phone' : 'tablet';
}

/** Retrato em aparelho de toque: o jogo pede para girar. */
export function isPortrait(): boolean {
  return innerHeight > innerWidth;
}
