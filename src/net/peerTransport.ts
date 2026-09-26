import type { DataConnection, Peer, PeerError, PeerOptions } from 'peerjs';
import { randomCode } from './protocol';
import {
  NetError,
  netRandom,
  type Link,
  type NetErrorKind,
  type RoomServer,
  type Transport,
} from './transport';

/** Prefixo dos ids no serviço público do PeerJS (o código da sala vem depois). */
const PREFIX = 'zumbibot-v1-';
const OPEN_TIMEOUT = 15000;
const CONNECT_TIMEOUT = 20000;

type PeerCtor = typeof Peer;
let loading: Promise<PeerCtor> | null = null;

/** O PeerJS só é baixado quando alguém abre o jogo online. */
function loadPeer(): Promise<PeerCtor> {
  loading ??= import('peerjs').then((m) => m.Peer);
  return loading.catch((e: unknown) => {
    loading = null;
    throw new NetError(navigator.onLine === false ? 'offline' : 'server', String(e));
  });
}

function mapError(err: PeerError<string> | Error): NetError {
  const type = (err as { type?: string }).type ?? '';
  let kind: NetErrorKind;
  if (navigator.onLine === false) kind = 'offline';
  else if (type === 'peer-unavailable') kind = 'not-found';
  else if (type === 'browser-incompatible') kind = 'unsupported';
  else if (type === 'webrtc') kind = 'blocked';
  else kind = 'server';
  return new NetError(kind, `${type} ${err.message}`);
}

class PeerLink implements Link {
  onMessage: ((msg: unknown) => void) | null = null;
  onClose: (() => void) | null = null;
  private closed = false;

  constructor(
    private c: DataConnection,
    private onEnd?: () => void,
  ) {
    c.on('data', (d) => this.onMessage?.(d));
    c.on('close', () => this.end());
    c.on('error', () => this.end());
    // WebRTC: rede caiu de vez
    c.on('iceStateChanged', (s) => {
      if (s === 'failed' || s === 'closed') this.end();
    });
  }

  send(msg: unknown): void {
    if (this.closed || !this.c.open) return;
    try {
      void this.c.send(msg);
    } catch {
      this.end();
    }
  }

  close(): void {
    if (this.closed) return;
    try {
      this.c.close();
    } catch {
      /* já fechada */
    }
    this.end();
  }

  private end(): void {
    if (this.closed) return;
    this.closed = true;
    this.onEnd?.();
    this.onClose?.();
  }
}

/** Espera o Peer abrir no serviço de conexão (ou falhar). */
function opened(peer: Peer): Promise<'ok' | 'taken'> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new NetError('timeout', 'open')), OPEN_TIMEOUT);
    peer.once('open', () => {
      clearTimeout(timer);
      resolve('ok');
    });
    peer.once('error', (err) => {
      clearTimeout(timer);
      if (err.type === 'unavailable-id') resolve('taken');
      else reject(mapError(err));
    });
  });
}

/**
 * Transporte de verdade: WebRTC com o serviço público e gratuito do PeerJS para os aparelhos se acharem pelo
 * código (depois a conversa é direta entre eles, ou por um servidor de retransmissão quando a rede exige).
 */
export class PeerTransport implements Transport {
  /** `server`: outro servidor PeerJS ("host:porta/caminho", sem https) — testes ou servidor próprio. */
  constructor(private server?: string | null) {}

  private options(): PeerOptions {
    if (!this.server) return { debug: 0 };
    const m = /^([^:/]+)(?::(\d+))?(\/.*)?$/.exec(this.server);
    if (!m) return { debug: 0 };
    return { debug: 0, host: m[1], port: Number(m[2] ?? 80), path: m[3] ?? '/', secure: false };
  }

  async host(onLink: (l: Link) => void): Promise<RoomServer> {
    const PeerC = await loadPeer();
    for (let i = 0; i < 6; i++) {
      const code = randomCode(netRandom);
      const peer = new PeerC(PREFIX + code, this.options());
      let res: 'ok' | 'taken';
      try {
        res = await opened(peer);
      } catch (e) {
        peer.destroy();
        throw e;
      }
      if (res === 'taken') {
        peer.destroy();
        continue;
      }
      peer.on('connection', (c) => {
        c.on('open', () => onLink(new PeerLink(c)));
      });
      // perdeu o serviço de conexão: quem já entrou continua; tenta voltar para aceitar gente nova
      let retry: ReturnType<typeof setTimeout> | null = null;
      peer.on('disconnected', () => {
        if (peer.destroyed || retry) return;
        retry = setTimeout(() => {
          retry = null;
          if (!peer.destroyed && peer.disconnected) peer.reconnect();
        }, 2000);
      });
      peer.on('error', () => {
        /* erros depois de aberto: conexões individuais avisam por conta própria */
      });
      return {
        code,
        close: () => {
          if (retry) clearTimeout(retry);
          peer.destroy();
        },
      };
    }
    throw new NetError('server', 'no free code');
  }

  async join(code: string): Promise<Link> {
    const PeerC = await loadPeer();
    const peer = new PeerC(this.options());
    try {
      await opened(peer);
      const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new NetError('timeout', 'connect')), CONNECT_TIMEOUT);
        c.once('open', () => {
          clearTimeout(timer);
          resolve();
        });
        c.once('error', (err) => {
          clearTimeout(timer);
          reject(mapError(err));
        });
        peer.once('error', (err) => {
          clearTimeout(timer);
          reject(mapError(err));
        });
      });
      peer.on('error', () => {});
      return new PeerLink(c, () => peer.destroy());
    } catch (e) {
      peer.destroy();
      throw e instanceof NetError ? e : mapError(e as Error);
    }
  }
}
