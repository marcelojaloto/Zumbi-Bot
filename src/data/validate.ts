import { BOSSES } from './bosses';
import { CHARACTERS } from './characters';
import { COSMETICS } from './cosmetics';
import { ENEMIES } from './enemies';
import { ITEMS, LOOT_TABLES } from './items';
import { ALL_MAPS } from './maps';
import { MOVES } from './melee';
import { MUSIC } from './music';
import { STAFFS } from './staffs';
import type { BossStep } from './types';

/** Validação cruzada dos dados do jogo. Retorna a lista de problemas (vazia = ok). */
export function validateData(): string[] {
  const errs: string[] = [];
  const levelIds = new Set<string>();
  const mapIds = new Set<string>();
  const indices = new Set<number>();
  for (const m of ALL_MAPS) {
    if (mapIds.has(m.id)) errs.push(`mapa duplicado: ${m.id}`);
    mapIds.add(m.id);
    if (!MUSIC[m.music]) errs.push(`${m.id}: música desconhecida ${m.music}`);
    if (m.index >= 0) {
      if (indices.has(m.index)) errs.push(`índice de mapa duplicado: ${m.index}`);
      indices.add(m.index);
    }
    m.levels.forEach((l, i) => {
      if (levelIds.has(l.id)) errs.push(`nível duplicado: ${l.id}`);
      levelIds.add(l.id);
      if (l.zBand[0] >= l.zBand[1]) errs.push(`${l.id}: faixa Z inválida`);
      let lastTrigger = -Infinity;
      for (const s of l.segments) {
        if (s.triggerX <= lastTrigger) errs.push(`${l.id}/${s.id}: gatilhos fora de ordem`);
        lastTrigger = s.triggerX;
        if (s.lock && s.lock.maxX - s.lock.minX < 14)
          errs.push(`${l.id}/${s.id}: trava estreita demais (<14 m)`);
        if (s.waves.length === 0) errs.push(`${l.id}/${s.id}: sem ondas`);
        for (const wv of s.waves)
          for (const sp of wv.spawns)
            if (!ENEMIES[sp.enemy]) errs.push(`${l.id}/${s.id}: inimigo desconhecido ${sp.enemy}`);
        if (s.triggerX > l.length) errs.push(`${l.id}/${s.id}: gatilho além do fim`);
      }
      for (const p of l.props)
        if (p.drop && !ITEMS[p.drop]) errs.push(`${l.id}: item desconhecido ${p.drop}`);
      for (const p of l.pickups) if (!ITEMS[p.item]) errs.push(`${l.id}: item desconhecido ${p.item}`);
      if (l.boss) {
        if (!BOSSES[l.boss.id]) errs.push(`${l.id}: chefe desconhecido ${l.boss.id}`);
        if (i !== m.levels.length - 1) errs.push(`${l.id}: chefe só no último nível do mapa`);
        if (l.boss.lock[1] > l.length) errs.push(`${l.id}: arena do chefe além do fim`);
        if (l.boss.lock[1] - l.boss.lock[0] < 14) errs.push(`${l.id}: arena do chefe estreita`);
        if (l.segments.length && l.boss.triggerX <= l.segments[l.segments.length - 1]!.triggerX)
          errs.push(`${l.id}: chefe antes do último segmento`);
      }
    });
  }
  for (const b of Object.values(BOSSES)) {
    if (!MUSIC[b.music]) errs.push(`${b.id}: música desconhecida ${b.music}`);
    if (b.phases.length === 0) errs.push(`chefe ${b.id}: sem fases`);
    let last = 2;
    for (const ph of b.phases) {
      if (ph.untilHpFrac >= last) errs.push(`chefe ${b.id}: fases fora de ordem`);
      last = ph.untilHpFrac;
      if (ph.patterns.length === 0) errs.push(`chefe ${b.id}: fase sem padrões`);
      const walk = (steps: BossStep[]) => {
        for (const s of steps) {
          if (s.t === 'summon' && !ENEMIES[s.enemy])
            errs.push(`chefe ${b.id}: invoca inimigo desconhecido ${s.enemy}`);
          if (s.t === 'repeat') walk(s.steps);
        }
      };
      for (const p of ph.patterns) walk(p.steps);
      if (ph.transition) walk(ph.transition);
      if (ph.adds && !ENEMIES[ph.adds.enemy]) errs.push(`chefe ${b.id}: add desconhecido ${ph.adds.enemy}`);
    }
    if (b.phases[b.phases.length - 1]!.untilHpFrac !== 0)
      errs.push(`chefe ${b.id}: última fase deve ir até 0`);
    if (b.rewards.unlockStaff && !STAFFS[b.rewards.unlockStaff])
      errs.push(`chefe ${b.id}: cajado desconhecido`);
    if (Object.keys(COSMETICS).length > 0)
      for (const c of b.rewards.cosmetics)
        if (!COSMETICS[c]) errs.push(`chefe ${b.id}: cosmético desconhecido ${c}`);
  }
  for (const s of Object.values(STAFFS)) {
    if (s.unlock.kind === 'boss' && !BOSSES[s.unlock.bossId])
      errs.push(`cajado ${s.id}: chefe de desbloqueio desconhecido ${s.unlock.bossId}`);
  }
  for (const e of Object.values(ENEMIES)) {
    if (!LOOT_TABLES[e.rewards.drops]) errs.push(`inimigo ${e.id}: tabela de loot desconhecida`);
    for (const a of e.attacks)
      if (a.move && !MOVES[a.move.id]) errs.push(`inimigo ${e.id}: golpe não registrado ${a.move.id}`);
  }
  for (const t of Object.values(LOOT_TABLES))
    for (const en of t.entries)
      if (en.item && !ITEMS[en.item]) errs.push(`loot ${t.id}: item desconhecido ${en.item}`);
  for (const c of Object.values(CHARACTERS)) {
    const m = MOVES[c.special];
    if (!m) errs.push(`personagem ${c.id}: especial não registrado ${c.special}`);
    else if (!m.special || !m.manaCost) errs.push(`personagem ${c.id}: especial ${m.id} sem marca/custo`);
    if (c.stats.hp <= 0 || c.stats.mana <= 0) errs.push(`personagem ${c.id}: vida/mana inválidas`);
  }
  return errs;
}
