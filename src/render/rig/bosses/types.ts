import type { BossDef } from '../../../data/types';
import type { PartSpec, RigSpec } from '../RigBuilder';

/** Acessórios exclusivos de um chefe, somados ao rig base (zumbi, robô ou mech). */
export type BossExtra = (spec: RigSpec, def: BossDef) => PartSpec[];
