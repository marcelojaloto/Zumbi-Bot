/**
 * Como os aparelhos se conectam. O jogo só vê "links" (conexões que levam mensagens JSON de qualquer tamanho,
 * confiáveis e em ordem); a implementação real usa WebRTC via PeerJS (serviço grátis, sem cadastro), e os testes
 * usam um canal local entre abas do mesmo navegador. As duas cortam as mensagens grandes em pedaços (`frame.ts`).
 */

export type NetErrorKind =
  /** Não existe sala com esse código. */
  | 'not-found'
  /** Sem internet. */
  | 'offline'
  /** O serviço de conexão (grátis) não respondeu. */
  | 'server'
  /** Achou a sala mas não conseguiu ligar os aparelhos (rede bloqueando). */
  | 'blocked'
  /** Demorou demais. */
  | 'timeout'
  /** Navegador sem suporte a WebRTC. */
  | 'unsupported'
  /** A sala já tem 5 jogadores. */
  | 'full'
  /** A partida já começou (dá para entrar quando ela acabar). */
  | 'started'
  /** Versões diferentes do jogo. */
  | 'version'
  /** A conexão caiu. */
  | 'lost';

export class NetError extends Error {
  constructor(
    readonly kind: NetErrorKind,
    detail?: string,
  ) {
    super(detail ? `${kind}: ${detail}` : kind);
  }
}

/** Uma conexão com outro aparelho. */
export interface Link {
  send(msg: unknown): void;
  close(): void;
  onMessage: ((msg: unknown) => void) | null;
  onClose: (() => void) | null;
  /** Id do outro aparelho no serviço de conexão (voz e troca de anfitrião). */
  readonly peerId?: string;
}

/**
 * Este aparelho no serviço de conexão. Vive a sala inteira, mesmo se a conexão com o anfitrião cair: a voz
 * continua e, se o anfitrião sair, um dos jogadores vira o novo anfitrião e os outros se conectam nele.
 */
export interface Endpoint {
  /** Id deste aparelho (para os outros ligarem: voz e troca de anfitrião). */
  readonly id: string;
  /** Voz deste aparelho; ausente quando o transporte não tem áudio. */
  readonly voice?: VoicePeer;
  /** Alguém conectou neste aparelho (pelo id ou pela porta do código): só o anfitrião aceita; null recusa. */
  onLink: ((l: Link) => void) | null;
  /** Conecta em outro aparelho pelo id (quando o anfitrião muda); `timeoutMs` limita a espera. */
  connect(to: string, timeoutMs?: number): Promise<Link>;
  /**
   * Abre a "porta" do código da sala neste aparelho: quem digitar o código chega aqui. O novo anfitrião tenta
   * até conseguir (o endereço do código fica livre quando o antigo anfitrião sai do serviço).
   */
  openDoor(code: string): Promise<boolean>;
  close(): void;
}

/** Chamadas de áudio de um aparelho (voz entre os jogadores da sala). */
export interface VoicePeer {
  /** Id deste aparelho no serviço de conexão. */
  readonly id: string;
  /** Liga para outro aparelho mandando `stream`; `meta` vai junto (o código da sala). */
  call(to: string, stream: MediaStream, meta: Record<string, unknown>): VoiceCall;
  /** Alguém ligou (atender com `answer`). */
  onCall: ((c: VoiceCall) => void) | null;
}

/** Uma chamada de áudio entre dois aparelhos. */
export interface VoiceCall {
  /** Id do outro aparelho. */
  readonly peer: string;
  readonly metadata: Record<string, unknown> | undefined;
  answer(stream: MediaStream): void;
  /** Troca a trilha de áudio enviada (microfone ⇄ nada) sem religar. null = não envia nada (mudo). */
  replaceTrack(track: MediaStreamTrack | null): void;
  /** Nível do áudio recebido agora (0..1); null quando o navegador não informa. */
  audioLevel(): number | null;
  /**
   * Energia acumulada do áudio recebido (estatísticas do WebRTC): a diferença entre duas leituras dá o nível médio
   * no intervalo, sem perder sons curtos. null quando o navegador não informa.
   */
  audioEnergy(): Promise<{ energy: number; duration: number } | null>;
  onStream: ((s: MediaStream) => void) | null;
  onClose: (() => void) | null;
  close(): void;
}

export interface Transport {
  /** Abre uma sala com um código novo; a porta do código fica neste aparelho. */
  host(): Promise<{ code: string; ep: Endpoint }>;
  /** Conecta na sala do código (este aparelho ganha um id próprio no serviço). */
  join(code: string): Promise<{ ep: Endpoint; link: Link }>;
}

/** Aleatório para códigos e ids (crypto quando existe). */
export function netRandom(): number {
  const c = globalThis.crypto;
  if (c?.getRandomValues) {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0]! / 2 ** 32;
  }
  return Math.random();
}

/**
 * Transporte escolhido pela URL: `?net=local` (testes, abas do mesmo navegador) ou PeerJS, no serviço público
 * ou em outro servidor (`?peer=host:porta/caminho`).
 */
export async function createTransport(kind: 'peer' | 'local', server?: string | null): Promise<Transport> {
  if (kind === 'local') {
    const { LocalTransport } = await import('./localTransport');
    return new LocalTransport();
  }
  const { PeerTransport } = await import('./peerTransport');
  return new PeerTransport(server);
}
