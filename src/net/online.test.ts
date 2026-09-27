import { afterEach, describe, expect, it } from 'vitest';
import type { PlayerSlot } from '../sim/Entity';
import { Btn, emptyFrame, type InputFrame, type InputSource } from '../sim/InputFrame';
import type { GameEvent } from '../sim/events';
import { loadout } from '../sim/test/helpers';
import { World } from '../sim/World';
import { getMap } from '../data/maps';
import { LocalTransport } from './localTransport';
import { takeOverWorld } from '../sim/takeover';
import { removePlayer } from '../sim/systems/lives';
import {
  CODE_ALPHABET,
  NET_VERSION,
  RemoteInputSource,
  cleanCode,
  packInput,
  randomCode,
  sanitizeLoadout,
  unpackInput,
  type StartMsg,
} from './protocol';
import { ClientAdapter, GuestRoom, HostRoom, type RoomNotice } from './room';
import { NetError, type Endpoint, type Link, type Transport } from './transport';

const until = async (cond: () => boolean, ms = 3000): Promise<void> => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error('timeout');
    await new Promise((r) => setTimeout(r, 5));
  }
};

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
afterEach(() => {
  while (cleanup.length) cleanup.pop()!();
});
function transport(): LocalTransport {
  const t = new LocalTransport('zb-test');
  cleanup.push(() => t.dispose());
  return t;
}

describe('código da sala e entrada compacta', () => {
  it('códigos de 4 letras sem I/O; limpa o que foi digitado', () => {
    for (let i = 0; i < 50; i++) {
      const c = randomCode();
      expect(c).toMatch(/^[A-Z]{4}$/);
      for (const ch of c) expect(CODE_ALPHABET).toContain(ch);
    }
    expect(cleanCode(' ab-cd ')).toBe('ABCD');
    expect(cleanCode('abc')).toBeNull();
    expect(cleanCode('ABIO')).toBeNull();
  });

  it('empacota e desempacota a entrada sem perder nada relevante', () => {
    const f: InputFrame = {
      tick: 3,
      buttons: Btn.Jump | Btn.Fire,
      moveX: -1,
      moveZ: 0.5,
      aimYaw: -2,
      aimMode: 1,
    };
    const u = unpackInput(packInput(f), 3);
    expect(u.buttons).toBe(f.buttons);
    expect(u.moveX).toBe(-1);
    expect(u.moveZ).toBeCloseTo(0.5, 2);
    expect(u.aimYaw).toBeCloseTo(-2, 2);
    expect(u.aimMode).toBe(1);
  });

  it('entrada remota: toque rápido entre dois ticks conta; sem notícias o jogador para', () => {
    let now = 0;
    const r = new RemoteInputSource(1, () => now, 300);
    r.push(packInput({ ...emptyFrame(), buttons: Btn.Punch, moveX: 1 }));
    r.push(packInput({ ...emptyFrame(), buttons: 0, moveX: 1 }));
    expect(r.sample(0).buttons).toBe(Btn.Punch);
    expect(r.sample(1).buttons).toBe(0);
    expect(r.sample(1).moveX).toBe(1);
    now = 400;
    expect(r.sample(2).moveX).toBe(0);
  });

  it('equipamento de quem entra é validado (ids desconhecidos somem)', () => {
    const lo = sanitizeLoadout(
      { name: 'x'.repeat(40), character: 'dragon', level: 999, guns: ['laserX', 'shotgun'], staffs: [] },
      2,
    );
    expect(lo.slot).toBe(2);
    expect(lo.character).toBe('robot');
    expect(lo.name.length).toBeLessThanOrEqual(16);
    expect(lo.level).toBeLessThanOrEqual(50);
    expect(lo.guns).toContain('pistol');
    expect(lo.guns).not.toContain('laserX');
    expect(lo.staffs).toEqual(['heal']);
  });
});

describe('sala online (canal local)', () => {
  it('entra, escolhe, fica pronto, começa, troca entradas e estado, e sai', async () => {
    const host = await HostRoom.open(transport(), loadout({ name: 'Ana' }), { mapId: 'vila', levelIdx: 0 });
    cleanup.push(() => host.close());
    const notices: RoomNotice[] = [];
    host.onNotice = (n) => notices.push(n);
    expect(host.code).toMatch(/^[A-Z]{4}$/);

    const guest = await GuestRoom.join(transport(), host.code, loadout({ name: 'Bia', character: 'mage' }));
    cleanup.push(() => guest.leave());
    expect(guest.slot).toBe(1);
    await until(() => guest.players.length === 2);
    expect(guest.players.map((p) => p.name)).toEqual(['Ana', 'Bia']);
    expect(notices).toEqual([{ kind: 'joined', slot: 1, name: 'Bia' }]);
    expect(host.allReady()).toBe(false);

    guest.pick('mutant', true);
    await until(() => host.allReady());
    expect(host.players()[1]!.char).toBe('mutant');

    let started: StartMsg | null = null;
    guest.onStart = (m) => (started = m);
    const msg = host.start({ seed: 9, ngPlus: false, enemyCap: 14 });
    await until(() => !!started);
    expect(started!.loadouts.map((l) => [l.slot, l.character])).toEqual([
      [0, 'robot'],
      [1, 'mutant'],
    ]);

    // anfitrião roda a simulação; o convidado só mostra
    const hw = worldFrom(msg);
    const cw = worldFrom(started!);
    const mine = new Fixed(0);
    const theirs = new Fixed(1);
    const ha = host.adapter(mine);
    const ca = new ClientAdapter(guest, theirs);
    guest.attach(ca);
    theirs.f = { moveX: 1 };
    const x0 = hw.get(2)!.t.x;
    const events: GameEvent[] = [];
    // o estado vai nos ticks 1, 4, 7... (91 é o último)
    for (let i = 0; i < 91; i++) {
      ca.collectInputs(i);
      await new Promise((r) => setTimeout(r, 1));
      hw.step(ha.collectInputs(hw.tick));
      ha.publish(hw.tick, hw, hw.drainEvents());
      events.push(...ca.receive(cw));
    }
    await until(() => {
      events.push(...ca.receive(cw));
      return cw.tick === hw.tick;
    });
    expect(hw.get(2)!.t.x).toBeGreaterThan(x0 + 1);
    expect(cw.get(2)!.t.x).toBeCloseTo(hw.get(2)!.t.x, 1);
    expect(cw.get(1)!.t.x).toBeCloseTo(hw.get(1)!.t.x, 1);

    // ficou para trás: pede um quadro completo e volta a acompanhar
    guest.requestKey();
    for (let i = 0; i < 30; i++) {
      ca.collectInputs(i);
      await new Promise((r) => setTimeout(r, 1));
      hw.step(ha.collectInputs(hw.tick));
      ha.publish(hw.tick, hw, hw.drainEvents());
      ca.receive(cw);
    }
    await until(() => {
      ca.receive(cw);
      return cw.tick === hw.tick;
    });
    expect(cw.get(2)!.t.x).toBeCloseTo(hw.get(2)!.t.x, 1);
    expect(cw.entities.length).toBe(hw.entities.length);

    // convidado sai no meio: o anfitrião fica sabendo
    const left: PlayerSlot[] = [];
    host.onGuestLeft = (s) => left.push(s);
    guest.leave();
    await until(() => left.length === 1);
    expect(host.guestCount).toBe(0);
    expect(notices.at(-1)).toEqual({ kind: 'left', slot: 1, name: 'Bia' });
  });

  it('opções da sala (dificuldade e voz) chegam a todos; a partida usa a dificuldade da sala; microfones', async () => {
    const host = await HostRoom.open(
      transport(),
      loadout({ name: 'Ana' }),
      { mapId: 'vila', levelIdx: 0 },
      { difficulty: 'hard', voice: false },
    );
    cleanup.push(() => host.close());
    const guest = await GuestRoom.join(transport(), host.code, loadout({ name: 'Bia' }));
    cleanup.push(() => guest.leave());
    await until(() => guest.players.length === 2);
    expect(guest.difficulty).toBe('hard');
    expect(guest.voice).toBe(false);

    host.setOptions({ difficulty: 'easy', voice: true });
    await until(() => guest.voice);
    expect(guest.difficulty).toBe('easy');
    host.setOptions({ difficulty: 'impossible' as never });
    expect(host.difficulty).toBe('easy');

    // microfone ligado aparece para os outros
    expect(host.players().map((p) => p.mic)).toEqual([false, false]);
    guest.setMic(true);
    await until(() => host.players()[1]!.mic === true);
    host.setMic(true);
    await until(() => guest.players[0]!.mic === true);
    guest.setMic(false);
    await until(() => host.players()[1]!.mic === false);

    let started: StartMsg | null = null;
    guest.onStart = (m) => (started = m);
    guest.pick('robot', true);
    await until(() => host.allReady());
    const msg = host.start({ seed: 3, ngPlus: false, enemyCap: 10 });
    expect(msg.difficulty).toBe('easy');
    await until(() => !!started);
    expect(started!.difficulty).toBe('easy');
  });

  it('o mesmo aparelho chegando duas vezes (aviso repetido da conexão) não vira um jogador fantasma', async () => {
    const ep: Endpoint = {
      id: 'host-1',
      onLink: null,
      connect: () => Promise.reject(new NetError('lost')),
      openDoor: () => Promise.resolve(true),
      close: () => {},
    };
    const deliver = (l: Link) => ep.onLink!(l);
    const t: Transport = {
      host: () => Promise.resolve({ code: 'ABCD', ep }),
      join: () => Promise.reject(new NetError('not-found')),
    };
    const host = await HostRoom.open(t, loadout(), { mapId: 'vila', levelIdx: 0 });
    cleanup.push(() => host.close());
    let closed = 0;
    const fake = (): Link => ({
      peerId: 'guest-1',
      onMessage: null,
      onClose: null,
      send: () => {},
      close: () => closed++,
    });
    const a = fake();
    const b = fake();
    deliver(a);
    deliver(b);
    const hello = { t: 'hello', v: NET_VERSION, lo: loadout({ name: 'Bia' }) };
    a.onMessage!(hello);
    b.onMessage?.(hello);
    expect(host.guestCount).toBe(1);
    expect(host.players().map((p) => p.slot)).toEqual([0, 1]);
    expect(closed).toBe(0);
  });

  it('código errado, sala cheia, partida já começou e anfitrião fechando', async () => {
    const t = transport();
    await expect(GuestRoom.join(t, 'ZZZZ', loadout())).rejects.toMatchObject({ kind: 'not-found' });

    const host = await HostRoom.open(transport(), loadout(), { mapId: 'vila', levelIdx: 0 });
    cleanup.push(() => host.close());
    const gs: GuestRoom[] = [];
    for (let i = 0; i < 4; i++) gs.push(await GuestRoom.join(transport(), host.code, loadout()));
    expect(gs.map((g) => g.slot)).toEqual([1, 2, 3, 4]);
    const err = await GuestRoom.join(transport(), host.code, loadout()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NetError);
    expect((err as NetError).kind).toBe('full');

    gs.pop()!.leave();
    await until(() => host.guestCount === 3);
    host.start({ seed: 1, ngPlus: false, enemyCap: 14 });
    const late = await GuestRoom.join(transport(), host.code, loadout()).catch((e: unknown) => e);
    expect((late as NetError).kind).toBe('started');

    // resultado: quem chega agora entra para a próxima
    host.toResult();
    const next = await GuestRoom.join(transport(), host.code, loadout());
    expect(next.slot).toBe(4);
    gs.push(next);
  });

  it('anfitrião sai: o jogador de menor número assume, os outros voltam sozinhos e a sala continua', async () => {
    const host = await HostRoom.open(transport(), loadout({ name: 'Ana' }), { mapId: 'vila', levelIdx: 0 });
    const gs: GuestRoom[] = [];
    for (const name of ['Bia', 'Caio', 'Duda'])
      gs.push(await GuestRoom.join(transport(), host.code, loadout({ name })));
    cleanup.push(() => gs.forEach((g) => g.leave()));
    await until(() => gs.every((g) => g.players.length === 4));
    gs[1]!.pick('mage', true);
    await until(() => gs[0]!.players.find((p) => p.slot === 2)?.char === 'mage');

    let promoted: HostRoom | null = null;
    const gone: RoomNotice[] = [];
    gs[0]!.onPromote = () => (promoted = HostRoom.takeOver(gs[0]!));
    for (const g of gs) g.onNotice = (n) => gone.push(n);
    const closed: string[] = [];
    for (const g of gs) g.onClosed = (w) => closed.push(w);
    const code = host.code;
    host.close();
    await until(() => !!promoted && promoted.guestCount === 2);
    cleanup.push(() => promoted!.close());
    const nh = promoted!;
    // mesma sala, mesmo código, o novo anfitrião é o P2 e ninguém caiu
    expect(nh.code).toBe(code);
    expect(nh.mySlot).toBe(1);
    expect(nh.players().map((p) => [p.slot, p.name])).toEqual([
      [1, 'Bia'],
      [2, 'Caio'],
      [3, 'Duda'],
    ]);
    // quem voltou guardou o personagem e o "pronto"
    expect(nh.players()[1]!.char).toBe('mage');
    expect(nh.players()[1]!.ready).toBe(true);
    await until(() => gs[2]!.hostSlot === 1 && gs[2]!.players.length === 3);
    expect(closed).toEqual([]);
    expect(gone.filter((n) => n.host).map((n) => n.name)).toEqual(['Ana', 'Ana', 'Ana']);

    // alguém novo entra pelo mesmo código (a porta do código mudou de aparelho) e fica com o lugar livre
    const late = await GuestRoom.join(transport(), code, loadout({ name: 'Eva' }));
    cleanup.push(() => late.leave());
    expect(late.slot).toBe(0);
    await until(() => late.players.length === 4 && late.hostSlot === 1);
  });

  it('anfitrião sai no meio da partida: quem assume continua a mesma fase e os outros continuam vendo', async () => {
    const host = await HostRoom.open(transport(), loadout({ name: 'Ana' }), { mapId: 'vila', levelIdx: 0 });
    const g1 = await GuestRoom.join(transport(), host.code, loadout({ name: 'Bia' }));
    const g2 = await GuestRoom.join(transport(), host.code, loadout({ name: 'Caio' }));
    cleanup.push(() => [g1, g2].forEach((g) => g.leave()));
    await until(() => g2.players.length === 3);
    let s1: StartMsg | null = null;
    let s2: StartMsg | null = null;
    g1.onStart = (m) => (s1 = m);
    g2.onStart = (m) => (s2 = m);
    const msg = host.start({ seed: 5, ngPlus: false, enemyCap: 14 });
    await until(() => !!s1 && !!s2);

    // a partida anda um pouco com o anfitrião original
    const hw = worldFrom(msg);
    const w1 = worldFrom(s1!);
    const w2 = worldFrom(s2!);
    const ha = host.adapter(new Fixed(0));
    const in1 = new Fixed(1);
    const c1 = new ClientAdapter(g1, in1);
    const c2 = new ClientAdapter(g2, new Fixed(2));
    g1.attach(c1);
    g2.attach(c2);
    in1.f = { moveX: 1 };
    // o estado vai a cada 3 ticks: 61 passos terminam num tick enviado
    for (let i = 0; i < 61; i++) {
      c1.collectInputs(i);
      await new Promise((r) => setTimeout(r, 1));
      hw.step(ha.collectInputs(hw.tick));
      ha.publish(hw.tick, hw, hw.drainEvents());
      c1.receive(w1);
      c2.receive(w2);
    }
    await until(() => {
      c1.receive(w1);
      return w1.tick === hw.tick;
    });
    const bx = w1.get(2)!.t.x;

    // anfitrião cai: Bia (P2) assume com o mundo que já tinha e continua a fase
    let nh: HostRoom | null = null;
    g1.onPromote = () => (nh = HostRoom.takeOver(g1));
    host.close();
    await until(() => !!nh && nh.guestCount === 1);
    cleanup.push(() => nh!.close());
    takeOverWorld(w1);
    const leftSlot = 0;
    removePlayer(w1, w1.get(leftSlot + 1)!);
    const na = nh!.adapter(in1);
    for (let i = 0; i < 61; i++) {
      await new Promise((r) => setTimeout(r, 1));
      w1.step(na.collectInputs(w1.tick));
      na.publish(w1.tick, w1, w1.drainEvents());
      c2.receive(w2);
    }
    // Bia continua andando; Ana sumiu da partida; Caio recebe o estado do novo anfitrião
    expect(w1.get(2)!.t.x).toBeGreaterThan(bx + 1);
    expect(w1.get(1)).toBeUndefined();
    await until(() => {
      c2.receive(w2);
      return w2.tick === w1.tick;
    });
    expect(w2.get(2)!.t.x).toBeCloseTo(w1.get(2)!.t.x, 1);
    expect(w2.get(1)).toBeUndefined();
    expect(w2.entities.length).toBe(w1.entities.length);
  });
});
