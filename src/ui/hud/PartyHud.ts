import { xpToNext } from '../../data/balance';
import { getCharacter } from '../../data/characters';
import { MELEE_WEAPONS } from '../../data/melee';
import { STAFFS } from '../../data/staffs';
import { STATUS } from '../../data/statusEffects';
import { FIREARMS } from '../../data/weapons';
import { SLOT_COLORS, playerTag } from '../../app/party';
import { lifeDonor } from '../../sim/systems/lives';
import type { Entity } from '../../sim/Entity';
import type { World } from '../../sim/World';
import { el } from '../dom';
import { t } from '../../i18n';
import type { VoiceHud } from './Hud';

interface Panel {
  root: HTMLDivElement;
  name: HTMLSpanElement;
  level: HTMLSpanElement;
  hp: HTMLDivElement;
  lag: HTMLDivElement;
  shield: HTMLDivElement;
  mana: HTMLDivElement;
  xp: HTMLDivElement;
  lives: HTMLSpanElement;
  mic: HTMLSpanElement;
  weapon: HTMLSpanElement;
  icons: HTMLSpanElement;
  note: HTMLDivElement;
  lagV: number;
  key: string;
  voiceKey: string;
}

const POWER_ICONS = { doubleDamage: '✖2', turbo: '⚡', invulnerable: '🛡', rage: '😡' } as const;

/**
 * Barras de energia no alto da tela, centralizadas: um painel por jogador (também no jogo solo), sem caixa nem
 * borda — só o nome na cor do jogador, as barras (vida, mana e XP), as vidas, a arma e os poderes. Cada painel tem
 * largura fixa, calculada para caberem 5 jogadores entre os botões da esquerda e a pontuação (ver hud.css).
 * Sem vidas, mostra como pegar uma vida emprestada de um colega.
 */
export class PartyHud {
  readonly root: HTMLDivElement;
  private panels = new Map<number, Panel>();
  private acc = 0;

  /**
   * `me`: jogador deste aparelho no online (painel marcado "você"); null no local. `solo`: um jogador só (sem a
   * etiqueta P1).
   */
  constructor(
    parent: HTMLElement,
    private me: number | null = null,
    private solo = false,
  ) {
    this.root = el('div', { class: 'party-hud' });
    parent.appendChild(this.root);
  }

  private panel(e: Entity): Panel {
    const slot = e.player!.slot;
    let p = this.panels.get(slot);
    if (p) return p;
    const name = el('span', { class: 'ph-name' });
    const level = el('span', { class: 'ph-lvl' });
    const hp = el('div', { class: 'bar-fill hp' });
    const lag = el('div', { class: 'bar-lag' });
    const shield = el('div', { class: 'bar-fill shield' });
    const mana = el('div', { class: 'bar-fill mana' });
    const xp = el('div', { class: 'ph-xp-fill' });
    const lives = el('span', { class: 'ph-lives' });
    const mic = el('span', { class: 'ph-mic' });
    const weapon = el('span', { class: 'ph-weapon' });
    const icons = el('span', { class: 'ph-icons' });
    const note = el('div', { class: 'ph-note' });
    const root = el(
      'div',
      { class: 'ph', style: `--pc:${SLOT_COLORS[slot]}` },
      el('div', { class: 'ph-head' }, this.solo ? null : el('b', {}, playerTag(slot)), name, mic, lives),
      el('div', { class: 'bar hpbar' }, lag, hp, shield),
      el('div', { class: 'bar manabar' }, mana),
      el('div', { class: 'ph-xp' }, xp),
      el('div', { class: 'ph-foot' }, weapon, icons, level),
      note,
    );
    if (this.me === slot) root.classList.add('me');
    p = {
      root,
      name,
      level,
      hp,
      lag,
      shield,
      mana,
      xp,
      lives,
      mic,
      weapon,
      icons,
      note,
      lagV: 1,
      key: '',
      voiceKey: '',
    };
    this.panels.set(slot, p);
    const order = [...this.panels.keys()].sort((a, b) => a - b);
    this.root.replaceChildren(...order.map((s) => this.panels.get(s)!.root));
    return p;
  }

  update(w: World, dt: number, voice: VoiceHud | null = null): void {
    const players = w.playerEntities();
    for (const e of players) {
      const pc = e.player!;
      const h = e.health!;
      const p = this.panel(e);
      const f = Math.max(0, h.hp / h.max);
      p.lagV = Math.max(f, p.lagV - dt * 0.5);
      p.hp.style.width = `${f * 100}%`;
      p.lag.style.width = `${p.lagV * 100}%`;
      p.shield.style.width = `${Math.min(1, h.shield / 100) * 100}%`;
      p.hp.classList.toggle('low', f < 0.25);
      p.mana.style.width = `${(pc.mana / pc.manaMax) * 100}%`;
    }
    this.acc += dt;
    if (this.acc < 0.1) return;
    this.acc = 0;
    for (const e of players) {
      const pc = e.player!;
      const p = this.panel(e);
      // chat de voz: 🎤 com o microfone ligado; 🔊 enquanto a pessoa fala
      const on = !!voice?.mine() && voice.mic(pc.slot);
      const talking = on && voice!.speaking(pc.slot);
      const vk = `${on}|${talking}`;
      if (vk !== p.voiceKey) {
        p.voiceKey = vk;
        p.mic.textContent = talking ? '🔊' : on ? '🎤' : '';
        p.root.classList.toggle('talking', talking);
      }
      if (p.root.dataset.char !== pc.character) {
        p.root.dataset.char = pc.character;
        p.name.textContent =
          t(getCharacter(pc.character).name) + (this.me === pc.slot ? ` (${t('você')})` : '');
      }
      p.xp.style.width = `${Math.min(1, pc.xp / xpToNext(pc.level)) * 100}%`;
      const out = pc.lives <= 0 && e.fighter?.state === 'dead';
      let weapon: string;
      if (pc.melee) weapon = t(MELEE_WEAPONS[pc.melee.id].name);
      else if (pc.mode === 'gun') {
        const g = FIREARMS[pc.guns[pc.gunIdx] ?? 'pistol'];
        const mag = pc.ammoMag[g.id] ?? 0;
        weapon = `${t(g.short)} ${pc.fire.reload > 0 ? '⟳' : `${mag}/${g.reserveMax === 'infinite' ? '∞' : pc.ammo[g.ammo]}`}`;
      } else weapon = `✦ ${t(STAFFS[pc.staffs[pc.staffIdx] ?? 'heal'].name)}`;
      const icons = [
        ...(Object.keys(POWER_ICONS) as (keyof typeof POWER_ICONS)[])
          .filter((k) => pc.powers[k] > 0)
          .map((k) => POWER_ICONS[k]),
        ...(e.statuses ?? []).map((s) => STATUS[s.id].icon),
      ].join('');
      let note = '';
      if (pc.gone) note = t('Saiu da partida');
      else if (out) {
        const donor = lifeDonor(w, e);
        note = donor ? t('PULAR: pegar 1 vida de {p}', { p: playerTag(donor.player!.slot) }) : t('Sem vidas');
      } else if (pc.respawn > 0) note = t('Voltando...');
      const key = `${pc.lives}|${pc.level}|${weapon}|${icons}|${note}`;
      if (key === p.key) continue;
      p.key = key;
      p.lives.textContent = '♥'.repeat(Math.max(0, pc.lives));
      p.level.textContent = t('Nv {n}', { n: pc.level });
      p.weapon.textContent = weapon;
      p.icons.textContent = icons;
      p.note.textContent = note;
      p.root.classList.toggle('out', out);
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
