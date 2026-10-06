import { el } from './dom';
import { t } from '../i18n';

/** Conta da trava para pais: um número de 12 a 19 vezes um de 3 a 9. */
export function gateNumbers(rnd: () => number = Math.random): { a: number; b: number } {
  return { a: 12 + Math.floor(rnd() * 8), b: 3 + Math.floor(rnd() * 7) };
}

/**
 * Trava para pais: antes de liberar algo que a lei deixa com os pais (a voz, o jogo online), uma conta que uma criança
 * pequena não resolve sozinha. Não é verificação de idade; é o esforço razoável possível quando a loja não informa a
 * idade (LGPD, art. 14, § 5º). Errou, a conta muda.
 */
export function parentGate(
  question: string,
  onPass: () => void,
  onCancel: () => void,
  rnd: () => number = Math.random,
): HTMLElement {
  let n = gateNumbers(rnd);
  const ask = el('span', { class: 'gate-q' });
  const msg = el('span', { class: 'gate-msg' });
  const input = el('input', {
    type: 'text',
    inputMode: 'numeric',
    maxLength: 3,
    autocomplete: 'off',
    class: 'gate-input',
    data: { nav: '' },
  });
  const show = () => (ask.textContent = t('Para confirmar, responda: quanto é {a} × {b}?', n));
  const confirm = () => {
    if (Number(input.value.trim()) === n.a * n.b) {
      onPass();
      return;
    }
    n = gateNumbers(rnd);
    show();
    input.value = '';
    msg.textContent = t('Resposta errada. Tente esta outra conta.');
    input.focus();
  };
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') confirm();
  });
  show();
  return el(
    'div',
    { class: 'parent-gate' },
    el('span', {}, question),
    ask,
    input,
    el('button', { class: 'btn small primary', data: { nav: '' }, onclick: confirm }, t('Confirmar')),
    el('button', { class: 'btn small', data: { nav: '' }, onclick: onCancel }, t('Cancelar')),
    msg,
  );
}
