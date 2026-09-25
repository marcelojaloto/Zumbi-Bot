import { hashString } from '../core/rng';
import { InputManager } from '../input/InputManager';
import { Renderer } from '../render/Renderer';
import { downgrade, resolveQuality, type QualityLevel } from '../render/quality';
import type { InputSource } from '../sim/InputFrame';
import { GameSession } from './GameSession';
import { readFlags, type UrlFlags } from './urlFlags';
import { installDebug } from './debug';
import { AudioEngine } from '../audio/AudioEngine';
import { AudioDirector } from '../audio/AudioDirector';
import { WorldOverlay } from '../ui/hud/WorldOverlay';
import { Hud } from '../ui/hud/Hud';
import { ScreenManager } from '../ui/ScreenManager';
import { Profile } from './Profile';
import type { UiHost } from '../ui/screens/host';
import { pauseScreen } from '../ui/screens/PauseScreen';
import { settingsScreen } from '../ui/screens/SettingsScreen';
import { controlsScreen } from '../ui/screens/ControlsScreen';
import { el } from '../ui/dom';

export type Screen = 'boot' | 'splash' | 'menu' | 'loading' | 'playing' | 'paused' | 'gameover' | 'victory';

/** Aplicação: renderer único, entrada, perfil salvo, telas, HUD e a partida em andamento. */
export class App implements UiHost {
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly flags: UrlFlags;
  readonly ui: HTMLElement;
  readonly audio: AudioEngine;
  readonly profile: Profile;
  readonly screens: ScreenManager;
  session: GameSession | null = null;
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

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.flags = readFlags();
    this.ui = ui;
    this.profile = new Profile();
    const q = this.flags.quality ?? this.profile.settings.graphics.quality;
    this.renderer = new Renderer(canvas, resolveQuality(q));
    this.input = new InputManager(canvas);
    this.input.onPause = () => this.togglePause();
    this.input.onMap = () => this.hud?.minimap.toggle();
    this.audio = new AudioEngine(this.flags.mute);
    this.screens = new ScreenManager(ui);
    this.screens.onNavSound = (k) =>
      this.playUi(k === 'hover' ? 'ui_hover' : k === 'back' ? 'ui_back' : 'ui_click');
    const unlock = () => this.audio.unlock();
    addEventListener('pointerdown', unlock);
    addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.screen === 'playing') this.pause();
    });
    this.renderer.onContextLost = () => {
      this.ui.appendChild(
        el(
          'div',
          { class: 'screen solid' },
          el('h2', {}, 'Contexto gráfico perdido'),
          el('p', {}, 'Recarregue a página para continuar.'),
        ),
      );
    };
    if (this.flags.debug) {
      installDebug(this);
      this.installDebugKeys();
    }
    this.applySettings();
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
    const start = () => {
      this.audio.unlock();
      this.showMainMenu();
    };
    const e = el(
      'div',
      { class: 'screen solid splash-screen' },
      el('h1', {}, 'ZUMBI BOT'),
      el('div', { class: 'subtitle' }, 'A revolução dos robôs no apocalipse zumbi'),
      el('button', { class: 'btn primary', onclick: start, data: { nav: '', autofocus: '' } }, 'Jogar'),
      el('p', { class: 'muted' }, 'Clique ou pressione Enter'),
    );
    this.screens.push({ el: e, id: 'splash', onBack: () => false });
    for (const n of this.profile.notices) setTimeout(() => this.hud?.toast(n, '#ffb02a'), 500);
  }

  showMainMenu(): void {
    this.screen = 'menu';
    this.screens.clear();
    const b = (label: string, fn: () => void, cls = 'btn') =>
      el('button', { class: cls, onclick: fn, data: { nav: '' } }, label);
    const e = el(
      'div',
      { class: 'screen solid' },
      el('h1', {}, 'ZUMBI BOT'),
      el('div', { class: 'subtitle' }, 'A revolução dos robôs no apocalipse zumbi'),
      el(
        'div',
        { class: 'menu' },
        b('Jogar', () => void this.startLevel('sandbox', 0), 'btn primary'),
        b('Configurações', () => this.openSettings()),
        b('Controles', () => this.openControls()),
      ),
    );
    this.screens.push({ el: e, id: 'menu', onBack: () => false });
  }

  openSettings(): void {
    this.screens.push(settingsScreen(this));
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
    this.audio.volumes.master = s.audio.master;
    this.audio.volumes.music = s.audio.music;
    this.audio.volumes.sfx = s.audio.sfx;
    this.audio.muted = s.audio.muted;
    this.audio.applyVolumes();
    this.input.sensitivity = s.controls.mouseSensitivity;
    this.renderer.cam.shakeScale = s.graphics.screenShake;
    this.renderer.renderScale = s.graphics.renderScale;
    this.renderer.resize();
    if (this.hud) this.hud.showFps = s.graphics.showFps || this.flags.fps;
    if (this.overlay) this.overlay.showNumbers = s.graphics.damageNumbers;
    const want: QualityLevel = resolveQuality(this.flags.quality ?? s.graphics.quality);
    if (want !== this.renderer.quality.level) void this.changeQuality(want);
  }

  private async changeQuality(q: QualityLevel): Promise<void> {
    await this.renderer.setQuality(q);
    // recria a partida atual com os novos recursos gráficos
    if (this.session && this.lastLevel) {
      this.hud?.toast(`Qualidade: ${q === 'low' ? 'Baixa' : q === 'medium' ? 'Média' : 'Alta'}`, '#39e6ff');
    }
  }

  // ------------------------------------------------------------------ partida
  async startLevel(mapId: string, levelIdx = 0): Promise<void> {
    this.endSession();
    this.screens.clear();
    this.screen = 'loading';
    this.lastLevel = { mapId, levelIdx };
    const seed = this.flags.seed ?? (hashString(mapId) ^ Date.now()) >>> 0;
    const session = new GameSession(this.renderer, this.input, {
      mapId,
      levelIdx,
      seed,
      loadout: this.profile.loadout(),
      difficulty: this.profile.settings.gameplay.difficulty,
      noLevel: mapId === 'sandbox',
    });
    this.session = session;
    if (this.flags.god) session.world.get(1)!.player!.god = true;
    const director = new AudioDirector(this.audio);
    this.overlay = new WorldOverlay(this.ui);
    this.hud = new Hud(this.ui);
    this.ui.appendChild(this.screens.root);
    const overlay = this.overlay;
    const hud = this.hud;
    session.hooks.push({
      onEvents: (ev, s) => {
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
    session.setInputOverride(this.autopilotSource);
    this.screen = 'playing';
    this.input.enabled = true;
    if (!this.flags.nopointerlock && this.profile.settings.controls.pointerLock)
      this.input.requestPointerLock();
  }

  protected onSessionEnd(_s: GameSession, _victory: boolean): void {}

  restartLevel(): void {
    if (this.lastLevel) void this.startLevel(this.lastLevel.mapId, this.lastLevel.levelIdx);
  }

  quitToMenu(): void {
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

  pause(): void {
    if (!this.session || this.screen !== 'playing') return;
    this.session.paused = true;
    this.screen = 'paused';
    this.input.enabled = false;
    this.input.exitPointerLock();
    this.screens.push(pauseScreen(this));
  }

  resume(): void {
    if (!this.session) return;
    this.screens.clear();
    this.session.paused = false;
    this.screen = 'playing';
    this.input.enabled = true;
    if (!this.flags.nopointerlock && this.profile.settings.controls.pointerLock)
      this.input.requestPointerLock();
  }

  togglePause(): void {
    if (this.screen === 'playing') this.pause();
  }

  setAutopilot(on: boolean): void {
    this.autopilotSource = on ? this.makeAutopilot() : null;
    this.session?.setInputOverride(this.autopilotSource);
  }

  protected makeAutopilot(): InputSource | null {
    return null;
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
    this.renderer.gl.info.reset();
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
