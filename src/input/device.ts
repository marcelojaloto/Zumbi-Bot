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

/** iPhone ou iPad (inclusive o iPad que se apresenta como Mac). */
export function isIOS(
  ua = navigator.userAgent,
  platform = navigator.platform,
  touchPoints = navigator.maxTouchPoints ?? 0,
): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
}

/** Android (navegador ou app). */
export function isAndroid(ua = navigator.userAgent): boolean {
  return /Android/i.test(ua);
}

/** Aberto pela Tela de Início (iPhone) ou como app instalado: já está em tela cheia. */
export function isStandalone(): boolean {
  try {
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
    return matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

/** O navegador deixa a página entrar em tela cheia (o iPhone não deixa: só pela Tela de Início). */
export function canFullscreen(): boolean {
  const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown };
  return typeof root.requestFullscreen === 'function' || typeof root.webkitRequestFullscreen === 'function';
}
