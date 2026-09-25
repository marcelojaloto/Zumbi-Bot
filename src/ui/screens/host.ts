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
  openSettings(): void;
  openControls(): void;
  playUi(id: string): void;
  readonly inGame: boolean;
}
