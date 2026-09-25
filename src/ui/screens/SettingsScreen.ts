import { el } from '../dom';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';
import type { SettingsV1 } from '../../save/schema';

function slider(
  label: string,
  get: () => number,
  set: (v: number) => void,
  min: number,
  max: number,
  step: number,
  fmt: (v: number) => string,
) {
  const out = el('span', { class: 'muted' }, fmt(get()));
  const input = el('input', {
    type: 'range',
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(get()),
    data: { nav: '' },
  });
  input.addEventListener('input', () => {
    set(Number(input.value));
    out.textContent = fmt(Number(input.value));
  });
  return [el('label', {}, label, ' ', out), input] as const;
}

function check(label: string, get: () => boolean, set: (v: boolean) => void) {
  const input = el('input', { type: 'checkbox', checked: get(), data: { nav: '' } });
  input.addEventListener('change', () => set(input.checked));
  return [el('label', {}, label), input] as const;
}

function select<T extends string>(label: string, get: () => T, set: (v: T) => void, options: [T, string][]) {
  const s = el(
    'select',
    { data: { nav: '' } },
    ...options.map(([v, t]) => el('option', { value: v, selected: v === get() }, t)),
  );
  s.addEventListener('change', () => set(s.value as T));
  return [el('label', {}, label), s] as const;
}

export function settingsScreen(host: UiHost): Screen {
  const st = (): SettingsV1 => host.profile.settings;
  const apply = () => {
    host.applySettings();
    host.profile.persistSettings();
  };
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const sections: Record<string, HTMLElement> = {};
  const mk = (rows: (readonly [HTMLElement, HTMLElement])[]) => el('div', { class: 'kv' }, ...rows.flat());

  sections.audio = mk([
    slider(
      'Volume geral',
      () => st().audio.master,
      (v) => ((st().audio.master = v), apply()),
      0,
      1,
      0.05,
      pct,
    ),
    slider(
      'Música',
      () => st().audio.music,
      (v) => ((st().audio.music = v), apply()),
      0,
      1,
      0.05,
      pct,
    ),
    slider(
      'Efeitos',
      () => st().audio.sfx,
      (v) => ((st().audio.sfx = v), apply()),
      0,
      1,
      0.05,
      pct,
    ),
    check(
      'Silenciar tudo',
      () => st().audio.muted,
      (v) => ((st().audio.muted = v), apply()),
    ),
  ]);
  sections.controls = mk([
    slider(
      'Sensibilidade do mouse',
      () => st().controls.mouseSensitivity,
      (v) => ((st().controls.mouseSensitivity = v), apply()),
      0.2,
      3,
      0.1,
      (v) => v.toFixed(1),
    ),
    check(
      'Travar o ponteiro do mouse no jogo',
      () => st().controls.pointerLock,
      (v) => ((st().controls.pointerLock = v), apply()),
    ),
    select(
      'Assistência de mira',
      () => st().controls.aimAssist,
      (v) => ((st().controls.aimAssist = v), apply()),
      [
        ['off', 'Desligada'],
        ['low', 'Baixa'],
        ['high', 'Alta'],
      ],
    ),
    check(
      'Mostrar dicas',
      () => st().controls.hints,
      (v) => ((st().controls.hints = v), apply()),
    ),
  ]);
  sections.graphics = mk([
    select(
      'Qualidade gráfica',
      () => st().graphics.quality,
      (v) => ((st().graphics.quality = v), apply()),
      [
        ['auto', 'Automática'],
        ['low', 'Baixa'],
        ['medium', 'Média'],
        ['high', 'Alta'],
      ],
    ),
    slider(
      'Escala de resolução',
      () => st().graphics.renderScale,
      (v) => ((st().graphics.renderScale = v), apply()),
      0.5,
      1,
      0.05,
      pct,
    ),
    slider(
      'Tremor de tela',
      () => st().graphics.screenShake,
      (v) => ((st().graphics.screenShake = v), apply()),
      0,
      1.5,
      0.1,
      pct,
    ),
    check(
      'Números de dano',
      () => st().graphics.damageNumbers,
      (v) => ((st().graphics.damageNumbers = v), apply()),
    ),
    check(
      'Mostrar FPS',
      () => st().graphics.showFps,
      (v) => ((st().graphics.showFps = v), apply()),
    ),
  ]);
  const confirmBox = el('div', { class: 'row-btns' });
  const wipeBtn = el(
    'button',
    {
      class: 'btn small danger',
      data: { nav: '' },
      onclick: () => {
        confirmBox.innerHTML = '';
        confirmBox.append(
          el('span', {}, 'Apagar TODO o progresso? '),
          el(
            'button',
            {
              class: 'btn small danger',
              data: { nav: '' },
              onclick: () => {
                host.profile.wipe();
                confirmBox.innerHTML = '<span class="muted">Progresso apagado.</span>';
              },
            },
            'Sim, apagar',
          ),
          el(
            'button',
            { class: 'btn small', data: { nav: '' }, onclick: () => (confirmBox.innerHTML = '') },
            'Cancelar',
          ),
        );
      },
    },
    'Apagar progresso',
  );
  sections.game = el(
    'div',
    {},
    mk([
      select(
        'Dificuldade',
        () => st().gameplay.difficulty,
        (v) => ((st().gameplay.difficulty = v), apply()),
        [
          ['easy', 'Fácil'],
          ['normal', 'Normal'],
          ['hard', 'Difícil'],
        ],
      ),
    ]),
    el(
      'div',
      { style: 'margin-top:16px' },
      host.inGame ? el('span', { class: 'muted' }, 'A dificuldade vale a partir da próxima fase.') : wipeBtn,
    ),
    confirmBox,
  );

  const names: Record<string, string> = {
    audio: 'Áudio',
    controls: 'Controles',
    graphics: 'Gráficos',
    game: 'Jogo',
  };
  const body = el('div', { class: 'panel' });
  const tabs = el('div', { class: 'tabs' });
  const show = (k: string) => {
    body.innerHTML = '';
    body.appendChild(sections[k]!);
    for (const b of tabs.children) b.classList.toggle('on', (b as HTMLElement).dataset.k === k);
  };
  for (const k of Object.keys(sections))
    tabs.appendChild(el('button', { class: 'btn', data: { nav: '', k }, onclick: () => show(k) }, names[k]!));
  show('audio');
  const e = el(
    'div',
    { class: 'screen dim' },
    el('h2', {}, 'CONFIGURAÇÕES'),
    tabs,
    body,
    el('button', { class: 'btn', onclick: () => host.screens.pop(), data: { nav: '' } }, 'Voltar'),
  );
  return {
    el: e,
    id: 'settings',
    onBack: () => {
      host.screens.pop();
      return true;
    },
  };
}
