import type { CharacterId } from '../data/types';
import type { DeviceRef } from '../input/devices';
import { totalXp } from '../sim/level/LevelRunner';
import type { PlayerComp, PlayerSlot } from '../sim/Entity';
import type { World } from '../sim/World';

/** Um jogador local da equipe: personagem e dispositivo de entrada. */
export interface PartyMember {
  slot: PlayerSlot;
  character: CharacterId;
  device: DeviceRef;
}

/** Cor de cada jogador (P1 laranja, P2 ciano, P3 verde, P4 magenta, P5 amarelo). */
export const SLOT_COLORS = ['#ff8c1a', '#39e6ff', '#5aff9a', '#ff4ad8', '#ffd24a'] as const;
export const SLOT_COLOR_HEX = [0xff8c1a, 0x39e6ff, 0x5aff9a, 0xff4ad8, 0xffd24a] as const;

export function playerTag(slot: number): string {
  return `P${slot + 1}`;
}

/**
 * Progresso da equipe para o perfil salvo: nível/XP do jogador que mais evoluiu, armas e cosméticos de todos,
 * sucata somada; a "sorte" dos cosméticos é a do jogador 1.
 */
export function aggregateParty(w: World): {
  level: number;
  xp: number;
  guns: PlayerComp['guns'];
  loot: string[];
  scrap: number;
  pity: number;
} | null {
  const ps = w.playerEntities().map((e) => e.player!);
  if (!ps.length) return null;
  const best = ps.reduce((a, p) => (totalXp(p.level, p.xp) > totalXp(a.level, a.xp) ? p : a));
  return {
    level: best.level,
    xp: best.xp,
    guns: [...new Set(ps.flatMap((p) => p.guns))],
    loot: [...new Set(ps.flatMap((p) => p.loot))],
    scrap: ps.reduce((a, p) => a + p.scrap, 0),
    pity: ps.find((p) => p.slot === 0)?.pity ?? ps[0]!.pity,
  };
}
