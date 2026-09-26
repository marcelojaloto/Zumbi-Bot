import { CHARACTER_ORDER } from '../../data/characters';
import type { CharacterId } from '../../data/types';
import type { PartyMember } from '../../app/party';
import { sameDevice, type DeviceRef } from '../../input/devices';
import { MAX_PLAYERS, type PlayerSlot } from '../../sim/Entity';

export interface LobbySlot {
  slot: PlayerSlot;
  device: DeviceRef;
  charIdx: number;
  ready: boolean;
}

/**
 * Estado da seleção de jogadores (sem DOM): quem entrou, com que dispositivo, qual personagem e se está pronto.
 * O jogador 1 é quem abriu a tela. Uma segunda pessoa no teclado divide o teclado (esquerda/direita); quando uma
 * das metades sai, a outra volta a ter o teclado inteiro.
 */
export class LobbyModel {
  slots: LobbySlot[] = [];

  constructor(first: DeviceRef, char: CharacterId = 'robot') {
    this.slots.push({
      slot: 0,
      device: first,
      charIdx: Math.max(0, CHARACTER_ORDER.indexOf(char)),
      ready: false,
    });
  }

  get full(): boolean {
    return this.slots.length >= MAX_PLAYERS;
  }

  find(dev: DeviceRef): LobbySlot | undefined {
    return this.slots.find((s) => sameDevice(s.device, dev));
  }

  get(slot: PlayerSlot): LobbySlot | undefined {
    return this.slots.find((s) => s.slot === slot);
  }

  keyboardSlots(): LobbySlot[] {
    return this.slots.filter((s) => s.device.k === 'kb');
  }

  /** Entra um jogador novo com o dispositivo (menor número livre); personagem sugerido = o próximo não usado. */
  join(dev: DeviceRef): LobbySlot | null {
    if (this.full || this.find(dev)) return null;
    let slot = 0 as PlayerSlot;
    while (this.slots.some((s) => s.slot === slot)) slot = (slot + 1) as PlayerSlot;
    const used = new Set(this.slots.map((s) => s.charIdx));
    let charIdx = 0;
    while (used.has(charIdx) && charIdx < CHARACTER_ORDER.length - 1) charIdx++;
    const s: LobbySlot = { slot, device: dev, charIdx, ready: false };
    this.slots.push(s);
    this.slots.sort((a, b) => a.slot - b.slot);
    return s;
  }

  /** Segunda pessoa no teclado: quem tinha o teclado inteiro fica com a esquerda, a nova entra na direita. */
  splitKeyboard(): LobbySlot | null {
    const kb = this.keyboardSlots();
    if (kb.length !== 1 || this.full) return null;
    const cur = kb[0]!;
    cur.device = { k: 'kb', layout: 'left' };
    return this.join({ k: 'kb', layout: 'right' });
  }

  /** Sai um jogador; devolve false se era o jogador 1 (a tela fecha). */
  leave(slot: PlayerSlot): boolean {
    if (slot === 0) return false;
    const i = this.slots.findIndex((s) => s.slot === slot);
    if (i < 0) return true;
    const [gone] = this.slots.splice(i, 1);
    if (gone?.device.k === 'kb') {
      const other = this.keyboardSlots();
      if (other.length === 1) other[0]!.device = { k: 'kb', layout: 'full' };
    }
    return true;
  }

  cycle(slot: PlayerSlot, dir: number): void {
    const s = this.get(slot);
    if (!s || s.ready) return;
    const n = CHARACTER_ORDER.length;
    s.charIdx = (((s.charIdx + dir) % n) + n) % n;
  }

  setChar(slot: PlayerSlot, id: CharacterId): void {
    const s = this.get(slot);
    const i = CHARACTER_ORDER.indexOf(id);
    if (s && i >= 0) s.charIdx = i;
  }

  toggleReady(slot: PlayerSlot): void {
    const s = this.get(slot);
    if (s) s.ready = !s.ready;
  }

  allReady(): boolean {
    return this.slots.length > 0 && this.slots.every((s) => s.ready);
  }

  character(s: LobbySlot): CharacterId {
    return CHARACTER_ORDER[s.charIdx] ?? 'robot';
  }

  members(): PartyMember[] {
    return this.slots.map((s) => ({ slot: s.slot, character: this.character(s), device: s.device }));
  }
}
