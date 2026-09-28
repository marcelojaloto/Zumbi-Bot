import { CHARACTERS } from '../../data/characters';
import { ENDING_CHAPTERS, type EndingChapter } from '../../render/EndingScene';
import { el, hexColor } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { UiHost } from './host';

/** O que o final lendário precisa do aplicativo (o mini cenário 3D de cada capítulo). */
export interface EndingHost extends UiHost {
  /** Monta o cenário do capítulo (desfaz o anterior). */
  endingChapter(c: EndingChapter): void;
}

const EPILOGUE =
  'Cinco heróis que ninguém imaginava juntos — um robô, uma maga, um soldado, um ciborgue e um mutante — provaram que máquinas, magia e gente podem viver em paz. A revolução acabou. O que começa agora é um mundo novo.';

/** Texto de um capítulo: título, nome e o final feliz. */
function chapterText(c: EndingChapter): { color: string; title: string; name: string; text: string } {
  if (c === 'all')
    return { color: '#ffd23a', title: t('Juntos'), name: t('Um mundo novo'), text: t(EPILOGUE) };
  const d = CHARACTERS[c];
  return {
    color: hexColor(d.color),
    title: `${d.secret ? '🔓 ' : ''}${t(d.name)} — ${t(d.ending.title)}`,
    // o secreto é liberado bem aqui
    name: d.secret ? `${d.fullName} • ${t('Personagem secreto liberado!')}` : d.fullName,
    text: t(d.ending.text),
  };
}

/**
 * Final lendário: depois do OMEGA-Z, um capítulo por personagem contando o final feliz dele, cada um num mini
 * cenário animado, e o epílogo com todos juntos. Passa sozinho (dá tempo de ler) ou em "Próximo"; "Pular" vai
 * direto para o fim.
 */
export function endingScreen(host: EndingHost, opts: { onDone: () => void }): Screen {
  let idx = -1;
  let timer = 0;
  let wait = 12;
  let done = false;
  const head = el('div', { class: 'end-head' });
  const name = el('div', { class: 'end-name' });
  const text = el('p', { class: 'end-text' });
  const bar = el('i');
  const dots = el('div', { class: 'end-dots' });
  const next = el('button', { class: 'btn primary', data: { nav: '', autofocus: '' } });
  const finish = () => {
    if (done) return;
    done = true;
    opts.onDone();
  };
  const show = (i: number) => {
    if (i >= ENDING_CHAPTERS.length) return finish();
    idx = i;
    const c = ENDING_CHAPTERS[i]!;
    host.endingChapter(c);
    const x = chapterText(c);
    box.style.setProperty('--cc', x.color);
    head.textContent = x.title;
    name.textContent = x.name;
    text.textContent = x.text;
    // tempo para ler (e ver o cenário) antes de passar sozinho
    wait = Math.max(11, x.text.length * 0.065);
    timer = 0;
    box.classList.remove('in');
    void box.offsetWidth;
    box.classList.add('in');
    dots.replaceChildren(
      ...ENDING_CHAPTERS.map((_, k) => el('span', { class: k === i ? 'on' : k < i ? 'seen' : '' })),
    );
    next.textContent = i === ENDING_CHAPTERS.length - 1 ? `${t('Fim')} ▶` : `${t('Próximo')} ▶`;
  };
  next.addEventListener('click', () => {
    host.playUi('ui_click');
    show(idx + 1);
  });
  const box = el(
    'div',
    { class: 'end-box' },
    head,
    name,
    text,
    el('div', { class: 'end-bar' }, bar),
    el(
      'div',
      { class: 'end-foot' },
      dots,
      el(
        'div',
        { class: 'row-btns' },
        el('button', { class: 'btn small', data: { nav: '' }, onclick: finish }, t('Pular')),
        next,
      ),
    ),
  );
  const e = el(
    'div',
    { class: 'screen ending' },
    el('div', { class: 'end-top' }, el('h2', {}, t('FINAL LENDÁRIO'))),
    box,
  );
  return {
    el: e,
    id: 'ending',
    onShow: () => {
      if (idx < 0) show(0);
    },
    onBack: () => {
      finish();
      return true;
    },
    onKey: (code) => {
      if (code === 'ArrowRight' || code === 'KeyD') {
        show(idx + 1);
        return true;
      }
      return false;
    },
    update: (dt) => {
      if (done || idx < 0) return;
      timer += dt;
      bar.style.width = `${Math.min(100, (timer / wait) * 100)}%`;
      if (timer >= wait) show(idx + 1);
    },
  };
}
