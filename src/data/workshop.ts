export { totalXp, xpForLevel } from './balance';
import { CHARACTERS } from './characters';
import { MOVES } from './melee';
import type { CharacterId, HitSource } from './types';
import './workshopMoves';

/**
 * Oficina: a árvore de melhorias de cada personagem, em quatro ramos. Cada melhoria pede um mínimo de XP (a soma de
 * tudo o que o jogador já ganhou) para ficar disponível e custa sucata para comprar; algumas pedem a anterior do
 * mesmo ramo. Atributos sobem em três níveis, ponderados pelos limites de cada personagem (a Maga ganha pouca
 * vida e muita magia; o Militar, muita vida e pouca agilidade). Os especiais novos trocam o especial (só um fica
 * em uso, escolhido na Oficina), os combos novos saem de golpes que já existem e as defesas mudam como ele apanha.
 */

export type PerkBranch = 'attr' | 'combo' | 'special' | 'defense';
export type AttrId = 'vigor' | 'forca' | 'agilidade' | 'energia' | 'pontaria' | 'magia';
export type DefenseId = 'dodge' | 'guard' | 'armor' | 'shield' | 'counter';

/** Ganhos de atributo: vida e mana somam pontos; o resto soma ao multiplicador (0,06 = +6%). */
export interface StatBonus {
  hp?: number;
  mana?: number;
  manaRegen?: number;
  dmg?: Partial<Record<HitSource, number>>;
  speed?: number;
  jump?: number;
  reload?: number;
}

export interface PerkDef {
  id: string;
  character: CharacterId;
  branch: PerkBranch;
  /** Linha na árvore (1 = primeira). */
  tier: number;
  /** Textos em português (chaves de tradução); os atributos montam o texto a partir dos números. */
  name: string;
  desc: string;
  /** Nível do jogador que libera a compra (mostrado como XP total). */
  level: number;
  price: number;
  /** Melhoria do mesmo ramo que precisa vir antes. */
  requires?: string;
  attr?: { id: AttrId; level: number; bonus: StatBonus };
  /** Especial novo (id do golpe). */
  special?: string;
  /** Combo novo: `button` durante um dos golpes `from` sai o golpe `to`. */
  combo?: { from: string[]; button: 'J' | 'K'; to: string };
  defense?: DefenseId;
}

/** Defesas: números de cada uma. */
export const DEFENSE = {
  /** Esquiva: toque duplo para cima ou para baixo. Velocidade (m/s), duração e invencibilidade (ticks), espera. */
  dodge: { speed: 9, ticks: 12, invuln: 18, cooldown: 36, tapTicks: 15 },
  /** Guarda: chance de bloquear golpes e tiros de frente (sem estar atacando) e o dano que ainda passa. */
  guard: { chance: 0.35, mult: 0.25 },
  /** Couraça: dano recebido. */
  armor: { mult: 0.85 },
  /** Escudo de energia: começa a fase com ele e recarrega `regen` por segundo depois de `delayS` sem apanhar. */
  shield: { max: 40, regen: 5, delayS: 4 },
  /** Contra-golpe: dano dobrado por um instante depois de uma esquiva ou de um bloqueio. */
  counter: { s: 1.5 },
};

/** Atributos: nome, o que melhora e o ganho por nível com peso 1. */
export const ATTRS: Record<AttrId, { name: string; step: StatBonus }> = {
  vigor: { name: 'Vigor', step: { hp: 15 } },
  forca: { name: 'Força', step: { dmg: { melee: 0.06, weapon: 0.06, special: 0.06 } } },
  agilidade: { name: 'Agilidade', step: { speed: 0.04, jump: 0.03 } },
  energia: { name: 'Energia', step: { mana: 15, manaRegen: 0.1 } },
  pontaria: { name: 'Pontaria', step: { dmg: { gun: 0.06 }, reload: 0.08 } },
  magia: { name: 'Magia', step: { dmg: { staff: 0.07 }, mana: 5 } },
};

/**
 * Peso de cada atributo por personagem (0 = não tem): quem não atira não tem Pontaria, quem não conjura não tem
 * Magia, e cada um cresce mais no que já é bom e menos no que é fraco.
 */
const WEIGHTS: Record<CharacterId, Partial<Record<AttrId, number>>> = {
  robot: { vigor: 1, forca: 1, agilidade: 1, energia: 1, pontaria: 1, magia: 1 },
  mage: { vigor: 0.6, forca: 0.5, agilidade: 0.9, energia: 1.4, magia: 1.4 },
  military: { vigor: 1.4, forca: 1.3, agilidade: 0.6, energia: 0.6, pontaria: 1.1 },
  cyborg: { vigor: 1, forca: 0.9, agilidade: 1, energia: 0.9, pontaria: 1.4 },
  mutant: { vigor: 1.2, forca: 1.2, agilidade: 1.3, energia: 0.8, pontaria: 0.7 },
  prodigy: { vigor: 0.6, forca: 1.4, agilidade: 1.3, energia: 1.1, magia: 1.1 },
};

export const ATTR_ORDER: AttrId[] = ['vigor', 'forca', 'agilidade', 'energia', 'pontaria', 'magia'];
/** Nível do jogador e preço de cada nível de atributo. */
const ATTR_LEVELS = [
  { level: 2, price: 200 },
  { level: 6, price: 500 },
  { level: 12, price: 1000 },
];

function scaled(step: StatBonus, k: number): StatBonus {
  const r = (v: number, d: number) => Math.round(v * k * d) / d;
  const out: StatBonus = {};
  if (step.hp) out.hp = Math.round(step.hp * k);
  if (step.mana) out.mana = Math.round(step.mana * k);
  if (step.manaRegen) out.manaRegen = r(step.manaRegen, 100);
  if (step.speed) out.speed = r(step.speed, 1000);
  if (step.jump) out.jump = r(step.jump, 1000);
  if (step.reload) out.reload = r(step.reload, 100);
  if (step.dmg) {
    out.dmg = {};
    for (const [s, v] of Object.entries(step.dmg)) out.dmg[s as HitSource] = r(v, 1000);
  }
  return out;
}

/** Combos, especiais e defesas de cada personagem (nome, texto e o que liberam). */
const CONTENT: Record<
  CharacterId,
  {
    combos: [string, string, string, string];
    specials: [string, string, string, string];
    defenses: [DefenseId, string, DefenseId, string];
  }
> = {
  robot: {
    combos: [
      'Pistão Turbo',
      'J depois do uppercut: um soco de pistão que arremessa o inimigo longe.',
      'Chute Foguete',
      'K, K: o segundo chute vira uma voadora com propulsão.',
    ],
    specials: [
      'Pulso EMP',
      'Explosão elétrica em volta que atordoa todo mundo, e uma onda que corre pelo chão.',
      'Míssil Teleguiado',
      'Dispara um míssil que persegue o inimigo mais próximo e explode.',
    ],
    defenses: ['guard', 'Blindagem Frontal', 'shield', 'Escudo de Bateria'],
  },
  mage: {
    combos: [
      'Palma Arcana',
      'J no fim do combo (depois do uppercut ou do terceiro golpe do cajado): uma rajada arcana que pode atordoar.',
      'Giro do Manto',
      'K, K: um giro com o manto em chamas.',
    ],
    specials: [
      'Chuva de Meteoros',
      'Meteoros de fogo caem à frente, cada um avisado por um círculo no chão.',
      'Prisão de Gelo',
      'Congela quem estiver em volta.',
    ],
    defenses: ['dodge', 'Passo Etéreo', 'shield', 'Barreira Arcana'],
  },
  military: {
    combos: [
      'Marreta Dupla',
      'J depois do uppercut: soca o chão com as duas mãos e derruba todos em volta.',
      'Rasteira',
      'K, K: uma rasteira que derruba.',
    ],
    specials: [
      'Ataque Aéreo',
      'Pede mísseis pelo rádio: eles caem à frente, cada um avisado por um círculo no chão.',
      'Escudo Tático',
      'Fica invencível por alguns segundos e empurra quem estiver colado.',
    ],
    defenses: ['guard', 'Guarda Tática', 'armor', 'Colete Reforçado'],
  },
  cyborg: {
    combos: [
      'Soco de Plasma',
      'J depois do uppercut: um soco elétrico que ainda dispara um tiro de plasma.',
      'Chute Servo',
      'K, K: chutes em sequência, rápidos como uma metralhadora.',
    ],
    specials: [
      'Sobrecarga',
      'Dano dobrado por 7 segundos e um choque em volta.',
      'Canhão de Plasma',
      'Um tiro de plasma enorme que atravessa vários inimigos.',
    ],
    defenses: ['dodge', 'Propulsores', 'shield', 'Campo de Força'],
  },
  mutant: {
    combos: [
      'Garra Dupla',
      'J depois do uppercut: garras envenenadas.',
      'Investida Mutante',
      'K, K: atropela quem estiver na frente.',
    ],
    specials: [
      'Salto Sísmico',
      'Bate no chão e solta uma onda de choque que derruba quem estiver no chão.',
      'Nuvem Tóxica',
      'Solta uma nuvem venenosa em volta por alguns segundos.',
    ],
    defenses: ['armor', 'Couro Grosso', 'guard', 'Braço Escudo'],
  },
  prodigy: {
    combos: [
      'Punho do Dragão',
      'J no fim do combo (depois do uppercut ou do terceiro golpe do cajado): um soco arcano que lança o inimigo alto.',
      'Chute Meia-Lua',
      'K, K: um chute giratório que acerta dos dois lados.',
    ],
    specials: [
      'Palma do Dragão',
      'Uma bola de fogo arcano gigante que atravessa inimigos e explode.',
      'Chute Lunar',
      'Gira em chutes de vento que lançam os inimigos e soltam ciclones.',
    ],
    defenses: ['dodge', 'Esquiva do Dojo', 'counter', 'Contra-golpe'],
  },
};

/** Golpes liberados por personagem: [combo do fim da sequência, combo do chute, especial 1, especial 2]. */
const MOVE_IDS: Record<CharacterId, [string, string, string, string]> = {
  robot: ['pistaoTurbo', 'chuteFoguete', 'pulsoEMP', 'misselTeleguiado'],
  mage: ['palmaArcana', 'giroDoManto', 'chuvaMeteoros', 'prisaoGelo'],
  military: ['marretaDupla', 'rasteira', 'ataqueAereo', 'escudoTatico'],
  cyborg: ['socoPlasma', 'chuteServo', 'sobrecarga', 'canhaoPlasma'],
  mutant: ['garraDupla', 'investidaMutante', 'saltoSismico', 'nuvemToxica'],
  prodigy: ['punhoDoDragao', 'chuteMeiaLua', 'palmaDoDragao', 'chuteLunar'],
};

/** Defesas: o que fazem (texto da Oficina). */
export const DEFENSE_DESC: Record<DefenseId, string> = {
  dodge: 'Toque duas vezes para cima ou para baixo: uma esquiva rápida em profundidade, sem levar dano.',
  guard:
    'Às vezes bloqueia golpes e tiros de frente (quando não está atacando): leva só um quarto do dano e não cai.',
  armor: 'Leva 15% menos dano de tudo.',
  shield:
    'Começa cada fase com um escudo de energia, que se recarrega sozinho depois de um tempo sem apanhar.',
  counter: 'Depois de uma esquiva ou de um bloqueio, o próximo golpe dá o dobro de dano.',
};

/** Fim de sequência: depois do uppercut, do terceiro golpe do cajado ou do último golpe de uma arma branca. */
const FINISHERS = ['uppercut', 'staff3', 'knife3', 'machete3', 'katana3', 'bat3', 'pipe3', 'sledge2'];

function buildPerks(): PerkDef[] {
  const out: PerkDef[] = [];
  for (const c of Object.keys(CHARACTERS) as CharacterId[]) {
    const w = WEIGHTS[c];
    for (const a of ATTR_ORDER) {
      const k = w[a];
      if (!k) continue;
      ATTR_LEVELS.forEach((lv, i) =>
        out.push({
          id: `${c}.${a}${i + 1}`,
          character: c,
          branch: 'attr',
          tier: i + 1,
          name: ATTRS[a].name,
          desc: '',
          level: lv.level,
          price: lv.price,
          requires: i > 0 ? `${c}.${a}${i}` : undefined,
          attr: { id: a, level: i + 1, bonus: scaled(ATTRS[a].step, k) },
        }),
      );
    }
    const t = CONTENT[c];
    const [comboA, comboB, specA, specB] = MOVE_IDS[c];
    out.push(
      {
        id: `${c}.combo1`,
        character: c,
        branch: 'combo',
        tier: 1,
        name: t.combos[0],
        desc: t.combos[1],
        level: 4,
        price: 600,
        combo: { from: FINISHERS, button: 'J', to: comboA },
      },
      {
        id: `${c}.combo2`,
        character: c,
        branch: 'combo',
        tier: 2,
        name: t.combos[2],
        desc: t.combos[3],
        level: 9,
        price: 1400,
        requires: `${c}.combo1`,
        combo: { from: ['kick'], button: 'K', to: comboB },
      },
      {
        id: `${c}.special1`,
        character: c,
        branch: 'special',
        tier: 1,
        name: t.specials[0],
        desc: t.specials[1],
        level: 5,
        price: 900,
        special: specA,
      },
      {
        id: `${c}.special2`,
        character: c,
        branch: 'special',
        tier: 2,
        name: t.specials[2],
        desc: t.specials[3],
        level: 11,
        price: 2200,
        requires: `${c}.special1`,
        special: specB,
      },
      {
        id: `${c}.defense1`,
        character: c,
        branch: 'defense',
        tier: 1,
        name: t.defenses[1],
        desc: DEFENSE_DESC[t.defenses[0]],
        level: 3,
        price: 500,
        defense: t.defenses[0],
      },
      {
        id: `${c}.defense2`,
        character: c,
        branch: 'defense',
        tier: 2,
        name: t.defenses[3],
        desc: DEFENSE_DESC[t.defenses[2]],
        level: 8,
        price: 1200,
        requires: `${c}.defense1`,
        defense: t.defenses[2],
      },
    );
  }
  return out;
}

export const PERKS: PerkDef[] = buildPerks();
export const PERK_BY_ID: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]));

export function perksOf(c: CharacterId): PerkDef[] {
  return PERKS.filter((p) => p.character === c);
}

/** Especiais que o personagem pode usar com as melhorias que tem (o original sempre). */
export function specialsOf(c: CharacterId, perks: readonly string[]): string[] {
  const out = [CHARACTERS[c].special];
  for (const id of perks) {
    const p = PERK_BY_ID[id];
    if (p?.character === c && p.special) out.push(p.special);
  }
  return out;
}

/** Efeito somado das melhorias de um personagem (no sim). */
export interface PerkEffects {
  hp: number;
  mana: number;
  manaRegen: number;
  dmg: Record<HitSource, number>;
  speed: number;
  jump: number;
  reload: number;
  defenses: ReadonlySet<DefenseId>;
  /** Combos novos: `${golpe}|${botão}` → golpe seguinte. */
  links: ReadonlyMap<string, string>;
}

const cache = new Map<string, PerkEffects>();

/** Soma as melhorias (ids de outros personagens ou desconhecidos são ignorados). */
export function perkEffects(c: CharacterId, perks: readonly string[] = []): PerkEffects {
  const key = `${c}|${perks.join(',')}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const fx = {
    hp: 0,
    mana: 0,
    manaRegen: 0,
    dmg: { melee: 0, weapon: 0, gun: 0, staff: 0, special: 0 },
    speed: 0,
    jump: 0,
    reload: 0,
    defenses: new Set<DefenseId>(),
    links: new Map<string, string>(),
  };
  for (const id of perks) {
    const p = PERK_BY_ID[id];
    if (!p || p.character !== c) continue;
    const b = p.attr?.bonus;
    if (b) {
      fx.hp += b.hp ?? 0;
      fx.mana += b.mana ?? 0;
      fx.manaRegen += b.manaRegen ?? 0;
      fx.speed += b.speed ?? 0;
      fx.jump += b.jump ?? 0;
      fx.reload += b.reload ?? 0;
      for (const [s, v] of Object.entries(b.dmg ?? {})) fx.dmg[s as HitSource] += v;
    }
    if (p.defense) fx.defenses.add(p.defense);
    if (p.combo && MOVES[p.combo.to])
      for (const from of p.combo.from) fx.links.set(`${from}|${p.combo.button}`, p.combo.to);
  }
  cache.set(key, fx);
  return fx;
}
