import type { ThemeId } from '../../../data/types';
import type { EnvCtx } from '../builder';
import { sandboxTheme } from './sandbox';

export const THEMES: Partial<Record<ThemeId, (ctx: EnvCtx) => void>> = {
  sandbox: sandboxTheme,
};
