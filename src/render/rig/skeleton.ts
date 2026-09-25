/**
 * Esqueleto humanoide compartilhado por robô, zumbis, robôs inimigos e bosses.
 * Pose de ligação: personagem olhando para +Z, Y para cima, pés em y=0. Esquerda = +X.
 */
export const J = {
  root: 0,
  hips: 1,
  spine: 2,
  chest: 3,
  neck: 4,
  head: 5,
  upperArmL: 6,
  foreArmL: 7,
  handL: 8,
  upperArmR: 9,
  foreArmR: 10,
  handR: 11,
  thighL: 12,
  shinL: 13,
  footL: 14,
  thighR: 15,
  shinR: 16,
  footR: 17,
} as const;

export type JointName = keyof typeof J;
export const JOINT_NAMES = Object.keys(J) as JointName[];
export const JOINT_COUNT = JOINT_NAMES.length;

export interface Proportions {
  hipH: number;
  hipW: number;
  thigh: number;
  shin: number;
  spine: number;
  chest: number;
  neck: number;
  shoulderW: number;
  shoulderH: number;
  upperArm: number;
  foreArm: number;
}

export const HUMAN: Proportions = {
  hipH: 0.92,
  hipW: 0.12,
  thigh: 0.44,
  shin: 0.44,
  spine: 0.1,
  chest: 0.24,
  neck: 0.28,
  shoulderW: 0.27,
  shoulderH: 0.2,
  upperArm: 0.3,
  foreArm: 0.28,
};

export interface JointDef {
  name: JointName;
  parent: number;
  /** Deslocamento relativo ao pai (pose de ligação). */
  offset: [number, number, number];
}

export function humanoidJoints(p: Proportions): JointDef[] {
  return [
    { name: 'root', parent: -1, offset: [0, 0, 0] },
    { name: 'hips', parent: J.root, offset: [0, p.hipH, 0] },
    { name: 'spine', parent: J.hips, offset: [0, p.spine, 0] },
    { name: 'chest', parent: J.spine, offset: [0, p.chest, 0] },
    { name: 'neck', parent: J.chest, offset: [0, p.neck, 0] },
    { name: 'head', parent: J.neck, offset: [0, 0.06, 0] },
    { name: 'upperArmL', parent: J.chest, offset: [p.shoulderW, p.shoulderH, 0] },
    { name: 'foreArmL', parent: J.upperArmL, offset: [0, -p.upperArm, 0] },
    { name: 'handL', parent: J.foreArmL, offset: [0, -p.foreArm, 0] },
    { name: 'upperArmR', parent: J.chest, offset: [-p.shoulderW, p.shoulderH, 0] },
    { name: 'foreArmR', parent: J.upperArmR, offset: [0, -p.upperArm, 0] },
    { name: 'handR', parent: J.foreArmR, offset: [0, -p.foreArm, 0] },
    { name: 'thighL', parent: J.hips, offset: [p.hipW, -0.02, 0] },
    { name: 'shinL', parent: J.thighL, offset: [0, -p.thigh, 0] },
    { name: 'footL', parent: J.shinL, offset: [0, -p.shin, 0] },
    { name: 'thighR', parent: J.hips, offset: [-p.hipW, -0.02, 0] },
    { name: 'shinR', parent: J.thighR, offset: [0, -p.thigh, 0] },
    { name: 'footR', parent: J.shinR, offset: [0, -p.shin, 0] },
  ];
}

/** Posições absolutas (espaço do modelo) de cada junta na pose de ligação. */
export function bindPositions(joints: JointDef[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < joints.length; i++) {
    const j = joints[i]!;
    const p = j.parent >= 0 ? out[j.parent]! : [0, 0, 0];
    out.push([p[0] + j.offset[0], p[1] + j.offset[1], p[2] + j.offset[2]]);
  }
  return out;
}
