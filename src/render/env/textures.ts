import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';
import { Rng } from '../../core/rng';
import type { GroundPattern } from '../../data/types';

const cache = new Map<string, Texture>();

function hex(c: number, k = 1): string {
  const r = Math.max(0, Math.min(255, Math.round(((c >> 16) & 255) * k)));
  const g = Math.max(0, Math.min(255, Math.round(((c >> 8) & 255) * k)));
  const b = Math.max(0, Math.min(255, Math.round((c & 255) * k)));
  return `rgb(${r},${g},${b})`;
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return [c, c.getContext('2d')!];
}

function noise(ctx: CanvasRenderingContext2D, size: number, rng: Rng, amt: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const s = 1 + rng.next() * 3;
    const v = rng.next() < 0.7 ? 0 : 200;
    ctx.fillStyle = `rgba(${v},${v},${v},${rng.next() * amt * (v ? 0.5 : 1)})`;
    ctx.fillRect(x, y, s, s);
  }
}

function blotches(
  ctx: CanvasRenderingContext2D,
  size: number,
  rng: Rng,
  color: string,
  n: number,
  r0: number,
  r1: number,
  alpha: number,
): void {
  for (let i = 0; i < n; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const r = r0 + rng.next() * (r1 - r0);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('ALPHA', String(alpha)));
    g.addColorStop(1, color.replace('ALPHA', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** Textura procedural de chão (repetível). */
export function groundTexture(pattern: GroundPattern, c1: number, c2: number, size = 256): Texture {
  const key = `g:${pattern}:${c1}:${c2}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [cv, ctx] = canvas(size);
  const rng = new Rng(size + c1);
  ctx.fillStyle = hex(c1);
  ctx.fillRect(0, 0, size, size);
  const s = size;
  switch (pattern) {
    case 'dirt':
    case 'ash':
    case 'sand':
      blotches(
        ctx,
        s,
        rng,
        `rgba(${(c2 >> 16) & 255},${(c2 >> 8) & 255},${c2 & 255},ALPHA)`,
        30,
        s * 0.05,
        s * 0.18,
        0.5,
      );
      blotches(ctx, s, rng, 'rgba(0,0,0,ALPHA)', 20, s * 0.03, s * 0.12, 0.25);
      noise(ctx, s, rng, 0.18, s * 12);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = hex(c2, 0.7 + rng.next() * 0.6);
        ctx.fillRect(rng.next() * s, rng.next() * s, 2 + rng.next() * 5, 2 + rng.next() * 4);
      }
      break;
    case 'grass':
      noise(ctx, s, rng, 0.2, s * 10);
      for (let i = 0; i < s * 3; i++) {
        ctx.strokeStyle = hex(c2, 0.6 + rng.next() * 0.8);
        ctx.globalAlpha = 0.5;
        const x = rng.next() * s;
        const y = rng.next() * s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rng.range(-2, 2), y - 3 - rng.next() * 5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      blotches(ctx, s, rng, 'rgba(0,0,0,ALPHA)', 12, s * 0.05, s * 0.15, 0.25);
      break;
    case 'stone':
    case 'tiles':
    case 'marble': {
      const n = pattern === 'tiles' ? 8 : 4;
      const cs = s / n;
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const off = pattern === 'stone' && y % 2 ? cs / 2 : 0;
          ctx.fillStyle = hex(rng.next() < 0.5 ? c1 : c2, 0.85 + rng.next() * 0.3);
          ctx.fillRect(x * cs + off, y * cs, cs, cs);
          if (off) ctx.fillRect(x * cs + off - s, y * cs, cs, cs);
        }
      }
      if (pattern === 'marble') {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        for (let i = 0; i < 20; i++) {
          ctx.beginPath();
          let x = rng.next() * s;
          let y = rng.next() * s;
          ctx.moveTo(x, y);
          for (let k = 0; k < 6; k++) {
            x += rng.range(-20, 20);
            y += rng.range(-20, 20);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = pattern === 'tiles' ? 1.5 : 3;
      for (let y = 0; y <= n; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cs);
        ctx.lineTo(s, y * cs);
        ctx.stroke();
        for (let x = 0; x <= n; x++) {
          const off = pattern === 'stone' && y % 2 ? cs / 2 : 0;
          ctx.beginPath();
          ctx.moveTo(x * cs + off, y * cs);
          ctx.lineTo(x * cs + off, (y + 1) * cs);
          ctx.stroke();
        }
      }
      noise(ctx, s, rng, 0.12, s * 8);
      blotches(ctx, s, rng, 'rgba(0,0,0,ALPHA)', 10, s * 0.05, s * 0.2, 0.2);
      break;
    }
    case 'planks': {
      const n = 6;
      const ph = s / n;
      for (let y = 0; y < n; y++) {
        ctx.fillStyle = hex(y % 2 ? c1 : c2, 0.85 + rng.next() * 0.3);
        ctx.fillRect(0, y * ph, s, ph);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        for (let k = 0; k < 8; k++) {
          ctx.beginPath();
          const yy = y * ph + rng.next() * ph;
          ctx.moveTo(0, yy);
          ctx.bezierCurveTo(s * 0.3, yy + rng.range(-3, 3), s * 0.6, yy + rng.range(-3, 3), s, yy);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, y * ph, s, 2);
        const cut = rng.next() * s;
        ctx.fillRect(cut, y * ph, 2, ph);
      }
      noise(ctx, s, rng, 0.1, s * 6);
      break;
    }
    case 'asphalt':
      noise(ctx, s, rng, 0.25, s * 30);
      blotches(ctx, s, rng, 'rgba(0,0,0,ALPHA)', 12, s * 0.06, s * 0.2, 0.3);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        let x = rng.next() * s;
        let y = rng.next() * s;
        ctx.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          x += rng.range(-25, 25);
          y += rng.range(-25, 25);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    case 'metal': {
      const n = 4;
      const cs = s / n;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          ctx.fillStyle = hex(c1, 0.9 + rng.next() * 0.2);
          ctx.fillRect(x * cs + 2, y * cs + 2, cs - 4, cs - 4);
          ctx.fillStyle = hex(c2);
          for (const [a, b] of [
            [6, 6],
            [cs - 8, 6],
            [6, cs - 8],
            [cs - 8, cs - 8],
          ])
            ctx.fillRect(x * cs + a!, y * cs + b!, 3, 3);
        }
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < s; i += 4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(s, i + rng.range(-2, 2));
        ctx.stroke();
      }
      noise(ctx, s, rng, 0.1, s * 6);
      break;
    }
  }
  const tex = new CanvasTexture(cv);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

/** Textura de parede (tijolos, pedra, painéis). */
export function wallTexture(
  kind: 'brick' | 'stone' | 'panel' | 'wood' | 'plaster',
  c1: number,
  c2: number,
  size = 256,
): Texture {
  const key = `w:${kind}:${c1}:${c2}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [cv, ctx] = canvas(size);
  const rng = new Rng(c1 ^ c2);
  ctx.fillStyle = hex(c2, 0.6);
  ctx.fillRect(0, 0, size, size);
  if (kind === 'brick' || kind === 'stone') {
    const rows = kind === 'brick' ? 12 : 6;
    const cols = kind === 'brick' ? 5 : 3;
    const rh = size / rows;
    const cw = size / cols;
    for (let y = 0; y < rows; y++)
      for (let x = -1; x <= cols; x++) {
        const off = y % 2 ? cw / 2 : 0;
        ctx.fillStyle = hex(rng.next() < 0.5 ? c1 : c2, 0.8 + rng.next() * 0.35);
        ctx.fillRect(x * cw + off + 2, y * rh + 2, cw - 4, rh - 4);
      }
  } else if (kind === 'panel') {
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        ctx.fillStyle = hex(c1, 0.9 + rng.next() * 0.2);
        ctx.fillRect(x * (size / 2) + 3, y * (size / 2) + 3, size / 2 - 6, size / 2 - 6);
      }
  } else if (kind === 'wood') {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = hex(x % 2 ? c1 : c2, 0.85 + rng.next() * 0.3);
      ctx.fillRect(x * (size / 8), 0, size / 8 - 2, size);
    }
  } else {
    ctx.fillStyle = hex(c1);
    ctx.fillRect(0, 0, size, size);
    blotches(
      ctx,
      size,
      rng,
      `rgba(${(c2 >> 16) & 255},${(c2 >> 8) & 255},${c2 & 255},ALPHA)`,
      25,
      10,
      50,
      0.4,
    );
  }
  noise(ctx, size, rng, 0.15, size * 8);
  blotches(ctx, size, rng, 'rgba(0,0,0,ALPHA)', 10, size * 0.05, size * 0.25, 0.3);
  const tex = new CanvasTexture(cv);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Textura radial suave (sombras-blob, brilhos, fumaça). */
export function radialTexture(kind: 'blob' | 'glow' | 'smoke' | 'spark' = 'blob', size = 64): Texture {
  const key = `r:${kind}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [cv, ctx] = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  if (kind === 'blob') {
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
  } else if (kind === 'smoke') {
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
  } else if (kind === 'spark') {
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(cv);
  cache.set(key, tex);
  return tex;
}

export function disposeTextures(): void {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}
