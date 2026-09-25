import type { ThemeId } from '../../../data/types';
import type { EnvCtx } from '../builder';
import { sandboxTheme } from './sandbox';
import { vilaTheme } from './vila';
import { torreTheme } from './torre';
import { bancoTheme } from './banco';
import { casteloTheme } from './castelo';
import { toxicaTheme } from './toxica';
import { florestaTheme } from './floresta';
import { centroTheme } from './centro';
import { chamasTheme } from './chamas';
import { guerraTheme } from './guerra';
import { arenaTheme } from './arena';

export const THEMES: Partial<Record<ThemeId, (ctx: EnvCtx) => void>> = {
  sandbox: sandboxTheme,
  vila: vilaTheme,
  torre: torreTheme,
  banco: bancoTheme,
  castelo: casteloTheme,
  toxica: toxicaTheme,
  floresta: florestaTheme,
  centro: centroTheme,
  chamas: chamasTheme,
  guerra: guerraTheme,
  arena: arenaTheme,
};
