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
import { MusicPlayer } from '../audio/music';
import { WorldOverlay } from '../ui/hud/WorldOverlay';
import { Hud } from '../ui/hud/Hud';
import { ScreenManager } from '../ui/ScreenManager';
import { Profile } from './Profile';
import { MenuScene } from '../render/MenuScene';
import { shopScreen, wardrobeScreen, type WardrobeHost } from '../ui/screens/WardrobeScreen';
import type { CosmeticId, CosmeticSlot } from '../data/types';
import { pauseScreen } from '../ui/screens/PauseScreen';
import { settingsScreen } from '../ui/screens/SettingsScreen';
import { controlsScreen } from '../ui/screens/ControlsScreen';
import { el, fmtInt } from '../ui/dom';
import { Autopilot } from '../sim/autopilot';
import { resultScreen } from '../ui/screens/ResultScreen';
import { mapSelectScreen } from '../ui/screens/MapSelectScreen';
import { creditsScreen } from '../ui/screens/CreditsScreen';
import { rankingScreen } from '../ui/screens/RankingScreen';
import type { RunStats } from '../sim/events';
import { MAPS, getMap } from '../data/maps';
import { xpToNext } from '../data/balance';

export type Screen = 'boot' | 'splash' | 'menu' | 'loading' | 'playing' | 'paused' | 'gameover' | 'victory';

/** Aplicação: renderer único, entrada, perfil salvo, telas, HUD e a partida em andamento. */
export class App implements WardrobeHost {
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
    this.music = new MusicPlayer(this.audio);
    this.screens = new ScreenManager(ui);
    this.screens.onNavSound = (k) =>
      this.playUi(k === 'hover' ? 'ui_hover' : k === 'back' ? 'ui_back' : 'ui_click');
    const unlock = () => {
      this.audio.unlock();
      this.music.resume();
    };
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
    this.ensureMenuScene();
    const start = () => {
      this.audio.unlock();
      this.showMainMenu();
    };
    this.music.play('menu');
    const e = el(
      'div',
      { class: 'screen dim splash-screen' },
      el('h1', {}, 'ZUMBI BOT'),
      el('div', { class: 'subtitle' }, 'A revolução dos robôs no apocalipse zumbi'),
      el('button', { class: 'btn primary', onclick: start, data: { nav: '', autofocus: '' } }, 'Jogar'),
      el('p', { class: 'muted' }, 'Clique ou pressione Enter'),
    );
    this.screens.push({ el: e, id: 'splash', onBack: () => false });
    for (const n of this.profile.notices) setTimeout(() => this.hud?.toast(n, '#ffb02a'), 500);
  }

  private ensureMenuScene(): void {
    if (this.session || this.menuScene) return;
    this.menuScene = new MenuScene(this.renderer, this.continueTarget().mapId);
    this.menuScene.setCosmetics(this.profile.save.cosmetics.equipped);
  }

  previewCosmetics(eq: Partial<Record<CosmeticSlot, CosmeticId>>): void {
    this.menuScene?.setCosmetics(eq);
  }

  setMenuFocus(f: number): void {
    if (this.menuScene) this.menuScene.focus = f;
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
      el('div', { class: 'subtitle' }, 'A revolução dos robôs no apocalipse zumbi'),
      el(
        'div',
        { class: 'profile-chip' },
        el('span', {}, s.profile.name),
        el('span', {}, 'Nível ', el('b', {}, String(s.profile.level))),
        el('span', {}, `XP ${fmtInt(s.profile.xp)}/${fmtInt(xpToNext(s.profile.level))}`),
        el('span', {}, 'Sucata ', el('b', {}, fmtInt(s.profile.scrap))),
      ),
      el(
        'div',
        { class: 'menu' },
        b(
          s.stats.runs > 0 ? `Continuar: ${contMap.name}` : 'Jogar',
          () => void this.startLevel(cont.mapId, cont.levelIdx),
          'btn primary',
        ),
        b('Mapas', () => this.screens.push(mapSelectScreen(this))),
        b('Guarda-roupa', () => this.screens.push(wardrobeScreen(this))),
        b('Loja', () => this.screens.push(shopScreen(this))),
        b('Ranking', () => this.screens.push(rankingScreen(this))),
        b('Configurações', () => this.openSettings()),
        b('Controles', () => this.openControls()),
        b('Créditos', () => this.screens.push(creditsScreen(this))),
      ),
      ...this.profile.notices.map((n) => el('p', { class: 'muted', style: 'color:#ffb02a' }, n)),
      el(
        'div',
        { class: 'menu-footer muted' },
        'WASD mover • J soco • K chute • Espaço pula • Mouse mira e atira • Esc pausa',
      ),
    );
    this.screens.push({ el: e, id: 'menu', onBack: () => false });
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
    this.renderer.post.flashScale = s.graphics.reduceFlashes ? 0.3 : 1;
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
  private showLoading(title: string): void {
    this.loadingEl?.remove();
    this.loadingEl = el(
      'div',
      { class: 'loading' },
      el('div', { class: 'ltitle' }, title),
      el('div', { class: 'lbar' }, el('i')),
      el('div', { class: 'muted' }, 'Carregando…'),
    );
    this.ui.appendChild(this.loadingEl);
  }

  private hideLoading(): void {
    this.loadingEl?.remove();
    this.loadingEl = null;
  }

  async startLevel(mapId: string, levelIdx = 0): Promise<void> {
    this.endSession();
    this.menuScene?.dispose();
    this.menuScene = null;
    this.screens.clear();
    this.screen = 'loading';
    this.lastLevel = { mapId, levelIdx };
    this.lastStats = null;
    const map = getMap(mapId);
    this.showLoading(map.index >= 0 ? `${map.index + 1}. ${map.name}` : map.name);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const seed = this.flags.seed ?? (hashString(mapId) ^ Date.now()) >>> 0;
    const session = new GameSession(this.renderer, this.input, {
      mapId,
      levelIdx,
      seed,
      loadout: this.profile.loadout(),
      difficulty: this.profile.settings.gameplay.difficulty,
      noLevel: mapId === 'sandbox',
      ngPlus: mapId !== 'sandbox' && this.profile.save.flags.ngPlusOn,
    });
    this.session = session;
    if (this.flags.god) session.world.get(1)!.player!.god = true;
    const director = new AudioDirector(this.audio, this.music);
    this.music.play(map.music, 0);
    this.overlay = new WorldOverlay(this.ui);
    this.hud = new Hud(this.ui);
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
    session.setInputOverride(this.autopilotSource);
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
    if (!this.flags.nopointerlock && this.profile.settings.controls.pointerLock)
      this.input.requestPointerLock();
  }

  protected onSessionEnd(s: GameSession, victory: boolean): void {
    const p = s.world.get(1)?.player;
    const stats = this.lastStats;
    if (!p || !stats) return;
    const beforeLevel = this.profile.save.profile.level;
    const res =
      s.world.map.id === 'sandbox'
        ? { newRecord: false, unlockedNext: null, ngPlusUnlocked: false, finalBoss: false }
        : this.profile.applyRun(stats, {
            level: p.level,
            xp: p.xp,
            guns: p.guns,
            loot: p.loot,
            scrap: p.scrap,
            pity: p.pity,
          });
    this.screen = victory ? 'victory' : 'gameover';
    this.input.enabled = false;
    this.input.exitPointerLock();
    const idx = s.world.levelIdx;
    this.screens.push(
      resultScreen(this, {
        stats,
        playerLevel: p.level,
        levelsGained: p.level - beforeLevel,
        newRecord: res.newRecord,
        next: victory ? this.profile.nextLevel(s.world.map.id, idx) : null,
        unlockedNext: res.unlockedNext,
        ngPlusUnlocked: res.ngPlusUnlocked,
      }),
    );
    // primeira vitória sobre o chefe final: créditos por cima do resultado
    const fl = this.profile.save.flags;
    if (victory && res.finalBoss && !fl.credits) {
      fl.credits = true;
      this.profile.persist();
      this.screens.push(creditsScreen(this, { final: true, ngPlusUnlocked: res.ngPlusUnlocked }));
    }
  }

  /** Sair no meio da fase preserva XP, sucata e loot obtidos. */
  private saveProgressOnQuit(): void {
    const p = this.session?.world.get(1)?.player;
    if (!p || this.session?.world.map.id === 'sandbox') return;
    const s = this.profile.save;
    s.profile.level = p.level;
    s.profile.xp = p.xp;
    s.profile.scrap += p.scrap;
    for (const c of p.loot) if (!s.cosmetics.owned.includes(c)) s.cosmetics.owned.push(c);
    for (const g of p.guns) if (!s.unlocks.firearms.includes(g)) s.unlocks.firearms.push(g);
    s.cosmetics.pity = p.pity;
    this.profile.persist();
  }

  restartLevel(): void {
    if (this.session && this.screen === 'paused') this.saveProgressOnQuit();
    if (this.lastLevel) void this.startLevel(this.lastLevel.mapId, this.lastLevel.levelIdx);
  }

  quitToMenu(): void {
    if (this.session && this.screen !== 'victory' && this.screen !== 'gameover') this.saveProgressOnQuit();
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
    this.music.muffle(true);
    this.screens.push(pauseScreen(this));
  }

  resume(): void {
    if (!this.session) return;
    this.screens.clear();
    this.session.paused = false;
    this.music.muffle(false);
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
    this.renderer.gl.info.reset();
    if (!this.session && this.menuScene) {
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
