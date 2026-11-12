import '../bosses/all';
import type { MapDef } from '../types';
import { sandbox } from './00-sandbox';
import { vila } from './01-vila';
import { torre } from './02-torre';
import { banco } from './03-banco';
import { castelo } from './04-castelo';
import { toxica } from './05-toxica';
import { floresta } from './06-floresta';
import { centro } from './07-centro';
import { chamas } from './08-chamas';
import { guerra } from './09-guerra';
import { arena } from './10-arena';
import { fabrica } from './11-fabrica';
import { praca } from './12-praca';
import { estudio } from './13-estudio';
import { pista } from './14-pista';
import { shopping } from './15-shopping';

/** Mapas jogáveis em ordem, uma temporada depois da outra (o sandbox fica fora da campanha). */
export const MAPS: MapDef[] = [
  vila,
  torre,
  banco,
  castelo,
  toxica,
  floresta,
  centro,
  chamas,
  guerra,
  arena,
  // 2ª temporada
  fabrica,
  praca,
  estudio,
  pista,
  shopping,
];

export const ALL_MAPS: MapDef[] = [sandbox, ...MAPS];

/** Temporadas do jogo e quantos mundos cada uma tem quando completa. */
export const SEASONS = [1, 2];
const SEASON_SIZE: Record<number, number> = { 1: 10, 2: 9 };

export function seasonOf(m: MapDef): number {
  return m.season ?? 1;
}

/** Mapas já lançados de uma temporada, em ordem. */
export function seasonMaps(season: number): MapDef[] {
  return MAPS.filter((m) => seasonOf(m) === season);
}

/** A temporada já tem todos os mundos. */
export function seasonComplete(season: number): boolean {
  return seasonMaps(season).length >= (SEASON_SIZE[season] ?? 0);
}

export function getMap(id: string): MapDef {
  const m = ALL_MAPS.find((m) => m.id === id);
  if (!m) throw new Error(`Mapa desconhecido: ${id}`);
  return m;
}
