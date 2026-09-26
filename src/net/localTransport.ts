import { randomCode } from './protocol';
import { NetError, netRandom, type Link, type RoomServer, type Transport } from './transport';

/** Mensagem no canal local: pedido de conexão, aceite, dado ou fim. */
interface Frame {
  k: 'syn' | 'ack' | 'msg' | 'fin';
  from: string;
  to?: string;
  code?: string;
  data?: unknown;
}

class LocalLink implements Link {
  onMessage: ((msg: unknown) => void) | null = null;
  onClose: (() => void) | null = null;
  closed = false;

  constructor(
    private t: LocalTransport,
    readonly peer: string,
  ) {}

  send(msg: unknown): void {
    if (!this.closed) this.t.post({ k: 'msg', to: this.peer, data: msg });
  }

  close(): void {
    if (this.closed) return;
    this.t.post({ k: 'fin', to: this.peer });
    this.end();
  }

  end(): void {
    if (this.closed) return;
    this.closed = true;
    this.t.forget(this.peer);
    this.onClose?.();
  }
}

/**
 * Transporte local (testes automatizados): abas do mesmo navegador conversam por um BroadcastChannel.
 * Mesmo comportamento do PeerJS para o jogo — código de sala, conexões e mensagens em ordem.
 */
export class LocalTransport implements Transport {
  private id = `p${Math.floor(netRandom() * 1e9)}`;
  private ch: BroadcastChannel;
  private links = new Map<string, LocalLink>();
  private rooms = new Map<string, (l: Link) => void>();
  private waiting = new Map<string, (peer: string) => void>();

  constructor(name = 'zumbibot-net') {
    this.ch = new BroadcastChannel(name);
    this.ch.onmessage = (e: MessageEvent) => this.recv(e.data as Frame);
  }

  post(f: Omit<Frame, 'from'>): void {
    this.ch.postMessage({ ...f, from: this.id });
  }

  forget(peer: string): void {
    this.links.delete(peer);
  }

  private recv(f: Frame): void {
    if (f.k === 'syn') {
      const onLink = f.code ? this.rooms.get(f.code) : undefined;
      if (!onLink) return;
      const l = new LocalLink(this, f.from);
      this.links.set(f.from, l);
      this.post({ k: 'ack', to: f.from, code: f.code });
      onLink(l);
      return;
    }
    if (f.to !== this.id) return;
    if (f.k === 'ack') {
      this.waiting.get(f.code ?? '')?.(f.from);
      return;
    }
    const l = this.links.get(f.from);
    if (!l) return;
    if (f.k === 'msg') l.onMessage?.(f.data);
    else if (f.k === 'fin') l.end();
  }

  async host(onLink: (l: Link) => void): Promise<RoomServer> {
    const code = randomCode(netRandom);
    this.rooms.set(code, onLink);
    return {
      code,
      close: () => {
        this.rooms.delete(code);
      },
    };
  }

  join(code: string): Promise<Link> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting.delete(code);
        reject(new NetError('not-found'));
      }, 1500);
      this.waiting.set(code, (peer) => {
        clearTimeout(timer);
        this.waiting.delete(code);
        const l = new LocalLink(this, peer);
        this.links.set(peer, l);
        resolve(l);
      });
      this.post({ k: 'syn', code });
    });
  }

  /** Fecha o canal (testes). */
  dispose(): void {
    for (const l of [...this.links.values()]) l.close();
    this.ch.close();
  }
}
