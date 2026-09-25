import type { World } from '../World';

export interface LevelState {
  segmentIdx: number;
  active: boolean;
  waveIdx: number;
  cleared: boolean[];
  bossSpawned: boolean;
  bossId: number;
  hintsShown: number;
  timeTicks: number;
}

export function createLevelState(_w: World): LevelState {
  return {
    segmentIdx: 0,
    active: false,
    waveIdx: 0,
    cleared: [],
    bossSpawned: false,
    bossId: 0,
    hintsShown: 0,
    timeTicks: 0,
  };
}

/** Encerra a partida (vitória ou derrota). */
export function finishRun(w: World, victory: boolean): void {
  if (w.finished) return;
  w.finished = victory ? 'victory' : 'gameOver';
  w.finishedTick = w.tick;
}

/** Progressão do nível: gatilhos de segmento, ondas e boss (implementado no M6). */
export function levelSystem(w: World): void {
  w.levelState.timeTicks++;
}
