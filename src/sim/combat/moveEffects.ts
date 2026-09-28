import { secToTicks } from '../../core/time';
import type { HitSpec, MeleeMoveDef } from '../../data/types';
import type { Entity } from '../Entity';
import type { World } from '../World';
import { spawnHazard } from '../systems/effects';
import { spawnProjectile } from '../systems/projectiles';

const NO_HIT: HitSpec = { damage: 0, dtype: 'blunt', knockback: 0, hitstun: 0, hitstop: 0 };

/**
 * Efeitos extras dos golpes especiais, chamados a cada quadro ativo (`rel` = quadros desde o início da fase
 * ativa). Anéis, ondas e poderes disparam no primeiro quadro; raios se repetem no intervalo pedido.
 */
export function runMoveEffects(w: World, e: Entity, m: MeleeMoveDef, rel: number): void {
  if (rel === 0 && m.sfx) w.emit({ t: 'sfx', id: m.sfx, x: e.t.x });
  if (!m.effects) return;
  for (const fx of m.effects) {
    switch (fx.k) {
      case 'ring':
        if (rel !== 0) break;
        spawnHazard(w, {
          x: e.t.x,
          z: e.t.z,
          owner: e.id,
          team: e.team,
          shape: { k: 'ring', r: 0.4, width: 0.6 },
          hit: NO_HIT,
          active: fx.ticks,
          grow: (fx.r - 0.4) / fx.ticks,
          fx: fx.fx,
          height: -1,
        });
        break;
      case 'shockwave':
        if (rel !== 0) break;
        spawnHazard(w, {
          x: e.t.x,
          z: e.t.z,
          owner: e.id,
          team: e.team,
          shape: { k: 'ring', r: fx.r0, width: fx.width },
          hit: fx.hit,
          active: fx.ticks,
          grow: fx.grow,
          fx: fx.fx,
          height: fx.height,
          source: e.player ? 'special' : undefined,
        });
        w.emit({ t: 'shake', trauma: 0.45 });
        break;
      case 'beam': {
        if (rel === 0) w.emit({ t: 'shake', trauma: 0.25 });
        if (rel % fx.every !== 0) break;
        const f = e.t.facing;
        const y = e.t.y + fx.y;
        w.emit({
          t: 'beam',
          x0: e.t.x + f * 0.5,
          y0: y,
          z0: e.t.z,
          x1: e.t.x + f * fx.length,
          y1: y,
          z1: e.t.z,
          element: 'laser',
        });
        break;
      }
      case 'grenades': {
        if (rel !== 0) break;
        const [z0, z1] = w.zBand;
        for (let i = 0; i < fx.count; i++) {
          // em volta, com um pouco de acaso (ângulo, distância e pavio) para cair espalhado e explodir em sequência
          const a = ((i + w.rng.next() * 0.6) / fx.count) * Math.PI * 2;
          const d = fx.dist[0] + w.rng.next() * (fx.dist[1] - fx.dist[0]);
          const tx = e.t.x + Math.cos(a) * d;
          const tz = Math.max(z0 + 0.2, Math.min(z1 - 0.2, e.t.z + Math.sin(a) * d * 0.6));
          spawnProjectile(w, {
            owner: e,
            x: e.t.x,
            y: e.t.y + 1.7,
            z: e.t.z,
            yaw: a,
            target: { x: tx, z: tz },
            spec: {
              visual: 'grenade',
              speed: 7,
              radius: 0.18,
              lifeS: 4,
              gravity: 16,
              lob: true,
              // encostou num inimigo no ar: explode ali mesmo (o dano é todo da explosão)
              hit: { damage: 0, dtype: 'explosive', knockback: 0, hitstun: 0, hitstop: 0 },
              onImpact: { explosion: fx.explosion },
            },
            fuseS: fx.fuseS[0] + w.rng.next() * (fx.fuseS[1] - fx.fuseS[0]),
            fromSpecial: !!e.player,
          });
        }
        w.emit({ t: 'sfx', id: 'whooshHeavy', x: e.t.x });
        break;
      }
      case 'bolt': {
        if (rel !== 0) break;
        const f = e.t.facing;
        spawnProjectile(w, {
          owner: e,
          x: e.t.x + f * 0.6,
          y: e.t.y + fx.y,
          z: e.t.z,
          yaw: f > 0 ? 0 : Math.PI,
          spec: fx.spec,
          fromSpecial: !!e.player,
          element: fx.element,
        });
        break;
      }
      case 'power': {
        const p = e.player;
        if (rel !== 0 || !p) break;
        const was = p.powers[fx.power] > 0;
        p.powers[fx.power] = Math.max(p.powers[fx.power], secToTicks(fx.s));
        if (!was) w.emit({ t: 'power', player: e.id, power: fx.power, on: true });
        break;
      }
    }
  }
}
