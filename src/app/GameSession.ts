import { FixedStepLoop } from '../core/loop';
import { getMap } from '../data/maps';
import type { Difficulty } from '../data/types';
import type { InputManager } from '../input/InputManager';
import { LocalAdapter } from '../net/LocalAdapter';
import { buildEnvironment, type BuiltEnv } from '../render/env/EnvironmentBuilder';
import { Lighting } from '../render/Lighting';
import type { Renderer } from '../render/Renderer';
import { SceneView } from '../render/SceneView';
import type { GameEvent } from '../sim/events';
import type { InputSource } from '../sim/InputFrame';
import { World, type PlayerLoadout } from '../sim/World';
import { spawnProp } from '../sim/systems/props';
import { spawnPickup } from '../sim/systems/pickups';
import { FxDirector } from '../render/fx/FxDirector';
import { ProjectileRenderer } from '../render/views/ProjectileRenderer';
import { HazardRenderer } from '../render/views/HazardRenderer';

export interface SessionOptions {
  mapId: string;
  levelIdx: number;
  seed: number;
  loadout: PlayerLoadout;
  difficulty: Difficulty;
  noLevel?: boolean;
  ngPlus?: boolean;
}

export interface SessionHooks {
  /** Consumidores de eventos do sim (efeitos, áudio, HUD). */
  onEvents?: (events: GameEvent[], s: GameSession) => void;
  onFrame?: (dt: number, alpha: number, s: GameSession) => void;
  onEnd?: (s: GameSession, victory: boolean) => void;
}

/**
 * Uma partida (um nível): mundo do sim + cenário + luzes + visuais. O App chama `frame(dt)`
 * a cada requestAnimationFrame; o loop de passo fixo avança a simulação.
 */
export class GameSession {
  readonly world: World;
  readonly net: LocalAdapter;
  readonly view: SceneView;
  readonly env: BuiltEnv;
  readonly lighting: Lighting;
  readonly loop: FixedStepLoop;
  readonly fx: FxDirector;
  readonly projectiles: ProjectileRenderer;
  readonly hazards: HazardRenderer;
  paused = false;
  ended = false;
  frameEvents: GameEvent[] = [];
  time = 0;
  private endNotified = false;
  hooks: SessionHooks[] = [];

  constructor(
    readonly r: Renderer,
    readonly input: InputManager,
    readonly opts: SessionOptions,
  ) {
    const map = getMap(opts.mapId);
    this.world = new World({
      seed: opts.seed,
      map,
      levelIdx: opts.levelIdx,
      loadouts: [opts.loadout],
      difficulty: opts.difficulty,
      enemyCap: r.quality.enemyCap,
      noLevel: opts.noLevel,
      ngPlus: opts.ngPlus,
    });
    const level = this.world.level;
    for (const p of level.props) spawnProp(this.world, p);
    for (const p of level.pickups) spawnPickup(this.world, p.item, p.x, p.z, false);
    this.world.drainEvents();

    this.net = new LocalAdapter(input);
    this.env = buildEnvironment(r.scene, map, level, r.quality);
    this.lighting = new Lighting(r.scene, r.gl, r.quality);
    this.lighting.applyEnv(map.env);
    this.lighting.setStaticLights(this.env.lights);
    r.post.applyEnv(map.env);
    this.view = new SceneView(r.scene, r.quality);
    this.fx = new FxDirector(r.scene, r.quality, this.view, r.cam, this.lighting, r.post);
    this.projectiles = new ProjectileRenderer(r.scene);
    this.hazards = new HazardRenderer(r.scene);

    this.loop = new FixedStepLoop({
      step: () => this.step(),
      render: () => {},
      raf: () => 0,
      caf: () => {},
    });

    input.aimProjector = (sx, sy) => {
      const p = this.world.get(1);
      if (!p) return null;
      return r.projectAim(sx, sy, p.t.x, p.t.y + 1.3, p.t.z);
    };

    const p = this.world.get(1)!;
    r.cam.snap(this.world.camX, 0, p.t.z * 0.3);
  }

  setInputOverride(src: InputSource | null): void {
    this.net.setOverride(src);
  }

  private step(): void {
    const w = this.world;
    const inputs = this.net.collectInputs(w.tick);
    w.step(inputs);
    const ev = w.drainEvents();
    if (ev.length) this.frameEvents.push(...ev);
    this.net.publish();
  }

  /** Avança N ticks imediatamente (debug/testes). */
  stepTicks(n: number): void {
    for (let i = 0; i < n; i++) this.step();
  }

  frame(dt: number): void {
    const w = this.world;
    this.loop.paused = this.paused;
    this.loop.timeScale = w.slowmo > 0 ? 0.3 : 1;
    this.loop.advance(dt);
    const alpha = this.paused ? 1 : this.loop.alpha;
    this.time += this.paused ? 0 : dt;

    if (this.frameEvents.length) {
      const ev = this.frameEvents;
      this.frameEvents = [];
      this.fx.onEvents(ev, w);
      for (const h of this.hooks) h.onEvents?.(ev, this);
    }

    const r = this.r;
    const ps = w.activePlayers();
    let py = 0;
    let pz = 0;
    for (const p of ps) {
      py += p.t.y;
      pz += p.t.z;
    }
    if (ps.length) {
      py /= ps.length;
      pz /= ps.length;
    }
    const rdt = this.paused ? 0 : dt;
    // chefes muito altos: a câmera recua para caber o corpo inteiro
    let zoom = 1;
    for (const e of w.entities)
      if (e.kind === 'boss' && e.body && e.fighter?.state !== 'dead')
        zoom = Math.max(zoom, Math.min(1.45, 1 + (e.body.height - 4.3) * 0.16));
    if (rdt > 0) r.cam.zoom += (zoom - r.cam.zoom) * Math.min(1, rdt * 1.5);
    r.cam.update(w.camX, py * 0.35, pz * 0.3, Math.max(rdt, 1e-4));
    this.view.sync(w, alpha, rdt);
    this.projectiles.sync(w, alpha, rdt, this.lighting);
    this.hazards.sync(w, rdt);
    this.fx.update(w, rdt);
    this.lighting.update(r.cam.x, 0, rdt);
    this.env.update(r.cam.x, this.time);
    for (const h of this.hooks) h.onFrame?.(rdt, alpha, this);

    if (w.finished && !this.endNotified && w.tick - w.finishedTick > 90) {
      this.endNotified = true;
      this.ended = true;
      for (const h of this.hooks) h.onEnd?.(this, w.finished === 'victory');
    }
  }

  dispose(): void {
    this.fx.dispose();
    this.projectiles.dispose();
    this.hazards.dispose();
    this.view.dispose();
    this.env.dispose();
    this.lighting.dispose();
    this.input.aimProjector = null;
    this.net.dispose();
  }
}
