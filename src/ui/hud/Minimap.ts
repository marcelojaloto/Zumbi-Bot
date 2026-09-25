import type { World } from '../../sim/World';

/** Minimapa em faixa (canvas 2D): nível inteiro em X, profundidade em Y. */
export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private acc = 0;
  big = false;

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap';
    this.canvas.width = 220;
    this.canvas.height = 70;
    parent.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }

  toggle(): void {
    this.big = !this.big;
    this.canvas.classList.toggle('big', this.big);
    this.canvas.width = this.big ? 640 : 220;
    this.canvas.height = this.big ? 160 : 70;
    this.acc = 1;
  }

  update(w: World, dt: number): void {
    this.acc += dt;
    if (this.acc < 1 / 15) return;
    this.acc = 0;
    const c = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const L = w.level.length;
    const [z0, z1] = w.level.zBand;
    const pad = 4;
    const sx = (x: number) => pad + (x / L) * (W - pad * 2);
    const sy = (z: number) => pad + ((z - z0 - 1) / (z1 - z0 + 2)) * (H - pad * 2);
    c.clearRect(0, 0, W, H);
    c.fillStyle = 'rgba(8,10,16,0.72)';
    c.fillRect(0, 0, W, H);
    // faixa jogável
    c.fillStyle = 'rgba(80,90,110,0.35)';
    c.fillRect(sx(0), sy(z0), sx(L) - sx(0), sy(z1) - sy(z0));
    // segmentos
    w.level.segments.forEach((s, i) => {
      if (!s.lock) return;
      const done = w.levelState.cleared[i];
      const active = w.levelState.active && w.levelState.segmentIdx === i;
      c.fillStyle = active
        ? 'rgba(255,60,60,0.35)'
        : done
          ? 'rgba(90,255,150,0.12)'
          : 'rgba(255,200,80,0.14)';
      c.fillRect(sx(s.lock.minX), sy(z0), sx(s.lock.maxX) - sx(s.lock.minX), sy(z1) - sy(z0));
    });
    // boss
    if (w.level.boss) {
      const bx = sx(w.level.boss.triggerX + 6);
      c.fillStyle = '#ff4a4a';
      c.font = `${this.big ? 20 : 12}px sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('☠', bx, H / 2);
    }
    // câmera
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 1;
    c.strokeRect(sx(w.bounds.minX), sy(z0) - 2, sx(w.bounds.maxX) - sx(w.bounds.minX), sy(z1) - sy(z0) + 4);
    // entidades
    for (const e of w.entities) {
      if (e.kind === 'enemy' && e.fighter?.state !== 'dead') {
        c.fillStyle = e.team === 'players' ? '#39e6ff' : '#ff4a3a';
        const r = (e.body?.radius ?? 0.4) > 0.55 ? 3 : 2;
        c.fillRect(sx(e.t.x) - r, sy(e.t.z) - r, r * 2, r * 2);
      } else if (e.kind === 'boss') {
        c.fillStyle = '#ff2a6a';
        c.beginPath();
        c.arc(sx(e.t.x), sy(e.t.z), this.big ? 6 : 4, 0, Math.PI * 2);
        c.fill();
      } else if (e.kind === 'pickup') {
        c.fillStyle = '#ffd24a';
        c.fillRect(sx(e.t.x) - 1.5, sy(e.t.z) - 1.5, 3, 3);
      }
    }
    for (const p of w.playerEntities()) {
      const x = sx(p.t.x);
      const y = sy(p.t.z);
      c.fillStyle = '#39e6ff';
      c.beginPath();
      const f = p.t.facing;
      c.moveTo(x + 5 * f, y);
      c.lineTo(x - 3 * f, y - 4);
      c.lineTo(x - 3 * f, y + 4);
      c.closePath();
      c.fill();
    }
  }
}
