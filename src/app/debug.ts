import { getEnemy } from '../data/enemies';
import { ITEMS } from '../data/items';
import type { PlayerSlot } from '../sim/Entity';
import { emptyFrame, type InputFrame, type InputSource } from '../sim/InputFrame';
import { spawnEnemy } from '../sim/ai/spawnEnemy';
import { applyItem, giveFirearm } from '../sim/systems/pickups';
import { STAFF_ORDER } from '../data/staffs';
import { WEAPON_ORDER } from '../data/weapons';
import { killEntity } from '../sim/combat/applyHit';
import type { App } from './App';
import { isCharacterId } from '../data/characters';

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
    character: string;
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
      // online: o jogador deste aparelho
      const p = w?.get((app.hud?.localSlot ?? 0) + 1);
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
              character: p.player!.character,
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
    /** Personagem do jogador 1 nas próximas partidas. */
    setCharacter(id: string) {
      if (isCharacterId(id)) app.profile.setCharacter(id);
    },
    step(ticks: number) {
      app.session?.stepTicks(ticks);
      app.renderOnce();
    },
    setPaused(b: boolean) {
      if (app.session) app.session.paused = b;
    },
    /** Mantém uma entrada fixa por N ticks (do jogador `slot`) e avança a simulação imediatamente. */
    input(f: Partial<InputFrame>, ticks: number, slot = 0) {
      const s = app.session;
      if (!s) return;
      const src: InputSource = {
        slot: slot as PlayerSlot,
        sample: (t) => ({ ...emptyFrame(t), ...f, tick: t }),
      };
      s.net.setOverride(src, slot as PlayerSlot);
      s.stepTicks(ticks);
      s.net.setOverride(slot === 0 ? app.autopilotSource : null, slot as PlayerSlot);
      app.renderOnce();
    },
    /**
     * Equipe para as próximas partidas (multijogador local): lista de personagens; o jogador 1 fica com o
     * teclado e os outros com os controles 1, 2... Lista com um só volta ao jogo solo.
     */
    setParty(chars: string[]) {
      const ok = chars.filter(isCharacterId);
      app.party =
        ok.length > 1
          ? ok.map((c, i) => ({
              slot: i as PlayerSlot,
              character: c,
              device: i === 0 ? { k: 'kb', layout: 'full' } : { k: 'pad', index: i - 1 },
            }))
          : null;
      if (ok[0]) app.profile.setCharacter(ok[0]);
    },
    /** Todos os jogadores (multijogador). */
    players() {
      return (app.session?.world.playerEntities() ?? []).map((p) => ({
        slot: p.player!.slot,
        character: p.player!.character,
        x: p.t.x,
        z: p.t.z,
        hp: p.health!.hp,
        lives: p.player!.lives,
        state: p.fighter!.state,
        score: p.player!.score,
      }));
    },
    /** Sala online (papel, código, jogadores). */
    online() {
      const r = app.online;
      if (!r) return null;
      return {
        role: r.role,
        code: r.code,
        slot: r.role === 'guest' ? r.slot : 0,
        phase: r.phase,
        players: r.role === 'host' ? r.players() : r.players,
      };
    },
    autopilot(on: boolean) {
      app.setAutopilot(on);
    },
    god(on: boolean) {
      for (const p of app.session?.world.playerEntities() ?? []) p.player!.god = on;
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
    unlockAll() {
      const w = app.session?.world;
      const p = w?.get(1);
      if (!w || !p?.player) return;
      p.player.staffs = [...STAFF_ORDER];
      for (const g of WEAPON_ORDER) if (!p.player.guns.includes(g)) giveFirearm(w, p, g);
      for (const k of Object.keys(p.player.ammo) as (keyof typeof p.player.ammo)[]) p.player.ammo[k] = 999;
      p.player.gunIdx = 0;
    },
    setStaff(id: string) {
      const p = app.session?.world.get(1);
      if (!p?.player) return;
      const i = p.player.staffs.indexOf(id as never);
      if (i >= 0) {
        p.player.staffIdx = i;
        p.player.mode = 'staff';
      }
    },
    setGun(id: string) {
      const p = app.session?.world.get(1);
      if (!p?.player) return;
      const i = p.player.guns.indexOf(id as never);
      if (i >= 0) {
        p.player.gunIdx = i;
        p.player.mode = 'gun';
      }
    },
    /** Pula direto para a arena do chefe (segmentos marcados como concluídos). */
    teleportToBoss() {
      const w = app.session?.world;
      const p = w?.get(1);
      if (!w || !p || !w.level.boss) return;
      const ls = w.levelState;
      ls.cleared = ls.cleared.map(() => true);
      ls.segmentIdx = w.level.segments.length;
      ls.active = false;
      w.lock = null;
      for (const e of [...w.entities]) if (e.kind === 'enemy') w.remove(e.id);
      const x = w.level.boss.triggerX + 0.5;
      p.t.x = p.t.px = x;
      w.camX = x;
      w.limitX = w.level.boss.lock[1];
      w.updateBounds();
      app.renderer.cam.snap(x, 0, 0);
      app.session!.stepTicks(2);
    },
    /** Salta para X (segmentos anteriores contam como concluídos; o próximo dispara normalmente). */
    teleport(x: number) {
      const w = app.session?.world;
      const p = w?.get(1);
      if (!w || !p) return;
      const ls = w.levelState;
      const segs = w.level.segments;
      let n = 0;
      while (n < segs.length && segs[n]!.triggerX < x) {
        ls.cleared[n] = true;
        n++;
      }
      ls.segmentIdx = n;
      ls.active = false;
      w.lock = null;
      for (const e of [...w.entities]) if (e.kind === 'enemy') w.remove(e.id);
      p.t.x = p.t.px = x;
      w.camX = x;
      w.limitX = segs[n] ? segs[n]!.triggerX + 20 : (w.level.boss?.lock[1] ?? w.level.length);
      w.updateBounds();
      app.renderer.cam.snap(x, 0, 0);
      app.session!.stepTicks(2);
    },
    captureFrame: () => app.renderer.captureFrame(),
    app,
  };
  (window as unknown as { __game: typeof api }).__game = api;
}
