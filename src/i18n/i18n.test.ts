import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectLang, ordinal, setLang, t } from './index';
import { EN } from './en';
import { dataKeys, literalKeys } from './keys';
import { ELEMENT_NAMES, TOUCH_HINTS } from '../ui/hud/Hud';
import { SLOT_NAMES } from '../ui/screens/WardrobeScreen';
import { ROWS, TOUCH_ROWS } from '../ui/screens/ControlsScreen';

function sources(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts') && !p.includes(`${join('src', 'i18n')}`))
      out.push(p);
  }
  return out;
}

afterEach(() => setLang('pt'));

describe('i18n', () => {
  it('português devolve o próprio texto e interpola parâmetros', () => {
    setLang('pt');
    expect(t('Jogar')).toBe('Jogar');
    expect(t('Nova arma: {name}', { name: 'Pistola' })).toBe('Nova arma: Pistola');
    expect(ordinal(1)).toBe('1º');
  });

  it('inglês traduz, interpola e cai no português quando falta', () => {
    setLang('en');
    expect(t('Jogar')).toBe('Play');
    expect(t('{n} vidas restantes', { n: 2 })).toBe('2 lives left');
    expect(t('texto sem tradução')).toBe('texto sem tradução');
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
    ]);
  });

  it('detecta o idioma pelo navegador', () => {
    expect(detectLang('pt-BR')).toBe('pt');
    expect(detectLang('pt-PT')).toBe('pt');
    expect(detectLang('en-US')).toBe('en');
    expect(detectLang('es-ES')).toBe('en');
    expect(detectLang(undefined)).toBe('en');
  });

  it('todo texto de dados exibido tem tradução em inglês', () => {
    const missing = dataKeys().filter((k) => !(k in EN));
    expect(missing).toEqual([]);
  });

  it("toda chamada t('…') da interface tem tradução em inglês", () => {
    const missing = new Set<string>();
    for (const f of sources('src'))
      for (const k of literalKeys(readFileSync(f, 'utf8'))) if (!(k in EN)) missing.add(`${f}: ${k}`);
    expect([...missing]).toEqual([]);
  });

  it('tabelas de textos da interface têm tradução em inglês', () => {
    const keys = [
      ...Object.values(ELEMENT_NAMES),
      ...Object.values(TOUCH_HINTS),
      ...Object.keys(TOUCH_HINTS),
      ...Object.values(SLOT_NAMES),
      ...ROWS.map((r) => r[0]),
      'Espaço',
      'Mouse esq.',
      'Mouse dir.',
      'Roda',
      'Analógico esquerdo',
      ...TOUCH_ROWS.flat(),
    ];
    expect(keys.filter((k) => !(k in EN))).toEqual([]);
  });

  it('parâmetros da tradução batem com os do original', () => {
    const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const bad = Object.entries(EN).filter(([pt, en]) => params(pt).join() !== params(en).join());
    expect(bad).toEqual([]);
  });
});
