import { ALL_MAPS } from '../data/maps';
import { BOSSES } from '../data/bosses';
import { FIREARMS } from '../data/weapons';
import { STAFFS } from '../data/staffs';
import { STATUS } from '../data/statusEffects';
import { MELEE_WEAPONS } from '../data/melee';
import { ITEMS } from '../data/items';
import { COSMETICS, RARITY_NAMES } from '../data/cosmetics';
import { CHARACTERS } from '../data/characters';

/**
 * Todos os textos de dados que aparecem na tela (chaves do dicionário). Usado pelo teste de cobertura
 * do inglês. Nomes de padrões de ataque e de inimigos não são exibidos e ficam de fora.
 */
export function dataKeys(): string[] {
  const out = new Set<string>();
  const add = (s: string | undefined) => {
    if (s) out.add(s);
  };
  for (const m of ALL_MAPS) {
    add(m.name);
    add(m.subtitle);
    for (const l of m.levels) {
      add(l.name);
      for (const h of l.hints ?? []) add(h.text);
    }
  }
  for (const b of Object.values(BOSSES)) {
    add(b.name);
    add(b.title);
    for (const ph of b.phases) add(ph.name);
  }
  for (const g of Object.values(FIREARMS)) {
    add(g.name);
    add(g.short);
    add(g.desc);
  }
  for (const s of Object.values(STAFFS)) {
    add(s.name);
    add(s.desc);
  }
  for (const s of Object.values(STATUS)) add(s.name);
  for (const m of Object.values(MELEE_WEAPONS)) add(m.name);
  for (const it of Object.values(ITEMS)) if (it.effect.k === 'power' || it.effect.k === 'melee') add(it.name);
  for (const c of Object.values(COSMETICS)) {
    add(c.name);
    add(c.desc);
  }
  for (const r of Object.values(RARITY_NAMES)) add(r);
  for (const c of Object.values(CHARACTERS)) {
    add(c.name);
    add(c.title);
    add(c.desc);
    add(c.specialName);
    add(c.specialDesc);
  }
  return [...out];
}

/** Chamadas `t('…')` literais num código-fonte. */
export function literalKeys(src: string): string[] {
  const out: string[] = [];
  const re = /\bt\(\s*'((?:[^'\\]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[1]!.replace(/\\'/g, "'"));
  return out;
}
