import { t } from '../../i18n';
import type { Renderer } from '../../render/Renderer';
import { ENEMIES } from '../../data/enemies';
import type { DamageType } from '../../data/types';
import type { GameEvent } from '../../sim/events';
import type { World } from '../../sim/World';
import { el } from '../dom';
import { SLOT_COLORS, playerTag } from '../../app/party';

interface Num {
  el: HTMLDivElement;
  x: number;
  y: number;
  z: number;
  t: number;
  life: number;
  active: boolean;
  dx: number;
}

interface Bar {
  el: HTMLDivElement;
  fill: HTMLDivElement;
  lag: HTMLDivElement;
  lastHit: number;
  lagV: number;
}

const DTYPE_COLORS: Partial<Record<DamageType, string>> = {
  fire: '#ff8a3a',
  water: '#5ab0ff',
  ice: '#bff4ff',
  electric: '#fff15a',
  toxic: '#9cff4a',
  cyber: '#39e6ff',
  wind: '#d8f0ff',
  earth: '#d8a85a',
  necro: '#c07aff',
  holy: '#fff8c0',
  explosive: '#ffb04a',
};

const _p = { x: 0, y: 0, visible: false };

/** Números de dano flutuantes e barras de vida dos inimigos, projetados do mundo para a tela. */
export class WorldOverlay {
  readonly root: HTMLDivElement;
  private nums: Num[] = [];
  private bars = new Map<number, Bar>();
  /** Etiquetas P1..P5 sobre os jogadores (multijogador). */
  private tags = new Map<number, HTMLDivElement>();
  showNumbers = true;
  private time = 0;

  constructor(parent: HTMLElement) {
    this.root = el('div', { class: 'world-overlay' });
    parent.appendChild(this.root);
    for (let i = 0; i < 40; i++) {
      const d = el('div', { class: 'dmg-num' });
      d.style.display = 'none';
      this.root.appendChild(d);
      this.nums.push({ el: d, x: 0, y: 0, z: 0, t: 0, life: 0.8, active: false, dx: 0 });
    }
  }

  private spawnNum(text: string, color: string, x: number, y: number, z: number, big: boolean): void {
    const n = this.nums.find((q) => !q.active) ?? this.nums.reduce((a, b) => (a.t > b.t ? a : b));
    n.active = true;
    n.x = x;
    n.y = y;
    n.z = z;
    n.t = 0;
    n.life = big ? 1.0 : 0.75;
    n.dx = (Math.random() - 0.5) * 0.6;
    n.el.textContent = text;
    n.el.style.color = color;
    n.el.style.fontSize = big ? '30px' : '20px';
    n.el.style.display = 'block';
  }

  onEvents(events: GameEvent[], w: World): void {
    for (const ev of events) {
      if (ev.t === 'hit') {
        const dst = w.get(ev.dst);
        if (dst && (dst.kind === 'enemy' || dst.kind === 'boss')) {
          let b = this.bars.get(ev.dst);
          if (!b && dst.kind === 'enemy') b = this.makeBar(ev.dst);
          if (b) b.lastHit = this.time;
        }
        if (!this.showNumbers) continue;
        if (ev.blocked) {
          this.spawnNum(t('IMUNE'), '#9aa4b8', ev.x, ev.y + 0.3, ev.z, false);
          continue;
        }
        if (ev.amount <= 0) continue;
        const isPlayer = dst?.kind === 'player';
        const color = isPlayer ? '#ff4a4a' : ev.crit ? '#ffd24a' : (DTYPE_COLORS[ev.dtype] ?? '#ffffff');
        this.spawnNum(
          `${ev.amount}${ev.crit ? '!' : ''}`,
          color,
          ev.x,
          ev.y + 0.2,
          ev.z,
          ev.crit || ev.heavy,
        );
      } else if (ev.t === 'heal' && this.showNumbers) {
        this.spawnNum(`+${ev.amount}`, '#5aff9a', ev.x, ev.y, ev.z, false);
      } else if (ev.t === 'death') {
        const b = this.bars.get(ev.id);
        if (b) b.lastHit = -99;
      }
    }
  }

  private makeBar(id: number): Bar {
    const fill = el('div', { class: 'ebar-fill' });
    const lag = el('div', { class: 'ebar-lag' });
    const d = el('div', { class: 'ebar' }, lag, fill);
    this.root.appendChild(d);
    const b: Bar = { el: d, fill, lag, lastHit: -99, lagV: 1 };
    this.bars.set(id, b);
    return b;
  }

  update(w: World, r: Renderer, dt: number): void {
    this.time += dt;
    for (const n of this.nums) {
      if (!n.active) continue;
      n.t += dt;
      if (n.t >= n.life) {
        n.active = false;
        n.el.style.display = 'none';
        continue;
      }
      const k = n.t / n.life;
      r.toScreen(n.x + n.dx * k, n.y + k * 0.9, n.z, _p);
      n.el.style.transform = `translate(${_p.x}px, ${_p.y}px) translate(-50%, -50%) scale(${1 + Math.max(0, 0.3 - n.t) * 2})`;
      n.el.style.opacity = String(1 - Math.max(0, k - 0.6) / 0.4);
    }
    if (w.playerCount > 1) {
      for (const e of w.playerEntities()) {
        const slot = e.player!.slot;
        let tag = this.tags.get(slot);
        if (!tag) {
          tag = el('div', { class: 'ptag', style: `--pc:${SLOT_COLORS[slot]}` }, playerTag(slot));
          this.root.appendChild(tag);
          this.tags.set(slot, tag);
        }
        const hide = e.player!.respawn > 0 || (e.fighter?.state === 'dead' && e.player!.lives <= 0);
        r.toScreen(e.t.x, e.t.y + (e.body?.height ?? 1.8) + 0.45, e.t.z, _p);
        tag.style.display = hide || !_p.visible ? 'none' : 'block';
        tag.style.transform = `translate(${_p.x}px, ${_p.y}px) translate(-50%, -50%)`;
      }
    }
    const seen = new Set<number>();
    for (const e of w.entities) {
      if (e.kind !== 'enemy' || !e.health) continue;
      const def = ENEMIES[e.defId];
      const elite = def && (def.archetype === 'brute' || def.archetype === 'mech');
      let b = this.bars.get(e.id);
      const show = e.fighter?.state !== 'dead' && (elite || (b && this.time - b.lastHit < 3));
      if (!show) {
        if (b) b.el.style.display = 'none';
        continue;
      }
      b ??= this.makeBar(e.id);
      seen.add(e.id);
      const h = e.body?.height ?? 1.8;
      r.toScreen(e.t.x, e.t.y + h + 0.35, e.t.z, _p);
      const frac = Math.max(0, e.health.hp / e.health.max);
      b.lagV = Math.max(frac, b.lagV - dt * 0.8);
      b.el.style.display = 'block';
      b.el.style.transform = `translate(${_p.x}px, ${_p.y}px) translate(-50%, -50%)`;
      b.el.style.width = elite ? '70px' : '46px';
      b.fill.style.width = `${frac * 100}%`;
      b.lag.style.width = `${b.lagV * 100}%`;
      b.el.classList.toggle('ally', e.team === 'players');
    }
    for (const [id, b] of this.bars) {
      if (!seen.has(id) && !w.get(id)) {
        b.el.remove();
        this.bars.delete(id);
      }
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
