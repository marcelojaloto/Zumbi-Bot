import { describe, expect, it } from 'vitest';
import { CHARACTERS, CHARACTER_ORDER, HERO_ORDER, playableCharacters } from '../data/characters';
import { COSMETICS, SECRET_GIFTS } from '../data/cosmetics';
import { Profile } from '../app/Profile';
import { MemoryKV, Storage } from '../save/storage';
import { LobbyModel } from '../ui/lobby/model';
import { nextCharacter } from '../ui/screens/CharacterPicker';
import { spawnEnemy } from './ai/spawnEnemy';
import { Btn } from './InputFrame';
import { makeWorld, player, run } from './test/helpers';
import { spawnPickup } from './systems/pickups';

describe('personagem secreto (Prodígio)', () => {
  it('só entra na escolha depois de terminar o jogo', () => {
    expect(CHARACTERS.prodigy.secret).toBe(true);
    expect(playableCharacters(false)).toEqual(HERO_ORDER);
    expect(playableCharacters(true)).toEqual(CHARACTER_ORDER);
    const p = new Profile(new Storage(new MemoryKV()));
    expect(p.roster).not.toContain('prodigy');
    // mesmo com o save apontando para ele, joga com o robô enquanto não liberou
    p.save.profile.character = 'prodigy';
    expect(p.loadout().character).toBe('robot');
    expect(nextCharacter('mutant', 1, p.roster)).toBe('robot');
    const lobby = new LobbyModel({ k: 'kb', layout: 'full' }, 'mutant', p.roster);
    lobby.cycle(0, 1);
    expect(lobby.character(lobby.slots[0]!)).toBe('robot');
  });

  it('terminou o jogo: libera o Prodígio e o disfarce vai para o guarda-roupa (sem equipar e sem vender)', () => {
    const kv = new MemoryKV();
    const p = new Profile(new Storage(kv));
    p.unlockSecret();
    expect(p.roster).toContain('prodigy');
    expect(nextCharacter('mutant', 1, p.roster)).toBe('prodigy');
    for (const id of SECRET_GIFTS) {
      expect(p.owns(id)).toBe(true);
      expect(COSMETICS[id]!.price).toBeNull();
    }
    expect(p.save.cosmetics.equipped).toEqual({});
    expect(p.sell('wig_black')).toBe(false);
    p.setCharacter('prodigy');
    p.persist();
    expect(new Profile(new Storage(kv)).loadout().character).toBe('prodigy');
  });

  it('quem já tinha terminado o jogo ganha o disfarce ao abrir a versão nova', () => {
    const kv = new MemoryKV();
    const p = new Profile(new Storage(kv));
    p.save.flags.credits = true;
    p.persist();
    const again = new Profile(new Storage(kv));
    expect(SECRET_GIFTS.every((id) => again.owns(id))).toBe(true);
  });

  it('usa o cajado, não pega arma de fogo e o Tornado Arcano acerta várias vezes avançando', () => {
    const w = makeWorld({ loadout: { character: 'prodigy', guns: ['pistol', 'smg'] } });
    const p = player(w);
    expect(p.player!.mode).toBe('staff');
    expect(p.player!.guns).toEqual([]);
    spawnPickup(w, 'gun_shotgun', p.t.x, p.t.z, false);
    run(w, 10);
    expect(p.player!.guns).toEqual([]);
    const z = spawnEnemy(w, 'walker', p.t.x + 2.2, p.t.z, 'right');
    z.health!.hp = z.health!.max = 999;
    const x0 = p.t.x;
    let hits = 0;
    run(w, 1, { buttons: Btn.Special });
    for (let i = 0; i < 50; i++) {
      run(w, 1);
      hits += w.drainEvents().filter((e) => e.t === 'hit' && e.dst === z.id && e.amount > 0).length;
    }
    expect(p.t.x - x0).toBeGreaterThan(1.5);
    expect(hits).toBeGreaterThanOrEqual(2);
  });
});
