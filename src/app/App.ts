import { hashString } from '../core/rng';
import { InputManager } from '../input/InputManager';
import { bindingsFrom } from '../input/keymap';
import { actionKeyNames, loadKeyboardLayout, moveKeys } from '../input/keyLabels';
import { TouchControls } from '../input/TouchControls';
import { canFullscreen, deviceKind, isIOS, isPortrait, isStandalone, type DeviceKind } from '../input/device';
import { Renderer } from '../render/Renderer';
import { downgrade, resolveQuality, type QualityLevel } from '../render/quality';
import type { InputSource } from '../sim/InputFrame';
import { GameSession } from './GameSession';
import { ViewportKeeper } from './viewport';
import { GlobalRanking } from '../net/globalRanking';
import { FIREBASE_CONFIG } from '../net/firebaseConfig';
import { readFlags, type UrlFlags } from './urlFlags';
import { installDebug } from './debug';
import { AudioEngine } from '../audio/AudioEngine';
import { AudioDirector } from '../audio/AudioDirector';
import { MusicPlayer } from '../audio/music';
import { WorldOverlay } from '../ui/hud/WorldOverlay';
import { Hud } from '../ui/hud/Hud';
import { ScreenManager } from '../ui/ScreenManager';
import { Profile } from './Profile';
import { MenuScene } from '../render/MenuScene';
import { shopScreen, wardrobeScreen } from '../ui/screens/WardrobeScreen';
import type { CharacterId, CosmeticId, CosmeticSlot } from '../data/types';
import { lobbyScreen, type LobbyHost } from '../ui/screens/LobbyScreen';
import { charactersScreen, type CharactersHost } from '../ui/screens/CharacterPicker';
import { renderPortrait } from '../render/Portraits';
import { EndingScene, type EndingChapter } from '../render/EndingScene';
import { endingScreen, type EndingHost } from '../ui/screens/EndingScreen';
import { getCharacter, isCharacterId } from '../data/characters';
import { SLOT_COLORS, aggregateParty, playerProgress, playerTag, type PartyMember } from './party';
import { ClientAdapter, GuestRoom, HostRoom, type RoomNotice } from '../net/room';
import type { RoomOptions, RoomPlayer, StartMsg } from '../net/protocol';
import { createTransport, type Transport } from '../net/transport';
import { VoiceChat } from '../net/voice';
import type { NetAdapter } from '../net/types';
import { removePlayer } from '../sim/systems/lives';
import { takeOverWorld } from '../sim/takeover';
import type { PlayerLoadout, World } from '../sim/World';
import type { Difficulty } from '../data/types';
import {
  joinScreen,
  micProblemText,
  onlineScreen,
  roomName,
  roomScreen,
  type OnlineHost,
} from '../ui/screens/OnlineScreen';
import type { DeviceRef } from '../input/devices';
import type { PlayerSlot } from '../sim/Entity';
import { pauseScreen } from '../ui/screens/PauseScreen';
import { settingsScreen } from '../ui/screens/SettingsScreen';
import { controlsScreen } from '../ui/screens/ControlsScreen';
import { el, fmtInt } from '../ui/dom';
import { Autopilot } from '../sim/autopilot';
import { resultScreen } from '../ui/screens/ResultScreen';
import { mapSelectScreen } from '../ui/screens/MapSelectScreen';
import { creditsScreen } from '../ui/screens/CreditsScreen';
import { rankingScreen } from '../ui/screens/RankingScreen';
import { workshopScreen } from '../ui/screens/WorkshopScreen';
import { chestScreen } from '../ui/screens/ChestScreen';
import { openChest, type ChestPrize } from './chest';
import { renderThumb } from '../render/Thumbnails';
import { staffRecipe } from '../render/views/staffRecipe';
import { COSMETICS } from '../data/cosmetics';
import { FIREARMS } from '../data/weapons';
import { MELEE_WEAPONS } from '../data/melee';
import type { RunStats } from '../sim/events';
import { MAPS, getMap } from '../data/maps';
import { xpToNext } from '../data/balance';
import { detectLang, setLang, t, type Lang } from '../i18n';

/** Endereço do jogo no navegador (links de sala enviados pelo app Android). */
const SITE_URL = 'https://marcelojaloto.github.io/Zumbi-Bot/';

/** Como jogar em tela cheia no iPhone (a página sozinha não consegue). */
function homeScreenTip(): string {
  return t(
    'Para jogar em tela cheia: toque em Compartilhar (□↑), depois em "Adicionar à Tela de Início", e abra o Zumbi Bot por lá.',
  );
}

export type Screen = 'boot' | 'splash' | 'menu' | 'loading' | 'playing' | 'paused' | 'gameover' | 'victory';

/** Pedido de instalação do navegador (Chrome/Edge no Android e no computador). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice?: Promise<{ outcome: string }>;
}

/** Tudo o que define uma partida (local ou online). */
interface LaunchConfig {
  mapId: string;
  levelIdx: number;
  seed: number;
  loadouts: PlayerLoadout[];
  difficulty: Difficulty;
  ngPlus: boolean;
  sources?: InputSource[];
  mouseSlot?: number;
  enemyCap?: number;
  net?: NetAdapter;
}

/** Aplicação: renderer único, entrada, perfil salvo, telas, HUD e a partida em andamento. */
export class App implements LobbyHost, OnlineHost, CharactersHost, EndingHost {
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly flags: UrlFlags;
  readonly ui: HTMLElement;
  readonly audio: AudioEngine;
  readonly music: MusicPlayer;
  readonly profile: Profile;
  readonly screens: ScreenManager;
  session: GameSession | null = null;
  menuScene: MenuScene | null = null;
  hud: Hud | null = null;
  private overlay: WorldOverlay | null = null;
  screen: Screen = 'boot';
  ready = false;
  fps = 60;
  autopilotSource: InputSource | null = null;
  private last = -1;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private slowFrames = 0;
  private autoQualityTimer = 0;
  lastLevel: { mapId: string; levelIdx: number } | null = null;
  private lastStats: RunStats | null = null;
  private loadingEl: HTMLElement | null = null;
  /** Celular, tablet ou computador (decide controles de toque e qualidade inicial). */
  readonly device: DeviceKind = deviceKind();
  readonly touch: TouchControls;
  private rotateEl: HTMLElement;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.flags = readFlags();
    this.ui = ui;
    this.profile = new Profile();
    // ranking global (Firebase): o melhor resultado do aparelho; qualquer falha só o deixa escondido
    this.global = new GlobalRanking(
      this.flags.rankdb ? { apiKey: 'test', databaseURL: this.flags.rankdb } : FIREBASE_CONFIG,
    );
    this.global.retry();
    if (isCharacterId(this.flags.char)) {
      // testes: ?char=prodigy já vem com o secreto liberado
      if (getCharacter(this.flags.char).secret && this.flags.debug) this.profile.unlockSecret();
      this.profile.setCharacter(this.flags.char);
    }
    // ?party=robot,mage,... : equipe local (P1 no teclado, os outros nos controles 1, 2...)
    const party = this.flags.party.filter(isCharacterId);
    if (party.length > 1)
      this.party = party.map((c, i) => ({
        slot: i as PlayerSlot,
        character: c,
        device: i === 0 ? { k: 'kb', layout: 'full' } : { k: 'pad', index: i - 1 },
      }));
    const q = this.flags.quality ?? this.profile.settings.graphics.quality;
    this.renderer = new Renderer(canvas, resolveQuality(q, this.device));
    // tela que se deforma (barra do navegador, gesto de sair, janela de instalar): espera 3 s antes de reajustar
    this.viewport = new ViewportKeeper({
      desktop: () => this.device === 'desktop',
      apply: () => this.renderer.resize(),
    });
    this.renderer.viewSize = () => this.viewport.size;
    this.input = new InputManager(canvas);
    this.touch = new TouchControls(ui, {
      onPause: () => this.togglePause(),
      onFullscreen: () => this.toggleFullscreen(),
      onMic: () => void this.toggleMic(),
      onMap: () => this.setTouchMap(!this.touchMap),
    });
    this.rotateEl = el(
      'div',
      { class: 'rotate', hidden: true },
      el('div', { class: 'phone' }),
      el('h2'),
      el('p'),
    );
    document.body.appendChild(this.rotateEl);
    // modo toque automático: toque liga; mouse ou teclado (no computador) desliga
    addEventListener(
      'pointerdown',
      (e) => {
        if (this.profile.settings.controls.touch.mode !== 'auto') return;
        if (e.pointerType === 'touch') this.setTouchMode(true);
        else if (e.pointerType === 'mouse' && this.device === 'desktop') this.setTouchMode(false);
      },
      { capture: true },
    );
    addEventListener('keydown', () => {
      if (this.profile.settings.controls.touch.mode === 'auto' && this.device === 'desktop' && this.touchOn)
        this.setTouchMode(false);
    });
    // multijogador: controle de um jogador desconectado pausa a partida
    addEventListener('gamepaddisconnected', (e) => {
      const idx = (e as GamepadEvent).gamepad.index;
      const m = this.party?.find((p) => p.device.k === 'pad' && p.device.index === idx);
      if (!m || this.screen !== 'playing') return;
      this.pause();
      this.hud?.toast(t('{p}: controle desconectado', { p: playerTag(m.slot) }), SLOT_COLORS[m.slot]);
    });
    // último dispositivo usado nos menus: quem abre a seleção de personagem vira o jogador 1
    addEventListener('keydown', () => (this.lastDevice = { k: 'kb', layout: 'full' }), { capture: true });
    addEventListener(
      'pointerdown',
      (e) => (this.lastDevice = e.pointerType === 'touch' ? { k: 'touch' } : { k: 'kb', layout: 'full' }),
      { capture: true },
    );
    this.input.onPause = () => this.togglePause();
    this.input.onMap = () => this.hud?.minimap.toggle();
    this.input.onVoice = () => {
      if (this.online) void this.toggleMic();
    };
    this.audio = new AudioEngine(this.flags.mute);
    this.music = new MusicPlayer(this.audio);
    this.screens = new ScreenManager(ui);
    this.screens.onPadActivity = (index) => (this.lastDevice = { k: 'pad', index });
    this.screens.onNavSound = (k) =>
      this.playUi(k === 'hover' ? 'ui_hover' : k === 'back' ? 'ui_back' : 'ui_click');
    const unlock = () => {
      this.audio.unlock();
      this.music.resume();
    };
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
    // iPhone: o som só é liberado no fim do toque (ou no clique)
    addEventListener('touchend', unlock);
    addEventListener('click', unlock);
    // iPhone: o Safari ignora "sem zoom" da página; a pinça no jogo não pode dar zoom
    for (const ev of ['gesturestart', 'gesturechange'])
      document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.screen === 'playing') this.pause();
      // online: saiu um instante (mandar o convite, outro app); os outros esperam mais antes de achar que caiu
      this.online?.setAway(document.hidden);
      // app Android: sem som com o app em segundo plano
      if (__NATIVE__) {
        if (document.hidden) this.audio.suspend();
        else this.audio.resume();
      }
    });
    // fechando a aba ou o app no meio da sala: os outros ficam sabendo na hora (e um deles assume como anfitrião)
    addEventListener('pagehide', () => this.leaveRoomQuiet());
    // celular/tablet: se o navegador sair da tela cheia sem o jogador pedir (outra aba, outro app), o próximo
    // toque volta para ela, para o jogo não se desarrumar com a barra do navegador
    const refull = () => {
      if (this.wantFullscreen && !this.isFullscreen() && !document.hidden) this.toggleFullscreen(true);
    };
    addEventListener('pointerup', refull, true);
    addEventListener('touchend', refull, true);
    // navegador que deixa instalar o jogo (Android): instalado, abre em tela cheia sem barra e sem aviso
    // (o botão fica nas Configurações, só enquanto o navegador oferece)
    addEventListener('beforeinstallprompt', (ev) => {
      ev.preventDefault();
      this.installEvt = ev as InstallPromptEvent;
    });
    addEventListener('appinstalled', () => {
      this.installEvt = null;
    });
    this.installNativeBack();
    // nomes das teclas como estão impressos no teclado do jogador (quando o navegador informa)
    void loadKeyboardLayout();
    this.renderer.onContextLost = () => {
      this.ui.appendChild(
        el(
          'div',
          { class: 'screen solid' },
          el('h2', {}, t('Contexto gráfico perdido')),
          el('p', {}, t('Recarregue a página para continuar.')),
        ),
      );
    };
    if (this.flags.debug) {
      installDebug(this);
      this.installDebugKeys();
    }
    this.applySettings();
  }

  /** Controles de toque ativos (celular/tablet ou toque na tela). */
  touchOn = false;
  /** Equipe do multijogador local (null = um jogador só). Mantida em "tentar de novo" e "próximo mapa". */
  party: PartyMember[] | null = null;
  /** Último dispositivo usado nos menus (quem abre a seleção vira o jogador 1). */
  lastDevice: DeviceRef = { k: 'kb', layout: 'full' };
  /** Sala online aberta (anfitrião) ou em que este aparelho entrou (convidado). */
  online: HostRoom | GuestRoom | null = null;
  /** Telas que acompanham a sala (lista de jogadores). */
  readonly roomListeners = new Set<() => void>();
  /** Telas que acompanham o chat de voz (microfone, quem fala). */
  readonly voiceListeners = new Set<() => void>();
  /** Chat de voz da sala (null: sem sala, voz desligada pelo anfitrião ou indisponível aqui). */
  voice: VoiceChat | null = null;
  readonly voiceSupported = VoiceChat.supported();
  private transport: Transport | null = null;
  /** Anfitrião: tempo máximo esperando os outros carregarem a fase. */
  private holdTimer = 0;
  /** Avisos da sala fora da partida (quem entrou, saiu, novo anfitrião). */
  private menuToasts: HTMLElement | null = null;
  /** O jogo pediu tela cheia (celular/tablet) e o jogador não desligou pelo botão ⛶. */
  private wantFullscreen = false;
  /** Mini cenário do final lendário em exibição. */
  private ending: EndingScene | null = null;
  /** Rostos dos personagens (menu Personagens), fotografados uma vez. */
  private portraits = new Map<CharacterId, string>();
  private portraitWait = new Map<CharacterId, (() => void)[]>();
  /** Pedido de instalação guardado (navegador que deixa instalar como app). */
  private installEvt: InstallPromptEvent | null = null;
  readonly global: GlobalRanking;
  private viewport: ViewportKeeper;

  /** O melhor registro do ranking pessoal vai para o ranking global (sem internet, fica para depois). */
  rankSaved(): void {
    void this.global.submit(this.profile.ranking.entries[0]);
  }

  get canInstall(): boolean {
    return !!this.installEvt;
  }

  /** Celular/tablet: minimapa pequeno à mostra (começa oculto; botão 🗺 da coluna do canto). */
  private touchMap = false;

  setTouchMap(on: boolean): void {
    this.touchMap = on;
    this.hud?.setMapShown(on);
    this.touch.setMap(on);
  }

  /** Liga/desliga o modo toque: controles na tela, HUD adaptado e sem travar o ponteiro. */
  setTouchMode(on: boolean): void {
    if (on === this.touchOn) return;
    this.touchOn = on;
    document.body.classList.toggle('touch', on);
    this.input.touch = on ? this.touch : null;
    if (this.hud) this.hud.touchMode = on;
    if (on) this.input.exitPointerLock();
  }

  /**
   * App Android: o botão Voltar do sistema chama `window.zbBack()`. Na partida pausa; nas telas volta como o Esc;
   * no menu principal devolve false e o app vai para segundo plano.
   */
  private installNativeBack(): void {
    if (!__NATIVE__) return;
    (window as unknown as { zbBack: () => boolean }).zbBack = () => {
      if (this.screen === 'playing') {
        this.pause();
        return true;
      }
      if (!this.session && this.screens.depth <= 1) return false;
      const init = { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true };
      document.dispatchEvent(new KeyboardEvent('keydown', init));
      document.dispatchEvent(new KeyboardEvent('keyup', init));
      return true;
    };
  }

  /**
   * Tela cheia + paisagem travada (Android). No iPhone a página não pode entrar em tela cheia: o botão explica
   * como adicionar à Tela de Início (de lá o jogo abre em tela cheia).
   */
  toggleFullscreen(force?: boolean): void {
    if (__NATIVE__) return; // o app já abre em tela cheia e deitado
    if (!canFullscreen()) {
      if (force === undefined && !isStandalone())
        this.hud?.toast(t('Tela cheia no iPhone'), '#39e6ff', homeScreenTip());
      return;
    }
    const on = force ?? !this.isFullscreen();
    // só o celular/tablet volta sozinho para a tela cheia; desligar pelo botão ⛶ vale até ligar de novo
    this.wantFullscreen = on && this.device !== 'desktop';
    try {
      if (on) {
        const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
        const p = root.requestFullscreen?.({ navigationUI: 'hide' }) ?? root.webkitRequestFullscreen?.();
        Promise.resolve(p)
          .then(() => {
            const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
            return o?.lock?.('landscape');
          })
          .catch(() => {});
      } else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } catch {
      /* sem suporte */
    }
  }

  private isFullscreen(): boolean {
    const d = document as Document & { webkitFullscreenElement?: Element };
    return !!(document.fullscreenElement || d.webkitFullscreenElement);
  }

  /**
   * Instala o jogo como app (quando o navegador oferece). A janela do navegador tira o jogo da tela cheia: o
   * tamanho fica segurado enquanto ela está aberta e, depois, o jogo tenta voltar para a tela cheia (se o navegador
   * não deixar sem um toque, o próximo toque volta).
   */
  installApp(): void {
    const ev = this.installEvt;
    if (!ev) return;
    this.installEvt = null;
    const back = this.wantFullscreen;
    this.viewport.freeze(true);
    void (async () => {
      try {
        await ev.prompt();
        await ev.userChoice;
      } catch {
        /* o navegador recusou mostrar */
      }
      this.viewport.freeze(false);
      if (back) this.toggleFullscreen(true);
    })();
  }

  /** Por quadro: controles de toque só na partida; aviso para girar em retrato. */
  private updateTouchUi(): void {
    const portrait = this.touchOn && this.device !== 'desktop' && isPortrait();
    if (portrait !== !this.rotateEl.hidden) {
      this.rotateEl.hidden = !portrait;
      if (portrait) {
        this.rotateEl.querySelector('h2')!.textContent = t('Gire o aparelho');
        this.rotateEl.querySelector('p')!.textContent = t('O Zumbi Bot é jogado com o celular deitado.');
        if (this.screen === 'playing') this.pause();
      }
    }
    this.touch.setVisible(this.touchOn && this.screen === 'playing' && !portrait);
    const p = this.session?.world.get((this.hud?.localSlot ?? 0) + 1)?.player;
    if (p) {
      const arms = getCharacter(p.character).arms;
      this.touch.setArms(
        p.mode,
        arms.guns && arms.staff && p.staffs.length > 0,
        p.mode === 'staff' ? p.staffs.length : p.guns.length,
        // quem não usa cajado: o ⇄ vira o botão da caixa de cura
        arms.staff ? null : (p.medkits?.length ?? 0),
      );
    }
  }

  get touchActive(): boolean {
    return this.touchOn;
  }

  get inGame(): boolean {
    return !!this.session;
  }

  private installDebugKeys(): void {
    const spawnKeys: Record<string, string> = {
      F1: 'walker',
      F2: 'runner',
      F3: 'brute',
      F4: 'spitter',
      F5: 'exploder',
      F6: 'drone',
      F7: 'soldier',
      F8: 'mech',
    };
    this.input.onKeyDown = (code, e) => {
      const id = spawnKeys[code];
      if (id && this.session) {
        e.preventDefault();
        (window as unknown as { __game: { spawn(id: string, x?: number): number } }).__game.spawn(
          id,
          this.session.world.get(1)!.t.x + 5,
        );
      }
    };
  }

  async boot(): Promise<void> {
    await this.renderer.setQuality(this.renderer.quality.level);
    this.screen = 'splash';
    requestAnimationFrame(this.frame);
    this.showSplash();
    this.ready = true;
    if (this.flags.autostart || this.flags.map)
      await this.startLevel(this.flags.map ?? 'sandbox', this.flags.level);
  }

  // ------------------------------------------------------------------ telas
  showSplash(): void {
    this.screens.clear();
    this.ensureMenuScene();
    const start = () => {
      this.audio.unlock();
      if (this.device !== 'desktop') this.toggleFullscreen(true);
      this.showMainMenu();
      // link de sala (?sala=ABCD): já abre a tela de entrar com o código
      const code = this.flags.sala;
      if (code) {
        this.flags.sala = null;
        this.openOnline();
        this.openJoin(code);
      }
    };
    this.music.play('menu');
    const e = el(
      'div',
      { class: 'screen dim splash-screen' },
      el('h1', {}, 'ZUMBI BOT'),
      el('div', { class: 'subtitle' }, t('A revolução dos robôs no apocalipse zumbi')),
      el('button', { class: 'btn primary', onclick: start, data: { nav: '', autofocus: '' } }, t('Jogar')),
      el('p', { class: 'muted' }, t('Clique ou pressione Enter')),
      // iPhone no Safari: tela cheia só pela Tela de Início
      !__NATIVE__ && isIOS() && !isStandalone() ? el('p', { class: 'muted ios-tip' }, homeScreenTip()) : null,
    );
    this.screens.push({ el: e, id: 'splash', onBack: () => false });
    for (const n of this.profile.notices) setTimeout(() => this.hud?.toast(n, '#ffb02a'), 500);
  }

  private ensureMenuScene(): void {
    if (this.session || this.menuScene) return;
    this.menuScene = new MenuScene(
      this.renderer,
      this.continueTarget().mapId,
      this.profile.save.profile.character,
    );
    this.menuScene.setCosmetics(this.profile.save.cosmetics.equipped);
  }

  /** Veste o boneco do menu (guarda-roupa e loja); `back` vira o boneco de costas (capas, asas). */
  previewCosmetics(eq: Partial<Record<CosmeticSlot, CosmeticId>>, back = false): void {
    this.menuScene?.setCosmetics(eq);
    if (this.menuScene) this.menuScene.back = back;
  }

  setMenuFocus(f: number): void {
    if (!this.menuScene) return;
    this.menuScene.focus = f;
    // fora do close (seleção, loja): o boneco volta à pose do menu
    if (f === 0) this.menuScene.resetTurn();
  }

  /** Seleção de personagem: gira o boneco (arrastar para os lados, ←/→ no teclado ou no controle). */
  turnMenuHero(delta: number): void {
    this.menuScene?.turn(delta);
  }

  setMenuStage(on: boolean): void {
    if (this.menuScene) this.menuScene.stage = on;
  }

  /** Começa a fase com a equipe escolhida na seleção (1 jogador = jogo solo de sempre). */
  startParty(members: PartyMember[], mapId: string, levelIdx = 0): void {
    this.party = members.length > 1 ? members : null;
    if (members[0]) this.profile.setCharacter(members[0].character);
    void this.startLevel(mapId, levelIdx);
  }

  /** Personagens escolhidos na seleção, em 3D atrás da tela. */
  previewLineup(chars: CharacterId[]): void {
    if (!this.menuScene) return;
    if (chars.length <= 1) {
      this.menuScene.setLineup([]);
      this.menuScene.setCharacter(chars[0] ?? this.profile.save.profile.character, true);
    } else this.menuScene.setLineup(chars);
  }

  /** Rosto do personagem; ainda não fotografado: fotografa no próximo quadro e avisa em `onReady`. */
  portrait(c: CharacterId, onReady?: () => void): string | null {
    const url = this.portraits.get(c);
    if (url) return url;
    const list = this.portraitWait.get(c) ?? [];
    if (onReady) list.push(onReady);
    this.portraitWait.set(c, list);
    return null;
  }

  /** Um rosto por quadro, logo antes do quadro normal (que apaga o canto usado). */
  private shootPortrait(): void {
    const next = this.portraitWait.keys().next();
    if (next.done) return;
    const c = next.value;
    const cbs = this.portraitWait.get(c) ?? [];
    this.portraitWait.delete(c);
    const url = renderPortrait(this.renderer, c);
    if (!url) return;
    this.portraits.set(c, url);
    for (const f of cbs) f();
  }

  /**
   * Final lendário (depois do OMEGA-Z, ou pelos Créditos): a partida e o cenário do menu saem de cena e cada
   * capítulo monta o seu mini cenário. `then` roda no fim (os créditos, ou voltar).
   */
  playEnding(then: () => void): void {
    this.input.exitPointerLock();
    this.endSession();
    this.menuScene?.dispose();
    this.menuScene = null;
    this.music.play('menu');
    this.screens.push(
      endingScreen(this, {
        onDone: () => {
          this.ending?.dispose();
          this.ending = null;
          this.ensureMenuScene();
          then();
        },
      }),
    );
  }

  endingChapter(c: EndingChapter): void {
    this.ending?.dispose();
    this.ending = new EndingScene(this.renderer, c);
  }

  /** Menu Personagens: começa a jogar com o personagem da ficha (na próxima fase da campanha). */
  playAs(c: CharacterId): void {
    this.profile.setCharacter(c);
    this.party = null;
    const cont = this.continueTarget();
    void this.startLevel(cont.mapId, cont.levelIdx);
  }

  /** Menu Personagens: abre os mapas com o personagem da ficha escolhido. */
  mapsAs(c: CharacterId): void {
    this.profile.setCharacter(c);
    this.screens.push(mapSelectScreen(this));
  }

  /** Seleção de personagem antes de começar a fase. */
  openLobby(mapId: string, levelIdx = 0): void {
    this.screens.push(lobbyScreen(this, { mapId, levelIdx }));
  }

  showMainMenu(): void {
    this.screen = 'menu';
    this.screens.clear();
    this.ensureMenuScene();
    this.music.play('menu');
    const b = (label: string, fn: () => void, cls = 'btn') =>
      el('button', { class: cls, onclick: fn, data: { nav: '' } }, label);
    const s = this.profile.save;
    const cont = this.continueTarget();
    const contMap = getMap(cont.mapId);
    const e = el(
      'div',
      { class: 'screen menu-screen' },
      el('h1', {}, 'ZUMBI BOT'),
      el('div', { class: 'subtitle' }, t('A revolução dos robôs no apocalipse zumbi')),
      el(
        'div',
        { class: 'profile-chip' },
        el('span', {}, s.profile.name),
        el('span', {}, t('Nível'), ' ', el('b', {}, String(s.profile.level))),
        el('span', {}, `XP ${fmtInt(s.profile.xp)}/${fmtInt(xpToNext(s.profile.level))}`),
        el('span', {}, t('Sucata'), ' ', el('b', {}, fmtInt(s.profile.scrap))),
      ),
      el(
        'div',
        { class: 'menu' },
        b(
          s.stats.runs > 0 ? t('Continuar: {map}', { map: t(contMap.name) }) : t('Jogar'),
          () => this.openLobby(cont.mapId, cont.levelIdx),
          'btn primary',
        ),
        b(`🌐 ${t('Jogar online')}`, () => this.openOnline()),
        b(t('Mapas'), () => this.screens.push(mapSelectScreen(this))),
        b(t('Personagens'), () => this.screens.push(charactersScreen(this))),
        b(`🔧 ${t('Oficina')}`, () => this.screens.push(workshopScreen(this))),
        b(t('Guarda-roupa'), () => this.screens.push(wardrobeScreen(this))),
        b(t('Loja'), () => this.screens.push(shopScreen(this))),
        b(t('Ranking'), () => this.screens.push(rankingScreen(this))),
        b(t('Configurações'), () => this.openSettings()),
        b(t('Controles'), () => this.openControls()),
        b(t('Créditos'), () =>
          this.screens.push(
            creditsScreen(this, {
              // quem já venceu o OMEGA-Z pode rever o final lendário
              onEnding: s.flags.credits ? () => this.playEnding(() => this.screens.pop()) : undefined,
            }),
          ),
        ),
      ),
      ...this.profile.notices.map((n) => el('p', { class: 'muted', style: 'color:#ffb02a' }, t(n))),
      el(
        'div',
        { class: 'menu-footer muted' },
        this.touchOn ? t('Direcional à esquerda | botões de ação à direita | ⏸ pausa') : this.keyHelp(),
      ),
    );
    this.screens.push({ el: e, id: 'menu', onBack: () => false });
  }

  /** Resumo das teclas no rodapé do menu (com as teclas que o jogador escolheu). */
  private keyHelp(): string {
    const n = actionKeyNames(this.input.bindings);
    return t(
      '{move} anda | {punch} soco | {kick} chute | {jump} pula | clique atira | botão direito: especial | rodinha corre | Esc pausa',
      { move: moveKeys(n), punch: n.punch, kick: n.kick, jump: n.jump },
    );
  }

  /** Primeiro nível desbloqueado e não concluído (ou o último desbloqueado). */
  continueTarget(): { mapId: string; levelIdx: number } {
    const prog = this.profile.save.progress;
    let last = { mapId: MAPS[0]!.id, levelIdx: 0 };
    for (const m of MAPS) {
      for (let i = 0; i < m.levels.length; i++) {
        const id = m.levels[i]!.id;
        if (!prog.unlockedLevels.includes(id)) continue;
        last = { mapId: m.id, levelIdx: i };
        if (!prog.levels[id]?.completed) return last;
      }
    }
    return last;
  }

  openSettings(tab?: string): void {
    this.screens.push(settingsScreen(this, tab));
  }

  openControls(): void {
    this.screens.push(controlsScreen(this));
  }

  playUi(id: string): void {
    this.audio.play(id, { bus: 'ui', vol: 0.6 });
  }

  /** Aplica configurações salvas (volume, sensibilidade, qualidade...). */
  applySettings(): void {
    const s = this.profile.settings;
    this.applyLanguage(s.language);
    const tc = s.controls.touch;
    // tablets têm tela maior: controles um pouco maiores
    this.touch.setLook(tc.size * (this.device === 'tablet' ? 1.2 : 1), tc.opacity);
    this.touch.haptics = tc.haptics;
    this.setTouchMode(
      tc.mode === 'on' || (tc.mode === 'auto' && (this.device !== 'desktop' || this.touchOn)),
    );
    this.audio.volumes.master = s.audio.master;
    this.audio.volumes.music = s.audio.music;
    this.audio.volumes.sfx = s.audio.sfx;
    this.audio.muted = s.audio.muted;
    this.audio.applyVolumes();
    this.voice?.setVolume(s.audio.voice * s.audio.master, s.audio.muted);
    this.input.sensitivity = s.controls.mouseSensitivity;
    this.input.bindings = bindingsFrom(s.controls.keys);
    this.renderer.cam.shakeScale = s.graphics.screenShake;
    this.renderer.post.flashScale = s.graphics.reduceFlashes ? 0.3 : 1;
    this.renderer.renderScale = s.graphics.renderScale;
    this.renderer.resize();
    if (this.hud) {
      this.hud.keyNames = actionKeyNames(this.input.bindings);
      this.hud.showFps = s.graphics.showFps || this.flags.fps;
      this.hud.showHints = s.controls.hints;
    }
    if (this.overlay) this.overlay.showNumbers = s.graphics.damageNumbers;
    const want: QualityLevel = resolveQuality(this.flags.quality ?? s.graphics.quality, this.device);
    if (want !== this.renderer.quality.level) void this.changeQuality(want);
  }

  /** Idioma: "auto" segue o navegador; atualiza o documento (lang e título). */
  private applyLanguage(choice: 'auto' | Lang): void {
    const lang: Lang = choice === 'auto' ? detectLang(navigator.language) : choice;
    setLang(lang);
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.title = `Zumbi Bot - ${t('A revolução dos robôs no apocalipse zumbi')}`;
    this.touch?.relabel();
  }

  /** Troca de idioma ao vivo: refaz as telas abertas e os rótulos fixos do HUD. */
  relocalize(): void {
    this.hud?.relabel();
    this.touch.relabel();
    if (this.session) {
      if (this.screen === 'paused') {
        this.screens.clear();
        this.screens.push(pauseScreen(this, this.online?.role));
        this.openSettings('game');
      }
    } else if (this.screen === 'menu') {
      this.showMainMenu();
      this.openSettings('game');
    }
  }

  private async changeQuality(q: QualityLevel): Promise<void> {
    await this.renderer.setQuality(q);
    // recria a partida atual com os novos recursos gráficos
    if (this.session && this.lastLevel) {
      this.hud?.toast(
        t('Qualidade: {q}', { q: t(q === 'low' ? 'Baixa' : q === 'medium' ? 'Média' : 'Alta') }),
        '#39e6ff',
      );
    }
  }

  // ------------------------------------------------------------------ partida
  private showLoading(title: string): void {
    this.loadingEl?.remove();
    this.loadingEl = el(
      'div',
      { class: 'loading' },
      el('div', { class: 'ltitle' }, title),
      el('div', { class: 'lbar' }, el('i')),
      el('div', { class: 'muted' }, t('Carregando...')),
    );
    this.ui.appendChild(this.loadingEl);
  }

  private hideLoading(): void {
    this.loadingEl?.remove();
    this.loadingEl = null;
  }

  async startLevel(mapId: string, levelIdx = 0): Promise<void> {
    const room = this.online;
    // online: quem entrou na sala espera o anfitrião escolher
    if (room?.role === 'guest') return;
    const seed = this.flags.seed ?? (hashString(mapId) ^ Date.now()) >>> 0;
    const difficulty = this.profile.settings.gameplay.difficulty;
    const ngPlus = mapId !== 'sandbox' && this.profile.save.flags.ngPlusOn;
    if (room) {
      // quem assumiu a sala depois de uma troca de anfitrião continua com o próprio número
      const slot = room.mySlot;
      room.me = { ...this.profile.loadout(), slot };
      room.setTarget(mapId, levelIdx);
      // online: a dificuldade é a da sala (escolhida pelo anfitrião)
      const msg = room.start({ seed, ngPlus, enemyCap: this.renderer.quality.enemyCap });
      const net = room.adapter(this.input.source(slot, { k: 'auto' }), () => this.input.endTick());
      await this.launch({ ...this.fromStart(msg), net, mouseSlot: slot });
      if (this.session?.net === net && room.guestCount > 0) {
        this.session.hold = true;
        this.holdTimer = 15;
        this.hud?.toast(t('Esperando os amigos carregarem...'), '#39e6ff');
      }
      return;
    }
    const party = this.party;
    const base = this.profile.loadout();
    const loadouts = party
      ? party.map((m) => ({
          // cada um com a Oficina e o item de reviver do próprio personagem
          ...this.profile.loadout(m.character),
          slot: m.slot,
          name: m.slot === 0 ? base.name : playerTag(m.slot),
          // convidados jogam com o nível e as armas do perfil, sem os cosméticos do jogador 1
          cosmetics: m.slot === 0 ? base.cosmetics : {},
        }))
      : [base];
    const mouseSlot = party?.find((m) => m.device.k === 'kb' && m.device.layout === 'full')?.slot ?? 0;
    await this.launch({
      mapId,
      levelIdx,
      seed,
      loadouts,
      difficulty,
      ngPlus,
      sources: party?.map((m) => this.input.source(m.slot, m.device)),
      mouseSlot,
    });
  }

  private fromStart(m: StartMsg): LaunchConfig {
    return {
      mapId: m.mapId,
      levelIdx: m.levelIdx,
      seed: m.seed,
      loadouts: m.loadouts,
      difficulty: m.difficulty,
      ngPlus: m.ngPlus,
      enemyCap: m.enemyCap,
    };
  }

  /** Cria a partida (cenário, HUD, som) e começa a jogar. */
  private async launch(c: LaunchConfig): Promise<void> {
    const { mapId, levelIdx } = c;
    this.endSession();
    this.menuScene?.dispose();
    this.menuScene = null;
    this.screens.clear();
    this.screen = 'loading';
    this.lastLevel = { mapId, levelIdx };
    this.lastStats = null;
    const map = getMap(mapId);
    this.showLoading(map.index >= 0 ? `${map.index + 1}. ${t(map.name)}` : t(map.name));
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const session = new GameSession(this.renderer, this.input, {
      mapId,
      levelIdx,
      seed: c.seed,
      loadouts: c.loadouts,
      sources: c.sources,
      mouseSlot: c.mouseSlot,
      difficulty: c.difficulty,
      noLevel: mapId === 'sandbox',
      ngPlus: c.ngPlus,
      enemyCap: c.enemyCap,
      net: c.net,
    });
    this.session = session;
    if (this.flags.god && !session.isClient)
      for (const p of session.world.playerEntities()) p.player!.god = true;
    const director = new AudioDirector(this.audio, this.music);
    this.music.play(map.music, 0);
    this.overlay = new WorldOverlay(this.ui);
    this.hud = new Hud(this.ui);
    this.hud.touchMode = this.touchOn;
    this.hud.setMapShown(this.touchMap);
    this.hud.online = !!c.net;
    if (c.net) {
      this.hud.localSlot = c.mouseSlot ?? 0;
      this.hud.voice = {
        mine: () => (this.voice ? { on: this.voice.micOn, busy: this.voice.starting } : null),
        mic: (slot) => !!this.roomPlayers().find((p) => p.slot === slot)?.mic,
        speaking: (slot) => this.voice?.speaking(slot as PlayerSlot) ?? false,
        toggle: () => void this.toggleMic(),
      };
    }
    this.ui.appendChild(this.touch.root);
    this.ui.appendChild(this.screens.root);
    const overlay = this.overlay;
    const hud = this.hud;
    session.hooks.push({
      onEvents: (ev, s) => {
        for (const x of ev) if (x.t === 'victory' || x.t === 'gameOver') this.lastStats = x.stats;
        director.onEvents(ev, s.world);
        overlay.onEvents(ev, s.world);
        hud.onEvents(ev, s.world);
      },
      onFrame: (dt, _a, s) => {
        this.audio.listenerX = this.renderer.cam.x;
        overlay.update(s.world, this.renderer, dt);
        hud.update(s.world, dt, this.fps, {
          x: this.input.cursorX,
          y: this.input.cursorY,
          visible: this.input.mouseActive,
        });
      },
      onEnd: (s, victory) => this.onSessionEnd(s, victory),
    });
    this.applySettings();
    this.audio.setReverb(session.world.map.env.reverb);
    if (this.autopilotSource) this.setAutopilot(true);
    // pré-compila shaders para evitar travadas na primeira aparição de efeitos
    try {
      session.frame(0);
      const gl = this.renderer.gl;
      if (gl.extensions.has('KHR_parallel_shader_compile'))
        await gl.compileAsync(this.renderer.scene, this.renderer.cam.camera);
      else gl.compile(this.renderer.scene, this.renderer.cam.camera);
    } catch {
      /* navegador sem suporte: compila sob demanda */
    }
    this.hideLoading();
    this.screen = 'playing';
    this.input.enabled = true;
    if (!this.flags.nopointerlock && this.profile.settings.controls.pointerLock && !this.touchOn)
      this.input.requestPointerLock();
  }

  /** Progresso deste aparelho: online só o próprio jogador; local, a equipe toda. */
  private progressOf(w: World): ReturnType<typeof aggregateParty> {
    const room = this.online;
    return room ? playerProgress(w, room.mySlot) : aggregateParty(w);
  }

  protected onSessionEnd(s: GameSession, victory: boolean): void {
    const p = this.progressOf(s.world);
    const stats = this.lastStats;
    const room = this.online;
    if (!p || !stats) return;
    const beforeLevel = this.profile.save.profile.level;
    const sandbox = s.world.map.id === 'sandbox';
    const res = sandbox
      ? { newRecord: false, unlockedNext: null, ngPlusUnlocked: false, finalBoss: false }
      : this.profile.applyRun(stats, p);
    // jornada: os pontos de cada mapa se somam; perdeu todas as vidas ou terminou o jogo, vai para o ranking
    const run = sandbox ? null : this.profile.addToRun(stats);
    const closed = run && (!victory || res.finalBoss) ? this.profile.closeRun(p.level, victory) : null;
    // terminou o jogo pela primeira vez: o personagem secreto aparece no fim do final lendário
    const secretNew = victory && res.finalBoss && !this.profile.save.flags.credits;
    this.screen = victory ? 'victory' : 'gameover';
    this.input.enabled = false;
    this.input.exitPointerLock();
    if (room?.role === 'host') room.toResult();
    const idx = s.world.levelIdx;
    this.screens.clear();
    this.screens.push(
      resultScreen(this, {
        online: room?.role,
        stats,
        playerLevel: p.level,
        levelsGained: p.level - beforeLevel,
        newRecord: res.newRecord,
        next: victory ? this.profile.nextLevel(s.world.map.id, idx) : null,
        unlockedNext: res.unlockedNext,
        ngPlusUnlocked: res.ngPlusUnlocked,
        run: run ? { score: run.score, maps: run.maps } : undefined,
        rank: closed ? { entry: closed.entry, pos: closed.pos, team: closed.run.team > 1 } : undefined,
        secretUnlocked: secretNew ? 'prodigy' : undefined,
      }),
    );
    // primeira vitória sobre o chefe final: o final lendário e os créditos por cima do resultado
    const ending = () => {
      if (!secretNew) return;
      // terminou o jogo: libera o personagem secreto (revelado no fim do final lendário)
      this.profile.unlockSecret();
      this.playEnding(() =>
        this.screens.replace(creditsScreen(this, { final: true, ngPlusUnlocked: res.ngPlusUnlocked })),
      );
    };
    // venceu a fase: o baú (os prêmios da fase e um bônus) por cima do resultado; abrindo, segue
    if (victory && !sandbox) {
      const me = s.world.get((room ? room.mySlot : 0) + 1)?.player;
      const prizes = openChest(this.profile, stats, {
        character: me?.character ?? this.profile.save.profile.character,
        loot: p.loot,
        scrap: p.scrap,
      });
      this.screens.push(
        chestScreen(this, prizes, () => {
          if (this.screens.top?.id === 'chest') this.screens.pop();
          ending();
        }),
      );
    } else ending();
  }

  /** Foto 3D de um prêmio do baú (null: a tela usa o ícone). */
  prizeThumb(p: ChestPrize): string | null {
    const recipe =
      p.k === 'cosmetic'
        ? COSMETICS[p.id]?.mesh
        : p.k === 'gun'
          ? FIREARMS[p.id].mesh
          : p.k === 'melee'
            ? MELEE_WEAPONS[p.id].mesh
            : p.k === 'staff'
              ? staffRecipe(p.id)
              : undefined;
    if (!recipe?.parts.length) return null;
    const key =
      p.k === 'cosmetic' || p.k === 'gun' || p.k === 'melee' || p.k === 'staff' ? `${p.k}:${p.id}` : '';
    // armas e cajados ficam de pé na foto; cosméticos de frente, um pouco de lado
    return renderThumb(this.renderer, key, recipe, p.k === 'cosmetic' ? {} : { pitch: 0.2, yaw: 1.2 });
  }

  /** Sair no meio da fase preserva XP, sucata e loot obtidos. */
  private saveProgressOnQuit(): void {
    const w = this.session?.world;
    const p = w ? this.progressOf(w) : null;
    if (!p || w?.map.id === 'sandbox') return;
    const s = this.profile.save;
    s.profile.level = p.level;
    s.profile.xp = p.xp;
    s.profile.scrap += p.scrap;
    for (const c of p.loot) if (!s.cosmetics.owned.includes(c)) s.cosmetics.owned.push(c);
    for (const g of p.guns) if (!s.unlocks.firearms.includes(g)) s.unlocks.firearms.push(g);
    s.cosmetics.pity = p.pity;
    this.profile.consumeRevive(p.reviveUsed);
    this.profile.persist();
  }

  restartLevel(): void {
    if (this.online?.role === 'guest') return;
    if (this.session && this.screen === 'paused') this.saveProgressOnQuit();
    if (this.lastLevel) void this.startLevel(this.lastLevel.mapId, this.lastLevel.levelIdx);
  }

  /** Sair da fase no meio guarda XP, sucata e loot (não na tela de resultado, que já guardou). */
  private get midLevel(): boolean {
    return !!this.session && this.screen !== 'victory' && this.screen !== 'gameover';
  }

  quitToMenu(): void {
    const room = this.online;
    if (room) {
      // online: o anfitrião leva todos de volta para a sala; quem entrou sai dela
      if (room.role === 'guest') return this.leaveRoom();
      if (this.midLevel) this.saveProgressOnQuit();
      this.endSession();
      room.toLobby();
      this.showRoom();
      return;
    }
    if (this.midLevel) this.saveProgressOnQuit();
    this.endSession();
    this.showMainMenu();
  }

  endSession(): void {
    this.input.exitPointerLock();
    this.overlay?.dispose();
    this.overlay = null;
    this.hud?.dispose();
    this.hud = null;
    this.session?.dispose();
    this.session = null;
  }

  // ------------------------------------------------------------------ online
  /** Tela "Jogar online": criar sala ou entrar numa sala (com um aviso opcional no topo). */
  openOnline(notice?: string): void {
    this.screens.push(onlineScreen(this, notice));
  }

  /** Tela para digitar o código (com o código já preenchido quando veio de um link). */
  openJoin(code?: string): void {
    this.screens.push(joinScreen(this, code));
  }

  private async getTransport(): Promise<Transport> {
    this.transport ??= await createTransport(this.flags.net, this.flags.peer);
    return this.transport;
  }

  async createRoom(opts: RoomOptions): Promise<HostRoom> {
    this.leaveRoomQuiet();
    const room = await HostRoom.open(
      await this.getTransport(),
      this.profile.loadout(),
      this.continueTarget(),
      opts,
    );
    this.wireHost(room);
    this.syncVoice();
    return room;
  }

  /** Sala do anfitrião (quem criou ou quem assumiu depois de uma troca). */
  private wireHost(room: HostRoom): void {
    this.online = room;
    room.onChange = () => this.roomChanged();
    room.onNotice = (n) => this.roomNotice(n);
    // alguém saiu no meio da fase: o boneco dele sai do jogo e os outros continuam
    room.onGuestLeft = (slot) => this.dropPlayer(slot);
  }

  /** Tira da partida o jogador de quem saiu da sala. */
  private dropPlayer(slot: PlayerSlot): void {
    const w = this.session?.world;
    const e = w?.playerEntities().find((p) => p.player!.slot === slot);
    if (w && e) removePlayer(w, e);
  }

  /** Aviso de quem entrou ou saiu (para todos da sala). */
  private roomNotice(n: RoomNotice): void {
    const who = `${playerTag(n.slot)} (${roomName(n.name, n.slot)})`;
    const inGame = !!this.session && this.midLevel;
    this.playUi(n.kind === 'joined' ? 'ui_click' : 'ui_back');
    this.notify(
      n.kind === 'joined'
        ? t('{p} entrou na sala', { p: who })
        : inGame
          ? t('{p} saiu da partida', { p: who })
          : t('{p} saiu da sala', { p: who }),
      SLOT_COLORS[n.slot]!,
      n.host ? t('Era o anfitrião: outro jogador assume a sala.') : undefined,
    );
  }

  /** Aviso rápido: na partida, no canto do HUD; nos menus (sala), no alto da tela. Some em 3 s. */
  private notify(text: string, color: string, sub?: string): void {
    if (this.hud) {
      this.hud.toast(text, color, sub);
      return;
    }
    this.menuToasts ??= el('div', { class: 'toasts menu-toasts' });
    if (this.menuToasts.parentElement !== this.ui) this.ui.appendChild(this.menuToasts);
    const box = this.menuToasts;
    const n = el(
      'div',
      { class: 'toast' },
      el('b', { style: `color:${color}` }, text),
      sub ? el('span', {}, sub) : null,
    );
    box.appendChild(n);
    while (box.children.length > 4) box.firstChild?.remove();
    setTimeout(() => n.classList.add('out'), 2500);
    setTimeout(() => n.remove(), 3000);
  }

  /**
   * O anfitrião saiu e este aparelho (o de menor número entre os que ficaram) assume: a mesma sala, o mesmo
   * código e, no meio da fase, a partida continua daqui para todos.
   */
  private promote(g: GuestRoom, old: RoomPlayer | undefined): void {
    if (this.online !== g) return;
    const room = HostRoom.takeOver(g);
    this.wireHost(room);
    const s = this.session;
    if (room.phase === 'playing' && s && !s.ended && this.screen !== 'loading') {
      takeOverWorld(s.world);
      if (old) this.dropPlayer(old.slot);
      s.becomeHost(room.adapter(this.input.source(room.mySlot, { k: 'auto' }), () => this.input.endTick()));
      // menu aberto: agora com as opções do anfitrião
      if (this.screen === 'paused') {
        this.screens.clear();
        this.screens.push(pauseScreen(this, 'host'));
      }
    } else if (room.phase === 'playing' && this.screen === 'loading') {
      // ainda carregando a fase: assume assim que ela abrir (`startGuest`)
    } else {
      // na sala ou no resultado: todos voltam para a sala, agora com este aparelho no comando
      if (this.midLevel) this.saveProgressOnQuit();
      this.endSession();
      room.toLobby();
      this.showRoom();
    }
    this.syncVoice();
    this.notify(
      t('Você agora é o anfitrião da sala.'),
      '#ffd23a',
      t('Deixe o jogo aberto: seu aparelho conduz a partida.'),
    );
  }

  async joinRoom(code: string): Promise<GuestRoom> {
    this.leaveRoomQuiet();
    const room = await GuestRoom.join(await this.getTransport(), code, this.profile.loadout());
    this.online = room;
    room.loadoutFor = (c) => this.profile.loadout(c);
    room.onChange = () => this.roomChanged();
    room.onStart = (m) => void this.startGuest(room, m);
    room.onNotice = (n) => this.roomNotice(n);
    room.onPromote = (old) => this.promote(room, old);
    // anfitrião antes da conexão cair: voltar nele é só uma reconexão, não troca de anfitrião
    let before = room.hostSlot;
    room.onReconnect = (to) => {
      if (this.online !== room) return;
      if (to?.slot === before) this.notify(t('Conexão instável: reconectando na sala...'), '#39e6ff');
      else if (to)
        this.notify(t('Conectando no novo anfitrião ({p})...', { p: playerTag(to.slot) }), '#39e6ff');
      else if (room.hostSlot === before) this.notify(t('Conectado de novo.'), '#5aff9a');
      else
        this.notify(
          t('{p} é o novo anfitrião.', { p: playerTag(room.hostSlot) }),
          SLOT_COLORS[room.hostSlot]!,
        );
      if (!to) before = room.hostSlot;
    };
    room.onClosed = (why) => {
      if (this.online !== room) return;
      if (this.midLevel) this.saveProgressOnQuit();
      this.online = null;
      this.stopVoice();
      this.endSession();
      this.showMainMenu();
      this.openOnline(
        why === 'host-left'
          ? t('O anfitrião saiu e não deu para continuar com outro anfitrião.')
          : t('A conexão com a sala caiu. Confira a internet e entre de novo.'),
      );
    };
    this.syncVoice();
    return room;
  }

  /** Quem entrou na sala: a partida só mostra o que o anfitrião manda. */
  private async startGuest(room: GuestRoom, m: StartMsg): Promise<void> {
    // o anfitrião recomeçou a fase no meio: o que este jogador ganhou até aqui fica salvo
    if (this.midLevel) this.saveProgressOnQuit();
    const net = new ClientAdapter(room, this.input.source(room.slot, { k: 'auto' }), () =>
      this.input.endTick(),
    );
    await this.launch({ ...this.fromStart(m), net, mouseSlot: room.slot });
    if (this.session?.net !== net) return;
    if (this.online === room) {
      room.attach(net);
      return;
    }
    // virou anfitrião enquanto a fase carregava: assume a partida agora
    const host = this.online;
    if (host?.role === 'host' && host.phase === 'playing') {
      const s = this.session;
      takeOverWorld(s.world);
      const old = s.world
        .playerEntities()
        .filter((p) => !host.players().some((x) => x.slot === p.player!.slot));
      for (const e of old) removePlayer(s.world, e);
      s.becomeHost(host.adapter(this.input.source(host.mySlot, { k: 'auto' }), () => this.input.endTick()));
    }
  }

  private roomChanged(): void {
    const room = this.online;
    // o anfitrião voltou para a sala: quem estava na fase volta junto
    if (room?.role === 'guest' && room.phase === 'lobby' && this.session) {
      if (this.midLevel) this.saveProgressOnQuit();
      this.endSession();
      this.showRoom();
    }
    this.syncVoice();
    for (const f of this.roomListeners) f();
  }

  private roomPlayers(): RoomPlayer[] {
    const r = this.online;
    return r ? (r.role === 'host' ? r.players() : r.players) : [];
  }

  /** Chat de voz acompanha a sala: existe enquanto o anfitrião permite e sabe quem está nela. */
  private syncVoice(): void {
    const room = this.online;
    const peer = room?.voice && this.voiceSupported ? room.voicePeer : undefined;
    if (!room || !peer) {
      this.stopVoice();
      return;
    }
    if (!this.voice) {
      const v = new VoiceChat(peer, room.code, room.mySlot);
      this.voice = v;
      v.onChange = () => this.voiceChanged();
      v.onTalking = (on) => this.audio.setTalking(on);
      const a = this.profile.settings.audio;
      v.setVolume(a.voice * a.master, a.muted);
    }
    this.voice.setMembers(this.roomPlayers());
  }

  private stopVoice(): void {
    const v = this.voice;
    if (!v) return;
    this.voice = null;
    v.dispose();
    this.audio.setTalking(false);
    this.voiceChanged();
    // voz desligada pelo anfitrião: os outros veem o microfone desligado
    this.online?.setMic(false);
  }

  private voiceChanged(): void {
    const v = this.voice;
    this.touch.setMic(v ? v.micOn : null, !!v?.micOn && v.speaking(v.mySlot));
    for (const f of this.voiceListeners) f();
  }

  /** Liga/desliga o microfone (botão, tecla V). `on` força o estado. */
  async toggleMic(on?: boolean): Promise<boolean> {
    const room = this.online;
    if (!room) return false;
    const v = this.voice;
    if (!v) {
      this.hud?.toast(
        room.voice
          ? t('Chat de voz indisponível neste aparelho.')
          : t('Chat de voz desligado pelo anfitrião.'),
        '#ffb02a',
      );
      return false;
    }
    const want = on ?? !(v.micOn || v.starting);
    this.playUi(want ? 'ui_click' : 'ui_back');
    const ok = await v.setMic(want);
    if (this.voice !== v || this.online !== room) return false;
    room.setMic(v.micOn);
    if (!ok && want) this.hud?.toast(micProblemText(v.problem), '#ff5a5a');
    return ok;
  }

  /** Tela da sala: código, quem está nela, personagem e começar. */
  showRoom(): void {
    this.showMainMenu();
    this.screens.push(roomScreen(this));
  }

  /** Sair da sala (quem entrou) ou fechar a sala (anfitrião). */
  leaveRoom(): void {
    if (this.midLevel) this.saveProgressOnQuit();
    this.leaveRoomQuiet();
    this.endSession();
    this.showMainMenu();
  }

  private leaveRoomQuiet(): void {
    const room = this.online;
    this.online = null;
    this.stopVoice();
    if (room?.role === 'host') room.close();
    else room?.leave();
  }

  /** Anfitrião: começa a fase escolhida na sala para todos. */
  startOnline(): void {
    const room = this.online;
    if (room?.role === 'host') void this.startLevel(room.mapId, room.levelIdx);
  }

  /** Link que abre o jogo já entrando na sala (no app Android, o link do site). */
  roomLink(code: string): string {
    const base = __NATIVE__ ? SITE_URL : `${location.origin}${location.pathname}`;
    return `${base}?sala=${code}`;
  }

  /** Anfitrião: a fase só anda quando todos carregaram (ou depois de 15 s). */
  private updateHold(dt: number): void {
    const s = this.session;
    if (!s?.hold) return;
    this.holdTimer -= dt;
    const room = this.online;
    if (room?.role !== 'host' || room.allLoaded() || this.holdTimer <= 0) s.hold = false;
  }

  pause(): void {
    if (!this.session || this.screen !== 'playing') return;
    // online a partida continua para os outros: só abre o menu
    if (!this.online) this.session.paused = true;
    this.screen = 'paused';
    this.input.enabled = false;
    this.input.exitPointerLock();
    this.music.muffle(true);
    this.screens.push(pauseScreen(this, this.online?.role));
  }

  resume(): void {
    if (!this.session) return;
    this.screens.clear();
    this.session.paused = false;
    this.music.muffle(false);
    this.screen = 'playing';
    this.input.enabled = true;
    if (!this.flags.nopointerlock && this.profile.settings.controls.pointerLock && !this.touchOn)
      this.input.requestPointerLock();
  }

  togglePause(): void {
    if (this.screen === 'playing') this.pause();
  }

  setAutopilot(on: boolean): void {
    const net = this.session?.net;
    if (net && net.role !== 'solo') {
      // online: só o jogador deste aparelho
      const slot = net.localSlots()[0] ?? 0;
      this.autopilotSource = on ? new Autopilot(() => this.session?.world ?? null, slot) : null;
      net.setOverride(this.autopilotSource, slot);
      return;
    }
    this.autopilotSource = on ? this.makeAutopilot() : null;
    this.session?.setInputOverride(this.autopilotSource);
    // multijogador: um piloto automático por jogador
    for (const p of this.session?.world.playerEntities() ?? []) {
      const slot = p.player!.slot;
      if (slot === 0) continue;
      this.session!.net.setOverride(on ? new Autopilot(() => this.session?.world ?? null, slot) : null, slot);
    }
  }

  protected makeAutopilot(): InputSource | null {
    return new Autopilot(() => this.session?.world ?? null);
  }

  renderOnce(): void {
    this.session?.frame(0);
    this.renderer.render(0);
  }

  private frame = (t: number): void => {
    const dt = this.last < 0 ? 1 / 60 : Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    this.screens.pollGamepad(dt);
    this.screens.update(dt);
    this.updateHold(dt);
    this.updateTouchUi();
    this.renderer.gl.info.reset();
    if (this.ending) {
      this.ending.frame(dt);
      this.renderer.render(dt);
    } else if (!this.session && this.menuScene) {
      if (this.portraitWait.size) this.shootPortrait();
      this.menuScene.frame(dt);
      this.renderer.render(dt);
    }
    if (this.session) {
      this.session.frame(dt);
      this.renderer.render(dt);
      this.autoQuality(dt);
    }
    requestAnimationFrame(this.frame);
  };

  /** Qualidade automática: cai um nível se o quadro médio passar de 22 ms. */
  private autoQuality(dt: number): void {
    if (this.profile.settings.graphics.quality !== 'auto' || this.flags.quality || this.screen !== 'playing')
      return;
    this.autoQualityTimer += dt;
    if (dt > 0.022) this.slowFrames++;
    if (this.autoQualityTimer >= 5) {
      const ratio = this.slowFrames / Math.max(1, this.autoQualityTimer * 60);
      if (ratio > 0.5 && this.renderer.quality.level !== 'low')
        void this.changeQuality(downgrade(this.renderer.quality.level));
      this.autoQualityTimer = 0;
      this.slowFrames = 0;
    }
  }
}
