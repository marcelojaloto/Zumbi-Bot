import { describe, expect, it } from 'vitest';
import { holdOnResize } from './viewport';

const phone = { desktop: false, typing: false };
const full = { w: 800, h: 360 };

describe('tela que se deforma', () => {
  it('celular: encolher (barra do navegador, gesto de sair) segura o tamanho antigo', () => {
    expect(holdOnResize(full, { w: 800, h: 304 }, phone)).toBe(true);
    expect(holdOnResize(full, { w: 752, h: 360 }, phone)).toBe(true);
  });

  it('crescer (voltou para a tela cheia) reajusta na hora', () => {
    expect(holdOnResize({ w: 800, h: 304 }, full, phone)).toBe(false);
  });

  it('girar o aparelho e digitar (teclado na tela) reajustam na hora', () => {
    expect(holdOnResize(full, { w: 360, h: 800 }, phone)).toBe(false);
    expect(holdOnResize(full, { w: 800, h: 180 }, { ...phone, typing: true })).toBe(false);
  });

  it('computador reajusta na hora, menos com a janela de instalar aberta', () => {
    expect(holdOnResize(full, { w: 700, h: 300 }, { desktop: true, typing: false })).toBe(false);
    expect(holdOnResize(full, { w: 700, h: 300 }, { desktop: true, typing: false, frozen: true })).toBe(true);
  });
});
