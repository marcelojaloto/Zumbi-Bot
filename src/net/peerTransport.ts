import type { DataConnection, MediaConnection, Peer, PeerError, PeerOptions } from 'peerjs';
import { randomCode } from './protocol';
import {
  NetError,
  netRandom,
  type Link,
  type NetErrorKind,
  type RoomServer,
  type Transport,
  type VoiceCall,
  type VoicePeer,
} from './transport';

/** Prefixo dos ids no serviço público do PeerJS (o código da sala vem depois). */
const PREFIX = 'zumbibot-v1-';
const OPEN_TIMEOUT = 15000;
const CONNECT_TIMEOUT = 20000;
/** Ligação de voz que chega antes de o chat de voz deste aparelho começar (quem acabou de entrar) espera um pouco. */
const HOLD_CALL_MS = 10000;

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
    readonly voice?: VoicePeer,
  ) {
    c.on('data', (d) => this.onMessage?.(d));
    c.on('close', () => this.end());
    c.on('error', () => this.end());
    // WebRTC: rede caiu de vez
    c.on('iceStateChanged', (s) => {
      if (s === 'failed' || s === 'closed') this.end();
    });
  }

  get peerId(): string {
    return this.c.peer;
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

class PeerVoiceCall implements VoiceCall {
  onStream: ((s: MediaStream) => void) | null = null;
  onClose: (() => void) | null = null;
  private ended = false;

  constructor(private c: MediaConnection) {
    c.on('stream', (st) => this.onStream?.(st));
    c.on('close', () => this.end());
    c.on('error', () => this.end());
    c.on('iceStateChanged', (st) => {
      if (st === 'failed' || st === 'closed') this.end();
    });
  }

  get peer(): string {
    return this.c.peer;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.c.metadata as Record<string, unknown> | undefined;
  }

  answer(stream: MediaStream): void {
    this.c.answer(stream);
  }

  replaceTrack(track: MediaStreamTrack): void {
    const sender = this.c.peerConnection
      ?.getSenders()
      .find((snd) => !snd.track || snd.track.kind === 'audio');
    void sender?.replaceTrack(track).catch(() => {});
  }

  private receiver(): RTCRtpReceiver | undefined {
    return this.c.peerConnection?.getReceivers().find((r) => r.track?.kind === 'audio');
  }

  async audioEnergy(): Promise<{ energy: number; duration: number } | null> {
    const rcv = this.receiver();
    if (!rcv?.getStats) return null;
    const report = await rcv.getStats();
    for (const st of report.values() as IterableIterator<Record<string, unknown>>) {
      if (st.type !== 'inbound-rtp' || (st.kind ?? st.mediaType) !== 'audio') continue;
      const energy = st.totalAudioEnergy;
      const duration = st.totalSamplesDuration;
      return typeof energy === 'number' && typeof duration === 'number' ? { energy, duration } : null;
    }
    // ainda não chegou nenhum pacote de áudio
    return { energy: 0, duration: 0 };
  }

  audioLevel(): number | null {
    const rcv = this.receiver();
    if (!rcv?.getSynchronizationSources) return null;
    const src = rcv.getSynchronizationSources()[0];
    if (!src) return 0;
    return typeof src.audioLevel === 'number' ? src.audioLevel : null;
  }

  close(): void {
    try {
      this.c.close();
    } catch {
      /* já fechada */
    }
    this.end();
  }

  get closed(): boolean {
    return this.ended;
  }

  private end(): void {
    if (this.ended) return;
    this.ended = true;
    this.onClose?.();
  }
}

/** Voz sobre o Peer já aberto (chamadas de áudio diretas entre os aparelhos da sala). */
function voicePeer(peer: Peer): VoicePeer {
  let handler: ((c: VoiceCall) => void) | null = null;
  // quem acabou de entrar recebe ligações antes de o chat de voz dele começar: elas esperam (senão só depois
  // de o outro lado desistir e ligar de novo)
  const waiting = new Set<PeerVoiceCall>();
  const vp: VoicePeer = {
    id: peer.id,
    get onCall() {
      return handler;
    },
    set onCall(h) {
      handler = h;
      if (!h) return;
      for (const c of [...waiting]) {
        waiting.delete(c);
        if (!c.closed) h(c);
      }
    },
    call: (to, stream, meta) => {
      const mc = peer.call(to, stream, { metadata: meta });
      if (!mc) throw new NetError('lost', 'voice call');
      return new PeerVoiceCall(mc);
    },
  };
  peer.on('call', (c) => {
    const vc = new PeerVoiceCall(c);
    if (handler) {
      handler(vc);
      return;
    }
    waiting.add(vc);
    setTimeout(() => {
      if (waiting.delete(vc)) vc.close();
    }, HOLD_CALL_MS);
  });
  return vp;
}

/** Perdeu o serviço de conexão: quem já está conectado continua; tenta voltar (entrada de gente nova, voz). */
function keepSignaling(peer: Peer): () => void {
  let retry: ReturnType<typeof setTimeout> | null = null;
  peer.on('disconnected', () => {
    if (peer.destroyed || retry) return;
    retry = setTimeout(() => {
      retry = null;
      if (!peer.destroyed && peer.disconnected) peer.reconnect();
    }, 2000);
  });
  return () => {
    if (retry) clearTimeout(retry);
  };
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
      // cada conexão vira um só link: o navegador às vezes avisa "aberta" duas vezes (viraria um jogador fantasma)
      const linked = new WeakSet<DataConnection>();
      peer.on('connection', (c) => {
        c.once('open', () => {
          if (linked.has(c)) return;
          linked.add(c);
          onLink(new PeerLink(c));
        });
      });
      const stop = keepSignaling(peer);
      peer.on('error', () => {
        /* erros depois de aberto: conexões individuais avisam por conta própria */
      });
      return {
        code,
        voice: voicePeer(peer),
        close: () => {
          stop();
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
      const stop = keepSignaling(peer);
      return new PeerLink(
        c,
        () => {
          stop();
          peer.destroy();
        },
        voicePeer(peer),
      );
    } catch (e) {
      peer.destroy();
      throw e instanceof NetError ? e : mapError(e as Error);
    }
  }
}
