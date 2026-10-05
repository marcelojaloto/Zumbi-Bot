import { maxHpForLevel, maxManaForLevel } from '../data/balance';
import { getCharacter } from '../data/characters';
import { MOVES } from '../data/melee';
import type { CharacterId } from '../data/types';
import { perkEffects, specialsOf, type DefenseId, type PerkEffects } from '../data/workshop';
import type { Entity } from './Entity';

/** Efeito das melhorias da Oficina de um jogador (personagem e melhorias que ele levou para a partida). */
export function playerPerks(e: Entity): PerkEffects {
  const p = e.player!;
  return perkEffects(p.character, p.perks);
}

export function hasDefense(e: Entity, d: DefenseId): boolean {
  return !!e.player && playerPerks(e).defenses.has(d);
}

/** Vida máxima no nível, com o Vigor da Oficina. */
export function playerMaxHp(character: CharacterId, level: number, perks?: readonly string[]): number {
  return maxHpForLevel(level, getCharacter(character).stats.hp) + perkEffects(character, perks).hp;
}

/** Mana máxima no nível, com a Energia e a Magia da Oficina. */
export function playerMaxMana(character: CharacterId, level: number, perks?: readonly string[]): number {
  return maxManaForLevel(level, getCharacter(character).stats.mana) + perkEffects(character, perks).mana;
}

/** Especial em uso: o escolhido na Oficina, se ele está liberado; senão o original do personagem. */
export function chosenSpecial(character: CharacterId, perks: readonly string[], want?: string): string {
  const list = specialsOf(character, perks);
  return want && list.includes(want) && MOVES[want] ? want : list[0]!;
}

/** Combo novo da Oficina: o golpe que sai de `move` com o botão `b`, se houver. */
export function comboLink(e: Entity, move: string, b: 'J' | 'K'): string | undefined {
  if (!e.player) return undefined;
  return playerPerks(e).links.get(`${move}|${b}`);
}
