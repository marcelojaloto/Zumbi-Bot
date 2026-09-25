import { secToTicks } from '../../core/time';
import { NG_PLUS, coopScaling, xpToNext } from '../../data/balance';
import { getBoss } from '../../data/bosses';
import type { SegmentDef, SpawnFrom, StaffId, WaveDef, WeaponId } from '../../data/types';
import type { RunStats } from '../events';
import type { World } from '../World';
import { spawnEnemy } from '../ai/spawnEnemy';
import { spawnBoss } from '../systems/boss';
import { spawnEnvHazard } from '../systems/envHazards';
import { computeStars, levelEndBonus } from '../progression';

interface PendingSpawn {
  enemy: string;
  from: SpawnFrom;
  at: number;
}

export interface LevelState {
  segmentIdx: number;
  active: boolean;
  waveIdx: number;
  /** Ondas já iniciadas no segmento atual. */
  wavesStarted: number;
  segStart: number;
  lastClearTick: number;
  pending: PendingSpawn[];
  cleared: boolean[];
  bossSpawned: boolean;
  bossId: number;
  bossDead: boolean;
  bossDeadTick: number;
  hintsShown: number;
  timeTicks: number;
  startXp: number;
  unlockedStaff: StaffId | null;
  startGuns: WeaponId[];
  levelHazards: boolean;
  bossCosmetics: string[];
}

export function totalXp(level: number, xp: number): number {
  let t = xp;
  for (let l = 1; l < level; l++) t += xpToNext(l);
  return t;
}

export function createLevelState(w: World): LevelState {
  const lo = w.opts.loadouts[0];
  return {
    segmentIdx: 0,
    active: false,
    waveIdx: 0,
    wavesStarted: 0,
    segStart: 0,
    lastClearTick: 0,
    pending: [],
    cleared: w.level.segments.map(() => false),
    bossSpawned: false,
    bossId: 0,
    bossDead: false,
    bossDeadTick: 0,
    hintsShown: 0,
    timeTicks: 0,
    startXp: lo ? totalXp(lo.level, lo.xp) : 0,
    unlockedStaff: null,
    startGuns: lo ? [...lo.guns] : [],
    levelHazards: false,
    bossCosmetics: [],
  };
}

function maxPlayerX(w: World): number {
  let m = -Infinity;
  for (const p of w.activePlayers()) m = Math.max(m, p.t.x);
  return m;
}

/** Posição de surgimento conforme a origem. */
export function spawnPos(w: World, from: SpawnFrom, i: number): { x: number; z: number; from: SpawnFrom } {
  const b = w.bounds;
  const [z0, z1] = w.zBand;
  const rz = () => w.rng.range(z0 + 0.4, z1 - 0.4);
  const inside = () => {
    // longe dos jogadores
    for (let k = 0; k < 8; k++) {
      const x = w.rng.range(b.minX + 1.5, b.maxX - 1.5);
      if (w.activePlayers().every((p) => Math.abs(p.t.x - x) > 2.2)) return x;
    }
    return w.rng.range(b.minX + 1.5, b.maxX - 1.5);
  };
  switch (from) {
    case 'left':
      return { x: b.minX - 1.5 - w.rng.next() * 2, z: rz(), from };
    case 'right':
      return { x: b.maxX + 1.5 + w.rng.next() * 2, z: rz(), from };
    case 'sides':
      return i % 2 === 0 ? spawnPos(w, 'right', i) : spawnPos(w, 'left', i);
    case 'back':
      return { x: inside(), z: z0 + 0.3, from };
    case 'front':
      return { x: inside(), z: z1 - 0.3, from };
    case 'ground':
      return { x: inside(), z: rz(), from };
    case 'sky':
      return { x: inside(), z: rz(), from };
  }
}

function queueWave(w: World, wave: WaveDef): void {
  const ls = w.levelState;
  const k = coopScaling(w.playerCount).count;
  for (const s of wave.spawns) {
    const n = Math.max(1, Math.round(s.count * k));
    for (let i = 0; i < n; i++)
      ls.pending.push({ enemy: s.enemy, from: s.from, at: w.tick + secToTicks(s.intervalS * i) });
  }
  ls.wavesStarted++;
}

function waveReady(w: World, seg: SegmentDef, idx: number): boolean {
  const wave = seg.waves[idx];
  if (!wave) return false;
  const ls = w.levelState;
  const st = wave.start;
  switch (st.k) {
    case 'segmentStart':
      return true;
    case 'timeS':
      return w.tick - ls.segStart >= secToTicks(st.s);
    case 'afterCleared':
      return (
        ls.pending.length === 0 &&
        w.enemiesAlive() === 0 &&
        w.tick - ls.lastClearTick >= secToTicks(st.delayS)
      );
    case 'aliveAtMost':
      return ls.pending.length === 0 && w.enemiesAlive() <= st.n;
  }
}

function startSegment(w: World, i: number): void {
  const ls = w.levelState;
  const seg = w.level.segments[i]!;
  ls.active = true;
  ls.segmentIdx = i;
  ls.waveIdx = 0;
  ls.wavesStarted = 0;
  ls.segStart = w.tick;
  ls.lastClearTick = w.tick;
  if (seg.lock) {
    w.lock = { ...seg.lock };
    w.emit({ t: 'segment', phase: 'locked', index: i });
  }
  if (seg.zBand) w.zBand = [...seg.zBand];
  for (const h of seg.hazards ?? []) spawnEnvHazard(w, h);
}

function clearSegment(w: World, i: number): void {
  const ls = w.levelState;
  const seg = w.level.segments[i]!;
  ls.cleared[i] = true;
  ls.active = false;
  ls.segmentIdx = i + 1;
  if (seg.lock) {
    w.lock = null;
    w.emit({ t: 'segment', phase: 'cleared', index: i });
    w.emit({ t: 'go' });
  }
  w.zBand = [...w.level.zBand];
}

/** Progressão do nível: gatilhos de segmento, ondas, dicas, chefe e fim da fase. */
export function levelSystem(w: World): void {
  const ls = w.levelState;
  if (w.finished) return;
  ls.timeTicks++;
  if (w.noLevel) return;

  if (!ls.levelHazards) {
    ls.levelHazards = true;
    for (const h of w.level.hazards ?? []) spawnEnvHazard(w, h);
  }

  const px = maxPlayerX(w);
  // dicas
  const hints = w.level.hints ?? [];
  while (ls.hintsShown < hints.length && px >= hints[ls.hintsShown]!.x) {
    w.emit({ t: 'hint', text: hints[ls.hintsShown]!.text });
    ls.hintsShown++;
  }

  const segs = w.level.segments;
  if (!ls.active && ls.segmentIdx < segs.length) {
    const seg = segs[ls.segmentIdx]!;
    if (px >= seg.triggerX) startSegment(w, ls.segmentIdx);
  }

  if (ls.active) {
    const seg = segs[ls.segmentIdx]!;
    // próximas ondas
    while (ls.wavesStarted < seg.waves.length && waveReady(w, seg, ls.wavesStarted)) {
      queueWave(w, seg.waves[ls.wavesStarted]!);
    }
    // surgimentos pendentes respeitando o limite de vivos
    const wave = seg.waves[Math.max(0, ls.wavesStarted - 1)];
    const cap = Math.min(wave?.maxAlive ?? 99, w.enemyCap);
    let alive = w.enemiesAlive();
    for (let k = 0; k < ls.pending.length && alive < cap;) {
      const p = ls.pending[k]!;
      if (p.at > w.tick) {
        k++;
        continue;
      }
      const pos = spawnPos(w, p.from, k + w.tick);
      spawnEnemy(w, p.enemy, pos.x, pos.z, pos.from === 'sides' ? 'right' : pos.from);
      ls.pending.splice(k, 1);
      alive++;
    }
    if (ls.pending.length === 0 && alive === 0) {
      if (ls.wavesStarted >= seg.waves.length) clearSegment(w, ls.segmentIdx);
    } else if (alive > 0) ls.lastClearTick = w.tick;
  }

  // limite de avanço: não passa do próximo segmento/chefe antes de concluir o atual
  w.limitX = progressLimit(w);

  // chefe
  const boss = w.level.boss;
  const allCleared = ls.segmentIdx >= segs.length && !ls.active;
  if (boss && allCleared && !ls.bossSpawned && px >= boss.triggerX) {
    ls.bossSpawned = true;
    w.lock = { minX: boss.lock[0], maxX: boss.lock[1] };
    if (boss.zBand) w.zBand = [...boss.zBand];
    const def = getBoss(boss.id);
    const b = spawnBoss(w, def, boss.lock[1] - 3.5, (w.zBand[0] + w.zBand[1]) / 2 - 0.5);
    ls.bossId = b.id;
  }
  if (ls.bossDead && w.tick - ls.bossDeadTick > 200) finishRun(w, true);
  if (!boss && allCleared && px >= w.level.length - 4) finishRun(w, true);
}

function progressLimit(w: World): number {
  const ls = w.levelState;
  const segs = w.level.segments;
  const boss = w.level.boss;
  const bossLimit = boss ? (ls.bossSpawned ? boss.lock[1] : boss.lock[1]) : w.level.length;
  if (ls.active) {
    const next = segs[ls.segmentIdx + 1];
    return next ? next.triggerX - 1 : boss ? boss.triggerX - 1 : w.level.length;
  }
  const next = segs[ls.segmentIdx];
  if (next) return next.lock ? next.lock.maxX : next.triggerX + 6;
  return bossLimit;
}

/** Encerra a partida (vitória ou derrota) e emite as estatísticas. */
export function finishRun(w: World, victory: boolean): void {
  if (w.finished) return;
  w.finished = victory ? 'victory' : 'gameOver';
  w.finishedTick = w.tick;
  const ls = w.levelState;
  const p = w.get(1)?.player;
  if (!p) return;
  const timeS = ls.timeTicks / 60;
  const star = { completed: victory, livesLost: p.livesLost, timeS, parTimeS: w.level.parTimeS };
  const bonus = levelEndBonus(star);
  p.score += bonus;
  if (w.ngPlus) {
    p.score = Math.round(p.score * NG_PLUS.score);
    p.scrap = Math.round(p.scrap * NG_PLUS.scrap);
  }
  const stats: RunStats = {
    mapId: w.map.id,
    levelId: w.level.id,
    score: p.score,
    kills: p.kills,
    maxCombo: p.maxCombo,
    timeMs: Math.round(timeS * 1000),
    livesLost: p.livesLost,
    damageTaken: Math.round(p.damageTaken),
    xpGained: Math.max(0, totalXp(p.level, p.xp) - ls.startXp),
    bossKills: p.bossKills,
    stars: computeStars(star),
    loot: [...p.loot],
    scrap: p.scrap,
    unlockedStaff: ls.unlockedStaff ?? undefined,
    unlockedGuns: p.guns.filter((g) => !ls.startGuns.includes(g)),
    victory,
    ngPlus: w.ngPlus || undefined,
  };
  w.emit(victory ? { t: 'victory', stats } : { t: 'gameOver', stats });
}
