import { describe, expect, it } from 'vitest';
import { Object3D } from 'three';
import { CHARACTERS } from '../../data/characters';
import { COSMETICS } from '../../data/cosmetics';
import type { CharacterId, CosmeticSlot } from '../../data/types';
import { characterRig } from '../rig/characterRigs';
import type { RigSpec, SocketSpec } from '../rig/RigBuilder';
import { J } from '../rig/skeleton';
import { CosmeticRig } from './Attachments';
import type { CharacterView } from './CharacterView';

type V3 = [number, number, number];

const IDS = Object.keys(CHARACTERS) as CharacterId[];

/** Peça base de cada encaixe de membro, na medida do robô: [centro, meia-medida]. */
const CORE: Record<'arm' | 'leg' | 'foot', [V3, V3]> = {
  arm: [
    [0, 0.01, 0],
    [0.085, 0.075, 0.085],
  ],
  leg: [
    [0, -0.01, 0],
    [0.095, 0.13, 0.095],
  ],
  foot: [
    [0, 0.058, 0.005],
    [0.1, 0.0625, 0.17],
  ],
};

/** Caixa da peça base no espaço da junta: [mínimo, máximo]. */
function coreBox(s: SocketSpec, kind: keyof typeof CORE): [V3, V3] {
  const sc: V3 = Array.isArray(s.scale) ? s.scale : [s.scale ?? 1, s.scale ?? 1, s.scale ?? 1];
  const [c, h] = CORE[kind];
  const mid = [0, 1, 2].map((i) => s.at[i]! + c[i]! * sc[i]!) as V3;
  const half = [0, 1, 2].map((i) => h[i]! * sc[i]!) as V3;
  return [mid.map((m, i) => m - half[i]!) as V3, mid.map((m, i) => m + half[i]!) as V3];
}

/** Caixa de uma peça do personagem (cilindro e esfera pelo raio maior). */
function partBox(p: RigSpec['parts'][number]): [V3, V3] {
  const half: V3 =
    p.shape === 'box'
      ? [p.size[0]! / 2, p.size[1]! / 2, p.size[2]! / 2]
      : p.shape === 'cyl'
        ? [Math.max(p.size[0]!, p.size[1]!), p.size[2]! / 2, Math.max(p.size[0]!, p.size[1]!)]
        : [p.size[0]!, p.size[0]!, p.size[0]!];
  return [p.at.map((a, i) => a - half[i]!) as V3, p.at.map((a, i) => a + half[i]!) as V3];
}

describe('encaixes dos membros', () => {
  it('todo personagem jogável tem os seis encaixes', () => {
    for (const id of IDS) {
      const s = characterRig(id).sockets;
      for (const k of ['armL', 'armR', 'legL', 'legR', 'footL', 'footR'])
        expect(s[k], `${id} ${k}`).toBeDefined();
    }
  });

  it('braçadeira e caneleira ficam por fora do membro na altura em que estão', () => {
    const pairs: [string, number, 'arm' | 'leg'][] = [
      ['armL', J.foreArmL, 'arm'],
      ['armR', J.foreArmR, 'arm'],
      ['legL', J.shinL, 'leg'],
      ['legR', J.shinR, 'leg'],
    ];
    for (const id of IDS) {
      const spec = characterRig(id);
      for (const [name, j, kind] of pairs) {
        const [lo, hi] = coreBox(spec.sockets[name]!, kind);
        for (const p of spec.parts.filter((x) => x.j === j)) {
          const [plo, phi] = partBox(p);
          if (phi[1] < lo[1] || plo[1] > hi[1]) continue;
          for (const i of [0, 2]) {
            expect(lo[i]!, `${id} ${name} eixo ${i}`).toBeLessThan(plo[i]!);
            expect(hi[i]!, `${id} ${name} eixo ${i}`).toBeGreaterThan(phi[i]!);
          }
        }
      }
    }
  });

  it('a bota cobre o pé inteiro de cada personagem', () => {
    for (const id of IDS) {
      const spec = characterRig(id);
      for (const [name, j] of [
        ['footL', J.footL],
        ['footR', J.footR],
      ] as const) {
        const [lo, hi] = coreBox(spec.sockets[name]!, 'foot');
        for (const p of spec.parts.filter((x) => x.j === j)) {
          const [plo, phi] = partBox(p);
          for (const i of [0, 1, 2]) {
            expect(lo[i]!, `${id} ${name} eixo ${i}`).toBeLessThanOrEqual(plo[i]! + 1e-6);
            expect(hi[i]!, `${id} ${name} eixo ${i}`).toBeGreaterThan(phi[i]!);
          }
        }
      }
    }
  });
});

/** Vista mínima: só os encaixes que o CosmeticRig usa. */
function fakeView(): { view: CharacterView; sockets: Record<string, Object3D> } {
  const sockets: Record<string, Object3D> = {};
  for (const k of [
    'head_top',
    'face',
    'mouth',
    'torso',
    'back',
    'armL',
    'armR',
    'legL',
    'legR',
    'footL',
    'footR',
  ])
    sockets[k] = new Object3D();
  const view = {
    socket: (n: string) => sockets[n],
    rig: { built: { spec: { key: 'teste' } }, bones: [] },
  } as unknown as CharacterView;
  return { view, sockets };
}

describe('CosmeticRig', () => {
  it('peça de membro aparece nos dois lados e some ao trocar', () => {
    const { view, sockets } = fakeView();
    const rig = new CosmeticRig(view);
    rig.set({ arms: 'bracers_apprentice', feet: 'boots_rain' });
    for (const k of ['armL', 'armR', 'footL', 'footR']) expect(sockets[k]!.children.length, k).toBe(1);
    rig.set({ feet: 'boots_rain' });
    expect(sockets.armL!.children.length + sockets.armR!.children.length).toBe(0);
    rig.dispose();
    expect(sockets.footL!.children.length).toBe(0);
  });

  it('manto comprido esconde as caneleiras', () => {
    const { view, sockets } = fakeView();
    const rig = new CosmeticRig(view);
    rig.set({ legs: 'shinguards_soccer' });
    expect(sockets.legL!.children.length).toBe(1);
    rig.set({ legs: 'shinguards_soccer', body: 'robe_starry' });
    expect(sockets.legL!.children.length + sockets.legR!.children.length).toBe(0);
    rig.set({ legs: 'shinguards_soccer' });
    expect(sockets.legR!.children.length).toBe(1);
  });
});

describe('catálogo dos membros', () => {
  it('cada encaixe novo tem peças de mago, zumbi e chefe', () => {
    for (const slot of ['arms', 'legs', 'feet'] as CosmeticSlot[]) {
      const items = Object.values(COSMETICS).filter((c) => c.slot === slot);
      expect(items.length).toBeGreaterThanOrEqual(4);
      for (const set of ['wizard', 'zombie', 'boss'])
        expect(
          items.some((c) => c.set === set),
          `${slot} ${set}`,
        ).toBe(true);
    }
  });
});
