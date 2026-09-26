import { describe, expect, it } from 'vitest';
import { coopEnemyCap, coopScaling } from '../data/balance';
import { getBoss } from '../data/bosses';
import { getMap } from '../data/maps';
import { sandbox } from '../data/maps/00-sandbox';
import type { CharacterId } from '../data/types';
import { keyboardFrame, SPLIT_KEYS, DEFAULT_KEYS } from '../input/keymap';
import { padFrame, type PadLike } from '../input/pads';
import { LocalAdapter } from '../net/LocalAdapter';
import { LobbyModel } from '../ui/lobby/model';
import { spawnEnemy } from './ai/spawnEnemy';
import { killEntity } from './combat/applyHit';
import { MAX_PLAYERS, type PlayerSlot } from './Entity';
import { Btn, emptyFrame, type InputFrame } from './InputFrame';
import { finishRun } from './level/LevelRunner';
import { hashWorld } from './snapshot';
import { onBossKilled, spawnBoss } from './systems/boss';
import { loadout } from './test/helpers';
import { World } from './World';

function party(chars: CharacterId[], map = sandbox, seed = 7): World {
  return new World({
    seed,
    map,
    levelIdx: 0,
    loadouts: chars.map((c, i) => loadout({ slot: i as PlayerSlot, character: c, name: `P${i + 1}` })),
    difficulty: 'normal',
    enemyCap: 14,
    noLevel: map === sandbox,
  });
}

function step(w: World, frames: Partial<Record<number, Partial<InputFrame>>> = {}, n = 1): void {
  for (let i = 0; i < n; i++) {
    const m = new Map<PlayerSlot, InputFrame>();
    for (const p of w.playerEntities())
      m.set(p.player!.slot, { ...emptyFrame(w.tick), ...(frames[p.player!.slot] ?? {}), tick: w.tick });
    w.step(m);
  }
}

describe('multijogador local', () => {
  it('5 jogadores: ids 1..5, a primeira entidade comum não colide e todos nascem dentro da faixa', () => {
    const w = party(['robot', 'mage', 'military', 'cyborg', 'mutant']);
    const ps = w.playerEntities();
    expect(MAX_PLAYERS).toBe(5);
    expect(ps.map((p) => p.id)).toEqual([1, 2, 3, 4, 5]);
    expect(ps.map((p) => p.player!.character)).toEqual(['robot', 'mage', 'military', 'cyborg', 'mutant']);
    const e = spawnEnemy(w, 'walker', 10, 0, 'right');
    expect(e.id).toBeGreaterThanOrEqual(6);
    expect(w.get(5)?.player?.slot).toBe(4);
    const zs = ps.map((p) => p.t.z);
    for (const z of zs) {
      expect(z).toBeGreaterThan(w.zBand[0]);
      expect(z).toBeLessThan(w.zBand[1]);
    }
    expect(new Set(zs).size).toBe(5);
  });

  it('solo continua igual: escala 1 e nasce no ponto de partida', () => {
    expect(coopScaling(1)).toEqual({ hp: 1, count: 1, bossHp: 1 });
    expect(coopEnemyCap(14, 1)).toBe(14);
    const w = party(['robot'], getMap('vila'));
    expect(w.get(1)!.t.z).toBe(w.level.playerStart.z);
    expect(w.get(1)!.t.x).toBe(w.level.playerStart.x);
    expect(coopEnemyCap(14, 5)).toBeLessThanOrEqual(Math.round(14 * 1.6));
  });

  it('inimigos e chefe ficam mais fortes com mais jogadores', () => {
    const one = party(['robot']);
    const five = party(['robot', 'mage', 'military', 'cyborg', 'mutant']);
    const a = spawnEnemy(one, 'walker', 10, 0, 'right');
    const b = spawnEnemy(five, 'walker', 10, 0, 'right');
    expect(b.health!.max).toBeGreaterThan(a.health!.max);
    const ba = spawnBoss(one, getBoss('coveiro'), 12, 0);
    const bb = spawnBoss(five, getBoss('coveiro'), 12, 0);
    expect(bb.health!.max).toBe(Math.round(ba.health!.max * coopScaling(5).bossHp));
  });

  it('sem vidas: PULAR pega uma vida do colega que tem mais (mínimo 2)', () => {
    const w = party(['robot', 'mage', 'mutant']);
    const [a, b, c] = w.playerEntities();
    a!.player!.lives = 1;
    b!.player!.lives = 3;
    c!.player!.lives = 3;
    killEntity(w, a!, 0);
    expect(a!.player!.lives).toBe(0);
    step(w, {}, 5);
    expect(a!.fighter!.state).toBe('dead');
    step(w, { 0: { buttons: Btn.Jump } });
    expect(a!.player!.lives).toBe(1);
    expect(b!.player!.lives).toBe(2); // empate entre P2 e P3: o menor número doa
    expect(c!.player!.lives).toBe(3);
    const ev = w.drainEvents().find((e) => e.t === 'lifeShare');
    expect(ev).toMatchObject({ t: 'lifeShare', from: b!.id, to: a!.id });
    step(w, {}, 3);
    expect(a!.fighter!.state).not.toBe('dead');

    // ninguém com 2 vidas: não dá para pegar
    const w2 = party(['robot', 'mage']);
    const [x, y] = w2.playerEntities();
    x!.player!.lives = 1;
    y!.player!.lives = 1;
    killEntity(w2, x!, 0);
    step(w2, {}, 2);
    step(w2, { 0: { buttons: Btn.Jump } });
    expect(x!.player!.lives).toBe(0);
    expect(w2.finished).toBeNull();
  });

  it('resultado: totais da equipe, uma linha por jogador e chefe dividido', () => {
    const w = party(['robot', 'mage'], getMap('vila'));
    const [a, b] = w.playerEntities();
    const boss = spawnBoss(w, getBoss('coveiro'), 20, 0);
    onBossKilled(w, boss, a!.id);
    const reward = getBoss('coveiro').rewards;
    expect(a!.player!.score).toBe(Math.ceil(reward.score / 2));
    expect(b!.player!.scrap).toBe(Math.ceil(reward.scrap / 2));
    a!.player!.kills = 5;
    b!.player!.kills = 3;
    finishRun(w, true);
    const ev = w.drainEvents().find((e) => e.t === 'victory');
    expect(ev?.t).toBe('victory');
    if (ev?.t !== 'victory') return;
    const s = ev.stats;
    expect(s.players).toHaveLength(2);
    expect(s.kills).toBe(8);
    expect(s.chars).toEqual(['robot', 'mage']);
    expect(s.score).toBeGreaterThanOrEqual(s.players![0]!.score + s.players![1]!.score);
    expect(s.scrap).toBe(s.players![0]!.scrap + s.players![1]!.scrap);
  });

  it('mesma semente e mesmas entradas de 5 jogadores → mesmo resultado (determinismo)', () => {
    const script = (w: World) => {
      for (let i = 0; i < 240; i++)
        step(w, {
          0: { moveX: 1, buttons: i % 20 < 2 ? Btn.Punch : 0 },
          1: { moveX: 1, moveZ: -0.5 },
          2: { buttons: i % 30 === 0 ? Btn.Special : 0 },
          3: { moveX: -1, buttons: i % 12 === 0 ? Btn.Fire : 0 },
          4: { moveZ: 1, buttons: i % 40 === 0 ? Btn.Jump : 0 },
        });
    };
    const w1 = party(['robot', 'mage', 'military', 'cyborg', 'mutant'], getMap('vila'), 99);
    const w2 = party(['robot', 'mage', 'military', 'cyborg', 'mutant'], getMap('vila'), 99);
    script(w1);
    script(w2);
    expect(hashWorld(w1)).toBe(hashWorld(w2));
  });
});

describe('entradas do multijogador', () => {
  it('teclado dividido: nenhuma tecla repetida entre os lados nem com Esc/P/M', () => {
    const left = Object.values(SPLIT_KEYS.left).flat();
    const right = Object.values(SPLIT_KEYS.right).flat();
    expect(left.filter((k) => right.includes(k))).toEqual([]);
    for (const k of [...DEFAULT_KEYS.pause, ...DEFAULT_KEYS.map]) {
      expect(left).not.toContain(k);
      expect(right).not.toContain(k);
    }
    expect(new Set(left).size).toBe(left.length);
    expect(new Set(right).size).toBe(right.length);
  });

  it('cada metade do teclado lê só as suas teclas', () => {
    const held = new Set(['KeyF', 'KeyD', 'ArrowLeft', 'KeyL']);
    const l = keyboardFrame(held, new Set(), SPLIT_KEYS.left);
    const r = keyboardFrame(held, new Set(), SPLIT_KEYS.right);
    expect(l).toEqual({ mx: 1, mz: 0, buttons: Btn.Punch });
    expect(r).toEqual({ mx: -1, mz: 0, buttons: Btn.Jump });
    // toque curto entre ticks não se perde
    expect(keyboardFrame(new Set(), new Set(['Comma']), SPLIT_KEYS.right).buttons).toBe(Btn.Prev);
  });

  it('controle: botões segurados, bordas de troca de arma e pausa', () => {
    const pad = (pressed: number[], axes = [0, 0, 0, 0]): PadLike => ({
      index: 1,
      connected: true,
      axes,
      buttons: Array.from({ length: 17 }, (_, i) => ({
        pressed: pressed.includes(i),
        value: pressed.includes(i) ? 1 : 0,
      })),
    });
    const a = padFrame(pad([2, 4], [1, 0, 0, 0]), []);
    expect(a.buttons & Btn.Punch).toBeTruthy();
    expect(a.buttons & Btn.Prev).toBeTruthy();
    expect(a.mx).toBeCloseTo(1);
    const b = padFrame(pad([2, 4]), a.pressed);
    expect(b.buttons & Btn.Prev).toBe(0);
    expect(padFrame(pad([9]), []).pause).toBe(true);
  });

  it('adaptador local: um quadro por jogador e substituição por slot', () => {
    const src = (slot: PlayerSlot, moveX: number) => ({
      slot,
      sample: (tick: number) => ({ ...emptyFrame(tick), moveX }),
    });
    let ends = 0;
    const net = new LocalAdapter([src(1, 0.5), src(0, 1)], () => ends++);
    expect(net.localSlots()).toEqual([0, 1]);
    const m = net.collectInputs(3);
    expect(m.get(0)!.moveX).toBe(1);
    expect(m.get(1)!.moveX).toBe(0.5);
    expect(ends).toBe(1);
    net.setOverride(src(1, -1), 1);
    expect(net.collectInputs(4).get(1)!.moveX).toBe(-1);
    net.setOverride(null, 1);
    expect(net.collectInputs(5).get(1)!.moveX).toBe(0.5);
  });

  it('seleção: entrar, dividir o teclado, trocar, pronto e sair', () => {
    const m = new LobbyModel({ k: 'kb', layout: 'full' }, 'mage');
    expect(m.character(m.slots[0]!)).toBe('mage');
    const p2 = m.join({ k: 'pad', index: 0 })!;
    expect(p2.slot).toBe(1);
    expect(m.character(p2)).toBe('robot'); // sugere um personagem ainda não usado
    expect(m.join({ k: 'pad', index: 0 })).toBeNull(); // o mesmo controle não entra duas vezes
    const p3 = m.splitKeyboard()!;
    expect(p3.slot).toBe(2);
    expect(m.slots[0]!.device).toEqual({ k: 'kb', layout: 'left' });
    expect(p3.device).toEqual({ k: 'kb', layout: 'right' });
    m.cycle(2, 1);
    m.cycle(2, -1);
    m.cycle(2, -1);
    expect(m.allReady()).toBe(false);
    for (const s of m.slots) m.toggleReady(s.slot);
    expect(m.allReady()).toBe(true);
    expect(m.leave(2)).toBe(true);
    expect(m.slots[0]!.device).toEqual({ k: 'kb', layout: 'full' }); // teclado volta a ser de um só
    expect(m.leave(0)).toBe(false); // jogador 1 saindo fecha a tela
    m.join({ k: 'pad', index: 1 });
    m.join({ k: 'pad', index: 2 });
    m.join({ k: 'pad', index: 3 });
    expect(m.full).toBe(true);
    expect(m.join({ k: 'pad', index: 4 })).toBeNull();
    expect(m.members().map((x) => x.slot)).toEqual([0, 1, 2, 3, 4]);
  });
});
