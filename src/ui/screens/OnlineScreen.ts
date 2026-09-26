import { CHARACTERS, CHARACTER_ORDER } from '../../data/characters';
import { MAPS, getMap } from '../../data/maps';
import { SLOT_COLORS, playerTag } from '../../app/party';
import { cleanCode, type RoomPlayer } from '../../net/protocol';
import { defaultSave } from '../../save/schema';
import type { GuestRoom, HostRoom } from '../../net/room';
import { NetError } from '../../net/transport';
import { MAX_PLAYERS } from '../../sim/Entity';
import { el, hexColor } from '../dom';
import { t } from '../../i18n';
import type { Screen } from '../ScreenManager';
import type { LobbyHost } from './LobbyScreen';

const DEFAULT_NAME = defaultSave().profile.name;

/** O que as telas do jogo online precisam do aplicativo. */
export interface OnlineHost extends LobbyHost {
  readonly online: HostRoom | GuestRoom | null;
  /** Avisos de mudança na sala (quem entrou, personagem, pronto...). */
  readonly roomListeners: Set<() => void>;
  createRoom(): Promise<HostRoom>;
  joinRoom(code: string): Promise<GuestRoom>;
  leaveRoom(): void;
  startOnline(): void;
  showRoom(): void;
  openJoin(code?: string): void;
  roomLink(code: string): string;
}

/** Mensagem simples para cada problema de conexão. */
export function netErrorText(e: unknown): string {
  const kind = e instanceof NetError ? e.kind : 'server';
  switch (kind) {
    case 'offline':
      return t('Sem internet. Conecte-se e tente de novo.');
    case 'not-found':
      return t(
        'Não existe sala com esse código. Confira as letras — a sala precisa estar aberta na tela de quem criou.',
      );
    case 'full':
      return t('Essa sala já está cheia (5 jogadores).');
    case 'started':
      return t('A partida dessa sala já começou. Espere a fase acabar e tente de novo.');
    case 'version':
      return t('Vocês estão com versões diferentes do jogo. Atualizem a página (ou o app) e tentem de novo.');
    case 'blocked':
      return t(
        'A rede não deixou os aparelhos se conectarem. Tente outra rede (por exemplo, os dados do celular).',
      );
    case 'timeout':
      return t('Demorou demais para conectar. Tente de novo.');
    case 'unsupported':
      return t(
        'Este navegador não tem suporte a jogo online. Use o Chrome, Edge, Firefox ou Safari atualizados.',
      );
    case 'lost':
      return t('A conexão caiu. Tente de novo.');
    default:
      return t('Não deu para falar com o serviço de conexão. Tente de novo daqui a pouco.');
  }
}

/** Nome na sala: o nome padrão do perfil vira "Jogador N" (senão todos seriam "Zumbi Bot"). */
export function roomName(name: string, slot: number): string {
  return name === DEFAULT_NAME ? t('Jogador {n}', { n: slot + 1 }) : name;
}

function levelLabel(mapId: string, levelIdx: number): string {
  const m = getMap(mapId);
  const l = m.levels[levelIdx];
  const map = m.index >= 0 ? `${m.index + 1}. ${t(m.name)}` : t(m.name);
  return m.levels.length > 1 && l ? `${map} — ${levelIdx + 1}. ${t(l.name)}` : map;
}

/** Tela "Jogar online": criar uma sala ou entrar na sala de um amigo. */
export function onlineScreen(host: OnlineHost, notice?: string): Screen {
  const status = el('p', { class: 'online-status' });
  let busy = false;
  const create = async () => {
    if (busy) return;
    busy = true;
    status.className = 'online-status';
    status.textContent = t('Criando a sala…');
    try {
      await host.createRoom();
      busy = false;
      status.textContent = '';
      host.showRoom();
    } catch (e) {
      busy = false;
      status.className = 'online-status error';
      status.textContent = netErrorText(e);
    }
  };
  const choice = (icon: string, title: string, desc: string, fn: () => void, cls = '') =>
    el(
      'button',
      { class: `online-choice ${cls}`, onclick: fn, data: { nav: '' } },
      el('span', { class: 'oc-icon' }, icon),
      el('b', {}, title),
      el('span', { class: 'oc-desc' }, desc),
    );
  const e = el(
    'div',
    { class: 'screen dim online' },
    el('h2', {}, t('JOGAR ONLINE')),
    el('p', { class: 'subtitle' }, t('Jogue com até 4 amigos, cada um no seu celular ou computador.')),
    notice ? el('p', { class: 'online-status error' }, notice) : null,
    el(
      'div',
      { class: 'online-choices' },
      choice(
        '🏠',
        t('Criar sala'),
        t('Você recebe um código de 4 letras para passar aos amigos.'),
        () => void create(),
        'primary',
      ),
      choice(
        '🔑',
        t('Entrar numa sala'),
        t('Um amigo criou a sala? Digite o código que aparece na tela dele.'),
        () => host.openJoin(),
      ),
    ),
    status,
    el(
      'p',
      { class: 'muted online-note' },
      t('Precisa de internet. Cada um guarda o próprio progresso (nível, armas e itens) no seu aparelho.'),
    ),
    el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
  );
  return { el: e, id: 'online' };
}

/** Digitar o código da sala (4 letras). */
export function joinScreen(host: OnlineHost, prefill?: string): Screen {
  const input = el('input', {
    type: 'text',
    class: 'code-input',
    maxLength: 4,
    placeholder: 'ABCD',
    autocomplete: 'off',
    spellcheck: false,
    value: (prefill ?? '').toUpperCase().slice(0, 4),
    data: { nav: '', autofocus: '' },
  });
  input.setAttribute('autocapitalize', 'characters');
  input.setAttribute('aria-label', t('Código da sala'));
  const status = el('p', { class: 'online-status' });
  const go = el('button', { class: 'btn primary', data: { nav: '' } }, t('Entrar'));
  let busy = false;
  const refresh = () => {
    const pos = input.selectionStart;
    input.value = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    if (pos !== null) input.setSelectionRange(pos, pos);
    go.disabled = busy || !cleanCode(input.value);
  };
  const join = async () => {
    const code = cleanCode(input.value);
    if (!code || busy) {
      if (!code) {
        status.className = 'online-status error';
        status.textContent = t('O código tem 4 letras.');
      }
      return;
    }
    busy = true;
    refresh();
    status.className = 'online-status';
    status.textContent = t('Procurando a sala {code}…', { code });
    try {
      await host.joinRoom(code);
      busy = false;
      host.showRoom();
    } catch (e) {
      busy = false;
      refresh();
      status.className = 'online-status error';
      status.textContent = netErrorText(e);
    }
  };
  input.addEventListener('input', () => {
    status.textContent = '';
    refresh();
  });
  go.addEventListener('click', () => void join());
  refresh();
  const e = el(
    'div',
    { class: 'screen dim online' },
    el('h2', {}, t('ENTRAR NUMA SALA')),
    el(
      'p',
      { class: 'subtitle' },
      t('Digite o código de 4 letras que aparece na tela de quem criou a sala.'),
    ),
    el('div', { class: 'join-row' }, input, go),
    status,
    el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
  );
  return {
    el: e,
    id: 'join',
    onKey: (code) => {
      if (code === 'Enter' || code === 'NumpadEnter') {
        void join();
        return true;
      }
      return false;
    },
    onShow: () => {
      // veio de um link: já tenta entrar
      if (prefill && cleanCode(input.value) && !busy) void join();
      prefill = undefined;
    },
  };
}

/** Anfitrião: fases que ele já liberou (a sala joga uma delas). */
function unlockedTargets(host: OnlineHost): { mapId: string; levelIdx: number }[] {
  const out: { mapId: string; levelIdx: number }[] = [];
  for (const m of MAPS)
    m.levels.forEach((l, i) => {
      if (host.profile.isLevelUnlocked(l.id)) out.push({ mapId: m.id, levelIdx: i });
    });
  return out;
}

/**
 * A sala: código grande, passo a passo, quem já entrou, escolha do personagem e começar (anfitrião) ou ficar
 * pronto (quem entrou). Atualiza sozinha quando alguém entra, sai, troca de personagem ou fica pronto.
 */
export function roomScreen(host: OnlineHost): Screen {
  const room = host.online;
  const isHost = room?.role === 'host';
  const code = room?.code ?? '';
  const link = code ? host.roomLink(code) : '';

  const list = el('div', { class: 'room-players' });
  const mine = el('div', { class: 'room-me' });
  const stageText = el('div', { class: 'room-level' });
  const status = el('p', { class: 'room-status' });
  const mainBtn = el('button', { class: 'btn primary', data: { nav: '' } });
  let lastChar = '';

  const players = (): RoomPlayer[] => {
    const r = host.online;
    return r ? (r.role === 'host' ? r.players() : r.players) : [];
  };
  const mySlot = () => (host.online?.role === 'guest' ? host.online.slot : 0);
  const me = () => players().find((p) => p.slot === mySlot());

  const setChar = (dir: number) => {
    const r = host.online;
    const p = me();
    if (!r || !p || (r.role === 'guest' && p.ready)) return;
    const n = CHARACTER_ORDER.length;
    const c = CHARACTER_ORDER[(((CHARACTER_ORDER.indexOf(p.char) + dir) % n) + n) % n]!;
    host.profile.setCharacter(c);
    host.playUi('ui_hover');
    if (r.role === 'host') r.setMyCharacter(c);
    else r.pick(c, false);
  };

  function row(i: number, p: RoomPlayer | undefined): HTMLElement {
    const color = SLOT_COLORS[i]!;
    const tag = el('b', { class: 'rp-tag', style: `color:${color}` }, playerTag(i));
    if (!p)
      return el(
        'div',
        { class: 'rp empty', style: `--pc:${color}` },
        tag,
        el('span', { class: 'muted' }, t('Vaga livre — esperando alguém entrar…')),
      );
    const c = CHARACTERS[p.char];
    const you = p.slot === mySlot();
    const state =
      p.slot === 0
        ? el('span', { class: 'rp-state host' }, `👑 ${t('Anfitrião')}`)
        : p.ready
          ? el('span', { class: 'rp-state ok' }, `✓ ${t('Pronto')}`)
          : el('span', { class: 'rp-state wait' }, t('Escolhendo…'));
    return el(
      'div',
      { class: `rp${you ? ' you' : ''}`, style: `--pc:${color}`, data: { slot: String(p.slot) } },
      tag,
      el(
        'span',
        { class: 'rp-name' },
        roomName(p.name, p.slot) + (you ? ` (${t('você')})` : ''),
        el('small', { class: 'muted' }, ` · ${t('Nv {n}', { n: p.level })}`),
      ),
      el('span', { class: 'rp-char', style: `color:${hexColor(c.color)}` }, t(c.name)),
      state,
    );
  }

  function render(): void {
    const r = host.online;
    if (!r) return;
    const ps = players();
    list.replaceChildren(
      ...Array.from({ length: MAX_PLAYERS }, (_, i) =>
        row(
          i,
          ps.find((p) => p.slot === i),
        ),
      ),
    );
    const p = me();
    if (p) {
      const c = CHARACTERS[p.char];
      const locked = r.role === 'guest' && p.ready;
      mine.style.setProperty('--cc', hexColor(c.color));
      mine.replaceChildren(
        el('div', { class: 'muted' }, t('Seu personagem')),
        el(
          'div',
          { class: 'lc-pick' },
          el(
            'button',
            {
              class: 'lc-arrow',
              title: t('Anterior'),
              disabled: locked,
              data: { nav: '' },
              onclick: () => setChar(-1),
            },
            '◀',
          ),
          el('div', { class: 'lc-name' }, t(c.name)),
          el(
            'button',
            {
              class: 'lc-arrow',
              title: t('Próximo'),
              disabled: locked,
              data: { nav: '' },
              onclick: () => setChar(1),
            },
            '▶',
          ),
        ),
        el('div', { class: 'ci-title' }, t(c.title)),
        el('div', { class: 'ci-special' }, el('b', {}, t(c.specialName)), el('span', {}, t(c.specialDesc))),
      );
      if (p.char !== lastChar) {
        lastChar = p.char;
        host.previewLineup([p.char]);
      }
    }
    stageText.replaceChildren(
      el('span', { class: 'muted' }, `${t('Fase')}: `),
      ...(r.role === 'host'
        ? [
            el(
              'button',
              { class: 'lc-arrow', title: t('Anterior'), data: { nav: '' }, onclick: () => stage(-1) },
              '◀',
            ),
            el('b', {}, levelLabel(r.mapId, r.levelIdx)),
            el(
              'button',
              { class: 'lc-arrow', title: t('Próximo'), data: { nav: '' }, onclick: () => stage(1) },
              '▶',
            ),
          ]
        : [el('b', {}, r.mapId ? levelLabel(r.mapId, r.levelIdx) : '…')]),
    );
    if (r.role === 'host') {
      const waiting = ps.filter((x) => x.slot !== 0 && !x.ready).map((x) => playerTag(x.slot));
      mainBtn.textContent = `▶ ${t('Começar')}`;
      mainBtn.disabled = !r.allReady();
      status.textContent =
        r.guestCount === 0
          ? t('Esperando os amigos entrarem com o código {code}…', { code })
          : waiting.length
            ? t('Esperando {who} tocar em Pronto…', { who: waiting.join(', ') })
            : t('Todos prontos! Toque em Começar.');
    } else {
      const ready = !!p?.ready;
      mainBtn.textContent = ready ? `✓ ${t('Pronto!')} (${t('toque para mudar')})` : t('Pronto?');
      mainBtn.classList.toggle('on', ready);
      mainBtn.disabled = false;
      status.textContent =
        r.phase === 'lobby'
          ? ready
            ? t('Tudo certo! Esperando o anfitrião (P1) começar a partida…')
            : t('Escolha seu personagem e toque em Pronto.')
          : t('O anfitrião está terminando uma fase. Você entra na próxima!');
    }
  }

  const stage = (dir: number) => {
    const r = host.online;
    if (r?.role !== 'host') return;
    const targets = unlockedTargets(host);
    if (!targets.length) return;
    let i = targets.findIndex((x) => x.mapId === r.mapId && x.levelIdx === r.levelIdx);
    i = (((i < 0 ? 0 : i + dir) % targets.length) + targets.length) % targets.length;
    host.playUi('ui_hover');
    r.setTarget(targets[i]!.mapId, targets[i]!.levelIdx);
  };

  mainBtn.addEventListener('click', () => {
    const r = host.online;
    if (!r) return;
    if (r.role === 'host') {
      if (r.allReady()) host.startOnline();
      return;
    }
    const p = me();
    if (p) r.pick(p.char, !p.ready);
  });

  const leave = () => {
    const r = host.online;
    if (r?.role === 'host' && r.guestCount > 0 && !confirm(t('Fechar a sala? Todos os jogadores vão sair.')))
      return;
    host.leaveRoom();
  };

  // anfitrião: link, compartilhar e QR
  let share: HTMLElement | null = null;
  const qr = el('div', { class: 'room-qr' });
  if (isHost && link) {
    const copy = el('button', { class: 'btn small', data: { nav: '' } }, `📋 ${t('Copiar link')}`);
    copy.addEventListener('click', () => {
      const done = () => (copy.textContent = `✓ ${t('Link copiado!')}`);
      const fallback = () => {
        const ta = el('textarea', { value: link });
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand('copy');
          done();
        } catch {
          /* o link aparece na tela para copiar à mão */
        }
        ta.remove();
      };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(done, fallback);
      else fallback();
    });
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    const shareBtn = nav.share
      ? el(
          'button',
          {
            class: 'btn small',
            data: { nav: '' },
            onclick: () =>
              void nav.share!({
                title: 'Zumbi Bot',
                text: t('Vem jogar Zumbi Bot comigo! Código da sala: {code}', { code }),
                url: link,
              }).catch(() => {}),
          },
          `📤 ${t('Enviar convite')}`,
        )
      : null;
    share = el(
      'div',
      { class: 'room-share' },
      el('div', { class: 'row-btns' }, copy, shareBtn),
      el('div', { class: 'room-link muted' }, link),
    );
    void import('qrcode-generator')
      .then((m) => {
        const q = m.default(0, 'M');
        q.addData(link);
        q.make();
        qr.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
        qr.appendChild(el('span', { class: 'muted' }, t('Ou aponte a câmera do celular aqui')));
      })
      .catch(() => {});
  }

  const steps = isHost
    ? el(
        'ol',
        { class: 'room-steps' },
        el('li', {}, t('Passe o código (ou o link) para os amigos.')),
        el(
          'li',
          {},
          t('Cada um abre o Zumbi Bot, toca em "Jogar online" → "Entrar numa sala" e digita o código.'),
        ),
        el('li', {}, t('Todos escolhem o personagem e tocam em "Pronto". Aí é só tocar em "Começar"!')),
      )
    : el(
        'ol',
        { class: 'room-steps' },
        el('li', {}, t('Escolha seu personagem (◀ ▶).')),
        el('li', {}, t('Toque em "Pronto".')),
        el('li', {}, t('Espere o anfitrião (P1) começar a partida.')),
      );

  const e = el(
    'div',
    { class: 'screen dim room' },
    el(
      'div',
      { class: 'room-top' },
      el('h2', {}, isHost ? t('SUA SALA') : t('VOCÊ ESTÁ NA SALA')),
      el('div', { class: 'room-code', title: t('Código da sala') }, code),
    ),
    el(
      'div',
      { class: 'room-body' },
      el(
        'div',
        { class: 'panel room-info' },
        isHost ? null : el('p', { class: 'room-ok' }, `✅ ${t('Você entrou na sala!')}`),
        steps,
        share,
        isHost ? qr : null,
      ),
      el('div', { class: 'room-side' }, list, el('div', { class: 'panel' }, mine, stageText)),
    ),
    status,
    el(
      'div',
      { class: 'row-btns' },
      el(
        'button',
        { class: 'btn danger', data: { nav: '' }, onclick: leave },
        isHost ? t('Fechar sala') : t('Sair da sala'),
      ),
      mainBtn,
    ),
    el(
      'p',
      { class: 'muted online-note' },
      isHost
        ? t('Deixe o jogo aberto nesta tela durante a partida: é o seu aparelho que conduz o jogo de todos.')
        : t('Seu progresso (nível, armas e itens) fica salvo neste aparelho.'),
    ),
  );
  return {
    el: e,
    id: 'room',
    onShow: () => {
      host.roomListeners.add(render);
      lastChar = '';
      render();
    },
    onHide: () => {
      host.roomListeners.delete(render);
    },
    onBack: () => {
      leave();
      return true;
    },
  };
}
