import { hashString } from '../core/rng';
import { InputManager } from '../input/InputManager';
import { Renderer } from '../render/Renderer';
import { resolveQuality } from '../render/quality';
import type { InputSource } from '../sim/InputFrame';
import { GameSession } from './GameSession';
import { readFlags, type UrlFlags } from './urlFlags';
import { installDebug } from './debug';
import type { PlayerLoadout } from '../sim/World';

export type Screen = 'boot' | 'splash' | 'menu' | 'loading' | 'playing' | 'paused' | 'gameover' | 'victory';

/** Aplicação: renderer único, entrada, tela atual e a partida em andamento. */
export class App {
  readonly renderer: Renderer;
  readonly input: InputManager;
  readonly flags: UrlFlags;
  readonly ui: HTMLElement;
  session: GameSession | null = null;
  screen: Screen = 'boot';
  ready = false;
  fps = 60;
  autopilotSource: InputSource | null = null;
  private last = -1;
  private fpsAcc = 0;
  private fpsFrames = 0;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.flags = readFlags();
    this.ui = ui;
    this.renderer = new Renderer(canvas, resolveQuality(this.flags.quality ?? 'auto'));
    this.input = new InputManager(canvas);
    this.input.onPause = () => this.togglePause();
    if (this.flags.debug) installDebug(this);
  }

  async boot(): Promise<void> {
    await this.renderer.setQuality(this.renderer.quality.level);
    this.screen = 'splash';
    this.showSplash();
    requestAnimationFrame(this.frame);
    this.ready = true;
    if (this.flags.autostart || this.flags.map)
      await this.startLevel(this.flags.map ?? 'sandbox', this.flags.level);
  }

  private showSplash(): void {
    this.ui.innerHTML = '';
    const d = document.createElement('div');
    d.className = 'splash';
    d.innerHTML = `<h1>ZUMBI BOT</h1><p>A revolução dos robôs no apocalipse zumbi</p>`;
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = 'Jogar';
    b.onclick = () => void this.startLevel('sandbox', 0);
    d.appendChild(b);
    this.ui.appendChild(d);
  }

  defaultLoadout(): PlayerLoadout {
    return {
      slot: 0,
      name: 'Zumbi Bot',
      level: 1,
      xp: 0,
      guns: ['pistol'],
      staffs: ['heal'],
      cosmetics: {},
      pity: 0,
      ownedCosmetics: [],
    };
  }

  async startLevel(mapId: string, levelIdx = 0): Promise<void> {
    this.endSession();
    this.screen = 'loading';
    this.ui.innerHTML = '';
    const seed = this.flags.seed ?? (hashString(mapId) ^ Date.now()) >>> 0;
    this.session = new GameSession(this.renderer, this.input, {
      mapId,
      levelIdx,
      seed,
      loadout: this.defaultLoadout(),
      difficulty: 'normal',
      noLevel: mapId === 'sandbox',
    });
    if (this.flags.god) this.session.world.get(1)!.player!.god = true;
    this.session.setInputOverride(this.autopilotSource);
    this.screen = 'playing';
    if (!this.flags.nopointerlock) this.input.requestPointerLock();
  }

  endSession(): void {
    this.session?.dispose();
    this.session = null;
  }

  togglePause(): void {
    if (!this.session) return;
    if (this.screen === 'playing') {
      this.session.paused = true;
      this.screen = 'paused';
    } else if (this.screen === 'paused') {
      this.session.paused = false;
      this.screen = 'playing';
    }
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
    this.renderer.gl.info.reset();
    if (this.session) this.session.frame(dt);
    if (this.session) this.renderer.render(dt);
    requestAnimationFrame(this.frame);
  };
}
