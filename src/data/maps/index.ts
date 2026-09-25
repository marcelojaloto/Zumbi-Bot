import '../bosses/all';
import type { MapDef } from '../types';
import { sandbox } from './00-sandbox';
import { vila } from './01-vila';

/** Mapas jogáveis em ordem (o sandbox fica fora da campanha). */
export const MAPS: MapDef[] = [vila];

export const ALL_MAPS: MapDef[] = [sandbox, ...MAPS];

export function getMap(id: string): MapDef {
  const m = ALL_MAPS.find((m) => m.id === id);
  if (!m) throw new Error(`Mapa desconhecido: ${id}`);
  return m;
}
