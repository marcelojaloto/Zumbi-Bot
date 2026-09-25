import type { Profile } from '../../app/Profile';
import type { ScreenManager } from '../ScreenManager';

/** O que as telas precisam do aplicativo (evita dependência circular com App). */
export interface UiHost {
  readonly profile: Profile;
  readonly screens: ScreenManager;
  resume(): void;
  restartLevel(): void;
  quitToMenu(): void;
  startLevel(mapId: string, levelIdx: number): void;
  applySettings(): void;
  /** Refaz as telas abertas depois de trocar o idioma. */
  relocalize(): void;
  openSettings(tab?: string): void;
  openControls(): void;
  playUi(id: string): void;
  readonly inGame: boolean;
  /** Controles de toque ativos (celular/tablet). */
  readonly touchActive: boolean;
}
