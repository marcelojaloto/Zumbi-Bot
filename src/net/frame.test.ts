import { describe, expect, it } from 'vitest';
import type { DataConnection } from 'peerjs';
import { Joiner, MAX_FRAME_BYTES, splitMessage, utf8Bytes } from './frame';
import { PeerLink } from './peerTransport';

/** Mensagem grande e cheia de texto que ocupa mais no JSON (aspas, acentos, emoji). */
function bigMessage(n: number): { t: string; rows: { name: string; note: string; v: number }[] } {
  const rows = [];
  for (let i = 0; i < n; i++)
    rows.push({ name: `Zé "Coração" ${i} 🧟`, note: 'ação\\pé "aspas" ' + 'ç'.repeat(i % 7), v: i * 1.5 });
  return { t: 'snap', rows };
}

/** Conexão do PeerJS de mentira: como o canal JSON dele, recusa mensagens de 16300 bytes ou mais. */
class FakeConn {
  open = true;
  peer = 'outro';
  sent: unknown[] = [];
  refused = 0;
  closed = 0;
  private handlers = new Map<string, ((x: unknown) => void)[]>();
  on(ev: string, f: (x: unknown) => void): void {
    this.handlers.set(ev, [...(this.handlers.get(ev) ?? []), f]);
  }
  emit(ev: string, x?: unknown): void {
    for (const f of this.handlers.get(ev) ?? []) f(x);
  }
  send(m: unknown): void {
    if (utf8Bytes(JSON.stringify(m)) >= 16300) {
      this.refused++;
      return;
    }
    // como a rede: chega como JSON e é lido do outro lado
    this.sent.push(JSON.parse(JSON.stringify(m)));
  }
  close(): void {
    this.closed++;
    this.open = false;
    this.emit('close');
  }
}

describe('mensagens grandes em pedaços', () => {
  it('mensagem pequena vai inteira', () => {
    const m = { t: 'ping' };
    expect(splitMessage(m)).toEqual([m]);
  });

  it('mensagem grande vira pedaços abaixo do limite e volta igual, seguida de outra mensagem', () => {
    const m = bigMessage(900);
    expect(utf8Bytes(JSON.stringify(m))).toBeGreaterThan(MAX_FRAME_BYTES * 3);
    const parts = splitMessage(m);
    expect(parts.length).toBeGreaterThan(3);
    for (const p of parts) expect(utf8Bytes(JSON.stringify(p))).toBeLessThan(MAX_FRAME_BYTES);
    const j = new Joiner();
    const got: unknown[] = [];
    for (const p of [...parts, { t: 'ping' }]) {
      const r = j.take(JSON.parse(JSON.stringify(p)));
      if (r !== undefined) got.push(r);
    }
    expect(got).toEqual([m, { t: 'ping' }]);
  });

  it('o link do PeerJS manda o estado grande em pedaços (antes ele era recusado em silêncio)', () => {
    const a = new FakeConn();
    const link = new PeerLink(a as unknown as DataConnection);
    const m = bigMessage(600);
    link.send(m);
    link.send({ t: 'ping' });
    expect(a.refused).toBe(0);
    const b = new FakeConn();
    const other = new PeerLink(b as unknown as DataConnection);
    const got: unknown[] = [];
    other.onMessage = (x) => got.push(x);
    for (const x of a.sent) b.emit('data', x);
    expect(got).toEqual([m, { t: 'ping' }]);
  });

  it('erro na conexão fecha de verdade (o outro lado fica sabendo na hora)', () => {
    const c = new FakeConn();
    const link = new PeerLink(c as unknown as DataConnection);
    let closed = 0;
    link.onClose = () => closed++;
    const warn = console.warn;
    console.warn = () => {};
    try {
      c.emit('error', { type: 'negotiation-failed', message: 'x' });
    } finally {
      console.warn = warn;
    }
    expect(c.closed).toBe(1);
    expect(closed).toBe(1);
  });
});
