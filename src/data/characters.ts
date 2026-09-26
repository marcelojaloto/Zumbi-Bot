import type { CharacterDef, CharacterId, HitSource } from './types';

const DMG = (melee: number, gun: number, staff: number): Record<HitSource, number> => ({
  melee,
  gun,
  staff,
  special: 1,
});

/**
 * Personagens jogáveis. O robô é a base (todos os multiplicadores = 1): o equilíbrio do jogo solo com ele não
 * muda. Os outros trocam força por fraqueza em alguma área e têm um especial próprio (golpe em `MOVES`).
 */
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  robot: {
    id: 'robot',
    name: 'Zumbi Bot',
    title: 'O robô rebelde',
    desc: 'Equilibrado em tudo: bom de briga, de tiro e de magia.',
    specialName: 'Giro Turbo',
    specialDesc: 'Gira com os braços abertos acertando todos em volta, sem levar dano.',
    color: 0xff8c1a,
    stats: {
      hp: 100,
      mana: 100,
      manaRegen: 1,
      speed: 1,
      jump: 1,
      dmg: DMG(1, 1, 1),
      reload: 1,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 1.2,
      hitstun: 1,
    },
    resist: {},
    special: 'giroTurbo',
    startMode: 'gun',
    metal: true,
  },
  mage: {
    id: 'mage',
    name: 'Maga',
    title: 'Feiticeira arcana',
    desc: 'Mestra dos cajados: magias muito mais fortes e mana de sobra, mas aguenta pouco.',
    specialName: 'Nova Arcana',
    specialDesc: 'Explosão de energia em volta que derruba e empurra todos os inimigos.',
    color: 0xb05aff,
    stats: {
      hp: 85,
      mana: 140,
      manaRegen: 1.5,
      speed: 1,
      jump: 1.05,
      dmg: DMG(0.85, 0.9, 1.35),
      reload: 1,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 1,
      hitstun: 1.1,
    },
    resist: { fire: 0.85, ice: 0.85, electric: 0.85, water: 0.85, necro: 0.85 },
    special: 'novaArcana',
    startMode: 'staff',
    metal: false,
  },
  military: {
    id: 'military',
    name: 'Militar',
    title: 'Soldado super forte',
    desc: 'Muita vida e socos devastadores; quase não é empurrado. Mais lento e fraco em magia.',
    specialName: 'Soco Sísmico',
    specialDesc: 'Soca o chão e solta uma onda de choque que derruba quem estiver em volta.',
    color: 0x7a9a3a,
    stats: {
      hp: 140,
      mana: 70,
      manaRegen: 0.75,
      speed: 0.9,
      jump: 0.9,
      dmg: DMG(1.3, 1.1, 0.8),
      reload: 1,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 1.6,
      hitstun: 0.7,
    },
    resist: { bullet: 0.8, explosive: 0.8, blunt: 0.85, blade: 0.85 },
    special: 'socoSismico',
    startMode: 'gun',
    metal: false,
  },
  cyborg: {
    id: 'cyborg',
    name: 'Ciborgue',
    title: 'Meio humano, meio máquina',
    desc: 'Especialista em armas: tiros mais fortes e recarga rápida. Sofre com choques elétricos.',
    specialName: 'Raio Laser',
    specialDesc: 'Dispara um raio reto que atravessa todos os inimigos à frente e queima.',
    color: 0xff3a4a,
    stats: {
      hp: 110,
      mana: 90,
      manaRegen: 1,
      speed: 1.05,
      jump: 1,
      dmg: DMG(1, 1.3, 0.9),
      reload: 1.35,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 1.3,
      hitstun: 1,
    },
    resist: { bullet: 0.9, toxic: 0.7, electric: 1.2 },
    special: 'raioLaser',
    startMode: 'gun',
    metal: true,
  },
  mutant: {
    id: 'mutant',
    name: 'Mutante',
    title: 'Fera regenerativa',
    desc: 'Rápido, pula alto e se regenera quando fica sem apanhar. Ruim de mira.',
    specialName: 'Fúria Mutante',
    specialDesc: 'Rugido que derruba e envenena; por 6 s bate mais forte, corre mais e rouba vida.',
    color: 0x5aff5a,
    stats: {
      hp: 120,
      mana: 80,
      manaRegen: 0.9,
      speed: 1.15,
      jump: 1.15,
      dmg: DMG(1.15, 0.85, 0.9),
      reload: 1,
      hpRegen: 2,
      hpRegenDelayS: 3,
      mass: 1.3,
      hitstun: 1,
    },
    resist: { toxic: 0.5, fire: 1.15 },
    special: 'furiaMutante',
    startMode: 'gun',
    metal: false,
  },
};

export const CHARACTER_ORDER: CharacterId[] = ['robot', 'mage', 'military', 'cyborg', 'mutant'];

export function isCharacterId(v: unknown): v is CharacterId {
  return typeof v === 'string' && v in CHARACTERS;
}

export function getCharacter(id: CharacterId | undefined): CharacterDef {
  return CHARACTERS[id ?? 'robot'] ?? CHARACTERS.robot;
}

/** Fúria mutante: bônus enquanto o poder 'rage' está ativo. */
export const RAGE = { melee: 1.35, speed: 1.2, lifesteal: 0.2 };
