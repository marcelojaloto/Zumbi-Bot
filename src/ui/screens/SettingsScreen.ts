import { el } from '../dom';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';
import type { LanguageChoice, SettingsV1 } from '../../save/schema';
import { dec, t } from '../../i18n';

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

export function settingsScreen(host: UiHost, tab = 'audio'): Screen {
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
      t('Volume geral'),
      () => st().audio.master,
      (v) => ((st().audio.master = v), apply()),
      0,
      1,
      0.05,
      pct,
    ),
    slider(
      t('Música'),
      () => st().audio.music,
      (v) => ((st().audio.music = v), apply()),
      0,
      1,
      0.05,
      pct,
    ),
    slider(
      t('Efeitos'),
      () => st().audio.sfx,
      (v) => ((st().audio.sfx = v), apply()),
      0,
      1,
      0.05,
      pct,
    ),
    check(
      t('Silenciar tudo'),
      () => st().audio.muted,
      (v) => ((st().audio.muted = v), apply()),
    ),
  ]);
  sections.controls = mk([
    slider(
      t('Sensibilidade do mouse'),
      () => st().controls.mouseSensitivity,
      (v) => ((st().controls.mouseSensitivity = v), apply()),
      0.2,
      3,
      0.1,
      (v) => dec(v),
    ),
    check(
      t('Travar o ponteiro do mouse no jogo'),
      () => st().controls.pointerLock,
      (v) => ((st().controls.pointerLock = v), apply()),
    ),
    select(
      t('Assistência de mira'),
      () => st().controls.aimAssist,
      (v) => ((st().controls.aimAssist = v), apply()),
      [
        ['off', t('Desligada')],
        ['low', t('Baixa')],
        ['high', t('Alta')],
      ],
    ),
    check(
      t('Mostrar dicas'),
      () => st().controls.hints,
      (v) => ((st().controls.hints = v), apply()),
    ),
    select(
      t('Controles de toque'),
      () => st().controls.touch.mode,
      (v) => ((st().controls.touch.mode = v), apply()),
      [
        ['auto', t('Automático (celular e tablet)')],
        ['on', t('Sempre')],
        ['off', t('Nunca')],
      ],
    ),
    slider(
      t('Tamanho dos controles de toque'),
      () => st().controls.touch.size,
      (v) => ((st().controls.touch.size = v), apply()),
      0.7,
      1.4,
      0.05,
      pct,
    ),
    slider(
      t('Opacidade dos controles de toque'),
      () => st().controls.touch.opacity,
      (v) => ((st().controls.touch.opacity = v), apply()),
      0.15,
      0.8,
      0.05,
      pct,
    ),
    check(
      t('Vibrar ao tocar'),
      () => st().controls.touch.haptics,
      (v) => ((st().controls.touch.haptics = v), apply()),
    ),
  ]);
  sections.graphics = mk([
    select(
      t('Qualidade gráfica'),
      () => st().graphics.quality,
      (v) => ((st().graphics.quality = v), apply()),
      [
        ['auto', t('Automática')],
        ['low', t('Baixa')],
        ['medium', t('Média')],
        ['high', t('Alta')],
      ],
    ),
    slider(
      t('Escala de resolução'),
      () => st().graphics.renderScale,
      (v) => ((st().graphics.renderScale = v), apply()),
      0.5,
      1,
      0.05,
      pct,
    ),
    slider(
      t('Tremor de tela'),
      () => st().graphics.screenShake,
      (v) => ((st().graphics.screenShake = v), apply()),
      0,
      1.5,
      0.1,
      pct,
    ),
    check(
      t('Números de dano'),
      () => st().graphics.damageNumbers,
      (v) => ((st().graphics.damageNumbers = v), apply()),
    ),
    check(
      t('Mostrar FPS'),
      () => st().graphics.showFps,
      (v) => ((st().graphics.showFps = v), apply()),
    ),
    check(
      t('Reduzir clarões (acessibilidade)'),
      () => st().graphics.reduceFlashes,
      (v) => ((st().graphics.reduceFlashes = v), apply()),
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
          el('span', {}, t('Apagar TODO o progresso?') + ' '),
          el(
            'button',
            {
              class: 'btn small danger',
              data: { nav: '' },
              onclick: () => {
                host.profile.wipe();
                confirmBox.innerHTML = '';
                confirmBox.appendChild(el('span', { class: 'muted' }, t('Progresso apagado.')));
              },
            },
            t('Sim, apagar'),
          ),
          el(
            'button',
            { class: 'btn small', data: { nav: '' }, onclick: () => (confirmBox.innerHTML = '') },
            t('Cancelar'),
          ),
        );
      },
    },
    t('Apagar progresso'),
  );
  sections.game = el(
    'div',
    {},
    mk([
      select<LanguageChoice>(
        'Idioma / Language',
        () => st().language,
        (v) => {
          st().language = v;
          apply();
          host.relocalize();
        },
        [
          ['auto', 'Automático / Auto'],
          ['pt', 'Português'],
          ['en', 'English'],
        ],
      ),
      select(
        t('Dificuldade'),
        () => st().gameplay.difficulty,
        (v) => ((st().gameplay.difficulty = v), apply()),
        [
          ['veryEasy', t('Muito fácil')],
          ['easy', t('Fácil')],
          ['normal', t('Normal')],
          ['hard', t('Difícil')],
        ],
      ),
    ]),
    el(
      'div',
      { style: 'margin-top:16px' },
      host.inGame
        ? el('span', { class: 'muted' }, t('A dificuldade vale a partir da próxima fase.'))
        : wipeBtn,
    ),
    confirmBox,
  );

  const names: Record<string, string> = {
    audio: t('Áudio'),
    controls: t('Controles'),
    graphics: t('Gráficos'),
    game: t('Jogo'),
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
  show(sections[tab] ? tab : 'audio');
  const e = el(
    'div',
    { class: 'screen dim' },
    el('h2', {}, t('CONFIGURAÇÕES')),
    tabs,
    body,
    el('button', { class: 'btn', onclick: () => host.screens.pop(), data: { nav: '' } }, t('Voltar')),
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
