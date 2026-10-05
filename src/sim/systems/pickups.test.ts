import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../ai/spawnEnemy';
import { Btn } from '../InputFrame';
import { makeWorld, player, run } from '../test/helpers';
import { spawnPickup } from './pickups';
import { kitHeal } from '../../data/balance';
import type { CharacterId } from '../../data/types';
import type { World } from '../World';

function onGround(w: World, item: string): number {
  return w.entities.filter((e) => e.kind === 'pickup' && e.defId === item).length;
}

/** Coloca a arma no chão, já parada, bem embaixo do jogador (ou `dx` metros à frente). */
function dropAt(w: World, item: string, dx = 0) {
  const p = player(w);
  return spawnPickup(w, item as never, p.t.x + dx, p.t.z, false)!;
}

describe('pegar armas passando por cima', () => {
  it('arma de fogo nova: pega sozinho e já fica com ela na mão', () => {
    const w = makeWorld();
    dropAt(w, 'gun_shotgun', 2);
    run(w, 30, { moveX: 1 });
    const pc = player(w).player!;
    expect(pc.guns).toContain('shotgun');
    expect(pc.mode).toBe('gun');
    expect(pc.guns[pc.gunIdx]).toBe('shotgun');
    expect(onGround(w, 'gun_shotgun')).toBe(0);
  });

  it('arma branca: troca pela do chão e só pega a antiga de volta depois de se afastar', () => {
    const w = makeWorld();
    const pc = player(w).player!;
    dropAt(w, 'melee_knife');
    run(w, 2);
    expect(pc.melee?.id).toBe('knife');
    dropAt(w, 'melee_katana');
    run(w, 2);
    expect(pc.melee?.id).toBe('katana');
    // parado em cima da faca que soltou: não fica trocando sem parar
    run(w, 90);
    expect(pc.melee?.id).toBe('katana');
    expect(onGround(w, 'melee_knife')).toBe(1);
    // afasta e volta: aí pega a faca (e solta a katana)
    run(w, 40, { moveX: 1 });
    run(w, 60, { moveX: -1 });
    expect(pc.melee?.id).toBe('knife');
  });

  it('a maga não pega arma de fogo: fica no chão para os colegas', () => {
    const w = makeWorld({ loadout: { character: 'mage' } });
    dropAt(w, 'gun_rifle');
    run(w, 30);
    const pc = player(w).player!;
    expect(pc.guns).toEqual([]);
    expect(pc.mode).toBe('staff');
    expect(onGround(w, 'gun_rifle')).toBe(1);
  });
});

describe('o que cada personagem usa', () => {
  const toggle = (c: CharacterId) => {
    const w = makeWorld({ loadout: { character: c, guns: ['pistol', 'smg'], staffs: ['heal', 'fire'] } });
    const pc = player(w).player!;
    const start = pc.mode;
    run(w, 1, { buttons: Btn.ToggleMode });
    run(w, 1);
    const toggled = pc.mode;
    run(w, 1, { buttons: Btn.ModeGun });
    run(w, 1);
    const gun = pc.mode;
    run(w, 1, { buttons: Btn.ModeStaff });
    run(w, 1);
    return { start, toggled, gun, staff: pc.mode, guns: pc.guns, staffs: pc.staffs };
  };

  it('a maga fica no cajado e não tem armas de fogo na mão', () => {
    const r = toggle('mage');
    expect([r.start, r.toggled, r.gun, r.staff]).toEqual(['staff', 'staff', 'staff', 'staff']);
    expect(r.guns).toEqual([]);
  });

  it('militar, ciborgue e mutante não conjuram, mas guardam os cajados', () => {
    for (const c of ['military', 'cyborg', 'mutant'] as const) {
      const r = toggle(c);
      expect([r.start, r.toggled, r.gun, r.staff]).toEqual(['gun', 'gun', 'gun', 'gun']);
      expect(r.staffs).toEqual(['heal', 'fire']);
    }
  });

  it('o Zumbi Bot usa os dois', () => {
    const r = toggle('robot');
    expect([r.start, r.toggled, r.gun, r.staff]).toEqual(['gun', 'staff', 'gun', 'staff']);
  });

  it('a maga bate bem mais fraco com arma branca do que com o próprio soco', () => {
    const hit = (c: CharacterId, melee: boolean) => {
      const w = makeWorld({ loadout: { character: c } });
      const p = player(w);
      if (melee) p.player!.melee = { id: 'pipe', durability: 99 };
      const z = spawnEnemy(w, 'walker', p.t.x + 1, p.t.z, 'right');
      z.health!.hp = z.health!.max = 999;
      z.ai!.mode = 'recover';
      run(w, 1, { buttons: Btn.Punch });
      run(w, 20);
      return 999 - z.health!.hp;
    };
    const robotRatio = hit('robot', true) / hit('robot', false);
    const mageRatio = hit('mage', true) / hit('mage', false);
    expect(mageRatio).toBeLessThan(robotRatio * 0.7);
  });
});

describe('caixas de cura guardadas (quem não usa cajado)', () => {
  const kitEvents = (w: World) =>
    w.drainEvents().filter((e): e is Extract<typeof e, { t: 'medkit' }> => e.t === 'medkit');

  it('Militar, Ciborgue e Mutante começam o mapa com 4; quem usa cajado não tem', () => {
    for (const c of ['military', 'cyborg', 'mutant'] as const)
      expect(player(makeWorld({ loadout: { character: c } })).player!.medkits, c).toHaveLength(4);
    for (const c of ['robot', 'mage', 'prodigy'] as const)
      expect(player(makeWorld({ loadout: { character: c } })).player!.medkits, c).toHaveLength(0);
  });

  it('o botão do cajado usa uma caixa e cura; com a vida cheia não gasta; sem caixas avisa', () => {
    const w = makeWorld({ loadout: { character: 'military' } });
    const p = player(w);
    const pc = p.player!;
    const h = p.health!;
    run(w, 1, { buttons: Btn.ToggleMode });
    run(w, 1);
    expect(pc.medkits).toHaveLength(4);
    expect(kitEvents(w).map((e) => e.action)).toEqual(['full']);
    h.hp = h.max - 60;
    run(w, 1, { buttons: Btn.ModeStaff });
    run(w, 1);
    // cura 40 ou 40% da vida máxima, o que for maior
    expect(h.hp).toBe(h.max - 60 + Math.max(40, Math.round(0.4 * h.max)));
    expect(pc.medkits).toHaveLength(3);
    expect(pc.mode).toBe('gun');
    pc.medkits = [];
    run(w, 1, { buttons: Btn.ToggleMode });
    run(w, 1);
    expect(kitEvents(w).map((e) => e.action)).toEqual(['use', 'empty']);
  });

  it('com a vida cheia, a caixa de cura do chão é guardada até 4', () => {
    const w = makeWorld({ loadout: { character: 'cyborg' } });
    const pc = player(w).player!;
    pc.medkits = [40, 40, 40];
    dropAt(w, 'medkitL');
    run(w, 3);
    expect(pc.medkits).toEqual([40, 40, 40, 80]);
    expect(onGround(w, 'medkitL')).toBe(0);
    dropAt(w, 'medkitS');
    run(w, 3);
    expect(pc.medkits).toHaveLength(4);
    expect(onGround(w, 'medkitS')).toBe(1);
    // a próxima usada é a última guardada (a grande); a pequena do chão sai antes, senão curaria na hora
    for (const e of [...w.entities]) if (e.kind === 'pickup') w.remove(e.id);
    player(w).health!.hp = 10;
    run(w, 1, { buttons: Btn.ToggleMode });
    run(w, 1);
    expect(player(w).health!.hp).toBe(
      Math.min(player(w).health!.max, 10 + kitHeal(80, player(w).health!.max)),
    );
  });

  it('quem usa cajado não guarda: com a vida cheia a caixa fica no chão', () => {
    const w = makeWorld();
    dropAt(w, 'medkitS');
    run(w, 5);
    expect(player(w).player!.medkits).toEqual([]);
    expect(onGround(w, 'medkitS')).toBe(1);
  });
});

describe('kit médico', () => {
  it('cura 40 (pequeno) e 80 (grande), ou essa porcentagem da vida máxima nos níveis altos', () => {
    expect(kitHeal(40, 100)).toBe(40);
    expect(kitHeal(80, 100)).toBe(80);
    expect(kitHeal(40, 245)).toBe(98);
    expect(kitHeal(80, 245)).toBe(196);
    const w = makeWorld({ loadout: { level: 30 } });
    const h = player(w).health!;
    h.hp = 20;
    dropAt(w, 'medkitS');
    run(w, 3);
    expect(h.hp).toBe(20 + Math.round(0.4 * h.max));
  });
});
