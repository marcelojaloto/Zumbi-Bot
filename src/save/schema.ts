import type {
  CharacterId,
  CosmeticId,
  CosmeticSlot,
  Difficulty,
  LevelId,
  MapId,
  StaffId,
  WeaponId,
} from '../data/types';
import type { KeyMap } from '../input/keymap';

export const SAVE_VERSION = 1;
export const SETTINGS_VERSION = 1;
export const RANKING_VERSION = 1;

export interface LevelProgress {
  completed: boolean;
  bestScore: number;
  bestTimeMs: number;
  stars: number;
}

export interface SaveV1 {
  version: 1;
  createdAt: number;
  updatedAt: number;
  /**
   * character = último personagem escolhido pelo jogador 1; rankName = último nome salvo no ranking (sugerido na
   * próxima vez; sem ele, sugere o apelido do personagem).
   */
  profile: {
    name: string;
    level: number;
    xp: number;
    scrap: number;
    character: CharacterId;
    rankName?: string;
  };
  progress: { unlockedLevels: LevelId[]; levels: Record<LevelId, LevelProgress> };
  unlocks: { firearms: WeaponId[]; staffs: StaffId[] };
  cosmetics: {
    owned: CosmeticId[];
    equipped: Partial<Record<CosmeticSlot, CosmeticId>>;
    seen: CosmeticId[];
    pity: number;
  };
  stats: { kills: number; deaths: number; bosses: number; playTimeMs: number; runs: number };
  /**
   * ngPlus = Novo Jogo+ desbloqueado; ngPlusOn = ativo nas próximas partidas; credits = jogo terminado (créditos
   * vistos) — também libera o personagem secreto.
   */
  flags: { ngPlus: boolean; ngPlusOn: boolean; tutorialDone: boolean; credits: boolean };
  /** Jornada em andamento: pontos somados mapa a mapa até perder todas as vidas ou terminar o jogo. */
  run?: CampaignRun;
}

/**
 * Jornada: os mapas jogados desde o último fim de jogo. A pontuação de cada mapa (vencido ou o da derrota) se
 * soma; quando o jogador perde todas as vidas ou termina o jogo, a jornada vai para o ranking.
 */
export interface CampaignRun {
  score: number;
  kills: number;
  timeMs: number;
  /** Mapas vencidos na jornada. */
  maps: number;
  /** Último mapa jogado. */
  mapId: MapId;
  levelId: LevelId;
  chars: CharacterId[];
  ngPlus: boolean;
  /** Maior equipe que jogou a jornada (1 = sozinho). */
  team: number;
  startedAt: number;
}

export type QualityChoice = 'auto' | 'low' | 'medium' | 'high';

export interface SettingsV1 {
  version: 1;
  /** `voice`: volume das vozes do chat de voz online. */
  audio: { master: number; music: number; sfx: number; voice: number; muted: boolean };
  controls: {
    mouseSensitivity: number;
    pointerLock: boolean;
    aimAssist: 'off' | 'low' | 'high';
    hints: boolean;
    /** Controles de toque (celular/tablet). */
    touch: TouchSettings;
    /** Teclas trocadas pelo jogador (teclado inteiro); ausente = teclas padrão. */
    keys?: Partial<KeyMap>;
  };
  graphics: {
    quality: QualityChoice;
    renderScale: number;
    screenShake: number;
    damageNumbers: boolean;
    showFps: boolean;
    /** Acessibilidade: atenua clarões de tela, pulso de dano e aberração cromática. */
    reduceFlashes: boolean;
  };
  gameplay: { difficulty: Difficulty };
  /** Idioma da interface; "auto" segue o navegador. */
  language: LanguageChoice;
}

export type LanguageChoice = 'auto' | 'pt' | 'en';

export interface TouchSettings {
  /** auto = aparece em celulares e tablets (e ao tocar na tela). */
  mode: 'auto' | 'on' | 'off';
  /** Escala dos controles (0,7–1,4). */
  size: number;
  /** Opacidade em repouso (0,15–0,8). */
  opacity: number;
  /** Vibração curta ao tocar (Android). */
  haptics: boolean;
}

export interface RankEntry {
  name: string;
  score: number;
  mapId: MapId;
  levelId: LevelId;
  timeMs: number;
  kills: number;
  playerLevel: number;
  date: number;
  /** Terminou o jogo (venceu o último mapa); false = perdeu todas as vidas. */
  victory: boolean;
  ngPlus?: boolean;
  /** Personagens da partida (um por jogador). */
  chars?: CharacterId[];
  /** Mapas vencidos na jornada (registros antigos, de um mapa só, não têm). */
  maps?: number;
}

export interface RankingV1 {
  version: 1;
  entries: RankEntry[];
}

export function defaultSave(now = 0): SaveV1 {
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    profile: { name: 'Zumbi Bot', level: 1, xp: 0, scrap: 0, character: 'robot' },
    progress: { unlockedLevels: ['vila-1'], levels: {} },
    unlocks: { firearms: ['pistol'], staffs: ['heal'] },
    cosmetics: { owned: [], equipped: {}, seen: [], pity: 0 },
    stats: { kills: 0, deaths: 0, bosses: 0, playTimeMs: 0, runs: 0 },
    flags: { ngPlus: false, ngPlusOn: false, tutorialDone: false, credits: false },
  };
}

export function defaultSettings(): SettingsV1 {
  return {
    version: 1,
    audio: { master: 0.8, music: 0.55, sfx: 0.85, voice: 1, muted: false },
    controls: {
      mouseSensitivity: 1,
      pointerLock: true,
      aimAssist: 'low',
      hints: true,
      touch: { mode: 'auto', size: 1, opacity: 0.35, haptics: true },
    },
    graphics: {
      quality: 'auto',
      renderScale: 1,
      screenShake: 1,
      damageNumbers: true,
      showFps: false,
      reduceFlashes: false,
    },
    gameplay: { difficulty: 'normal' },
    language: 'auto',
  };
}

export function defaultRanking(): RankingV1 {
  return { version: 1, entries: [] };
}
