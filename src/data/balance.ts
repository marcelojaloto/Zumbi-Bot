import type { Difficulty } from './types';

/** Constantes de balanceamento do jogador e da progressão. */
export const PLAYER = {
  hp: 100,
  hpPerLevel: 5,
  mana: 100,
  manaPerLevel: 3,
  manaRegen: 4,
  manaRegenDelayS: 1.5,
  dmgPerLevel: 0.02,
  maxLevel: 50,
  walkX: 4.0,
  walkZ: 3.0,
  runX: 7.5,
  runZ: 4.5,
  jumpV: 8.5,
  doubleJumpV: 7.5,
  gravity: 26,
  airControl: 0.6,
  radius: 0.35,
  height: 1.8,
  lives: 3,
  hurtInvuln: 30,
  getupInvuln: 60,
  respawnInvuln: 120,
  coyoteTicks: 6,
  jumpBufferTicks: 6,
  doubleTapTicks: 15,
  inputBufferTicks: 8,
  aimMoveMult: 0.6,
  shieldMax: 100,
  juggleCap: 3,
} as const;

/**
 * Dificuldade: multiplicadores de dano e vida dos inimigos, vida dos chefes, fichas de ataque simultâneo e
 * ritmo dos chefes (pausa entre ataques; maior = mais tempo para reagir e revidar).
 */
export const DIFFICULTY: Record<
  Difficulty,
  {
    enemyDmg: number;
    enemyHp: number;
    bossHp: number;
    bossPace: number;
    meleeTokens: number;
    rangedTokens: number;
  }
> = {
  veryEasy: { enemyDmg: 0.45, enemyHp: 0.65, bossHp: 0.5, bossPace: 1.6, meleeTokens: 1, rangedTokens: 1 },
  easy: { enemyDmg: 0.7, enemyHp: 0.85, bossHp: 0.75, bossPace: 1.25, meleeTokens: 1, rangedTokens: 1 },
  normal: { enemyDmg: 1, enemyHp: 1, bossHp: 1, bossPace: 1, meleeTokens: 2, rangedTokens: 2 },
  hard: { enemyDmg: 1.3, enemyHp: 1.2, bossHp: 1.2, bossPace: 0.9, meleeTokens: 3, rangedTokens: 2 },
};

export const DIFFICULTY_ORDER: Difficulty[] = ['veryEasy', 'easy', 'normal', 'hard'];

/** Novo Jogo+: inimigos mais resistentes e fortes, pontuação e sucata maiores. */
export const NG_PLUS = { enemyHp: 1.5, enemyDmg: 1.3, score: 1.5, scrap: 1.5 };

/** Largura visível (m) aproximada no plano do jogador; o sim usa metade dela para limitar a câmera. */
export const VIEW_HALF_WIDTH = 6.8;
export const GRAVITY = 26;

export function xpToNext(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function maxHpForLevel(level: number): number {
  return PLAYER.hp + PLAYER.hpPerLevel * (level - 1);
}

export function maxManaForLevel(level: number): number {
  return PLAYER.mana + PLAYER.manaPerLevel * (level - 1);
}

export function levelDamageMult(level: number): number {
  return 1 + PLAYER.dmgPerLevel * (level - 1);
}

export function comboMultiplier(combo: number): number {
  return Math.min(3, 1 + 0.1 * Math.floor(combo / 5));
}

export const COMBO_TIMEOUT_TICKS = 120;

/** Escala de co-op (costura para o futuro). */
export function coopScaling(n: number): { hp: number; count: number; bossHp: number } {
  return { hp: 1 + 0.5 * (n - 1), count: 1 + 0.35 * (n - 1), bossHp: 1 + 0.75 * (n - 1) };
}

export function mapScaling(index: number): { hp: number; dmg: number } {
  return { hp: 1 + 0.12 * index, dmg: 1 + 0.08 * index };
}
