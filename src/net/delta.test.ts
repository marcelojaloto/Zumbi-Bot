import { describe, expect, it } from 'vitest';
import { getMap } from '../data/maps';
import { Autopilot } from '../sim/autopilot';
import type { PlayerSlot } from '../sim/Entity';
import type { InputFrame } from '../sim/InputFrame';
import { spawnEnemy } from '../sim/ai/spawnEnemy';
import { spawnProp } from '../sim/systems/props';
import { loadout } from '../sim/test/helpers';
import { World } from '../sim/World';
import { SnapshotEncoder, applyDelta, applyPatch, diff, reduceEntity, type SnapDelta } from './delta';

function party(n: number, seed = 5): World {
  const map = getMap('vila');
  const w = new World({
    seed,
    map,
    levelIdx: 0,
    loadouts: Array.from({ length: n }, (_, i) =>
      loadout({ slot: i as PlayerSlot, character: (['robot', 'mage', 'military'] as const)[i % 3] }),
    ),
    difficulty: 'normal',
    enemyCap: 14,
  });
  for (const p of w.level.props) spawnProp(w, p);
  w.drainEvents();
  return w;
}

const wire = (d: SnapDelta): SnapDelta => JSON.parse(JSON.stringify(d)) as SnapDelta;
const view = (w: World) => JSON.stringify(w.entities.map(reduceEntity));

describe('estado do mundo pela rede (diferenças)', () => {
  it('diff/applyPatch: troca, altera por dentro e apaga', () => {
    const a = { x: 1, t: { x: 1, y: 2 }, list: [1, 2], gone: true };
    const b = { x: 1, t: { x: 3, y: 2 }, list: [1, 2, 3] };
    const p = diff(a, b, 2)!;
    expect(p).toEqual({ s: { list: [1, 2, 3] }, p: { t: { s: { x: 3 } } }, d: ['gone'] });
    const c = structuredClone(a) as Record<string, unknown>;
    applyPatch(c, p);
    expect(c).toEqual(b);
    expect(diff(b, structuredClone(b), 2)).toBeNull();
  });

  it('o espelho do cliente acompanha o anfitrião numa fase de verdade (3 jogadores no piloto automático)', () => {
    const host = party(3);
    const client = party(3, 999);
    const bots = [0, 1, 2].map((s) => new Autopilot(() => host, s as PlayerSlot));
    const enc = new SnapshotEncoder();
    let bytes = 0;
    let n = 0;
    for (let i = 0; i < 60 * 40; i++) {
      const m = new Map<PlayerSlot, InputFrame>();
      bots.forEach((b, s) => m.set(s as PlayerSlot, b.sample(host.tick)));
      host.step(m);
      host.drainEvents();
      if (host.tick % 3) continue;
      const d = enc.encode(host);
      const s = JSON.stringify(d);
      bytes += s.length;
      n++;
      applyDelta(client, JSON.parse(s) as SnapDelta);
      if (host.tick % 120 === 0) expect(view(client)).toBe(view(host));
    }
    expect(client.tick).toBe(host.tick);
    expect(client.camX).toBeCloseTo(host.camX, 1);
    expect(client.levelState.segmentIdx).toBe(host.levelState.segmentIdx);
    expect(client.playerEntities().map((p) => p.player!.slot)).toEqual([0, 1, 2]);
    // média bem abaixo de um quadro completo (~15 KB)
    expect(bytes / n).toBeLessThan(4000);
  });

  it('entidades novas chegam inteiras, removidas somem, e o 1º envio é completo', () => {
    const host = party(1);
    const client = party(1, 3);
    spawnEnemy(client, 'walker', 12, 0, 'right'); // lixo local que o quadro completo apaga
    const enc = new SnapshotEncoder();
    const first = wire(enc.encode(host));
    expect(first.f).toBe(1);
    applyDelta(client, first);
    expect(view(client)).toBe(view(host));
    const e = spawnEnemy(host, 'walker', 10, 0, 'right');
    const d1 = wire(enc.encode(host));
    expect(d1.a?.map((x) => x.id)).toEqual([e.id]);
    const added = applyDelta(client, d1);
    expect(added.has(e.id)).toBe(true);
    expect(client.get(e.id)?.kind).toBe('enemy');
    expect(client.get(e.id)?.fighter?.hitSet).toEqual([]);
    host.remove(e.id);
    const d2 = wire(enc.encode(host));
    expect(d2.r).toEqual([e.id]);
    applyDelta(client, d2);
    expect(client.get(e.id)).toBeUndefined();
    // nada mudou: nenhuma entidade no envio
    const d3 = enc.encode(host);
    expect(d3.a).toBeUndefined();
    expect(d3.u).toBeUndefined();
    enc.reset();
    expect(enc.encode(host).f).toBe(1);
  });
});
