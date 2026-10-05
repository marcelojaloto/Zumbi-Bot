import type { Profile } from '../../app/Profile';
import type { VoiceGate } from '../../net/voiceGate';
import type { ScreenManager } from '../ScreenManager';

/** O que as telas precisam do aplicativo (evita dependência circular com App). */
export interface UiHost {
  readonly profile: Profile;
  readonly screens: ScreenManager;
  resume(): void;
  restartLevel(): void;
  quitToMenu(): void;
  /** Sai da sala online (quem fica continua; se era o anfitrião, outro jogador assume). */
  leaveRoom(): void;
  startLevel(mapId: string, levelIdx: number): void;
  /** Tela de seleção de personagem antes de começar a fase. */
  openLobby(mapId: string, levelIdx: number): void;
  applySettings(): void;
  /** Refaz as telas abertas depois de trocar o idioma. */
  relocalize(): void;
  openSettings(tab?: string): void;
  openControls(): void;
  playUi(id: string): void;
  readonly inGame: boolean;
  /** Controles de toque ativos (celular/tablet). */
  readonly touchActive: boolean;
  /** O navegador deixa instalar o jogo agora (aparece nas Configurações só quando dá). */
  readonly canInstall: boolean;
  /** Instala o jogo como app (depois o jogo volta para a tela cheia). */
  installApp(): void;
  /** Um registro do ranking foi salvo ou renomeado (o melhor do aparelho vai para o ranking global). */
  rankSaved(): void;
  /** Trava do chat de voz por idade (a sala libera, as Configurações bloqueiam de novo). */
  readonly voiceGate: VoiceGate;
}
