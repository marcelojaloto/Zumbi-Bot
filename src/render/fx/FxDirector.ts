import type { Scene } from 'three';
import { BOSSES } from '../../data/bosses';
import { getCharacter } from '../../data/characters';
import { ENEMIES } from '../../data/enemies';
import { MOVES } from '../../data/melee';
import type { Element } from '../../data/types';
import type { Entity } from '../../sim/Entity';
import type { GameEvent } from '../../sim/events';
import type { World } from '../../sim/World';
import { resolveAim } from '../../sim/systems/weapons';
import type { CameraRig } from '../CameraRig';
import type { Lighting } from '../Lighting';
import type { PostFX } from '../PostFX';
import type { QualityPreset } from '../quality';
import type { SceneView } from '../SceneView';
import { fxColor } from '../views/HazardRenderer';
import { PROJ_VISUALS } from '../views/ProjectileRenderer';
import { ELEMENT_COLORS } from '../views/staffRecipe';
import { Debris } from './Debris';
import { ParticlePool } from './Particles';
import { Tracers } from './Tracers';

interface Flash {
  x: number;
  y: number;
  z: number;
  color: number;
  intensity: number;
  dist: number;
  life: number;
  max: number;
  priority: number;
}

const ZOMBIE_BLOOD = 0x6a8a1a;
const ZOMBIE_GORE = 0x4a2a1a;

/** Traduz eventos do sim em efeitos visuais: partículas, detritos, traços, luzes, tremor e flashes. */
export class FxDirector {
  private clock = 0;
  readonly add: ParticlePool;
  readonly norm: ParticlePool;
  readonly debris: Debris;
  readonly tracers: Tracers;
  private flashes: Flash[] = [];
  private seed = 1;
  private t = 0;
  damagePulse = 0;
  desat = 0;

  constructor(
    private scene: Scene,
    private q: QualityPreset,
    private view: SceneView,
    private cam: CameraRig,
    private lighting: Lighting,
    private post: PostFX,
  ) {
    this.add = new ParticlePool(scene, q.particles, true);
    this.norm = new ParticlePool(scene, Math.round(q.particles * 0.6), false);
    this.debris = new Debris(scene, Math.max(40, Math.round(q.particles / 8)), q.standardMaterials);
    this.tracers = new Tracers(scene);
  }

  rnd = (): number => {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  };

  flash(
    x: number,
    y: number,
    z: number,
    color: number,
    intensity: number,
    dist: number,
    life: number,
    priority = 3,
  ): void {
    this.flashes.push({ x, y, z, color, intensity, dist, life, max: life, priority });
  }

  burst(
    x: number,
    y: number,
    z: number,
    n: number,
    color: number,
    speed: number,
    size: number,
    life: number,
    additive = true,
    gravity = 6,
    intensity = 2.5,
  ): void {
    const pool = additive ? this.add : this.norm;
    const k = Math.max(1, Math.round(n * (this.q.level === 'low' ? 0.5 : 1)));
    for (let i = 0; i < k; i++) {
      pool.emit(
        {
          x,
          y,
          z,
          vx: 0,
          vy: speed * 0.4,
          vz: 0,
          spread: speed,
          life,
          size,
          sizeEnd: size * 0.2,
          color,
          gravity,
          drag: 2,
          intensity: additive ? intensity : 1,
        },
        this.rnd,
      );
    }
  }

  smoke(x: number, y: number, z: number, n: number, size = 0.8, color = 0x3a3a3a, life = 1.2): void {
    for (let i = 0; i < n; i++) {
      this.norm.emit(
        {
          x,
          y,
          z,
          vy: 0.8,
          spread: 0.8,
          life,
          size: size * 0.5,
          sizeEnd: size * 1.8,
          color,
          alpha: 0.5,
          gravity: -0.4,
          drag: 1.5,
        },
        this.rnd,
      );
    }
  }

  onEvents(events: GameEvent[], w: World): void {
    for (const ev of events) {
      switch (ev.t) {
        case 'hit': {
          this.view.flash(ev.dst, ev.amount > 0 ? 0.55 : 0.25);
          const dst = w.get(ev.dst);
          const kind: string | undefined = dst?.kind;
          const fam: string | undefined =
            kind === 'enemy'
              ? ENEMIES[dst!.defId]?.family
              : kind === 'player'
                ? getCharacter(dst!.player?.character).metal
                  ? 'player'
                  : 'fleshPlayer'
                : kind === 'boss'
                  ? 'boss'
                  : kind;
          if (ev.blocked) {
            this.burst(ev.x, ev.y, ev.z, 6, 0xc8d8ff, 3, 0.12, 0.25);
            break;
          }
          if (fam === 'zombie' || fam === 'boss') {
            this.burst(
              ev.x,
              ev.y,
              ev.z,
              ev.heavy ? 14 : 7,
              ZOMBIE_BLOOD,
              ev.heavy ? 5 : 3,
              0.16,
              0.5,
              false,
              12,
            );
            if (ev.heavy || ev.dtype === 'blade')
              this.debris.emit(ev.x, ev.y, ev.z, ev.heavy ? 4 : 2, ZOMBIE_GORE, 3, 0.09, this.rnd);
          } else if (fam === 'robot' || fam === 'player') {
            this.burst(
              ev.x,
              ev.y,
              ev.z,
              ev.heavy ? 14 : 8,
              0xffb04a,
              ev.heavy ? 7 : 5,
              0.1,
              0.35,
              true,
              14,
              4,
            );
            if (ev.heavy) this.debris.emit(ev.x, ev.y, ev.z, 3, 0x5a6270, 3, 0.07, this.rnd);
          } else if (fam === 'fleshPlayer') {
            // personagens de carne e osso: estrelas de impacto em vez de faíscas
            this.burst(
              ev.x,
              ev.y,
              ev.z,
              ev.heavy ? 12 : 7,
              0xffe2a8,
              ev.heavy ? 5 : 4,
              0.1,
              0.3,
              true,
              12,
              3,
            );
          } else if (dst?.kind === 'prop') {
            this.debris.emit(ev.x, ev.y, ev.z, 3, 0x6a4a2a, 2.5, 0.1, this.rnd);
          }
          if (ev.shield) this.burst(ev.x, ev.y, ev.z, 10, 0x3a8cff, 3, 0.15, 0.3);
          // brilho de impacto
          if (ev.heavy) {
            this.add.emit(
              {
                x: ev.x,
                y: ev.y,
                z: ev.z + 0.2,
                life: 0.12,
                size: 1.4,
                sizeEnd: 0.2,
                color: 0xffffff,
                intensity: 2,
              },
              this.rnd,
            );
            this.cam.addTrauma(0.22);
            this.post.pulseChroma(0.5);
          } else this.cam.addTrauma(0.06);
          if (dst?.player && ev.amount > 0) {
            // multijogador: a tela é de todos, o aviso vermelho fica mais discreto
            const k = w.playerCount > 1 ? 0.35 : 1;
            this.damagePulse = Math.min(0.8, this.damagePulse + (0.3 + (ev.heavy ? 0.2 : 0)) * k);
            this.cam.addTrauma(0.2);
          }
          break;
        }
        case 'death': {
          const e = w.get(ev.id);
          const def = ENEMIES[ev.defId];
          const big = def?.archetype === 'brute' || def?.archetype === 'mech';
          if (ev.family === 'zombie') {
            this.debris.emit(
              ev.x,
              ev.y + 1,
              ev.z,
              big ? 14 : 7,
              ZOMBIE_GORE,
              3.5,
              big ? 0.16 : 0.11,
              this.rnd,
            );
            this.debris.emit(ev.x, ev.y + 1, ev.z, big ? 6 : 3, def?.rig.skin ?? 0x6f7f5a, 3, 0.12, this.rnd);
            this.burst(ev.x, ev.y + 1, ev.z, 12, ZOMBIE_BLOOD, 4, 0.2, 0.6, false, 10);
          } else if (ev.family === 'robot') {
            this.debris.emit(ev.x, ev.y + 1, ev.z, big ? 16 : 8, 0x5a6270, 4, big ? 0.16 : 0.1, this.rnd);
            this.burst(ev.x, ev.y + 1, ev.z, 20, 0xffb04a, 6, 0.12, 0.5, true, 12, 4);
            this.smoke(ev.x, ev.y + 1, ev.z, 5);
            this.flash(ev.x, ev.y + 1, ev.z, 0xffa04a, 12, 6, 0.25);
          } else if (ev.family === 'player') {
            const ch = getCharacter(e?.player?.character);
            const c = ch.id === 'robot' ? 0x39e6ff : ch.color;
            this.burst(ev.x, ev.y + 1, ev.z, 30, c, 6, 0.15, 0.7, true, 8, 4);
            if (ch.metal) this.debris.emit(ev.x, ev.y + 1, ev.z, 10, 0x7a8aa0, 4, 0.12, this.rnd);
            this.flash(ev.x, ev.y + 1, ev.z, c, 14, 8, 0.4);
          }
          void e;
          break;
        }
        case 'explosion': {
          const el = ev.element;
          const color = el && el !== 'explosive' ? ELEMENT_COLORS[el as Element] : 0xff7a2a;
          const colorEnd =
            el && el !== 'explosive'
              ? (((((color >> 16) & 255) * 0.3) | 0) << 16) |
                (((((color >> 8) & 255) * 0.3) | 0) << 8) |
                (((color & 255) * 0.3) | 0)
              : 0x8a1a00;
          const r = ev.r;
          for (let i = 0; i < 26; i++) {
            const a = this.rnd() * Math.PI * 2;
            const s = r * (1.5 + this.rnd() * 2.5);
            this.add.emit(
              {
                x: ev.x,
                y: ev.y,
                z: ev.z,
                vx: Math.cos(a) * s,
                vy: this.rnd() * s,
                vz: Math.sin(a) * s * 0.6,
                life: 0.5,
                size: r * 0.5,
                sizeEnd: r * 0.1,
                color,
                colorEnd,
                intensity: 3,
                drag: 4,
              },
              this.rnd,
            );
          }
          this.add.emit(
            {
              x: ev.x,
              y: ev.y + 0.3,
              z: ev.z + 0.3,
              life: 0.18,
              size: r * 2.4,
              sizeEnd: r * 0.6,
              color: 0xfff0c0,
              intensity: 3,
            },
            this.rnd,
          );
          this.smoke(ev.x, ev.y + 0.5, ev.z, 10, r * 0.6, 0x2a2622, 1.8);
          this.debris.emit(ev.x, 0.3, ev.z, 6, 0x3a3228, r * 1.5, 0.12, this.rnd, 1.6);
          this.flash(ev.x, ev.y + 1, ev.z, color, 30, r * 4, 0.35);
          this.post.pulseChroma(1);
          break;
        }
        case 'shot': {
          const vis = ev.visual ? PROJ_VISUALS[ev.visual] : undefined;
          const c = vis && vis.glow > 0 ? vis.color : 0xffd07a;
          this.add.emit(
            {
              x: ev.x + ev.dx * 0.2,
              y: ev.y,
              z: ev.z + ev.dz * 0.2,
              life: 0.06,
              size: 0.55,
              sizeEnd: 0.2,
              color: c,
              intensity: 4,
            },
            this.rnd,
          );
          for (let i = 0; i < 3; i++)
            this.add.emit(
              {
                x: ev.x,
                y: ev.y,
                z: ev.z,
                vx: ev.dx * 6,
                vz: ev.dz * 6,
                spread: 2,
                life: 0.12,
                size: 0.08,
                color: 0xffc04a,
                intensity: 3,
                drag: 6,
              },
              this.rnd,
            );
          this.flash(ev.x, ev.y, ev.z, c, ev.weapon === 'enemy' ? 4 : 7, 6, 0.06, 3);
          if (ev.weapon !== 'enemy' && ev.weapon !== 'gl' && this.q.level !== 'low') {
            // cápsula
            this.debris.emit(ev.x - ev.dx * 0.2, ev.y, ev.z, 1, 0xc8a040, 1.5, 0.035, this.rnd, 0.7);
          }
          break;
        }
        case 'tracer':
          this.tracers.add(ev.x0, ev.y0, ev.z0, ev.x1, ev.y1, ev.z1, ev.color, 0.1, 5);
          break;
        case 'beam':
          if (ev.element === 'laser') {
            this.laserBeam(ev.x0, ev.y0, ev.z0, ev.x1, ev.y1, ev.z1);
            break;
          }
          if (ev.element === 'electric')
            this.tracers.bolt(ev.x0, ev.y0, ev.z0, ev.x1, ev.y1, ev.z1, 0xfff15a, this.rnd, 8);
          else
            this.tracers.add(
              ev.x0,
              ev.y0,
              ev.z0,
              ev.x1,
              ev.y1,
              ev.z1,
              ELEMENT_COLORS[ev.element] ?? 0xffffff,
              0.15,
              6,
            );
          this.flash(ev.x1, ev.y1, ev.z1, 0xfff15a, 6, 5, 0.1);
          break;
        case 'impact': {
          const vis = PROJ_VISUALS[ev.visual];
          const c = ev.element ? ELEMENT_COLORS[ev.element] : vis.color;
          this.burst(
            ev.x,
            ev.y,
            ev.z,
            vis.glow > 0 ? 6 : 4,
            c,
            3,
            vis.glow > 0 ? 0.12 : 0.1,
            0.3,
            vis.glow > 0,
            8,
            3,
          );
          if (ev.visual === 'rock' || ev.visual === 'tombstone' || ev.visual === 'mudball')
            this.debris.emit(ev.x, ev.y, ev.z, 4, vis.color, 3, 0.12, this.rnd);
          break;
        }
        case 'cast': {
          const c = ELEMENT_COLORS[ev.staff];
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            this.add.emit(
              {
                x: ev.x + Math.cos(a) * 0.7,
                y: 0.1,
                z: ev.z + Math.sin(a) * 0.4,
                vy: 2,
                life: 0.5,
                size: 0.18,
                sizeEnd: 0.02,
                color: c,
                intensity: 3,
              },
              this.rnd,
            );
          }
          this.flash(ev.x, ev.y + 1.2, ev.z, c, 8, 6, 0.3, 2);
          break;
        }
        case 'jump':
          if (!ev.double) this.dust(w, ev.id, 5);
          else {
            const e = w.get(ev.id);
            if (e) this.burst(e.t.x, e.t.y, e.t.z, 10, 0x39e6ff, 2.5, 0.12, 0.3, true, 0, 3);
          }
          break;
        case 'land':
          this.dust(w, ev.id, ev.heavy ? 10 : 5);
          if (ev.heavy) this.cam.addTrauma(0.1);
          break;
        case 'propBreak':
          this.debris.emit(
            ev.x,
            0.5,
            ev.z,
            10,
            ev.kind.includes('arrel') || ev.kind === 'bin' ? 0x3a4a5a : 0x7a5a32,
            3,
            0.14,
            this.rnd,
          );
          this.smoke(ev.x, 0.5, ev.z, 4, 0.6, 0x5a5048);
          break;
        case 'pickup':
          this.burst(ev.x, ev.y, ev.z, 12, 0xfff0a0, 2.5, 0.1, 0.4, true, -1, 3);
          break;
        case 'levelUp': {
          const e = w.get(ev.player);
          if (e) {
            for (let i = 0; i < 30; i++) {
              const a = (i / 30) * Math.PI * 2;
              this.add.emit(
                {
                  x: e.t.x + Math.cos(a) * 0.8,
                  y: 0.2,
                  z: e.t.z + Math.sin(a) * 0.5,
                  vy: 4,
                  life: 0.9,
                  size: 0.2,
                  sizeEnd: 0.02,
                  color: 0xffd24a,
                  intensity: 3,
                },
                this.rnd,
              );
            }
            this.flash(e.t.x, 2, e.t.z, 0xffd24a, 12, 8, 0.6, 2);
          }
          break;
        }
        case 'interaction': {
          const e = w.get(ev.id);
          if (!e) break;
          const y = e.t.y + 1.2;
          if (ev.kind === 'steam') this.smoke(e.t.x, y, e.t.z, 8, 0.7, 0xd8d8e0, 1);
          else if (ev.kind === 'shatter') {
            this.debris.emit(e.t.x, y, e.t.z, 16, 0xbff4ff, 5, 0.14, this.rnd);
            this.burst(e.t.x, y, e.t.z, 20, 0xbff4ff, 5, 0.15, 0.5, true, 10, 3);
          } else if (ev.kind === 'conduct')
            this.burst(e.t.x, y, e.t.z, 16, 0xfff15a, 5, 0.1, 0.3, true, 0, 4);
          else if (ev.kind === 'freeze') this.burst(e.t.x, y, e.t.z, 14, 0xbff4ff, 3, 0.15, 0.5, true, 2, 3);
          break;
        }
        case 'shake':
          this.cam.addTrauma(ev.trauma);
          break;
        case 'bossDefeated':
          this.desat = 1;
          this.cam.addTrauma(0.8);
          break;
        case 'control': {
          const e = w.get(ev.id);
          if (e && ev.on)
            this.burst(
              e.t.x,
              e.t.y + 1.5,
              e.t.z,
              16,
              ev.kind === 'hacked' ? 0x39e6ff : 0xb05aff,
              3,
              0.14,
              0.6,
              true,
              -1,
              3,
            );
          break;
        }
        case 'respawn': {
          const e = w.get(ev.player);
          if (e) this.flash(e.t.x, 3, e.t.z, 0x39e6ff, 14, 8, 0.6, 2);
          break;
        }
        default:
          break;
      }
    }
  }

  /**
   * Raio Laser (especial do ciborgue): brilho largo, feixe vermelho e núcleo branco em camadas. O sim manda um
   * trecho a cada 3 quadros e cada traço dura um pouco mais: na tela é um raio contínuo, com faíscas na boca,
   * calor subindo ao longo do raio e respingos na ponta.
   */
  private laserBeam(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): void {
    const dir = Math.sign(x1 - x0) || 1;
    this.tracers.add(x0, y0, z0, x1, y1, z1, 0xff1a2a, 0.11, 2.4, 0.75);
    this.tracers.add(x0, y0, z0, x1, y1, z1, 0xff4a3a, 0.1, 4, 0.3);
    this.tracers.add(x0, y0, z0, x1, y1, z1, 0xfff0e8, 0.09, 5, 0.09);
    this.flash(x0, y0, z0 + 0.4, 0xff3a3a, 14, 7, 0.12, 2);
    this.flash((x0 + x1) / 2, y0, z0 + 0.8, 0xff2a2a, 8, 7, 0.12, 3);
    for (let i = 0; i < 3; i++)
      this.add.emit(
        {
          x: x0,
          y: y0,
          z: z0,
          vx: dir * (2 + this.rnd() * 3),
          vy: (this.rnd() - 0.3) * 3,
          spread: 1.2,
          life: 0.18,
          size: 0.1,
          sizeEnd: 0.02,
          color: 0xffd0a0,
          intensity: 4,
          drag: 4,
        },
        this.rnd,
      );
    for (let i = 0; i < 4; i++) {
      const k = this.rnd();
      this.add.emit(
        {
          x: x0 + (x1 - x0) * k,
          y: y0 + (this.rnd() - 0.5) * 0.2,
          z: z0 + (z1 - z0) * k,
          vy: 1 + this.rnd(),
          spread: 0.3,
          life: 0.35,
          size: 0.2,
          sizeEnd: 0.02,
          color: 0xff5a2a,
          colorEnd: 0x6a0a0a,
          intensity: 3,
        },
        this.rnd,
      );
    }
    this.burst(x1, y1, z1, 3, 0xff8a4a, 3, 0.09, 0.22, true, 4, 3);
  }

  /** Ciborgue carregando o Raio Laser: brilho vermelho que cresce na mão e faíscas sendo puxadas para ela. */
  private laserCharge(e: Entity, every: (hz: number) => boolean): void {
    const fi = e.fighter!;
    const m = MOVES.raioLaser!;
    const hx = e.t.x + e.t.facing * 0.55;
    const hy = e.t.y + 1.3;
    const hz = e.t.z;
    if (fi.st < m.startup) {
      const k = fi.st / m.startup;
      this.lighting.request({
        x: hx,
        y: hy,
        z: hz + 0.6,
        color: 0xff2a3a,
        intensity: 4 + 18 * k,
        distance: 5,
        priority: 2,
      });
      this.add.emit(
        { x: hx, y: hy, z: hz, life: 0.05, size: 0.18 + 0.4 * k, color: 0xff3a3a, intensity: 4 },
        this.rnd,
      );
      if (every(90)) {
        const a = this.rnd() * Math.PI * 2;
        const r = 0.9 - 0.4 * k;
        this.add.emit(
          {
            x: hx + Math.cos(a) * r,
            y: hy + Math.sin(a) * r,
            z: hz + (this.rnd() - 0.5) * 0.4,
            vx: -Math.cos(a) * r * 6,
            vy: -Math.sin(a) * r * 6,
            life: 0.15,
            size: 0.09,
            sizeEnd: 0.02,
            color: 0xff7a5a,
            intensity: 4,
          },
          this.rnd,
        );
      }
    } else if (fi.st < m.startup + m.active) {
      this.lighting.request({
        x: hx,
        y: hy,
        z: hz + 0.6,
        color: 0xff3a3a,
        intensity: 24,
        distance: 7,
        priority: 1,
      });
      this.add.emit({ x: hx, y: hy, z: hz, life: 0.05, size: 0.55, color: 0xffb0a0, intensity: 5 }, this.rnd);
    }
  }

  private dust(w: World, id: number, n: number): void {
    const e = w.get(id);
    if (!e) return;
    for (let i = 0; i < n; i++)
      this.norm.emit(
        {
          x: e.t.x,
          y: 0.1,
          z: e.t.z,
          vx: (this.rnd() - 0.5) * 3,
          vy: 0.5,
          vz: (this.rnd() - 0.5) * 1.2,
          life: 0.5,
          size: 0.3,
          sizeEnd: 0.8,
          color: 0x8a8070,
          alpha: 0.35,
          drag: 3,
        },
        this.rnd,
      );
  }

  /** Emissões contínuas por frame (fogo em quem queima, rastros, zonas). */
  update(w: World, dt: number): void {
    this.t += dt;
    const every = (hz: number) => this.rnd() < hz * dt;
    this.clock += dt;
    for (const e of w.entities) {
      if (e.statuses && e.statuses.length) {
        for (const s of e.statuses) {
          const h = e.body?.height ?? 1.6;
          if (s.id === 'burn' && every(20))
            this.add.emit(
              {
                x: e.t.x + (this.rnd() - 0.5) * 0.4,
                y: e.t.y + this.rnd() * h,
                z: e.t.z,
                vy: 2,
                spread: 0.3,
                life: 0.45,
                size: 0.3,
                sizeEnd: 0.05,
                color: 0xff7a1a,
                colorEnd: 0xff2a00,
                intensity: 3,
              },
              this.rnd,
            );
          if (s.id === 'poison' && every(8))
            this.add.emit(
              {
                x: e.t.x + (this.rnd() - 0.5) * 0.4,
                y: e.t.y + this.rnd() * h,
                z: e.t.z,
                vy: 0.6,
                spread: 0.2,
                life: 0.7,
                size: 0.12,
                color: 0x8cff3a,
                intensity: 2,
              },
              this.rnd,
            );
          if (s.id === 'stun' && every(10)) {
            const a = this.t * 6;
            this.add.emit(
              {
                x: e.t.x + Math.cos(a) * 0.35,
                y: e.t.y + h + 0.1,
                z: e.t.z + Math.sin(a) * 0.35,
                life: 0.3,
                size: 0.12,
                color: 0xfff15a,
                intensity: 3,
              },
              this.rnd,
            );
          }
          if (s.id === 'wet' && every(6))
            this.norm.emit(
              {
                x: e.t.x + (this.rnd() - 0.5) * 0.4,
                y: e.t.y + this.rnd() * h,
                z: e.t.z,
                vy: -1,
                life: 0.4,
                size: 0.07,
                color: 0x5ab0ff,
                gravity: 8,
              },
              this.rnd,
            );
          if ((s.id === 'hacked' || s.id === 'raised') && every(6))
            this.add.emit(
              {
                x: e.t.x,
                y: e.t.y + h + 0.2,
                z: e.t.z,
                vy: 0.5,
                spread: 0.3,
                life: 0.5,
                size: 0.12,
                color: s.id === 'hacked' ? 0x39e6ff : 0xb05aff,
                intensity: 3,
              },
              this.rnd,
            );
          if (s.id === 'regen' && every(8))
            this.add.emit(
              {
                x: e.t.x + (this.rnd() - 0.5) * 0.5,
                y: e.t.y + 0.2,
                z: e.t.z,
                vy: 1.8,
                life: 0.7,
                size: 0.14,
                sizeEnd: 0.02,
                color: 0x5aff9a,
                intensity: 3,
              },
              this.rnd,
            );
        }
      }
      if (e.fighter?.state === 'attack' && e.fighter.moveId === 'raioLaser') this.laserCharge(e, every);
      // mira laser ao segurar o botão de mirar
      if (e.player && e.player.mode === 'gun' && (e.player.buttons & 32) !== 0 && e.player.respawn <= 0) {
        const yaw = resolveAim(w, e, 14);
        const x0 = e.t.x + Math.cos(yaw) * 0.6;
        const z0 = e.t.z + Math.sin(yaw) * 0.3;
        const y0 = e.t.y + 1.3;
        this.tracers.add(
          x0,
          y0,
          z0,
          x0 + Math.cos(yaw) * 14,
          y0,
          z0 + Math.sin(yaw) * 14,
          0xff2a2a,
          Math.max(dt, 0.016) * 1.01,
          1.6,
          0.025,
        );
      }
      const pc = e.projectile;
      if (pc) {
        if ((pc.visual === 'fireball' || pc.visual === 'orb_fire') && every(40))
          this.add.emit(
            {
              x: e.t.x,
              y: e.t.y,
              z: e.t.z,
              spread: 0.4,
              life: 0.3,
              size: 0.3,
              sizeEnd: 0.05,
              color: 0xff7a1a,
              intensity: 3,
            },
            this.rnd,
          );
        else if (pc.visual === 'missile' && every(40)) this.smoke(e.t.x, e.t.y, e.t.z, 1, 0.3, 0x6a6a6a, 0.6);
        else if (
          (pc.visual === 'skull_necro' || pc.visual === 'packet_cyber' || pc.visual === 'plasma') &&
          every(25)
        )
          this.add.emit(
            {
              x: e.t.x,
              y: e.t.y,
              z: e.t.z,
              spread: 0.2,
              life: 0.35,
              size: 0.15,
              color: PROJ_VISUALS[pc.visual].color,
              intensity: 3,
            },
            this.rnd,
          );
        else if (pc.visual === 'grenade' && every(20)) this.smoke(e.t.x, e.t.y, e.t.z, 1, 0.2, 0x8a8a8a, 0.4);
      }
      // luz de destaque para chefes e elites (legibilidade no escuro)
      if (e.kind === 'boss' && e.body) {
        this.lighting.request({
          x: e.t.x - 1,
          y: e.body.height * 0.7,
          z: e.t.z + 3,
          color: 0xffd8a8,
          intensity: 18,
          distance: 10,
          priority: 2,
        });
        // núcleo do ciborgue pulsa na cor do elemento atual
        if (
          e.boss &&
          e.boss.element !== 'cyber' &&
          e.fighter?.state !== 'dead' &&
          BOSSES[e.defId]?.family === 'cyborg'
        ) {
          const col = ELEMENT_COLORS[e.boss.element];
          this.lighting.request({
            x: e.t.x + e.t.facing * 0.6,
            y: e.body.height * 0.6,
            z: e.t.z + 1.2,
            color: col,
            intensity: 10 + Math.sin(this.clock * 6) * 4,
            distance: 7,
            priority: 2,
          });
          if (every(4))
            this.add.emit(
              {
                x: e.t.x + (this.rnd() - 0.5) * e.body.radius * 2,
                y: this.rnd() * e.body.height,
                z: e.t.z + (this.rnd() - 0.5) * 1.2,
                vy: 1.2,
                spread: 0.3,
                life: 0.7,
                size: 0.18,
                sizeEnd: 0.02,
                color: col,
                intensity: 3,
              },
              this.rnd,
            );
        }
      }
      const hz = e.hazard;
      if (hz && hz.delay <= 0 && (!hz.env || hz.phase === 1)) this.hazardParticles(e.t.x, e.t.z, hz, every);
      // zumbi bomba pisca antes de explodir
      if (e.kind === 'enemy' && e.fighter?.state === 'windup' && e.ai?.attackId === 'explode' && every(15))
        this.add.emit(
          { x: e.t.x, y: e.t.y + 1.5, z: e.t.z + 0.3, life: 0.1, size: 0.6, color: 0xff2a1a, intensity: 4 },
          this.rnd,
        );
    }

    // luzes transitórias
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]!;
      f.life -= dt;
      if (f.life <= 0) {
        this.flashes.splice(i, 1);
        continue;
      }
      this.lighting.request({
        x: f.x,
        y: f.y,
        z: f.z,
        color: f.color,
        intensity: f.intensity * (f.life / f.max),
        distance: f.dist,
        priority: f.priority,
      });
    }

    this.add.update(dt);
    this.norm.update(dt);
    this.debris.update(dt);
    this.tracers.update(dt);
    this.damagePulse = Math.max(0, this.damagePulse - dt * 1.6);
    this.desat = Math.max(0, this.desat - dt * 0.4);
    this.post.setDamagePulse(this.damagePulse);
    this.post.setDesat(this.desat);
  }

  private hazardParticles(
    x: number,
    z: number,
    hz: NonNullable<World['entities'][number]['hazard']>,
    every: (hz: number) => boolean,
  ): void {
    const c = fxColor(hz.fx);
    const s = hz.shape;
    const r =
      s.k === 'circle' || s.k === 'ring'
        ? s.r
        : s.k === 'rect'
          ? Math.max(s.w, s.d) / 2
          : s.k === 'cone'
            ? s.range / 2
            : 1;
    const rate = Math.min(60, 8 + r * 10);
    if (!every(rate)) return;
    const a = this.rnd() * Math.PI * 2;
    let px = x + Math.cos(a) * r * this.rnd();
    let pz = z + Math.sin(a) * r * this.rnd();
    if (s.k === 'lane') {
      px = s.x0 + (s.x1 - s.x0) * this.rnd();
      pz = z + (this.rnd() - 0.5) * s.width;
    } else if (s.k === 'cone') {
      const ang = s.dir + (this.rnd() - 0.5) * s.angle;
      const d = this.rnd() * s.range;
      px = x + Math.cos(ang) * d;
      pz = z + Math.sin(ang) * d;
    }
    switch (hz.fx) {
      case 'flame':
      case 'fire':
      case 'fireJet':
      case 'magma':
        this.add.emit(
          {
            x: px,
            y: 0.2,
            z: pz,
            vy: 3,
            spread: 0.5,
            life: 0.5,
            size: 0.45,
            sizeEnd: 0.05,
            color: 0xff8a2a,
            colorEnd: 0xff2a00,
            intensity: 3,
          },
          this.rnd,
        );
        break;
      case 'acidPool':
      case 'toxicPool':
      case 'poisonCloud':
      case 'gasVent':
        this.add.emit(
          {
            x: px,
            y: 0.15,
            z: pz,
            vy: hz.fx === 'poisonCloud' || hz.fx === 'gasVent' ? 1 : 0.4,
            spread: 0.2,
            life: 0.8,
            size: hz.fx === 'poisonCloud' ? 0.5 : 0.15,
            sizeEnd: 0.6,
            color: c,
            intensity: 1.2,
            alpha: 0.6,
          },
          this.rnd,
        );
        break;
      case 'ice':
      case 'frost':
        this.add.emit(
          { x: px, y: 0.1, z: pz, vy: 0.5, life: 0.6, size: 0.1, color: 0xdff8ff, intensity: 2 },
          this.rnd,
        );
        break;
      case 'electric':
      case 'electricTile':
      case 'shock':
        this.add.emit(
          { x: px, y: 0.1, z: pz, vy: 2, spread: 1, life: 0.15, size: 0.08, color: 0xfff15a, intensity: 4 },
          this.rnd,
        );
        break;
      case 'shockwave':
      case 'debris':
        this.norm.emit(
          {
            x: px,
            y: 0.2,
            z: pz,
            vy: 3,
            spread: 1,
            life: 0.5,
            size: 0.3,
            sizeEnd: 0.6,
            color: 0x8a7a6a,
            alpha: 0.6,
            gravity: 6,
          },
          this.rnd,
        );
        break;
      default:
        this.add.emit(
          { x: px, y: 0.1, z: pz, vy: 1, life: 0.4, size: 0.12, color: c, intensity: 2 },
          this.rnd,
        );
    }
  }

  dispose(): void {
    this.add.dispose(this.scene);
    this.norm.dispose(this.scene);
    this.debris.dispose(this.scene);
    this.tracers.dispose(this.scene);
  }
}
