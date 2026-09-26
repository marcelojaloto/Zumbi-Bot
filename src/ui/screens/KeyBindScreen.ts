import { ACTION_LABELS } from '../../input/InputManager';
import { keyName } from '../../input/keyLabels';
import {
  DEFAULT_KEYS,
  ESSENTIAL_ACTIONS,
  MAX_KEYS_PER_ACTION,
  bindingsFrom,
  clearKey,
  customKeys,
  editableKeys,
  rebind,
  type Action,
} from '../../input/keymap';
import { el } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

const ORDER = Object.keys(DEFAULT_KEYS) as Action[];

/**
 * Trocar as teclas do teclado: uma linha por ação com duas teclas. Clicar numa tecla (ou Enter/A) e apertar a nova;
 * Esc cancela, Delete apaga. Uma tecla que já era de outra ação sai de lá. Salva na hora.
 */
export function keyBindScreen(host: UiHost): Screen {
  const st = () => host.profile.settings;
  let map = bindingsFrom(st().controls.keys);
  let listening: { action: Action; slot: number } | null = null;
  const list = el('div', { class: 'kb-list' });
  const status = el('p', { class: 'kb-status' }, t('Clique numa tecla e aperte a nova.'));

  const label = (a: Action) => t(ACTION_LABELS[a]);
  const save = () => {
    const c = customKeys(map);
    if (c) st().controls.keys = c;
    else delete st().controls.keys;
    host.profile.persistSettings();
    host.applySettings();
  };
  const focus = (a: Action, slot: number) =>
    list.querySelector<HTMLElement>(`[data-action="${a}"][data-slot="${slot}"]`)?.focus();

  function row(a: Action): HTMLElement {
    const keys = editableKeys(map, a);
    const missing = keys.length === 0 && ESSENTIAL_ACTIONS.includes(a);
    const slots = Array.from({ length: MAX_KEYS_PER_ACTION }, (_, i) => {
      const on = listening?.action === a && listening.slot === i;
      const code = keys[i];
      return el(
        'button',
        {
          class: `kb-key${on ? ' listening' : ''}${code ? '' : ' empty'}`,
          title: label(a),
          data: { nav: '', action: a, slot: String(i) },
          onclick: () => listen(a, i),
        },
        on ? t('Aperte uma tecla…') : code ? keyName(code) : '—',
      );
    });
    return el(
      'div',
      { class: `kb-row${missing ? ' missing' : ''}` },
      el(
        'span',
        { class: 'kb-label' },
        label(a),
        a === 'pause' ? el('kbd', {}, 'Esc') : null,
        missing ? el('small', {}, t('sem tecla!')) : null,
      ),
      ...slots,
    );
  }

  function render(): void {
    list.replaceChildren(...ORDER.map(row));
  }

  const listen = (a: Action, slot: number) => {
    listening = { action: a, slot };
    status.textContent = t('Aperte a tecla nova para "{action}" • Esc cancela • Delete apaga', {
      action: label(a),
    });
    host.playUi('ui_click');
    render();
    focus(a, slot);
  };

  const onKey = (code: string, e?: KeyboardEvent): boolean => {
    if (!listening) return false;
    e?.preventDefault();
    const { action, slot } = listening;
    listening = null;
    if (code === 'Escape') status.textContent = t('Nada mudou.');
    else if (code === 'Delete' || code === 'Backspace') {
      map = clearKey(map, action, slot);
      save();
      status.textContent = t('Tecla apagada de "{action}".', { action: label(action) });
    } else {
      const r = rebind(map, action, slot, code);
      map = r.map;
      save();
      status.textContent = r.from
        ? t('{key} agora é "{action}" (saiu de "{from}").', {
            key: keyName(code),
            action: label(action),
            from: label(r.from),
          })
        : t('{key} agora é "{action}".', { key: keyName(code), action: label(action) });
    }
    host.playUi(code === 'Escape' ? 'ui_back' : 'ui_click');
    render();
    focus(action, slot);
    return true;
  };

  const reset = () => {
    listening = null;
    map = bindingsFrom();
    save();
    status.textContent = t('Teclas padrão de volta.');
    render();
  };

  const e = el(
    'div',
    { class: 'screen dim keybind-screen' },
    el('h2', {}, t('TECLAS DO TECLADO')),
    el('p', { class: 'subtitle' }, t('Cada ação pode ter duas teclas. Clique numa tecla e aperte a nova.')),
    status,
    el('div', { class: 'panel' }, list),
    el(
      'p',
      { class: 'muted kb-note' },
      t(
        'Mouse: botão esquerdo atira • botão direito solta o especial • a rodinha liga a corrida (até você parar).',
      ),
    ),
    el(
      'p',
      { class: 'muted kb-note' },
      t('O teclado dividido do multijogador local continua com as teclas de sempre.'),
    ),
    el(
      'div',
      { class: 'row-btns' },
      el('button', { class: 'btn', data: { nav: '' }, onclick: reset }, t('Restaurar padrão')),
      el(
        'button',
        { class: 'btn primary', data: { nav: '' }, onclick: () => host.screens.pop() },
        t('Voltar'),
      ),
    ),
  );
  render();
  return {
    el: e,
    id: 'keybind',
    onKey,
    onBack: () => {
      if (listening) {
        listening = null;
        status.textContent = t('Nada mudou.');
        render();
      } else host.screens.pop();
      return true;
    },
  };
}
