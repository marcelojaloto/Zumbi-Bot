import { randomCode } from './protocol';
import { NetError, netRandom, type Endpoint, type Link, type Transport } from './transport';

/** Mensagem no canal local: pedido de conexão, aceite, dado ou fim. */
interface Frame {
  k: 'syn' | 'ack' | 'msg' | 'fin';
  from: string;
  to?: string;
  /** Pedido de conexão pela porta de um código de sala. */
  code?: string;
  /** Identifica o pedido de conexão (o aceite volta com ele). */
  req?: number;
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

  get peerId(): string {
    return this.peer;
  }

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
    this.t.forget(this);
    this.onClose?.();
  }
}

class LocalEndpoint implements Endpoint {
  onLink: ((l: Link) => void) | null = null;

  constructor(private t: LocalTransport) {}

  get id(): string {
    return this.t.id;
  }

  connect(to: string): Promise<Link> {
    return this.t.dial({ to });
  }

  async openDoor(code: string): Promise<boolean> {
    this.t.doors.add(code);
    return true;
  }

  close(): void {
    this.t.release(this);
  }
}

/**
 * Transporte local (testes automatizados): abas do mesmo navegador conversam por um BroadcastChannel.
 * Mesmo comportamento do PeerJS para o jogo — código de sala, conexões pelo id, mensagens em ordem e troca de
 * anfitrião (a porta do código muda de aparelho).
 */
export class LocalTransport implements Transport {
  readonly id = `p${Math.floor(netRandom() * 1e9)}`;
  readonly doors = new Set<string>();
  private ch: BroadcastChannel;
  private links = new Map<string, LocalLink>();
  private ep: LocalEndpoint | null = null;
  private waiting = new Map<number, (peer: string) => void>();
  private req = 0;
  private closed = false;

  constructor(name = 'zumbibot-net') {
    this.ch = new BroadcastChannel(name);
    this.ch.onmessage = (e: MessageEvent) => this.recv(e.data as Frame);
    // aba fechando: os outros ficam sabendo na hora (como a conexão de verdade caindo)
    if (typeof addEventListener === 'function') addEventListener('pagehide', () => this.dispose());
  }

  post(f: Omit<Frame, 'from'>): void {
    if (!this.closed) this.ch.postMessage({ ...f, from: this.id });
  }

  forget(l: LocalLink): void {
    if (this.links.get(l.peer) === l) this.links.delete(l.peer);
  }

  private recv(f: Frame): void {
    if (f.k === 'syn') {
      const mine = f.code ? this.doors.has(f.code) : f.to === this.id;
      const onLink = mine ? this.ep?.onLink : null;
      if (!onLink) return;
      const l = new LocalLink(this, f.from);
      this.links.get(f.from)?.end();
      this.links.set(f.from, l);
      this.post({ k: 'ack', to: f.from, req: f.req });
      onLink(l);
      return;
    }
    if (f.to !== this.id) return;
    if (f.k === 'ack') {
      this.waiting.get(f.req ?? -1)?.(f.from);
      return;
    }
    const l = this.links.get(f.from);
    if (!l) return;
    if (f.k === 'msg') l.onMessage?.(f.data);
    else if (f.k === 'fin') l.end();
  }

  /** Pede conexão pela porta de um código ou direto a um aparelho. */
  dial(target: { code?: string; to?: string }): Promise<Link> {
    const req = ++this.req;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting.delete(req);
        reject(new NetError(target.code ? 'not-found' : 'timeout'));
      }, 1500);
      this.waiting.set(req, (peer) => {
        clearTimeout(timer);
        this.waiting.delete(req);
        const l = new LocalLink(this, peer);
        this.links.get(peer)?.end();
        this.links.set(peer, l);
        resolve(l);
      });
      this.post({ k: 'syn', req, ...target });
    });
  }

  release(ep: LocalEndpoint): void {
    if (this.ep !== ep) return;
    this.ep = null;
    this.doors.clear();
    for (const l of [...this.links.values()]) l.close();
  }

  async host(): Promise<{ code: string; ep: Endpoint }> {
    if (this.ep) this.release(this.ep);
    const code = randomCode(netRandom);
    this.ep = new LocalEndpoint(this);
    this.doors.add(code);
    return { code, ep: this.ep };
  }

  async join(code: string): Promise<{ ep: Endpoint; link: Link }> {
    if (this.ep) this.release(this.ep);
    const ep = new LocalEndpoint(this);
    this.ep = ep;
    try {
      return { ep, link: await this.dial({ code }) };
    } catch (e) {
      this.release(ep);
      throw e;
    }
  }

  /** Fecha o canal (testes). */
  dispose(): void {
    if (this.closed) return;
    for (const l of [...this.links.values()]) l.close();
    this.closed = true;
    this.ch.close();
  }
}
