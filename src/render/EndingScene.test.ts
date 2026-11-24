import { describe, expect, it } from 'vitest';
import { getMap } from '../data/maps';
import { CHAPTER_MAP, ENDING_CHAPTERS, SEASON2_CHAPTERS } from './EndingScene';

describe('finais', () => {
  it('todo capítulo acontece num mapa que existe', () => {
    for (const c of [...ENDING_CHAPTERS, ...SEASON2_CHAPTERS])
      expect(getMap(CHAPTER_MAP[c]).id).toBe(CHAPTER_MAP[c]);
  });

  it('cada temporada termina no gancho da seguinte', () => {
    expect(ENDING_CHAPTERS.at(-1)).toBe('sequel');
    expect(SEASON2_CHAPTERS.at(-1)).toBe('season3');
  });
});
