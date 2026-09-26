/**
 * Como os aparelhos se conectam. O jogo só vê "links" (conexões que levam mensagens JSON, confiáveis e em ordem);
 * a implementação real usa WebRTC via PeerJS (serviço grátis, sem cadastro), e os testes usam um canal local
 * entre abas do mesmo navegador.
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
}

/** Sala aberta pelo anfitrião: recebe as conexões de quem digita o código. */
export interface RoomServer {
  readonly code: string;
  close(): void;
}

export interface Transport {
  /** Abre uma sala com um código novo; `onLink` recebe cada pessoa que entra. */
  host(onLink: (l: Link) => void): Promise<RoomServer>;
  /** Conecta na sala do código. */
  join(code: string): Promise<Link>;
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
 * Transporte escolhido pela URL: `?net=local` (testes, abas do mesmo navegador) ou PeerJS — no serviço público
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
