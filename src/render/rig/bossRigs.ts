import type { BossDef } from '../../data/types';
import type { RigSpec } from './RigBuilder';
import { mechRig, soldierRig, zombieRig } from './rigs';
import { BOSS_EXTRAS } from './bosses';

/** Rig de chefe: base (zumbi, robô ou mech) + acessórios exclusivos. */
export function bossRig(def: BossDef): RigSpec {
  const key = `boss:${def.id}`;
  const base =
    def.rig.kind === 'mech'
      ? mechRig(key, def.rig)
      : def.rig.kind === 'robot'
        ? soldierRig(key, def.rig)
        : zombieRig(key, { ...def.rig, accessory: 'none' }, 1);
  const extra = BOSS_EXTRAS[def.rig.boss];
  if (extra) base.parts.push(...extra(base, def));
  base.height = def.height / def.scale;
  return base;
}
