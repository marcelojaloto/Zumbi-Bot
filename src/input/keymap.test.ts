import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KEYS,
  bindingsFrom,
  clearKey,
  customKeys,
  editableKeys,
  keyLabel,
  keyboardFrame,
  rebind,
} from './keymap';
import { Btn } from '../sim/InputFrame';

describe('teclas configuráveis', () => {
  it('padrão sem personalização; Esc sempre pausa', () => {
    const m = bindingsFrom();
    expect(m).toEqual(DEFAULT_KEYS);
    expect(customKeys(m)).toBeUndefined();
    const c = bindingsFrom({ pause: ['KeyO'] });
    expect(c.pause).toEqual(['Escape', 'KeyO']);
    expect(editableKeys(c, 'pause')).toEqual(['KeyO']);
  });

  it('trocar uma tecla tira ela da outra ação e vale no jogo', () => {
    const { map, from } = rebind(bindingsFrom(), 'jump', 0, 'KeyK');
    expect(from).toBe('kick');
    expect(map.jump).toEqual(['KeyK']);
    expect(map.kick).toEqual([]);
    const f = keyboardFrame(new Set(['KeyK']), new Set(), map);
    expect(f.buttons).toBe(Btn.Jump);
    expect(customKeys(map)?.jump).toEqual(['KeyK']);
  });

  it('segunda tecla, troca de posição na mesma ação, limite de 2 e apagar', () => {
    let m = rebind(bindingsFrom(), 'punch', 1, 'KeyH').map;
    expect(m.punch).toEqual(['KeyJ', 'KeyH']);
    m = rebind(m, 'punch', 0, 'KeyH').map;
    expect(m.punch).toEqual(['KeyH', 'KeyJ']);
    m = rebind(m, 'punch', 5, 'KeyG').map;
    expect(m.punch.length).toBe(2);
    m = clearKey(m, 'punch', 0);
    expect(m.punch).toEqual(['KeyJ']);
    // Esc não pode ser usado
    expect(rebind(m, 'jump', 0, 'Escape').map.jump).toEqual(m.jump);
  });

  it('nomes das teclas (e o caractere do teclado do jogador quando o navegador informa)', () => {
    expect(keyLabel('KeyA')).toBe('A');
    expect(keyLabel('Digit1')).toBe('1');
    expect(keyLabel('Numpad3')).toBe('Num 3');
    expect(keyLabel('ArrowLeft')).toBe('←');
    expect(keyLabel('Space')).toBe('Espaço');
    expect(keyLabel('Semicolon')).toBe(';');
    expect(keyLabel('Semicolon', new Map([['Semicolon', 'ç']]))).toBe('Ç');
    expect(keyLabel('F5')).toBe('F5');
  });
});
