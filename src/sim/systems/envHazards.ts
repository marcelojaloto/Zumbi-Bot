import { secToTicks } from '../../core/time';
import type { HazardPlacement, HitSpec } from '../../data/types';
import type { Entity } from '../Entity';
import type { World } from '../World';
import { spawnHazard } from './effects';
import { hazardOverlaps } from './hazards';
import { spawnEnemy } from '../ai/spawnEnemy';
import { explode } from './effects';

const H = (damage: number, dtype: HitSpec['dtype'], extra: Partial<HitSpec> = {}): HitSpec => ({
  damage,
  dtype,
  knockback: 0,
  hitstun: 0,
  hitstop: 0,
  ...extra,
});

/** Cria um perigo ambiental do nível/segmento. */
export function spawnEnvHazard(w: World, h: HazardPlacement): Entity {
  const period = h.periodS ? secToTicks(h.periodS) : 0;
  const base = { x: h.x, z: h.z, owner: 0, team: 'neutral' as const, active: 1, hitsAll: true };
  let e: Entity;
  switch (h.kind) {
    case 'toxicPool':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'circle', r: (h.w ?? 3) / 2 },
        hit: H(4, 'toxic', { status: { id: 'poison', chance: 0.5 } }),
        tickEvery: 30,
        fx: 'toxicPool',
        height: 0.5,
      });
      break;
    case 'gasVent':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'circle', r: (h.w ?? 2.4) / 2 },
        hit: H(5, 'toxic', { status: { id: 'poison', chance: 0.6 } }),
        tickEvery: 20,
        fx: 'gasVent',
        height: 3,
      });
      break;
    case 'fireJet':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'circle', r: (h.w ?? 2) / 2 },
        hit: H(12, 'fire', { knockback: 2, launch: 3, hitstun: 12, status: { id: 'burn' } }),
        tickEvery: 30,
        fx: 'fireJet',
        height: 3,
      });
      break;
    case 'fire':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'circle', r: (h.w ?? 2) / 2 },
        hit: H(5, 'fire', { status: { id: 'burn', chance: 0.5 } }),
        tickEvery: 30,
        fx: 'fire',
        height: 1.5,
      });
      break;
    case 'electricTile':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'rect', w: h.w ?? 2, d: h.d ?? 2 },
        hit: H(10, 'electric', { status: { id: 'stun', durationS: 0.6 } }),
        tickEvery: 40,
        fx: 'electricTile',
        height: 0.4,
      });
      break;
    case 'laserTrip':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'rect', w: 0.3, d: h.d ?? 6 },
        hit: H(0, 'electric'),
        fx: 'laserTrip',
        height: 3,
      });
      break;
    case 'pendulum':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'rect', w: 0.5, d: 1.4 },
        hit: H(15, 'blade', { knockback: 5, launch: 3, knockdown: true, hitstun: 20, hitstop: 4 }),
        tickEvery: 40,
        fx: 'pendulum',
        height: 2.2,
      });
      break;
    case 'swamp':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'circle', r: (h.w ?? 4) / 2 },
        hit: H(0, 'water'),
        fx: 'swamp',
        slow: 0.5,
        height: 0.5,
      });
      break;
    case 'gust':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'rect', w: h.w ?? 4, d: h.d ?? 6 },
        hit: H(0, 'wind'),
        fx: 'gust',
        height: 4,
        pushZ: 22,
      });
      break;
    case 'artillery':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'circle', r: 0.1 },
        hit: H(0, 'explosive'),
        fx: 'artillery',
        height: -1,
      });
      break;
    case 'mine':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'circle', r: 0.55 },
        hit: H(0, 'explosive'),
        fx: 'mine',
        height: 0.5,
      });
      break;
    case 'debris':
      e = spawnHazard(w, {
        ...base,
        shape: { k: 'circle', r: 0.1 },
        hit: H(0, 'blunt'),
        fx: 'debris',
        height: -1,
      });
      break;
  }
  const hz = e.hazard!;
  hz.env = h.kind;
  hz.period = period;
  hz.offset = h.offsetS ? secToTicks(h.offsetS) : 0;
  hz.phase = period ? 0 : 1;
  if (h.kind === 'gust') hz.pushZ = (h.z > (w.level.zBand[0] + w.level.zBand[1]) / 2 ? -1 : 1) * 22;
  return e;
}

/**
 * Perigos ambientais: cíclicos alternam inativo (fase 0) e ativo (fase 1); alguns têm
 * comportamento próprio (minas, alarmes, artilharia, destroços).
 */
export function tickEnvHazard(w: World, h: Entity): void {
  const hz = h.hazard!;
  // longe demais da câmera: inativo
  if (Math.abs(h.t.x - w.camX) > 30) return;
  switch (hz.env) {
    case 'mine':
      for (const p of w.entities) {
        if ((p.kind === 'player' || p.kind === 'enemy') && p.t.y < 0.4 && hazardOverlaps(h, p)) {
          explode(
            w,
            h.t.x,
            0.3,
            h.t.z,
            {
              radius: 2.2,
              damage: 30,
              minMult: 0.4,
              dtype: 'explosive',
              knockback: 7,
              launch: 6,
              selfMult: 0,
              fx: 'explosion',
            },
            0,
            'neutral',
          );
          w.remove(h.id);
          return;
        }
      }
      return;
    case 'laserTrip':
      for (const p of w.activePlayers()) {
        if (hazardOverlaps(h, p)) {
          w.emit({ t: 'sfx', id: 'alarm', x: h.t.x });
          for (let i = 0; i < 2; i++)
            spawnEnemy(
              w,
              'soldier',
              w.bounds.maxX + 1.5 + i,
              w.rng.range(w.zBand[0] + 0.5, w.zBand[1] - 0.5),
              'right',
            );
          w.remove(h.id);
          return;
        }
      }
      return;
    case 'artillery':
    case 'debris': {
      const period = hz.period || secToTicks(4);
      if ((w.tick + hz.offset) % period !== 0) return;
      const ps = w.activePlayers();
      if (!ps.length) return;
      const tgt = ps[w.rng.int(0, ps.length - 1)]!;
      if (Math.abs(tgt.t.x - h.t.x) > 14) return;
      const art = hz.env === 'artillery';
      const x = tgt.t.x + w.rng.range(-1.5, 1.5) + tgt.t.vx * 0.6;
      const z = Math.max(w.zBand[0], Math.min(w.zBand[1], tgt.t.z + w.rng.range(-1, 1)));
      spawnHazard(w, {
        x,
        z,
        owner: 0,
        team: 'neutral',
        shape: { k: 'circle', r: art ? 2 : 1.3 },
        hit: {
          damage: art ? 22 : 15,
          dtype: art ? 'explosive' : 'blunt',
          knockback: 5,
          launch: 4,
          knockdown: true,
          hitstun: 20,
          hitstop: 4,
          heavy: true,
        },
        delay: secToTicks(art ? 1.3 : 1.0),
        active: 4,
        hitsAll: true,
        fx: art ? 'explosion' : 'debris',
        height: 3,
        telegraph: { k: 'circle', r: art ? 2 : 1.3 },
      });
      if (art) w.emit({ t: 'sfx', id: 'hz_artillery', x });
      return;
    }
    default:
      break;
  }
  if (hz.env === 'pendulum') {
    // lâmina que varre a profundidade
    const [z0, z1] = w.zBand;
    const t = (w.tick + hz.offset) / 60;
    h.t.z = (z0 + z1) / 2 + Math.sin(t * 1.6) * ((z1 - z0) / 2 + 0.3);
  }
  if (hz.period <= 0) {
    hz.phase = 1;
    return;
  }
  const t = (w.tick + hz.offset) % hz.period;
  const activeLen = Math.floor(hz.period * 0.35);
  const wasActive = hz.phase === 1;
  hz.phase = t >= hz.period - activeLen ? 1 : 0;
  if (hz.phase === 1 && !wasActive) {
    hz.hitSet.length = 0;
    hz.tickAcc = 0;
    w.emit({ t: 'sfx', id: `hz_${hz.env}`, x: h.t.x });
  }
}
