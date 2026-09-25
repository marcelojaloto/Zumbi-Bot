import type { ThemeId } from '../../../data/types';
import type { EnvCtx } from '../builder';
import { sandboxTheme } from './sandbox';
import { vilaTheme } from './vila';

export const THEMES: Partial<Record<ThemeId, (ctx: EnvCtx) => void>> = {
  sandbox: sandboxTheme,
  vila: vilaTheme,
};
