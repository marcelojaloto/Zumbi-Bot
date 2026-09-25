import type { BossDef } from '../../data/types';
import type { RigSpec } from './RigBuilder';
import { mechRig, zombieRig } from './rigs';

/** Rig de boss (detalhado por boss no M6/M7). */
export function bossRig(def: BossDef): RigSpec {
  if (def.rig.kind === 'mech' || def.rig.kind === 'robot') return mechRig(`boss:${def.id}`, def.rig);
  return zombieRig(`boss:${def.id}`, def.rig, 0);
}
