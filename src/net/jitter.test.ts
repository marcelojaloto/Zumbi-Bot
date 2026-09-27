import { describe, expect, it } from 'vitest';
import { makeWorld, run } from '../sim/test/helpers';
import { SnapshotEncoder, type SnapDelta } from './delta';
import { tuneOpus } from './peerTransport';
import { ClientAdapter, type GuestRoom } from './room';
import type { InputSource } from './../sim/InputFrame';
import { emptyFrame } from '../sim/InputFrame';

const room = { send() {}, requestKey() {}, detach() {} } as unknown as GuestRoom;
const idle: InputSource = { slot: 1, sample: (t) => emptyFrame(t) };

/** Anfitrião andando para a direita: um estado a cada 3 ticks. */
function hostSnaps(ticks: number): SnapDelta[] {
  const hw = makeWorld();
  const enc = new SnapshotEncoder();
  const out: SnapDelta[] = [];
  for (let i = 0; i < ticks; i++) {
    run(hw, 1, { moveX: 1 });
    if (i % 3 === 0) out.push(enc.encode(hw));
  }
  return out;
}

/** Mostra os estados chegando em rajadas (`burstMs`) e devolve a posição na tela do jogador a cada quadro. */
function play(snaps: SnapDelta[], burstMs: number, seconds: number): number[] {
  let now = 0;
  const cw = makeWorld();
  const ca = new ClientAdapter(room, idle, undefined, () => now);
  const xs: number[] = [];
  let sent = 0;
  for (let f = 0; f < seconds * 60; f++) {
    now = f * (1000 / 60);
    // o anfitrião gera 1 estado a cada 50 ms; a rede entrega tudo junto a cada `burstMs`
    const due = Math.floor(Math.floor(now / burstMs) * (burstMs / 50));
    while (sent < Math.min(due, snaps.length)) ca.push({ s: snaps[sent++]!, ev: [] });
    ca.receive(cw);
    const p = cw.get(1)!;
    const a = ca.alpha();
    xs.push(p.t.px + (p.t.x - p.t.px) * a);
  }
  return xs;
}

describe('rede: estados em rajadas', () => {
  for (const burst of [200, 400])
    it(`com a rede entregando aos trancos (a cada ${burst} ms), a tela anda lisa: sem parar e sem saltos`, () => {
      const snaps = hostSnaps(11 * 60);
      const xs = play(snaps, burst, 10);
      // depois de se ajustar, cada quadro anda quase o mesmo tanto (4 m/s ≈ 0,067 m por quadro)
      const steps = xs
        .slice(7 * 60)
        .map((x, i, a) => (i ? x - a[i - 1]! : 0))
        .slice(1);
      expect(Math.min(...steps)).toBeGreaterThan(0.05);
      expect(Math.max(...steps)).toBeLessThan(0.085);
    });

  it('rede boa: o atraso cai para o mínimo e a tela acompanha quase junto', () => {
    const snaps = hostSnaps(20 * 60);
    const xs = play(snaps, 50, 18);
    const steps = xs
      .slice(10 * 60)
      .map((x, i, a) => (i ? x - a[i - 1]! : 0))
      .slice(1);
    expect(Math.min(...steps)).toBeGreaterThan(0.05);
    expect(Math.max(...steps)).toBeLessThan(0.09);
  });
});

describe('voz leve (Opus)', () => {
  it('pede mono, DTX e até 24 kbps sem perder os outros parâmetros', () => {
    const sdp =
      'v=0\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10;useinbandfec=1\r\na=rtpmap:0 PCMU/8000\r\n';
    const out = tuneOpus(sdp);
    expect(out).toContain(
      'a=fmtp:111 minptime=10;useinbandfec=1;usedtx=1;stereo=0;sprop-stereo=0;maxaveragebitrate=24000\r\n',
    );
    expect(out.match(/a=fmtp:111/g)).toHaveLength(1);
    expect(out).toContain('a=rtpmap:0 PCMU/8000');
  });

  it('sem linha fmtp: cria uma logo depois do rtpmap', () => {
    const out = tuneOpus('v=0\r\na=rtpmap:109 opus/48000/2\r\nm=x\r\n');
    expect(out).toContain('a=rtpmap:109 opus/48000/2\r\na=fmtp:109 minptime=10;useinbandfec=1;usedtx=1');
  });

  it('SDP sem Opus fica igual', () => {
    const sdp = 'v=0\r\na=rtpmap:0 PCMU/8000\r\n';
    expect(tuneOpus(sdp)).toBe(sdp);
  });
});
