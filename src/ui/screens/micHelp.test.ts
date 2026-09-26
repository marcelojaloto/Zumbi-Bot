import { afterEach, describe, expect, it } from 'vitest';
import { setLang } from '../../i18n';
import { isIOS } from '../../input/device';
import { micHelp, micProblemText } from './OnlineScreen';

afterEach(() => setLang('pt'));

describe('microfone bloqueado: onde liberar em cada aparelho', () => {
  it('um caminho diferente para cada plataforma (app de iPhone nos Ajustes do iPhone)', () => {
    const all = (['android-app', 'ios-app', 'ios-web', 'android-web', 'desktop'] as const).map((p) =>
      micHelp(p),
    );
    expect(new Set(all).size).toBe(5);
    expect(micHelp('ios-app')).toContain('Ajustes do iPhone');
    expect(micHelp('ios-web')).toContain('Safari');
    expect(micHelp('android-app')).toContain('Android');
    expect(micProblemText('denied')).toContain('bloqueado');
    setLang('en');
    expect(micHelp('ios-app')).toContain('iPhone Settings');
  });

  it('reconhece iPhone e iPad (inclusive o iPad que se apresenta como Mac)', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
    expect(isIOS(ua, 'iPhone', 5)).toBe(true);
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true);
    expect(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false);
    expect(isIOS('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5)).toBe(false);
  });
});
