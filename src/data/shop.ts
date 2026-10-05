import type { MeleeId, WeaponId } from './types';

/**
 * Preços da Loja (em sucata) além do visual: armas de fogo (ficam no arsenal para sempre, como as achadas nos
 * mapas), armas brancas (a escolhida já começa cada fase na mão, inteira) e o item de reviver de cada personagem.
 */
export const FIREARM_PRICES: Partial<Record<WeaponId, number>> = {
  shotgun: 600,
  smg: 900,
  rifle: 1400,
  sniper: 1800,
  mg: 2400,
  gl: 3000,
};

export const MELEE_PRICES: Record<MeleeId, number> = {
  knife: 250,
  pipe: 300,
  bat: 400,
  machete: 500,
  katana: 1200,
  sledge: 1500,
};

export const MELEE_ORDER: MeleeId[] = ['knife', 'pipe', 'bat', 'machete', 'katana', 'sledge'];

export const REVIVE_PRICE = 900;
