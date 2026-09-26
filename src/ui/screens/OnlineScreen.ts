import { CHARACTERS, CHARACTER_ORDER } from '../../data/characters';
import { DIFFICULTY_ORDER } from '../../data/balance';
import { MAPS, getMap } from '../../data/maps';
import type { Difficulty } from '../../data/types';
import { SLOT_COLORS, playerTag } from '../../app/party';
import { isAndroid, isIOS } from '../../input/device';
import { cleanCode, type RoomOptions, type RoomPlayer } from '../../net/protocol';
import { defaultSave } from '../../save/schema';
import type { GuestRoom, HostRoom } from '../../net/room';
import { NetError } from '../../net/transport';
import type { MicProblem, VoiceChat } from '../../net/voice';
import { MAX_PLAYERS } from '../../sim/Entity';
import { difficultyName } from '../difficulty';
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
  /** Avisos do chat de voz (microfone, quem fala, permissão). */
  readonly voiceListeners: Set<() => void>;
  /** Chat de voz da sala (null: voz desligada na sala ou indisponível aqui). */
  readonly voice: VoiceChat | null;
  /** Este aparelho consegue participar do chat de voz. */
  readonly voiceSupported: boolean;
  toggleMic(on?: boolean): Promise<boolean>;
  createRoom(opts: RoomOptions): Promise<HostRoom>;
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

/** Como liberar o microfone neste aparelho (app Android, iPhone, Android no navegador, computador). */
export function micHelp(): string {
  if (__NATIVE__)
    return t(
      'Para liberar: Configurações do Android → Apps → Zumbi Bot → Permissões → Microfone → Permitir.',
    );
  if (isIOS())
    return t(
      'Para liberar no iPhone: toque em "aA" na barra de endereço → Ajustes do Site → Microfone → Permitir (ou Ajustes → Apps → Safari → Microfone) e recarregue a página.',
    );
  if (isAndroid())
    return t(
      'Para liberar: toque no ícone ao lado do endereço → Permissões → Microfone → Permitir, e recarregue a página.',
    );
  return t(
    'Para liberar: clique no ícone ao lado do endereço do site → Microfone → Permitir, e recarregue a página.',
  );
}

/** Por que o microfone não ligou, e o que fazer. */
export function micProblemText(p: MicProblem | null): string {
  switch (p) {
    case 'denied':
      return `${t('O microfone está bloqueado.')} ${micHelp()}`;
    case 'no-mic':
      return t('Nenhum microfone encontrado neste aparelho.');
    case 'busy':
      return t('O microfone está sendo usado por outro app. Feche o outro app e tente de novo.');
    case 'insecure':
      return t('O navegador só libera o microfone em páginas seguras (https).');
    case 'unsupported':
      return t(
        'Este navegador não deixa usar o microfone. Use o Chrome, Edge, Firefox ou Safari atualizados.',
      );
    default:
      return t('Não deu para ligar o microfone. Tente de novo.');
  }
}

/** Linha de ajuda do chat de voz na sala (permissão checada antes de pedir). */
function voiceStatus(host: OnlineHost): string {
  const r = host.online;
  if (!r) return '';
  if (!r.voice)
    return r.role === 'host'
      ? t('Chat de voz desligado nesta sala.')
      : t('Chat de voz desligado pelo anfitrião.');
  const v = host.voice;
  if (!v) return t('Chat de voz indisponível neste aparelho ou navegador. Você joga normalmente.');
  if (v.starting) return t('Toque em "Permitir" quando o aparelho pedir o microfone.');
  if (v.micOn) return t('Microfone ligado: todos da sala ouvem você.');
  if (v.problem) return micProblemText(v.problem);
  if (v.permission === 'denied') return micProblemText('denied');
  if (v.permission === 'prompt')
    return t(
      'Todos da sala se ouvem. Para falar, ligue o microfone (o aparelho pede permissão na primeira vez).',
    );
  return t('Todos da sala se ouvem. Ligue o microfone para falar.');
}

function levelLabel(mapId: string, levelIdx: number): string {
  const m = getMap(mapId);
  const l = m.levels[levelIdx];
  const map = m.index >= 0 ? `${m.index + 1}. ${t(m.name)}` : t(m.name);
  return m.levels.length > 1 && l ? `${map} — ${levelIdx + 1}. ${t(l.name)}` : map;
}

/** Tela "Jogar online": criar uma sala ou entrar na sala de um amigo. */
export function onlineScreen(host: OnlineHost, notice?: string): Screen {
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
        () => host.screens.push(createRoomScreen(host)),
        'primary',
      ),
      choice(
        '🔑',
        t('Entrar numa sala'),
        t('Um amigo criou a sala? Digite o código que aparece na tela dele.'),
        () => host.openJoin(),
      ),
    ),
    el(
      'p',
      { class: 'muted online-note' },
      t('Precisa de internet. Cada um guarda o próprio progresso (nível, armas e itens) no seu aparelho.'),
    ),
    el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
  );
  return { el: e, id: 'online' };
}

/** Botões de escolha única (um aceso). */
function segmented<T>(options: [T, string][], get: () => T, set: (v: T) => void): HTMLElement {
  const btns = options.map(([v, label]) =>
    el(
      'button',
      {
        class: 'seg-btn',
        data: { nav: '' },
        onclick: () => {
          set(v);
          refresh();
        },
      },
      label,
    ),
  );
  const refresh = () =>
    btns.forEach((b, i) => {
      const on = options[i]![0] === get();
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
  refresh();
  return el('div', { class: 'seg', role: 'group' }, ...btns);
}

/** Antes de criar a sala: dificuldade da partida e se o chat de voz é permitido (dá para mudar depois). */
export function createRoomScreen(host: OnlineHost): Screen {
  let difficulty: Difficulty = host.profile.settings.gameplay.difficulty;
  let voice = true;
  const status = el('p', { class: 'online-status' });
  const go = el('button', { class: 'btn primary', data: { nav: '' } }, `🏠 ${t('Criar sala')}`);
  let busy = false;
  go.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    go.disabled = true;
    status.className = 'online-status';
    status.textContent = t('Criando a sala…');
    host
      .createRoom({ difficulty, voice })
      .then(
        () => host.showRoom(),
        (e: unknown) => {
          status.className = 'online-status error';
          status.textContent = netErrorText(e);
        },
      )
      .finally(() => {
        busy = false;
        go.disabled = false;
      });
  });
  const e = el(
    'div',
    { class: 'screen dim online create-room' },
    el('h2', {}, t('CRIAR SALA')),
    el('p', { class: 'subtitle' }, t('Escolha como vai ser a partida. Dá para mudar depois, na sala.')),
    el(
      'div',
      { class: 'panel room-opts' },
      el('div', { class: 'opt-label' }, t('Dificuldade')),
      segmented(
        DIFFICULTY_ORDER.map((d) => [d, difficultyName(d)]),
        () => difficulty,
        (d) => (difficulty = d),
      ),
      el('div', { class: 'opt-label' }, t('Chat de voz')),
      segmented(
        [
          [true, `🎤 ${t('Permitido')}`],
          [false, `🔇 ${t('Desligado')}`],
        ],
        () => voice,
        (v) => (voice = v),
      ),
      el(
        'p',
        { class: 'muted opt-note' },
        t('Com o chat de voz, todos da sala conversam juntos. Cada um liga ou desliga o próprio microfone.'),
        host.voiceSupported ? null : el('br'),
        host.voiceSupported
          ? null
          : t('Este aparelho não tem chat de voz, mas os outros jogadores podem conversar entre si.'),
      ),
    ),
    status,
    el(
      'div',
      { class: 'row-btns' },
      el('button', { class: 'btn', data: { nav: '' }, onclick: () => host.screens.pop() }, t('Voltar')),
      go,
    ),
  );
  return { el: e, id: 'create-room' };
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

  // opções da sala: o anfitrião muda, os outros só veem
  const arrow = (text: string, title: string, fn: () => void) =>
    el('button', { class: 'lc-arrow', title, data: { nav: '' }, onclick: fn }, text);
  const diffVal = el('b');
  const diffLine = el(
    'div',
    { class: 'room-level room-diff' },
    el('span', { class: 'muted' }, `${t('Dificuldade')}: `),
    ...(isHost
      ? [
          arrow('◀', t('Anterior'), () => cycleDiff(-1)),
          diffVal,
          arrow('▶', t('Próximo'), () => cycleDiff(1)),
        ]
      : [diffVal]),
  );
  const voiceVal = isHost
    ? el('button', {
        class: 'btn small voice-allow',
        data: { nav: '' },
        onclick: () => {
          const r = host.online;
          if (r?.role !== 'host') return;
          host.playUi('ui_click');
          r.setOptions({ voice: !r.voice });
        },
      })
    : el('b');
  const voiceLine = el(
    'div',
    { class: 'room-level room-voice-opt' },
    el('span', { class: 'muted' }, `${t('Chat de voz')}: `),
    voiceVal,
  );
  const cycleDiff = (dir: number) => {
    const r = host.online;
    if (r?.role !== 'host') return;
    const n = DIFFICULTY_ORDER.length;
    const i = DIFFICULTY_ORDER.indexOf(r.difficulty);
    host.playUi('ui_hover');
    r.setOptions({ difficulty: DIFFICULTY_ORDER[(((i + dir) % n) + n) % n]! });
  };

  // chat de voz: microfone, ajuda (permissão) e "toque para ouvir"
  const micBtn = el('button', {
    class: 'btn mic-btn',
    data: { nav: '' },
    onclick: () => void host.toggleMic(),
  });
  const voiceText = el('span', { class: 'room-voice-text' });
  const hearBtn = el(
    'button',
    { class: 'btn small hear-btn', hidden: true, data: { nav: '' }, onclick: () => host.voice?.unlock() },
    `🔈 ${t('Toque para ouvir a conversa')}`,
  );
  const voiceBar = el('div', { class: 'room-voice' }, voiceText, hearBtn);

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
    const mic = el('span', { class: 'rp-mic' });
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
      mic,
      el('span', { class: 'rp-char', style: `color:${hexColor(c.color)}` }, t(c.name)),
      state,
    );
  }

  /** Só o que muda com a voz (quem fala, microfones, botão): não refaz a tela toda. */
  function renderVoice(): void {
    const r = host.online;
    if (!r) return;
    const v = host.voice;
    for (const p of players()) {
      const rowEl = list.querySelector<HTMLElement>(`.rp[data-slot="${p.slot}"]`);
      const m = rowEl?.querySelector<HTMLElement>('.rp-mic');
      if (!rowEl || !m) continue;
      const talking = !!(r.voice && p.mic && v?.speaking(p.slot));
      m.textContent = !r.voice ? '' : talking ? '🔊' : p.mic ? '🎤' : '🔇';
      m.title = p.mic ? t('Microfone ligado') : t('Microfone mudo');
      m.classList.toggle('off', !p.mic);
      rowEl.classList.toggle('talking', talking);
    }
    micBtn.hidden = !(r.voice && v);
    if (v) {
      micBtn.textContent = v.starting
        ? `🎤 ${t('Ligando…')}`
        : v.micOn
          ? `🔇 ${t('Desligar microfone')}`
          : `🎤 ${t('Ligar microfone')}`;
      micBtn.classList.toggle('on', v.micOn);
      micBtn.classList.toggle('talking', v.micOn && v.speaking(mySlot()));
      micBtn.disabled = v.starting;
    }
    const text = voiceStatus(host);
    if (voiceText.textContent !== text) voiceText.textContent = text;
    voiceBar.classList.toggle('error', !!v && !v.micOn && (!!v.problem || v.permission === 'denied'));
    hearBtn.hidden = !(r.voice && v?.blocked);
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
    diffVal.textContent = difficultyName(r.difficulty);
    voiceVal.textContent = r.voice ? `🎤 ${t('Permitido')}` : `🔇 ${t('Desligado')}`;
    voiceVal.classList.toggle('on', r.voice);
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
    renderVoice();
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
        el('div', { class: 'room-opts-box' }, diffLine, voiceLine),
      ),
      el('div', { class: 'room-side' }, list, el('div', { class: 'panel' }, mine, stageText)),
    ),
    status,
    voiceBar,
    el(
      'div',
      { class: 'row-btns' },
      el(
        'button',
        { class: 'btn danger', data: { nav: '' }, onclick: leave },
        isHost ? t('Fechar sala') : t('Sair da sala'),
      ),
      micBtn,
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
      host.voiceListeners.add(renderVoice);
      lastChar = '';
      render();
    },
    onHide: () => {
      host.roomListeners.delete(render);
      host.voiceListeners.delete(renderVoice);
    },
    onBack: () => {
      leave();
      return true;
    },
  };
}
