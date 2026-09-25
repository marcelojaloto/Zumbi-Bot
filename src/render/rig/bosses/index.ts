import type { BossExtra } from './types';
import { coveiroExtra } from './coveiro';
import { sentinelaExtra } from './sentinela';
import { guardiaoExtra } from './guardiao';
import { condeExtra } from './conde';
import { abominacaoExtra } from './abominacao';
import { pantanoExtra } from './pantano';
import { mechaExtra } from './mecha';
import { incandescenteExtra } from './incandescente';
import { criotanqueExtra } from './criotanque';
import { omegaExtra } from './omega';

/** Acessórios exclusivos por chefe (chave = def.rig.boss). */
export const BOSS_EXTRAS: Record<string, BossExtra> = {
  coveiro: coveiroExtra,
  sentinela: sentinelaExtra,
  guardiao: guardiaoExtra,
  conde: condeExtra,
  abominacao: abominacaoExtra,
  pantano: pantanoExtra,
  mecha: mechaExtra,
  incandescente: incandescenteExtra,
  criotanque: criotanqueExtra,
  omega: omegaExtra,
};
