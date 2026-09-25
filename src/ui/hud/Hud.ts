import { xpToNext } from '../../data/balance';
import { ITEMS } from '../../data/items';
import { MELEE_WEAPONS } from '../../data/melee';
import { STAFFS } from '../../data/staffs';
import { STATUS } from '../../data/statusEffects';
import { FIREARMS } from '../../data/weapons';
import { BOSSES } from '../../data/bosses';
import { COSMETICS, RARITY_COLORS, RARITY_NAMES } from '../../data/cosmetics';
import type { GameEvent } from '../../sim/events';
import type { World } from '../../sim/World';
import type { Entity } from '../../sim/Entity';
import { ELEMENT_COLORS } from '../../render/views/staffRecipe';
import { el, fmtInt, hexColor } from '../dom';
import { Minimap } from './Minimap';
import type { Element } from '../../data/types';
import { t } from '../../i18n';

export const ELEMENT_NAMES: Record<Element, string> = {
  heal: 'Cura',
  fire: 'Fogo',
  water: 'Água',
  ice: 'Gelo',
  electric: 'Eletricidade',
  toxic: 'Tóxico',
  cyber: 'Cibernético',
  wind: 'Vento',
  earth: 'Terra',
  necro: 'Necromancia',
};

const POWER_INFO = {
  doubleDamage: { icon: '✖2', color: '#ff4a3a' },
  turbo: { icon: '⚡', color: '#ffd24a' },
  invulnerable: { icon: '🛡', color: '#ffffff' },
} as const;

/** Dicas do tutorial que citam teclas: versão para os controles de toque. */
export const TOUCH_HINTS: Record<string, string> = {
  'A/D andam • W/S mudam de plano (profundidade)':
    'Arraste o direcional para andar • para cima e para baixo muda de plano (profundidade)',
  'J = soco • K = chute • J, J, J, J = combo com uppercut':
    'SOCO e CHUTE atacam • 4 socos seguidos = combo com uppercut',
  'Espaço pula — aperte de novo no ar para o pulo duplo':
    'PULAR pula — toque de novo no ar para o pulo duplo',
  'Clique (ou L) atira • botão direito mira para crítico':
    'ATIRAR dispara e mira sozinho no inimigo à frente',
  'Shift ou toque duplo corre • correndo + K = voadora':
    'Empurre o direcional até a borda para correr • correndo + CHUTE = voadora',
  '2 = modo cajado • 1 = armas • U (ou J+K) = Giro Turbo':
    'O botão ⇄ troca arma e cajado • ESPECIAL = Giro Turbo',
};

/** HUD em HTML sobre o canvas: vida, mana, vidas, XP, pontuação, combo, arma, minimapa, chefe e avisos. */
export class Hud {
  readonly root: HTMLDivElement;
  readonly minimap: Minimap;
  private hpFill: HTMLDivElement;
  private hpLag: HTMLDivElement;
  private shieldFill: HTMLDivElement;
  private manaFill: HTMLDivElement;
  private hpText: HTMLSpanElement;
  private lives: HTMLDivElement;
  private level: HTMLSpanElement;
  private xpFill: HTMLDivElement;
  private score: HTMLDivElement;
  private combo: HTMLDivElement;
  private mapName: HTMLDivElement;
  private pips: HTMLDivElement;
  private go: HTMLDivElement;
  private weaponName: HTMLDivElement;
  private ammo: HTMLDivElement;
  private ring: HTMLDivElement;
  private meleeBox: HTMLDivElement;
  private slots: HTMLDivElement;
  private powers: HTMLDivElement;
  private statuses: HTMLDivElement;
  private toasts: HTMLDivElement;
  private hint: HTMLDivElement;
  readonly crosshair: HTMLDivElement;
  private bossBar: HTMLDivElement;
  private bossFill: HTMLDivElement;
  private bossLag: HTMLDivElement;
  private bossName: HTMLDivElement;
  private bossPhases: HTMLDivElement;
  private banner: HTMLDivElement;
  private fps: HTMLDivElement;
  private hpLagV = 1;
  private bossLagV = 1;
  private lastCombo = 0;
  private acc = 0;
  private goTimer = 0;
  private hintTimer = 0;
  private lastKey = '';
  showFps = false;
  crosshairVisible = true;
  /** Configuração "Mostrar dicas". */
  showHints = true;
  /** Controles de toque ativos: dicas do tutorial viram a versão de toque. */
  touchMode = false;

  constructor(parent: HTMLElement) {
    this.hpFill = el('div', { class: 'bar-fill hp' });
    this.hpLag = el('div', { class: 'bar-lag' });
    this.shieldFill = el('div', { class: 'bar-fill shield' });
    this.manaFill = el('div', { class: 'bar-fill mana' });
    this.hpText = el('span', { class: 'bar-text' });
    this.lives = el('div', { class: 'lives' });
    this.level = el('span', { class: 'lvl' });
    this.xpFill = el('div', { class: 'xp-fill' });
    const tl = el(
      'div',
      { class: 'hud-tl' },
      el('div', { class: 'portrait' }, el('div', { class: 'visor' })),
      el(
        'div',
        { class: 'bars' },
        el('div', { class: 'bar hpbar' }, this.hpLag, this.hpFill, this.shieldFill, this.hpText),
        el('div', { class: 'bar manabar' }, this.manaFill),
        el('div', { class: 'row' }, this.lives, this.level, el('div', { class: 'xp' }, this.xpFill)),
      ),
    );
    this.mapName = el('div', { class: 'mapname' });
    this.pips = el('div', { class: 'pips' });
    this.go = el('div', { class: 'go' }, t('SIGA ➜'));
    const tc = el('div', { class: 'hud-tc' }, this.mapName, this.pips, this.go);
    this.score = el('div', { class: 'score' }, '0');
    this.combo = el('div', { class: 'combo' });
    const tr = el('div', { class: 'hud-tr' }, this.score, this.combo);
    this.minimap = new Minimap(tr);
    this.weaponName = el('div', { class: 'wname' });
    this.ammo = el('div', { class: 'ammo' });
    this.ring = el('div', { class: 'ring' });
    this.meleeBox = el('div', { class: 'melee' });
    this.slots = el('div', { class: 'slots' });
    const br = el(
      'div',
      { class: 'hud-br' },
      el('div', { class: 'weapon' }, this.ring, el('div', {}, this.weaponName, this.ammo)),
      this.meleeBox,
      this.slots,
    );
    this.powers = el('div', { class: 'powers' });
    this.statuses = el('div', { class: 'statuses' });
    const bl = el('div', { class: 'hud-bl' }, this.powers, this.statuses);
    this.bossName = el('div', { class: 'boss-name' });
    this.bossFill = el('div', { class: 'boss-fill' });
    this.bossLag = el('div', { class: 'boss-lag' });
    this.bossPhases = el('div', { class: 'boss-phases' });
    this.bossBar = el(
      'div',
      { class: 'hud-boss' },
      this.bossName,
      el('div', { class: 'boss-bar' }, this.bossLag, this.bossFill, this.bossPhases),
    );
    this.toasts = el('div', { class: 'toasts' });
    this.hint = el('div', { class: 'hint' });
    this.crosshair = el('div', { class: 'crosshair' }, el('i'), el('i'), el('i'), el('i'));
    this.banner = el('div', { class: 'banner' });
    this.fps = el('div', { class: 'fps' });
    this.root = el(
      'div',
      { class: 'hud' },
      tl,
      tc,
      tr,
      bl,
      br,
      this.bossBar,
      this.toasts,
      this.hint,
      this.banner,
      this.crosshair,
      this.fps,
    );
    parent.appendChild(this.root);
  }

  /** Rótulos fixos depois de trocar o idioma (o resto é atualizado a cada quadro). */
  relabel(): void {
    this.go.textContent = t('SIGA ➜');
    this.bossName.dataset.id = '';
    this.lastKey = '';
  }

  toast(text: string, color = '#e8ecf4', sub?: string): void {
    const t = el(
      'div',
      { class: 'toast', style: `border-color:${color}` },
      el('b', { style: `color:${color}` }, text),
      sub ? el('span', {}, sub) : null,
    );
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 5) this.toasts.firstChild?.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3200);
  }

  showBanner(title: string, sub = '', ms = 2200, cls = ''): void {
    this.banner.innerHTML = '';
    this.banner.append(el('div', { class: 'b-title' }, title), sub ? el('div', { class: 'b-sub' }, sub) : '');
    this.banner.className = `banner show ${cls}`;
    setTimeout(() => (this.banner.className = 'banner'), ms);
  }

  showHint(text: string): void {
    if (!this.showHints) return;
    this.hint.textContent = t((this.touchMode && TOUCH_HINTS[text]) || text);
    this.hint.classList.add('show');
    this.hintTimer = 5;
  }

  onEvents(events: GameEvent[], w: World): void {
    for (const ev of events) {
      switch (ev.t) {
        case 'go':
          this.goTimer = 4;
          break;
        case 'levelUp':
          this.toast(t('NÍVEL {n}!', { n: ev.level }), '#ffd24a', t('Vida e mana aumentaram'));
          break;
        case 'unlock':
          if (ev.kind === 'gun')
            this.toast(
              t('Nova arma: {name}', { name: t(FIREARMS[ev.id as keyof typeof FIREARMS]?.name ?? ev.id) }),
              '#ffb02a',
            );
          else
            this.toast(
              t('Novo cajado: {name}', { name: t(STAFFS[ev.id as keyof typeof STAFFS]?.name ?? ev.id) }),
              hexColor(ELEMENT_COLORS[ev.id as keyof typeof ELEMENT_COLORS] ?? 0xffffff),
            );
          break;
        case 'loot': {
          if (ev.cosmetic) {
            const c = COSMETICS[ev.cosmetic];
            if (c) {
              const col = hexColor(RARITY_COLORS[c.rarity]);
              if (ev.duplicate)
                this.toast(
                  t('{name} (repetido)', { name: t(c.name) }),
                  col,
                  t('+{n} sucata', { n: ev.scrap ?? 0 }),
                );
              else
                this.toast(t(c.name), col, t('{rarity} • novo item!', { rarity: t(RARITY_NAMES[c.rarity]) }));
            }
          } else if (ev.scrap) this.toast(t('+{n} sucata', { n: ev.scrap }), '#c8d0d8');
          break;
        }
        case 'pickup': {
          const d = ITEMS[ev.item];
          if (d && (d.effect.k === 'power' || d.effect.k === 'melee'))
            this.toast(t(d.name), hexColor(d.color));
          break;
        }
        case 'meleeBreak':
          this.toast(t('{name} quebrou!', { name: t(MELEE_WEAPONS[ev.melee].name) }), '#ff7a5a');
          break;
        case 'playerDown':
          if (ev.livesLeft > 0)
            this.showBanner(
              t('DESATIVADO'),
              ev.livesLeft === 1 ? t('1 vida restante') : t('{n} vidas restantes', { n: ev.livesLeft }),
              2000,
              'danger',
            );
          break;
        case 'hint':
          this.showHint(ev.text);
          break;
        case 'bossIntro': {
          const b = BOSSES[ev.bossId];
          if (b) this.showBanner(t(b.name).toUpperCase(), t(b.title), 3000, 'boss');
          break;
        }
        case 'bossPhase': {
          const be = w.get(ev.id);
          const name = be ? BOSSES[be.defId]?.phases[ev.phase]?.name : undefined;
          this.showBanner(t('FASE {n}', { n: ev.phase + 1 }), name ? t(name) : '', 1800, 'boss');
          break;
        }
        case 'bossElement': {
          const be = w.get(ev.id);
          const def = be ? BOSSES[be.defId] : undefined;
          if (def && be?.boss && def.phases[be.boss.phase]?.elementCycle)
            this.toast(
              `${t(def.name)}: ${t(ELEMENT_NAMES[ev.element])}`,
              hexColor(ELEMENT_COLORS[ev.element]),
            );
          break;
        }
        case 'bossDefeated':
          this.showBanner(t('CHEFE DERROTADO!'), '', 2500, 'win');
          break;
        case 'segment':
          if (ev.phase === 'locked') this.showBanner('', '', 1);
          break;
        default:
          break;
      }
    }
    void w;
  }

  update(w: World, dt: number, fps: number, cursor: { x: number; y: number; visible: boolean }): void {
    const p = w.get(1);
    if (!p?.player || !p.health) return;
    const pc = p.player;
    const h = p.health;
    // barras (todo quadro)
    const hpf = Math.max(0, h.hp / h.max);
    this.hpLagV = Math.max(hpf, this.hpLagV - dt * 0.5);
    this.hpFill.style.width = `${hpf * 100}%`;
    this.hpLag.style.width = `${this.hpLagV * 100}%`;
    this.shieldFill.style.width = `${Math.min(1, h.shield / 100) * 100}%`;
    this.manaFill.style.width = `${(pc.mana / pc.manaMax) * 100}%`;
    this.hpFill.classList.toggle('low', hpf < 0.25);
    this.goTimer = Math.max(0, this.goTimer - dt);
    this.go.classList.toggle('show', this.goTimer > 0);
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint.classList.remove('show');
    }
    this.updateCrosshair(p, cursor);
    this.updateBoss(w, dt);

    // texto a 20 Hz
    this.acc += dt;
    if (this.acc < 0.05) return;
    this.acc = 0;
    this.hpText.textContent = `${Math.ceil(h.hp)}/${h.max}${h.shield > 0 ? ` +${Math.ceil(h.shield)}` : ''}`;
    const livesKey = `${pc.lives}`;
    if (this.lives.dataset.v !== livesKey) {
      this.lives.dataset.v = livesKey;
      this.lives.textContent = '♥'.repeat(Math.max(0, pc.lives));
    }
    this.level.textContent = t('Nv {n}', { n: pc.level });
    this.xpFill.style.width = `${Math.min(1, pc.xp / xpToNext(pc.level)) * 100}%`;
    this.score.textContent = fmtInt(pc.score);
    if (pc.combo !== this.lastCombo) {
      this.lastCombo = pc.combo;
      if (pc.combo >= 3) {
        this.combo.textContent = `x${pc.combo} COMBO`;
        this.combo.classList.remove('pop');
        void this.combo.offsetWidth;
        this.combo.classList.add('pop', 'show');
      } else this.combo.classList.remove('show');
    }
    this.mapName.textContent =
      (w.map.index >= 0 ? `${w.map.index + 1}. ${t(w.map.name)}` : t(w.map.name)) +
      (w.ngPlus ? ' • NG+' : '');
    const segs = w.level.segments.filter((s) => s.lock);
    const pipKey = `${segs.length}:${w.levelState.cleared.join(',')}:${w.levelState.segmentIdx}:${w.levelState.active}`;
    if (this.pips.dataset.k !== pipKey) {
      this.pips.dataset.k = pipKey;
      this.pips.innerHTML = '';
      w.level.segments.forEach((s, i) => {
        if (!s.lock) return;
        const cls = w.levelState.cleared[i]
          ? 'done'
          : w.levelState.active && w.levelState.segmentIdx === i
            ? 'active'
            : '';
        this.pips.appendChild(el('i', { class: cls }));
      });
      if (w.level.boss)
        this.pips.appendChild(el('i', { class: `boss ${w.levelState.bossSpawned ? 'active' : ''}` }));
    }
    this.updateWeapon(p);
    this.updatePowers(p);
    this.minimap.update(w, 0.07);
    this.fps.style.display = this.showFps ? 'block' : 'none';
    if (this.showFps) this.fps.textContent = `${fps} FPS`;
  }

  private updateWeapon(p: Entity): void {
    const pc = p.player!;
    let key: string;
    if (pc.mode === 'gun') {
      const g = FIREARMS[pc.guns[pc.gunIdx] ?? 'pistol'];
      const mag = pc.ammoMag[g.id] ?? 0;
      const res = g.reserveMax === 'infinite' ? '∞' : String(pc.ammo[g.ammo]);
      this.weaponName.textContent = t(g.name);
      this.ammo.textContent = `${mag} / ${res}`;
      this.ammo.classList.toggle('empty', mag === 0);
      const rl = pc.fire.reloadTotal > 0 ? 1 - pc.fire.reload / pc.fire.reloadTotal : 0;
      this.ring.style.setProperty('--p', `${rl * 100}%`);
      this.ring.style.setProperty('--c', '#ffb02a');
      this.ring.textContent = pc.fire.reload > 0 ? '⟳' : t(g.short);
      key = `g:${pc.gunIdx}:${pc.guns.join(',')}`;
    } else {
      const s = STAFFS[pc.staffs[pc.staffIdx] ?? 'heal'];
      const cd = pc.staffCd[s.id] ?? 0;
      const total = Math.round(s.cooldownS * 60);
      this.weaponName.textContent = t(s.name);
      this.ammo.textContent = t('{n} mana', { n: s.manaCost });
      this.ammo.classList.toggle('empty', pc.mana < s.manaCost);
      this.ring.style.setProperty('--p', `${cd > 0 ? (1 - cd / total) * 100 : 0}%`);
      this.ring.style.setProperty('--c', hexColor(ELEMENT_COLORS[s.id]));
      this.ring.textContent = '✦';
      this.ring.style.color = hexColor(ELEMENT_COLORS[s.id]);
      key = `s:${pc.staffIdx}:${pc.staffs.join(',')}`;
    }
    if (pc.mode === 'gun') this.ring.style.color = '';
    if (pc.melee) {
      const m = MELEE_WEAPONS[pc.melee.id];
      this.meleeBox.style.display = 'flex';
      this.meleeBox.innerHTML = '';
      this.meleeBox.append(
        el('span', {}, t(m.name)),
        el(
          'div',
          { class: 'dur' },
          el('i', { style: `width:${(pc.melee.durability / m.durability) * 100}%` }),
        ),
      );
    } else this.meleeBox.style.display = 'none';
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.slots.innerHTML = '';
      if (pc.mode === 'gun') {
        pc.guns.forEach((g, i) =>
          this.slots.appendChild(el('i', { class: i === pc.gunIdx ? 'on' : '' }, t(FIREARMS[g].short))),
        );
      } else {
        pc.staffs.forEach((s, i) =>
          this.slots.appendChild(
            el('i', {
              class: `dot ${i === pc.staffIdx ? 'on' : ''}`,
              style: `background:${hexColor(ELEMENT_COLORS[s])}`,
              title: t(STAFFS[s].name),
            }),
          ),
        );
      }
    }
  }

  private updatePowers(p: Entity): void {
    const pc = p.player!;
    const parts: string[] = [];
    for (const k of ['doubleDamage', 'turbo', 'invulnerable'] as const) {
      const t = pc.powers[k];
      if (t > 0)
        parts.push(
          `<div class="pw" style="border-color:${POWER_INFO[k].color}"><b>${POWER_INFO[k].icon}</b><span>${Math.ceil(t / 60)}s</span></div>`,
        );
    }
    const html = parts.join('');
    if (this.powers.innerHTML !== html) this.powers.innerHTML = html;
    const st = (p.statuses ?? [])
      .filter((s) => s.id !== 'regen' || true)
      .map(
        (s) =>
          `<div class="st" title="${t(STATUS[s.id].name)}" style="border-color:${hexColor(STATUS[s.id].color)}">${STATUS[s.id].icon}${s.stacks > 1 ? `<sub>${s.stacks}</sub>` : ''}</div>`,
      )
      .join('');
    if (this.statuses.innerHTML !== st) this.statuses.innerHTML = st;
  }

  private updateCrosshair(p: Entity, cursor: { x: number; y: number; visible: boolean }): void {
    const pc = p.player!;
    const show = this.crosshairVisible && cursor.visible && pc.aimMode === 1;
    this.crosshair.style.display = show ? 'block' : 'none';
    if (!show) return;
    let spread = 1.5;
    if (pc.mode === 'gun') {
      const g = FIREARMS[pc.guns[pc.gunIdx] ?? 'pistol'];
      const aiming = (pc.buttons & 32) !== 0;
      spread = g.spreadDeg * (aiming ? g.aimedSpreadMult : 1) + pc.fire.bloom;
    }
    const gap = 6 + Math.min(40, spread * 3);
    this.crosshair.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;
    this.crosshair.style.setProperty('--gap', `${gap}px`);
    this.crosshair.classList.toggle('staff', pc.mode === 'staff');
  }

  private updateBoss(w: World, dt: number): void {
    const b = w.entities.find((e) => e.kind === 'boss');
    if (!b || !b.health || !b.boss) {
      this.bossBar.classList.remove('show');
      return;
    }
    const def = BOSSES[b.defId];
    this.bossBar.classList.add('show');
    const f = Math.max(0, b.health.hp / b.health.max);
    this.bossLagV = Math.max(f, this.bossLagV - dt * 0.35);
    this.bossFill.style.width = `${f * 100}%`;
    this.bossLag.style.width = `${this.bossLagV * 100}%`;
    this.bossFill.classList.toggle('stagger', b.boss.staggered > 0 || b.boss.vulnTicks > 0);
    this.bossFill.classList.toggle('immune', b.boss.transitioning);
    if (def && this.bossName.dataset.id !== def.id) {
      this.bossName.dataset.id = def.id;
      this.bossName.innerHTML = '';
      this.bossName.append(el('b', {}, t(def.name)), el('span', {}, t(def.title)));
      this.bossPhases.innerHTML = '';
      for (const ph of def.phases.slice(0, -1))
        this.bossPhases.appendChild(el('i', { style: `left:${ph.untilHpFrac * 100}%` }));
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
