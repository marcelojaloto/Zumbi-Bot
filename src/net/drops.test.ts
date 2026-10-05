import { afterEach, describe, expect, it } from 'vitest';
import type { PlayerSlot } from '../sim/Entity';
import { emptyFrame, type InputFrame, type InputSource } from '../sim/InputFrame';
import { loadout } from '../sim/test/helpers';
import { World } from '../sim/World';
import { getMap } from '../data/maps';
import { spawnEnemy } from '../sim/ai/spawnEnemy';
import { takeOverWorld } from '../sim/takeover';
import { removePlayer } from '../sim/systems/lives';
import { SnapshotEncoder } from './delta';
import { LocalTransport } from './localTransport';
import type { StartMsg } from './protocol';
import { ClientAdapter, GuestRoom, HostRoom, ROOM_TIMES, type HostAdapter, type RoomNotice } from './room';

/**
 * Quedas de conexão no jogo online: estado maior que o limite do PeerJS, rede de um aparelho sumindo, anfitrião
 * saindo um instante e aparelho travado. Os tempos da sala ficam curtos aqui (os de verdade são de segundos).
 */

const until = async (cond: () => boolean, ms = 3000): Promise<void> => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 5));
  }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Fixed implements InputSource {
  f: Partial<InputFrame> = {};
  constructor(readonly slot: PlayerSlot) {}
  sample(tick: number): InputFrame {
    return { ...emptyFrame(tick), ...this.f, tick };
  }
}

function worldFrom(m: StartMsg): World {
  return new World({
    seed: m.seed,
    map: getMap(m.mapId),
    levelIdx: m.levelIdx,
    loadouts: m.loadouts,
    difficulty: m.difficulty,
    enemyCap: m.enemyCap,
    ngPlus: m.ngPlus,
  });
}

const cleanup: (() => void)[] = [];
const saved = { ...ROOM_TIMES };
afterEach(() => {
  while (cleanup.length) cleanup.pop()!();
  Object.assign(ROOM_TIMES, saved);
});

/** Tempos curtos (antes de abrir as salas: o intervalo dos sinais de vida é lido na criação). */
function fastTimes(): void {
  Object.assign(ROOM_TIMES, {
    pingMs: 40,
    timeoutMs: 400,
    awayMs: 2500,
    rejoinWaitMs: 2000,
    rejoinTryMs: 2000,
    sameHostMs: 700,
    attemptMs: 300,
    // com a máquina ocupada (outros testes rodando), o intervalo de 40 ms atrasa: só um salto grande é "travou"
    stallMs: 400,
  });
}

/** Canal local; `peerLike`: com o limite de tamanho do canal JSON do PeerJS. */
function transport(peerLike = false): LocalTransport {
  const t = new LocalTransport('zb-drops', peerLike ? { maxBytes: 16300 } : {});
  cleanup.push(() => t.dispose());
  return t;
}

/** Um passo do anfitrião e dos convidados (o estado vai a cada 3 ticks). */
async function step(hw: World, ha: HostAdapter, views: [ClientAdapter, World][]): Promise<void> {
  await sleep(1);
  hw.step(ha.collectInputs(hw.tick));
  ha.publish(hw.tick, hw, hw.drainEvents());
  for (const [c, w] of views) c.receive(w);
}

describe('quedas de conexão', () => {
  it('3 jogadores e uma onda grande: o estado chega inteiro e a troca de anfitrião não divide a sala', async () => {
    fastTimes();
    const host = await HostRoom.open(transport(true), loadout({ name: 'Ana' }), {
      mapId: 'vila',
      levelIdx: 0,
    });
    const g1 = await GuestRoom.join(transport(true), host.code, loadout({ name: 'Bia' }));
    const g2 = await GuestRoom.join(transport(true), host.code, loadout({ name: 'Caio' }));
    cleanup.push(() => [g1, g2].forEach((g) => g.leave()));
    await until(() => g2.players.length === 3);
    let s1: StartMsg | null = null;
    let s2: StartMsg | null = null;
    g1.onStart = (m) => (s1 = m);
    g2.onStart = (m) => (s2 = m);
    const msg = host.start({ seed: 5, ngPlus: false, enemyCap: 30 });
    await until(() => !!s1 && !!s2);
    const hw = worldFrom(msg);
    for (let i = 0; i < 30; i++)
      spawnEnemy(hw, i % 2 ? 'walker' : 'runner', 8 + i * 0.4, (i % 5) - 2, 'right');
    // o quadro completo passa (e muito) do limite do PeerJS: antes ele era recusado e a conexão morria calada
    expect(JSON.stringify(new SnapshotEncoder().encode(hw)).length).toBeGreaterThan(16300);
    const w1 = worldFrom(s1!);
    const w2 = worldFrom(s2!);
    const ha = host.adapter(new Fixed(0));
    const in1 = new Fixed(1);
    const c1 = new ClientAdapter(g1, in1);
    const c2 = new ClientAdapter(g2, new Fixed(2));
    g1.attach(c1);
    g2.attach(c2);
    for (let i = 0; i < 31; i++)
      await step(hw, ha, [
        [c1, w1],
        [c2, w2],
      ]);
    await until(() => {
      c1.receive(w1);
      c2.receive(w2);
      return w1.tick === hw.tick && w2.tick === hw.tick;
    });
    expect(w1.entities.length).toBe(hw.entities.length);
    expect(w2.entities.length).toBe(hw.entities.length);

    // o anfitrião sai: Bia assume; Caio volta nela e recebe o quadro completo (também grande)
    let nh: HostRoom | null = null;
    let promoted2 = false;
    g1.onPromote = () => (nh = HostRoom.takeOver(g1));
    g2.onPromote = () => (promoted2 = true);
    host.close();
    await until(() => !!nh && nh.guestCount === 1);
    cleanup.push(() => nh!.close());
    takeOverWorld(w1);
    removePlayer(w1, w1.get(1)!);
    const na = nh!.adapter(in1);
    for (let i = 0; i < 31; i++) await step(w1, na, [[c2, w2]]);
    await until(() => {
      c2.receive(w2);
      return w2.tick === w1.tick;
    });
    expect(w2.entities.length).toBe(w1.entities.length);
    // passado o tempo de queda, Caio continua convidado da Bia: ninguém virou um segundo anfitrião
    const t0 = Date.now();
    while (Date.now() - t0 < ROOM_TIMES.timeoutMs * 2) await step(w1, na, [[c2, w2]]);
    expect(promoted2).toBe(false);
    expect(g2.hostSlot).toBe(1);
    expect(nh!.guestCount).toBe(1);
    expect(nh!.players().map((p) => p.slot)).toEqual([1, 2]);
  });

  it('a rede de um convidado cai com o anfitrião no ar: ele volta no mesmo anfitrião e ninguém assume', async () => {
    fastTimes();
    const host = await HostRoom.open(transport(), loadout({ name: 'Ana' }), { mapId: 'vila', levelIdx: 0 });
    cleanup.push(() => host.close());
    const notices: RoomNotice[] = [];
    host.onNotice = (n) => notices.push(n);
    const t1 = transport();
    const g1 = await GuestRoom.join(t1, host.code, loadout({ name: 'Bia' }));
    const g2 = await GuestRoom.join(transport(), host.code, loadout({ name: 'Caio' }));
    cleanup.push(() => [g1, g2].forEach((g) => g.leave()));
    await until(() => g1.players.length === 3 && g2.players.length === 3);
    let promoted = 0;
    const closed: string[] = [];
    for (const g of [g1, g2]) {
      g.onPromote = () => promoted++;
      g.onClosed = (w) => closed.push(w);
    }
    const back: (string | null)[] = [];
    g1.onReconnect = (to) => back.push(to ? `P${to.slot + 1}` : null);
    // o Wi-Fi da Bia (P2, que seria a próxima anfitriã) some sem aviso
    t1.cut(g1.players.find((p) => p.slot === 0)!.pid!, true);
    await until(() => back.includes(null), 4000);
    expect(back[0]).toBe('P1');
    expect(promoted).toBe(0);
    expect(closed).toEqual([]);
    expect(g1.hostSlot).toBe(0);
    await until(() => host.guestCount === 2);
    expect(host.players().map((p) => p.slot)).toEqual([0, 1, 2]);
    // quem caiu e voltou a tempo não "saiu da sala"
    expect(notices.filter((n) => n.kind === 'left')).toEqual([]);
    // e a conversa continua: a escolha dela chega ao anfitrião
    g1.pick('mage', true);
    await until(() => host.players()[1]!.char === 'mage');
  });

  it('quem caiu e não voltou a tempo sai da sala (o lugar fica guardado só por um tempo)', async () => {
    fastTimes();
    const host = await HostRoom.open(transport(), loadout({ name: 'Ana' }), { mapId: 'vila', levelIdx: 0 });
    cleanup.push(() => host.close());
    const notices: RoomNotice[] = [];
    host.onNotice = (n) => notices.push(n);
    const t1 = transport();
    const g1 = await GuestRoom.join(t1, host.code, loadout({ name: 'Bia' }));
    await until(() => host.guestCount === 1 && g1.players.length === 2);
    g1.onPromote = () => {};
    g1.onClosed = () => {};
    // o aparelho dela desligou de vez: nada mais sai dele
    t1.cut(g1.players.find((p) => p.slot === 0)!.pid!, true);
    t1.dispose();
    await until(() => host.guestCount === 0, 4000);
    // caiu, mas o lugar continua guardado (e ninguém foi avisado ainda)
    expect(host.players().map((p) => p.slot)).toEqual([0, 1]);
    expect(notices.filter((n) => n.kind === 'left')).toEqual([]);
    await until(() => notices.some((n) => n.kind === 'left'), 5000);
    expect(notices.at(-1)).toEqual({ kind: 'left', slot: 1, name: 'Bia' });
    expect(host.players().map((p) => p.slot)).toEqual([0]);
  });

  it('anfitrião avisa que saiu por um instante (mandando o convite): ninguém assume enquanto ele não volta', async () => {
    fastTimes();
    const th = transport();
    const host = await HostRoom.open(th, loadout({ name: 'Ana' }), { mapId: 'vila', levelIdx: 0 });
    cleanup.push(() => host.close());
    const g1 = await GuestRoom.join(transport(), host.code, loadout({ name: 'Bia' }));
    cleanup.push(() => g1.leave());
    await until(() => g1.players.length === 2);
    let promoted = 0;
    g1.onPromote = () => promoted++;
    host.setAway(true);
    await sleep(50);
    // o aparelho do anfitrião congela (outro app): nada sai dele por mais que o tempo de queda
    const gid = host.players()[1]!.pid!;
    th.muted.add(gid);
    await sleep(ROOM_TIMES.timeoutMs * 3);
    expect(promoted).toBe(0);
    th.muted.delete(gid);
    host.setAway(false);
    await sleep(ROOM_TIMES.timeoutMs * 2);
    expect(promoted).toBe(0);
    expect(g1.hostSlot).toBe(0);
  });

  it('aparelho que ficou parado (fase carregando) não derruba ninguém', async () => {
    fastTimes();
    let now = 0;
    const clock = () => now;
    const host = await HostRoom.open(
      transport(),
      loadout({ name: 'Ana' }),
      { mapId: 'vila', levelIdx: 0 },
      undefined,
      clock,
    );
    cleanup.push(() => host.close());
    const g1 = await GuestRoom.join(transport(), host.code, loadout({ name: 'Bia' }), clock);
    cleanup.push(() => g1.leave());
    await until(() => host.guestCount === 1 && g1.players.length === 2);
    let promoted = 0;
    g1.onPromote = () => promoted++;
    // o relógio pula 15 s de uma vez entre dois sinais de vida (o aparelho travou)
    now += 15000;
    await sleep(ROOM_TIMES.pingMs * 4);
    expect(host.guestCount).toBe(1);
    expect(promoted).toBe(0);
  });
});
