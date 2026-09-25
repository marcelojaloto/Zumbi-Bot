import { J, JOINT_COUNT } from './skeleton';

/** Pose: rotações por junta (x,y,z) + deslocamentos da raiz. */
export class Pose {
  r = new Float32Array(JOINT_COUNT * 3);
  /** Deslocamento vertical da raiz. */
  y = 0;
  /** Inclinação para trás (deitar), rad. */
  tilt = 0;
  /** Deslocamento para trás ao deitar. */
  back = 0;

  reset(): this {
    this.r.fill(0);
    this.y = 0;
    this.tilt = 0;
    this.back = 0;
    return this;
  }

  set(j: number, x: number, y = 0, z = 0): this {
    this.r[j * 3] = x;
    this.r[j * 3 + 1] = y;
    this.r[j * 3 + 2] = z;
    return this;
  }

  add(j: number, x: number, y = 0, z = 0): this {
    this.r[j * 3] += x;
    this.r[j * 3 + 1] += y;
    this.r[j * 3 + 2] += z;
    return this;
  }

  copy(o: Pose): this {
    this.r.set(o.r);
    this.y = o.y;
    this.tilt = o.tilt;
    this.back = o.back;
    return this;
  }

  lerp(o: Pose, t: number): this {
    for (let i = 0; i < this.r.length; i++) this.r[i] = this.r[i]! + (o.r[i]! - this.r[i]!) * t;
    this.y += (o.y - this.y) * t;
    this.tilt += (o.tilt - this.tilt) * t;
    this.back += (o.back - this.back) * t;
    return this;
  }

  /** Interpola entre a e b. */
  mix(a: Pose, b: Pose, t: number): this {
    for (let i = 0; i < this.r.length; i++) this.r[i] = a.r[i]! + (b.r[i]! - a.r[i]!) * t;
    this.y = a.y + (b.y - a.y) * t;
    this.tilt = a.tilt + (b.tilt - a.tilt) * t;
    this.back = a.back + (b.back - a.back) * t;
    return this;
  }
}

const P = Math.PI;

export interface Style {
  /** Postura zumbi (0..1). */
  hunch: number;
  /** Braços estendidos à frente (zumbi). */
  zombieArms: boolean;
  heavy: boolean;
}

export function idlePose(p: Pose, t: number, s: Style): Pose {
  p.reset();
  const br = Math.sin(t * 2.2) * 0.03;
  p.set(J.chest, br + s.hunch * 0.25);
  p.set(J.spine, s.hunch * 0.2);
  p.set(
    J.neck,
    s.hunch * 0.25 + Math.sin(t * 1.3) * 0.04 * s.hunch,
    Math.sin(t * 0.7) * 0.15 * s.hunch,
    Math.sin(t * 0.9) * 0.12 * s.hunch,
  );
  if (s.zombieArms) {
    p.set(J.upperArmL, -1.25 + Math.sin(t * 1.7) * 0.08, 0, 0.1);
    p.set(J.upperArmR, -1.35 + Math.sin(t * 1.5 + 1) * 0.08, 0, -0.1);
    p.set(J.foreArmL, -0.2);
    p.set(J.foreArmR, -0.25);
  } else {
    p.set(J.upperArmL, 0.05, 0, 0.12 + br);
    p.set(J.upperArmR, 0.05, 0, -0.12 - br);
    p.set(J.foreArmL, -0.25);
    p.set(J.foreArmR, -0.25);
  }
  p.set(J.thighL, -0.05, 0, 0.03);
  p.set(J.thighR, 0.05, 0, -0.03);
  p.set(J.shinL, 0.08);
  p.set(J.shinR, 0.08);
  p.y = -0.01 + br * 0.3;
  return p;
}

export function walkPose(p: Pose, phase: number, amt: number, s: Style): Pose {
  p.reset();
  const sw = Math.sin(phase);
  const leg = 0.55 * amt;
  p.set(J.thighL, sw * leg);
  p.set(J.thighR, -sw * leg);
  p.set(J.shinL, Math.max(0, -Math.cos(phase)) * 0.9 * amt + 0.05);
  p.set(J.shinR, Math.max(0, Math.cos(phase)) * 0.9 * amt + 0.05);
  p.set(J.footL, -sw * 0.2 * amt);
  p.set(J.footR, sw * 0.2 * amt);
  p.set(J.spine, s.hunch * 0.25 + 0.03);
  p.set(J.chest, s.hunch * 0.2, sw * 0.08 * amt);
  p.set(J.neck, s.hunch * 0.2);
  if (s.zombieArms) {
    p.set(J.upperArmL, -1.3 - sw * 0.12, 0, 0.1);
    p.set(J.upperArmR, -1.3 + sw * 0.12, 0, -0.1);
    p.set(J.foreArmL, -0.15);
    p.set(J.foreArmR, -0.2);
    p.set(J.hips, 0, 0, sw * 0.08 * s.hunch);
  } else {
    p.set(J.upperArmL, -sw * 0.5 * amt, 0, 0.1);
    p.set(J.upperArmR, sw * 0.5 * amt, 0, -0.1);
    p.set(J.foreArmL, -0.35 - Math.max(0, sw) * 0.3);
    p.set(J.foreArmR, -0.35 - Math.max(0, -sw) * 0.3);
  }
  p.y = -Math.abs(Math.cos(phase)) * 0.04 * amt;
  return p;
}

export function runPose(p: Pose, phase: number, s: Style): Pose {
  p.reset();
  const sw = Math.sin(phase);
  p.set(J.thighL, sw * 0.95 - 0.1);
  p.set(J.thighR, -sw * 0.95 - 0.1);
  p.set(J.shinL, Math.max(0, -Math.cos(phase)) * 1.5 + 0.2);
  p.set(J.shinR, Math.max(0, Math.cos(phase)) * 1.5 + 0.2);
  p.set(J.spine, 0.25 + s.hunch * 0.2);
  p.set(J.chest, 0.05, sw * 0.15);
  p.set(J.neck, -0.15);
  if (s.zombieArms) {
    p.set(J.upperArmL, -1.1 - sw * 0.4, 0, 0.2);
    p.set(J.upperArmR, -1.1 + sw * 0.4, 0, -0.2);
  } else {
    p.set(J.upperArmL, -sw * 0.9, 0, 0.12);
    p.set(J.upperArmR, sw * 0.9, 0, -0.12);
    p.set(J.foreArmL, -1.3);
    p.set(J.foreArmR, -1.3);
  }
  p.y = -Math.abs(Math.cos(phase)) * 0.07 + 0.02;
  return p;
}

export function jumpPose(p: Pose, vy: number, s: Style): Pose {
  p.reset();
  const up = Math.max(0, Math.min(1, vy / 8));
  p.set(J.thighL, -1.0 * up - 0.3);
  p.set(J.thighR, -0.4 * up - 0.1);
  p.set(J.shinL, 1.5 * up + 0.4);
  p.set(J.shinR, 0.8 * up + 0.3);
  p.set(J.upperArmL, -0.6 - up * 0.8, 0, 0.3);
  p.set(J.upperArmR, 0.3 + up * 0.2, 0, -0.35);
  p.set(J.foreArmL, -0.8);
  p.set(J.foreArmR, -0.8);
  p.set(J.spine, 0.1 + s.hunch * 0.2);
  return p;
}

export function landPose(p: Pose): Pose {
  p.reset();
  p.set(J.thighL, -0.6);
  p.set(J.thighR, -0.6);
  p.set(J.shinL, 1.0);
  p.set(J.shinR, 1.0);
  p.set(J.footL, -0.35);
  p.set(J.footR, -0.35);
  p.set(J.spine, 0.3);
  p.set(J.upperArmL, 0.2, 0, 0.5);
  p.set(J.upperArmR, 0.2, 0, -0.5);
  p.y = -0.16;
  return p;
}

/** Keyframes de golpes: [preparação, impacto]. */
type Key = (p: Pose) => void;
const K: Record<string, [Key, Key]> = {
  jab: [
    (p) =>
      p
        .set(J.upperArmR, 0.2, 0, -0.2)
        .set(J.foreArmR, -2.0)
        .set(J.chest, 0, 0.25)
        .set(J.upperArmL, -0.6, 0, 0.3)
        .set(J.foreArmL, -1.8),
    (p) =>
      p
        .set(J.upperArmR, -1.55, 0.15)
        .set(J.foreArmR, -0.05)
        .set(J.chest, 0, -0.35)
        .set(J.upperArmL, -0.5, 0, 0.3)
        .set(J.foreArmL, -1.9),
  ],
  cross: [
    (p) =>
      p
        .set(J.upperArmL, 0.2, 0, 0.2)
        .set(J.foreArmL, -2.0)
        .set(J.chest, 0, -0.3)
        .set(J.upperArmR, -0.6, 0, -0.3)
        .set(J.foreArmR, -1.8),
    (p) =>
      p
        .set(J.upperArmL, -1.55, -0.3)
        .set(J.foreArmL, -0.05)
        .set(J.chest, 0, 0.45)
        .set(J.upperArmR, -0.4)
        .set(J.foreArmR, -1.9),
  ],
  hook: [
    (p) => p.set(J.upperArmR, -0.3, 0.6, -1.0).set(J.foreArmR, -1.6).set(J.chest, 0, 0.45),
    (p) =>
      p.set(J.upperArmR, -1.4, -0.7, -0.3).set(J.foreArmR, -1.3).set(J.chest, 0, -0.55).set(J.spine, 0.15),
  ],
  uppercut: [
    (p) =>
      p
        .set(J.upperArmR, 0.5, 0, -0.2)
        .set(J.foreArmR, -2.2)
        .set(J.spine, 0.35)
        .set(J.thighL, -0.5)
        .set(J.shinL, 0.8)
        .set(J.thighR, 0.2)
        .set(J.shinR, 0.4),
    (p) =>
      p
        .set(J.upperArmR, -2.8, 0.1)
        .set(J.foreArmR, -0.4)
        .set(J.spine, -0.25)
        .set(J.chest, -0.1, -0.3)
        .set(J.thighL, -0.1)
        .set(J.thighR, 0.1),
  ],
  kick: [
    (p) =>
      p
        .set(J.thighR, -1.2)
        .set(J.shinR, 1.8)
        .set(J.spine, -0.1)
        .set(J.upperArmL, -0.5, 0, 0.5)
        .set(J.upperArmR, -0.3, 0, -0.5),
    (p) =>
      p
        .set(J.thighR, -1.55)
        .set(J.shinR, 0)
        .set(J.footR, 0.4)
        .set(J.spine, -0.35)
        .set(J.thighL, 0.1)
        .set(J.upperArmL, 0.3, 0, 0.7)
        .set(J.upperArmR, 0.3, 0, -0.7),
  ],
  spinKick: [
    (p) =>
      p
        .set(J.root, 0, -1.2)
        .set(J.thighR, -0.6)
        .set(J.shinR, 1.2)
        .set(J.upperArmL, 0, 0, 1.0)
        .set(J.upperArmR, 0, 0, -1.0),
    (p) =>
      p
        .set(J.root, 0, 1.2)
        .set(J.thighR, -1.4, 0, -0.5)
        .set(J.shinR, 0.1)
        .set(J.spine, -0.3)
        .set(J.upperArmL, 0, 0, 1.3)
        .set(J.upperArmR, 0, 0, -1.3),
  ],
  flyKick: [
    (p) => p.set(J.thighR, -1.0).set(J.shinR, 1.6).set(J.thighL, -0.6).set(J.shinL, 1.8).set(J.spine, 0.2),
    (p) => {
      p.set(J.thighR, -1.5)
        .set(J.shinR, 0)
        .set(J.thighL, -0.4)
        .set(J.shinL, 1.9)
        .set(J.spine, -0.4)
        .set(J.upperArmL, 0.2, 0, 1.2)
        .set(J.upperArmR, 0.2, 0, -1.2);
      p.tilt = -0.35;
      p.y = 0.2;
    },
  ],
  airPunch: [
    (p) =>
      p
        .set(J.upperArmR, 0.2)
        .set(J.foreArmR, -2.0)
        .set(J.thighL, -1.0)
        .set(J.shinL, 1.6)
        .set(J.thighR, -0.8)
        .set(J.shinR, 1.6),
    (p) =>
      p
        .set(J.upperArmR, -1.2)
        .set(J.foreArmR, 0)
        .set(J.thighL, -1.0)
        .set(J.shinL, 1.6)
        .set(J.thighR, -0.8)
        .set(J.shinR, 1.6)
        .set(J.spine, 0.3),
  ],
  airKick: [
    (p) => p.set(J.thighR, -1.4).set(J.shinR, 2.0).set(J.thighL, -0.8).set(J.shinL, 1.6),
    (p) =>
      p
        .set(J.thighR, -0.9)
        .set(J.shinR, 0)
        .set(J.footR, 0.6)
        .set(J.thighL, -1.1)
        .set(J.shinL, 1.8)
        .set(J.spine, -0.2)
        .set(J.upperArmL, -0.8, 0, 0.8)
        .set(J.upperArmR, -0.8, 0, -0.8),
  ],
  spin: [
    (p) =>
      p
        .set(J.upperArmL, 0, 0, 1.4)
        .set(J.upperArmR, 0, 0, -1.4)
        .set(J.thighL, -0.3)
        .set(J.shinL, 0.6)
        .set(J.thighR, -0.3)
        .set(J.shinR, 0.6),
    (p) =>
      p
        .set(J.upperArmL, 0, 0, 1.55)
        .set(J.upperArmR, 0, 0, -1.55)
        .set(J.foreArmL, 0)
        .set(J.foreArmR, 0)
        .set(J.thighL, -0.3)
        .set(J.shinL, 0.6)
        .set(J.thighR, -0.3)
        .set(J.shinR, 0.6),
  ],
  slash1: [
    (p) => p.set(J.upperArmR, -2.8, 0.3).set(J.foreArmR, -0.8).set(J.chest, 0, 0.3),
    (p) => p.set(J.upperArmR, -0.9, -0.5).set(J.foreArmR, -0.2).set(J.chest, 0, -0.4).set(J.spine, 0.2),
  ],
  slash2: [
    (p) => p.set(J.upperArmR, -1.3, 1.0, -0.6).set(J.foreArmR, -1.2).set(J.chest, 0, 0.5),
    (p) => p.set(J.upperArmR, -1.4, -0.9, -0.2).set(J.foreArmR, -0.2).set(J.chest, 0, -0.6),
  ],
  slash3: [
    (p) =>
      p
        .set(J.upperArmR, -3.0)
        .set(J.foreArmR, -1.0)
        .set(J.upperArmL, -3.0)
        .set(J.foreArmL, -1.0)
        .set(J.spine, -0.2),
    (p) =>
      p
        .set(J.upperArmR, -0.8)
        .set(J.foreArmR, 0)
        .set(J.upperArmL, -0.8)
        .set(J.foreArmL, 0)
        .set(J.spine, 0.45)
        .set(J.thighL, -0.6)
        .set(J.shinL, 0.7),
  ],
  stab: [
    (p) => p.set(J.upperArmR, 0.4).set(J.foreArmR, -1.8).set(J.chest, 0, 0.3),
    (p) =>
      p
        .set(J.upperArmR, -1.55)
        .set(J.foreArmR, 0)
        .set(J.chest, 0, -0.4)
        .set(J.spine, 0.2)
        .set(J.thighL, -0.5)
        .set(J.shinL, 0.5),
  ],
  thrust: [
    (p) =>
      p.set(J.upperArmR, 0.3).set(J.foreArmR, -1.9).set(J.spine, 0.2).set(J.thighL, -0.4).set(J.shinL, 0.7),
    (p) =>
      p
        .set(J.upperArmR, -1.55)
        .set(J.foreArmR, 0)
        .set(J.spine, 0.4)
        .set(J.thighL, -0.9)
        .set(J.shinL, 0.7)
        .set(J.thighR, 0.5),
  ],
  swing1: [
    (p) =>
      p
        .set(J.upperArmR, -1.2, 1.2, -0.8)
        .set(J.foreArmR, -0.6)
        .set(J.upperArmL, -1.0, 1.0)
        .set(J.chest, 0, 0.7),
    (p) =>
      p.set(J.upperArmR, -1.4, -1.1).set(J.foreArmR, -0.2).set(J.upperArmL, -1.2, -0.8).set(J.chest, 0, -0.7),
  ],
  swing2: [
    (p) => p.set(J.upperArmR, -1.4, -1.0).set(J.foreArmR, -0.4).set(J.chest, 0, -0.6),
    (p) => p.set(J.upperArmR, -1.3, 1.0, -0.5).set(J.foreArmR, -0.1).set(J.chest, 0, 0.6),
  ],
  swing3: [
    (p) =>
      p
        .set(J.upperArmR, -3.0, 0.2)
        .set(J.foreArmR, -0.8)
        .set(J.upperArmL, -2.8)
        .set(J.foreArmL, -0.8)
        .set(J.spine, -0.25),
    (p) =>
      p
        .set(J.upperArmR, -0.7)
        .set(J.foreArmR, 0)
        .set(J.upperArmL, -0.7)
        .set(J.foreArmL, 0)
        .set(J.spine, 0.5)
        .set(J.thighL, -0.7)
        .set(J.shinL, 0.8),
  ],
  slam: [
    (p) =>
      p
        .set(J.upperArmR, -3.0)
        .set(J.foreArmR, -0.6)
        .set(J.upperArmL, -3.0)
        .set(J.foreArmL, -0.6)
        .set(J.spine, -0.3),
    (p) => {
      p.set(J.upperArmR, -0.9)
        .set(J.foreArmR, 0)
        .set(J.upperArmL, -0.9)
        .set(J.foreArmL, 0)
        .set(J.spine, 0.6)
        .set(J.thighL, -0.8)
        .set(J.shinL, 1.0)
        .set(J.thighR, 0.3);
      p.y = -0.15;
    },
  ],
  claw: [
    (p) =>
      p
        .set(J.upperArmR, -2.6, 0.3)
        .set(J.foreArmR, -0.8)
        .set(J.upperArmL, -2.4, -0.3)
        .set(J.foreArmL, -0.6)
        .set(J.spine, -0.1),
    (p) =>
      p
        .set(J.upperArmR, -1.0, -0.3)
        .set(J.foreArmR, -0.1)
        .set(J.upperArmL, -1.1, 0.3)
        .set(J.foreArmL, -0.1)
        .set(J.spine, 0.5)
        .set(J.neck, 0.3),
  ],
  lunge: [
    (p) => {
      p.set(J.thighL, -0.9)
        .set(J.shinL, 1.4)
        .set(J.thighR, -0.9)
        .set(J.shinR, 1.4)
        .set(J.spine, 0.6)
        .set(J.upperArmL, 0.4)
        .set(J.upperArmR, 0.4);
      p.y = -0.3;
    },
    (p) => {
      p.set(J.thighL, 0.4)
        .set(J.thighR, 0.6)
        .set(J.shinL, 0.3)
        .set(J.spine, 0.2)
        .set(J.upperArmL, -2.6)
        .set(J.upperArmR, -2.6);
      p.tilt = -0.9;
      p.y = 0.25;
    },
  ],
  slamGround: [
    (p) =>
      p
        .set(J.upperArmR, -3.1)
        .set(J.upperArmL, -3.1)
        .set(J.foreArmR, -0.4)
        .set(J.foreArmL, -0.4)
        .set(J.spine, -0.35)
        .set(J.chest, -0.1),
    (p) => {
      p.set(J.upperArmR, -0.7)
        .set(J.upperArmL, -0.7)
        .set(J.spine, 0.7)
        .set(J.chest, 0.2)
        .set(J.thighL, -0.9)
        .set(J.shinL, 1.1)
        .set(J.thighR, -0.9)
        .set(J.shinR, 1.1);
      p.y = -0.25;
    },
  ],
  charge: [
    (p) =>
      p
        .set(J.spine, 0.5)
        .set(J.upperArmL, -0.4, 0, 0.6)
        .set(J.upperArmR, -0.4, 0, -0.6)
        .set(J.thighL, -0.5)
        .set(J.shinL, 0.9),
    (p) =>
      p
        .set(J.spine, 0.6)
        .set(J.chest, 0.1, 0.3)
        .set(J.upperArmL, -0.5, 0, 0.8)
        .set(J.upperArmR, 0.3, 0, -0.8)
        .set(J.neck, -0.3),
  ],
  stomp: [
    (p) =>
      p
        .set(J.thighR, -1.6)
        .set(J.shinR, 1.4)
        .set(J.spine, -0.1)
        .set(J.upperArmL, 0, 0, 0.6)
        .set(J.upperArmR, 0, 0, -0.6),
    (p) => {
      p.set(J.thighR, -0.2).set(J.shinR, 0.1).set(J.thighL, -0.3).set(J.shinL, 0.6).set(J.spine, 0.3);
      p.y = -0.12;
    },
  ],
  cast: [
    (p) =>
      p
        .set(J.upperArmR, -2.4, 0.2)
        .set(J.foreArmR, -0.3)
        .set(J.upperArmL, -1.2, 0, 0.4)
        .set(J.foreArmL, -0.8)
        .set(J.spine, -0.15),
    (p) =>
      p
        .set(J.upperArmR, -1.5, 0)
        .set(J.foreArmR, 0)
        .set(J.upperArmL, -1.4, 0, 0.2)
        .set(J.foreArmL, -0.2)
        .set(J.spine, 0.15)
        .set(J.thighL, -0.4)
        .set(J.shinL, 0.5),
  ],
};

export function hasAttackPose(name: string): boolean {
  return name in K;
}

const _a = new Pose();
const _b = new Pose();

/**
 * Pose de golpe a partir do progresso: preparação durante o startup, impacto no ativo,
 * volta ao repouso na recuperação.
 */
export function attackPose(
  out: Pose,
  rest: Pose,
  name: string,
  st: number,
  startup: number,
  active: number,
  recovery: number,
): Pose {
  const k = K[name] ?? K.jab!;
  _a.copy(rest);
  k[0](_a);
  _b.copy(rest);
  k[1](_b);
  if (st < startup) {
    const t = startup > 0 ? st / startup : 1;
    return out.mix(rest, _a, easeOut(t));
  }
  if (st < startup + active) {
    const t = Math.min(1, (st - startup + 1) / Math.max(2, Math.min(4, active)));
    out.mix(_a, _b, easeOut(t));
    if (name === 'spin') {
      out.r[J.root * 3 + 1] = ((st - startup) / active) * P * 4;
    }
    return out;
  }
  const t = recovery > 0 ? (st - startup - active) / recovery : 1;
  return out.mix(_b, rest, easeInOut(Math.min(1, t)));
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function hurtPose(p: Pose, rest: Pose, t: number): Pose {
  p.copy(rest);
  const k = Math.sin(Math.min(1, t) * P);
  p.add(J.spine, -0.35 * k);
  p.add(J.neck, -0.4 * k);
  p.add(J.upperArmL, 0.4 * k, 0, 0.3 * k);
  p.add(J.upperArmR, 0.4 * k, 0, -0.3 * k);
  return p;
}

export function lyingPose(p: Pose, amount: number, facedown = false): Pose {
  p.reset();
  p.set(J.upperArmL, -2.4, 0, 0.4);
  p.set(J.upperArmR, -2.2, 0, -0.5);
  p.set(J.thighL, -0.2, 0, 0.15);
  p.set(J.thighR, 0.1, 0, -0.1);
  p.set(J.shinL, 0.4);
  p.set(J.neck, 0.2);
  p.tilt = (facedown ? 1 : -1) * (P / 2) * amount;
  p.y = 0.18 * amount;
  p.back = 0.0;
  return p;
}

export function airbornePose(p: Pose, vy: number): Pose {
  p.reset();
  p.set(J.upperArmL, -2.6, 0, 0.8);
  p.set(J.upperArmR, -2.4, 0, -0.8);
  p.set(J.thighL, -0.8);
  p.set(J.shinL, 1.2);
  p.set(J.thighR, -0.3);
  p.set(J.shinR, 0.6);
  p.set(J.spine, -0.4);
  p.tilt = -Math.min(1.2, 0.5 + Math.max(0, -vy) * 0.08);
  return p;
}
