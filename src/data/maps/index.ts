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

/** Mapas jogáveis em ordem (o sandbox fica fora da campanha). */
export const MAPS: MapDef[] = [vila, torre, banco, castelo, toxica, floresta, centro, chamas, guerra, arena];

export const ALL_MAPS: MapDef[] = [sandbox, ...MAPS];

export function getMap(id: string): MapDef {
  const m = ALL_MAPS.find((m) => m.id === id);
  if (!m) throw new Error(`Mapa desconhecido: ${id}`);
  return m;
}
