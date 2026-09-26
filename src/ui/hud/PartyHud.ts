import { getCharacter } from '../../data/characters';
import { STAFFS } from '../../data/staffs';
import { FIREARMS } from '../../data/weapons';
import { SLOT_COLORS, playerTag } from '../../app/party';
import { lifeDonor } from '../../sim/systems/lives';
import type { Entity } from '../../sim/Entity';
import type { World } from '../../sim/World';
import { el } from '../dom';
import { t } from '../../i18n';

interface Panel {
  root: HTMLDivElement;
  portrait: HTMLDivElement;
  name: HTMLSpanElement;
  hp: HTMLDivElement;
  mana: HTMLDivElement;
  lives: HTMLSpanElement;
  weapon: HTMLSpanElement;
  powers: HTMLSpanElement;
  note: HTMLDivElement;
  key: string;
}

const POWER_ICONS = { doubleDamage: '✖2', turbo: '⚡', invulnerable: '🛡', rage: '😡' } as const;

/**
 * HUD do multijogador local: um painel compacto por jogador (cor do jogador, retrato do personagem, vida,
 * mana, vidas, arma e poderes). Sem vidas, mostra como pegar uma vida emprestada de um colega.
 */
export class PartyHud {
  readonly root: HTMLDivElement;
  private panels = new Map<number, Panel>();
  private acc = 0;

  constructor(parent: HTMLElement) {
    this.root = el('div', { class: 'party-hud' });
    parent.appendChild(this.root);
  }

  private panel(e: Entity): Panel {
    const slot = e.player!.slot;
    let p = this.panels.get(slot);
    if (p) return p;
    const portrait = el('div', { class: 'portrait' }, el('div', { class: 'visor' }));
    const name = el('span', { class: 'ph-name' });
    const hp = el('div', { class: 'bar-fill hp' });
    const mana = el('div', { class: 'bar-fill mana' });
    const lives = el('span', { class: 'ph-lives' });
    const weapon = el('span', { class: 'ph-weapon' });
    const powers = el('span', { class: 'ph-powers' });
    const note = el('div', { class: 'ph-note' });
    const root = el(
      'div',
      { class: 'ph', style: `--pc:${SLOT_COLORS[slot]}` },
      portrait,
      el(
        'div',
        { class: 'ph-body' },
        el('div', { class: 'ph-head' }, el('b', {}, playerTag(slot)), name, lives),
        el('div', { class: 'bar hpbar' }, hp),
        el('div', { class: 'bar manabar' }, mana),
        el('div', { class: 'ph-foot' }, weapon, powers),
        note,
      ),
    );
    p = { root, portrait, name, hp, mana, lives, weapon, powers, note, key: '' };
    this.panels.set(slot, p);
    const order = [...this.panels.keys()].sort((a, b) => a - b);
    this.root.replaceChildren(...order.map((s) => this.panels.get(s)!.root));
    return p;
  }

  update(w: World, dt: number): void {
    const players = w.playerEntities();
    for (const e of players) {
      const pc = e.player!;
      const h = e.health!;
      const p = this.panel(e);
      p.hp.style.width = `${Math.max(0, h.hp / h.max) * 100}%`;
      p.hp.classList.toggle('low', h.hp / h.max < 0.25);
      p.mana.style.width = `${(pc.mana / pc.manaMax) * 100}%`;
    }
    this.acc += dt;
    if (this.acc < 0.1) return;
    this.acc = 0;
    for (const e of players) {
      const pc = e.player!;
      const p = this.panel(e);
      if (p.portrait.dataset.char !== pc.character) {
        p.portrait.dataset.char = pc.character;
        p.name.textContent = t(getCharacter(pc.character).name);
      }
      const out = pc.lives <= 0 && e.fighter?.state === 'dead';
      let weapon: string;
      if (pc.mode === 'gun') {
        const g = FIREARMS[pc.guns[pc.gunIdx] ?? 'pistol'];
        const mag = pc.ammoMag[g.id] ?? 0;
        weapon = `${t(g.short)} ${pc.fire.reload > 0 ? '⟳' : `${mag}/${g.reserveMax === 'infinite' ? '∞' : pc.ammo[g.ammo]}`}`;
      } else weapon = `✦ ${t(STAFFS[pc.staffs[pc.staffIdx] ?? 'heal'].name)}`;
      const powers = (Object.keys(POWER_ICONS) as (keyof typeof POWER_ICONS)[])
        .filter((k) => pc.powers[k] > 0)
        .map((k) => POWER_ICONS[k])
        .join(' ');
      let note = '';
      if (out) {
        const donor = lifeDonor(w, e);
        note = donor ? t('PULAR: pegar 1 vida de {p}', { p: playerTag(donor.player!.slot) }) : t('Sem vidas');
      } else if (pc.respawn > 0) note = t('Voltando...');
      const key = `${pc.lives}|${weapon}|${powers}|${note}`;
      if (key === p.key) continue;
      p.key = key;
      p.lives.textContent = '♥'.repeat(Math.max(0, pc.lives));
      p.weapon.textContent = weapon;
      p.powers.textContent = powers;
      p.note.textContent = note;
      p.root.classList.toggle('out', out);
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
