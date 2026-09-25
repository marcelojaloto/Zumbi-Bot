import type { BufferGeometry } from 'three';
import type { Rng } from '../../core/rng';
import type { EnvironmentDef, LevelDef, MapDef } from '../../data/types';
import { paint, place, primitive, type Shape } from '../geom';
import type { LightRequest } from '../Lighting';
import type { QualityPreset } from '../quality';

export const CHUNK = 20;

export interface PieceOpts {
  rot?: [number, number, number];
  /** Intensidade de brilho (>0 = parte emissiva). */
  glow?: number;
  jitter?: number;
  /** Não projeta sombra (camada separada). */
  noShadow?: boolean;
}

/** Acumula geometrias do cenário por bloco (chunk) de 20 m para mesclar em poucas draw calls. */
export class Pieces {
  readonly lit = new Map<number, BufferGeometry[]>();
  readonly flat = new Map<number, BufferGeometry[]>();
  readonly glow = new Map<number, BufferGeometry[]>();
  private seed = 1;

  private push(map: Map<number, BufferGeometry[]>, x: number, g: BufferGeometry): void {
    const c = Math.floor(x / CHUNK);
    let arr = map.get(c);
    if (!arr) map.set(c, (arr = []));
    arr.push(g);
  }

  part(
    shape: Shape,
    size: number[],
    x: number,
    y: number,
    z: number,
    color: number,
    o: PieceOpts = {},
  ): this {
    const g = place(primitive(shape, size), [x, y, z], o.rot);
    if (o.glow) this.push(this.glow, x, paint(g, color, 0, o.glow));
    else this.push(o.noShadow ? this.flat : this.lit, x, paint(g, color, o.jitter ?? 0.08, 1, this.seed++));
    return this;
  }

  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    o: PieceOpts = {},
  ): this {
    return this.part('box', [w, h, d], x, y, z, color, o);
  }

  cyl(
    x: number,
    y: number,
    z: number,
    rt: number,
    rb: number,
    h: number,
    color: number,
    seg = 7,
    o: PieceOpts = {},
  ): this {
    return this.part('cyl', [rt, rb, h, seg], x, y, z, color, o);
  }

  cone(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: number,
    seg = 6,
    o: PieceOpts = {},
  ): this {
    return this.part('cone', [r, h, seg], x, y, z, color, o);
  }

  ico(x: number, y: number, z: number, r: number, color: number, o: PieceOpts = {}): this {
    return this.part('ico', [r, 0], x, y, z, color, o);
  }

  sphere(x: number, y: number, z: number, r: number, color: number, o: PieceOpts = {}): this {
    return this.part('sphere', [r, 7, 5], x, y, z, color, o);
  }
}

export interface EnvCtx {
  map: MapDef;
  level: LevelDef;
  env: EnvironmentDef;
  rng: Rng;
  q: QualityPreset;
  p: Pieces;
  /** Comprimento total a decorar (inclui margens). */
  x0: number;
  x1: number;
  zBand: [number, number];
  lights: LightRequest[];
  light(
    x: number,
    y: number,
    z: number,
    color: number,
    intensity: number,
    distance: number,
    flicker?: number,
  ): void;
  /** Densidade de props conforme a qualidade. */
  dense(n: number): number;
  /** Parede de fundo (interiores). */
  wall?: {
    kind: 'brick' | 'stone' | 'panel' | 'wood' | 'plaster';
    c1: number;
    c2: number;
    z: number;
    h: number;
  };
}
