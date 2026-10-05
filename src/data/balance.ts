import type { Difficulty } from './types';

/**
 * A câmera inclinada achata a profundidade: 1 m em Z aparece na tela menor que 1 m em X, ~3× no fundo da faixa
 * e ~2,2× na frente (perspectiva). Para cima/para baixo anda essa razão mais rápido em metros e fica na mesma
 * velocidade na tela que para os lados, em qualquer profundidade; as diagonais ficam iguais também (um teste
 * confere a conta com a câmera de verdade).
 */
export function depthSpeed(z: number): number {
  return Math.min(3.2, Math.max(2, 2.5 - 0.15 * z));
}

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
  /** Velocidade para os lados; em Z é a mesma na tela (`depthSpeed`). */
  walkX: 4.0,
  runX: 7.5,
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
 * ritmo dos chefes (pausa entre ataques; maior = mais tempo para reagir e revidar). O Normal (padrão) é mais leve
 * que a força de referência, que fica no Difícil (tudo 1).
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
  easy: { enemyDmg: 0.35, enemyHp: 0.55, bossHp: 0.4, bossPace: 1.8, meleeTokens: 1, rangedTokens: 1 },
  normal: { enemyDmg: 0.7, enemyHp: 0.85, bossHp: 0.75, bossPace: 1.25, meleeTokens: 1, rangedTokens: 1 },
  hard: { enemyDmg: 1, enemyHp: 1, bossHp: 1, bossPace: 1, meleeTokens: 2, rangedTokens: 2 },
  insane: { enemyDmg: 1.3, enemyHp: 1.2, bossHp: 1.2, bossPace: 0.9, meleeTokens: 3, rangedTokens: 2 },
};

/**
 * Caixas de cura guardadas de quem não usa cajado (Militar, Ciborgue, Mutante): começa cada mapa com o estoque cheio
 * e usa no botão do cajado; pegar uma caixa de cura com a vida cheia guarda ela (até `max`).
 */
export const MEDKITS = { max: 4, start: 4, heal: 40 };

/**
 * Cura de um kit médico: `amount` vale como pontos de vida e como porcentagem da vida máxima, o que for maior. Assim o
 * kit continua enchendo boa parte da barra nos níveis altos (o pequeno, 40%; o grande, 80%).
 */
export function kitHeal(amount: number, maxHp: number): number {
  return Math.max(amount, Math.round((amount / 100) * maxHp));
}

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'normal', 'hard', 'insane'];

/** Novo Jogo+: inimigos mais resistentes e fortes, pontuação e sucata maiores. */
export const NG_PLUS = { enemyHp: 1.5, enemyDmg: 1.3, score: 1.5, scrap: 1.5 };

/** Largura visível (m) aproximada no plano do jogador; o sim usa metade dela para limitar a câmera. */
export const VIEW_HALF_WIDTH = 6.8;
export const GRAVITY = 26;

export function xpToNext(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** XP somado para chegar a um nível (do nível 1 até lá). */
export function xpForLevel(level: number): number {
  let n = 0;
  for (let l = 1; l < level; l++) n += xpToNext(l);
  return n;
}

/** XP total já ganho (nível atual e o XP dentro dele). */
export function totalXp(level: number, xp: number): number {
  return xpForLevel(level) + xp;
}

/** Vida máxima no nível; `base` = vida do personagem no nível 1 (robô: 100). */
export function maxHpForLevel(level: number, base: number = PLAYER.hp): number {
  return base + PLAYER.hpPerLevel * (level - 1);
}

export function maxManaForLevel(level: number, base: number = PLAYER.mana): number {
  return base + PLAYER.manaPerLevel * (level - 1);
}

export function levelDamageMult(level: number): number {
  return 1 + PLAYER.dmgPerLevel * (level - 1);
}

export function comboMultiplier(combo: number): number {
  return Math.min(3, 1 + 0.1 * Math.floor(combo / 5));
}

export const COMBO_TIMEOUT_TICKS = 120;

/**
 * Escala do multijogador local (n jogadores): inimigos mais resistentes e em maior número, chefe com mais vida.
 * Com 1 jogador tudo vale 1 (o jogo solo não muda).
 */
export function coopScaling(n: number): { hp: number; count: number; bossHp: number } {
  const k = Math.max(0, n - 1);
  return { hp: 1 + 0.3 * k, count: 1 + 0.3 * k, bossHp: 1 + 0.6 * k };
}

/** Mais inimigos vivos ao mesmo tempo com mais jogadores (até +60%). */
export function coopCapMult(n: number): number {
  return Math.min(1.6, 1 + 0.15 * Math.max(0, n - 1));
}

export function coopEnemyCap(base: number, n: number): number {
  return Math.round(base * coopCapMult(n));
}

export function mapScaling(index: number): { hp: number; dmg: number } {
  return { hp: 1 + 0.12 * index, dmg: 1 + 0.08 * index };
}
