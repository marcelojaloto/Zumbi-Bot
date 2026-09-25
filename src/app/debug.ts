import { getEnemy } from '../data/enemies';
import { ITEMS } from '../data/items';
import type { PlayerSlot } from '../sim/Entity';
import { emptyFrame, type InputFrame, type InputSource } from '../sim/InputFrame';
import { spawnEnemy } from '../sim/ai/spawnEnemy';
import { applyItem } from '../sim/systems/pickups';
import { killEntity } from '../sim/combat/applyHit';
import type { App } from './App';

export interface DebugState {
  screen: string;
  mapId?: string;
  tick: number;
  segment: number;
  enemiesAlive: number;
  bossHp?: number;
  finished?: string | null;
  player?: {
    x: number;
    y: number;
    z: number;
    hp: number;
    mana: number;
    lives: number;
    level: number;
    state: string;
    ammo: string;
    score: number;
  };
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

/** API de depuração exposta em window.__game quando ?debug=1 (usada pelos testes E2E). */
export function installDebug(app: App): void {
  const errors: string[] = [];
  addEventListener('error', (e) => errors.push(String(e.message)));
  addEventListener('unhandledrejection', (e) => errors.push(String((e as PromiseRejectionEvent).reason)));

  const api = {
    errors,
    isReady: () => app.ready,
    state(): DebugState {
      const s = app.session;
      const w = s?.world;
      const p = w?.get(1);
      const info = app.renderer.gl.info;
      const boss = w?.entities.find((e) => e.kind === 'boss');
      return {
        screen: app.screen,
        mapId: w?.map.id,
        tick: w?.tick ?? 0,
        segment: w?.levelState.segmentIdx ?? 0,
        enemiesAlive: w?.enemiesAlive() ?? 0,
        bossHp: boss?.health?.hp,
        finished: w?.finished,
        player: p
          ? {
              x: p.t.x,
              y: p.t.y,
              z: p.t.z,
              hp: p.health!.hp,
              mana: p.player!.mana,
              lives: p.player!.lives,
              level: p.player!.level,
              state: p.fighter!.state,
              ammo: `${p.player!.ammoMag[p.player!.guns[p.player!.gunIdx]!] ?? 0}`,
              score: p.player!.score,
            }
          : undefined,
        fps: app.fps,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      };
    },
    async startLevel(mapId: string, levelIdx = 0) {
      await app.startLevel(mapId, levelIdx);
    },
    step(ticks: number) {
      app.session?.stepTicks(ticks);
      app.renderOnce();
    },
    setPaused(b: boolean) {
      if (app.session) app.session.paused = b;
    },
    /** Mantém uma entrada fixa por N ticks e avança a simulação imediatamente. */
    input(f: Partial<InputFrame>, ticks: number) {
      const s = app.session;
      if (!s) return;
      const src: InputSource = {
        slot: 0 as PlayerSlot,
        sample: (t) => ({ ...emptyFrame(t), ...f, tick: t }),
      };
      s.setInputOverride(src);
      s.stepTicks(ticks);
      s.setInputOverride(app.autopilotSource);
      app.renderOnce();
    },
    autopilot(on: boolean) {
      app.setAutopilot(on);
    },
    god(on: boolean) {
      const p = app.session?.world.get(1);
      if (p?.player) p.player.god = on;
    },
    spawn(enemyId: string, x?: number, z?: number): number {
      const w = app.session?.world;
      if (!w) return -1;
      getEnemy(enemyId);
      const p = w.get(1)!;
      return spawnEnemy(w, enemyId, x ?? p.t.x + 2.5, z ?? p.t.z, 'right').id;
    },
    give(id: string) {
      const w = app.session?.world;
      const p = w?.get(1);
      if (!w || !p || !ITEMS[id]) return false;
      return applyItem(w, p, id);
    },
    killAll() {
      const w = app.session?.world;
      if (!w) return;
      for (const e of [...w.entities])
        if ((e.kind === 'enemy' || e.kind === 'boss') && e.fighter?.state !== 'dead') killEntity(w, e, 1);
    },
    teleport(x: number) {
      const p = app.session?.world.get(1);
      if (p) p.t.x = p.t.px = x;
    },
    captureFrame: () => app.renderer.captureFrame(),
    app,
  };
  (window as unknown as { __game: typeof api }).__game = api;
}
