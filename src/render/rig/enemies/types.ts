import type { RigParams } from '../../../data/types';
import type { PartSpec } from '../RigBuilder';

/** Peças extras de um inimigo (chave = rig.extra); `cd` = profundidade do peito. */
export type EnemyExtra = (rp: RigParams, cd: number) => PartSpec[];
