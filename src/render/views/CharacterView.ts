import {
  Color,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  type MeshLambertMaterial,
} from 'three';
import { lerp } from '../../core/math';
import { MOVES } from '../../data/melee';
import { ENEMIES } from '../../data/enemies';
import { STATUS } from '../../data/statusEffects';
import type { Entity } from '../../sim/Entity';
import { buildRig, disposeInstance, instantiate, type RigInstance, type RigSpec } from '../rig/RigBuilder';
import { J, JOINT_COUNT } from '../rig/skeleton';
import {
  Pose,
  airbornePose,
  attackPose,
  hasAttackPose,
  hurtPose,
  idlePose,
  jumpPose,
  landPose,
  lyingPose,
  runPose,
  walkPose,
  type Style,
} from '../rig/poses';
import { DJ } from '../rig/rigs';

/** Rotação base: 3/4 de perfil voltado levemente para a câmera. */
export const BASE_YAW = Math.PI / 2 - 0.35;

const _c = new Color();
let iceGeo: IcosahedronGeometry | null = null;
let iceMat: MeshStandardMaterial | null = null;

export interface AnimInfo {
  pose: string;
  startup: number;
  active: number;
  recovery: number;
  /** Relógio próprio da pose (chefes); senão usa fighter.st. */
  st?: number;
  /** Aplica mesmo fora dos estados de ataque. */
  force?: boolean;
}

/** Visual de um personagem: rig animado, tinta de status, flash de dano, gelo, itens na mão. */
export class CharacterView {
  readonly group = new Group();
  readonly yaw = new Object3D();
  readonly tilt = new Object3D();
  readonly rig: RigInstance;
  readonly style: Style;
  readonly isDrone: boolean;
  private cur = new Pose();
  private tgt = new Pose();
  private rest = new Pose();
  private phase = 0;
  private lastX = 0;
  private lastZ = 0;
  flash = 0;
  private ice: Mesh | null = null;
  heldKey = '';
  sink = 0;
  time = Math.random() * 10;
  scale = 1;
  /** Mira do braço (rad no plano XZ, mundo) ou null. */
  aim: number | null = null;
  hidden = false;

  constructor(spec: RigSpec, standardMat: boolean, style: Style, scale = 1) {
    this.rig = instantiate(buildRig(spec), standardMat);
    this.style = style;
    this.isDrone = spec.key.startsWith('drone');
    this.scale = scale;
    this.group.add(this.yaw);
    this.yaw.rotation.y = BASE_YAW;
    this.yaw.add(this.tilt);
    this.tilt.add(this.rig.root);
    this.group.scale.setScalar(scale);
    for (const b of this.rig.bones) b.rotation.order = 'YXZ';
  }

  get height(): number {
    return this.rig.built.spec.height * this.scale;
  }

  socket(name: string): Object3D | undefined {
    return this.rig.sockets[name];
  }

  /** Posiciona e anima a partir do estado do sim (interpolado por alpha). */
  sync(e: Entity, alpha: number, dt: number, info: AnimInfo | null): void {
    const t = e.t;
    const x = lerp(t.px, t.x, alpha);
    const y = lerp(t.py, t.y, alpha);
    const z = lerp(t.pz, t.z, alpha);
    this.group.position.set(x, y - this.sink, z);
    this.group.scale.set(this.scale * t.facing, this.scale, this.scale);
    this.time += dt;

    const dx = x - this.lastX;
    const dz = z - this.lastZ;
    this.lastX = x;
    this.lastZ = z;
    const dist = Math.hypot(dx, dz);

    if (this.isDrone) {
      this.animateDrone(e, dt);
    } else {
      this.animateHumanoid(e, dt, dist, info);
    }
    this.updateMaterial(e, dt);
  }

  private animateDrone(e: Entity, dt: number): void {
    const b = this.rig.bones;
    const dead = e.fighter?.state === 'dead';
    b[DJ.rotorL]!.rotation.y += dt * (dead ? 2 : 40);
    b[DJ.rotorR]!.rotation.y -= dt * (dead ? 2 : 40);
    b[DJ.body]!.rotation.z = -e.t.vx * 0.06 * e.t.facing;
    b[DJ.body]!.rotation.x = dead ? 0.8 : Math.sin(this.time * 3) * 0.08;
    b[DJ.body]!.position.y = 0.3 + (dead ? 0 : Math.sin(this.time * 2.4) * 0.05);
    if (e.fighter?.state === 'windup') b[DJ.eye]!.scale.setScalar(1 + Math.sin(this.time * 40) * 0.3);
    else b[DJ.eye]!.scale.setScalar(1);
  }

  private animateHumanoid(e: Entity, dt: number, dist: number, info: AnimInfo | null): void {
    const fi = e.fighter;
    let state: string = fi?.state ?? 'idle';
    const st = info?.st ?? fi?.st ?? 0;
    if (info?.force && state !== 'dead' && state !== 'knockdown' && state !== 'down' && state !== 'attack')
      state = 'windup';
    const speed = dist / Math.max(dt, 1e-4);
    const grounded = e.body?.grounded ?? true;

    // pose de repouso (locomoção)
    if (speed > 0.25 && grounded) {
      this.phase += (dist / (speed > 5 ? 1.5 : 1.05)) * Math.PI;
      if (speed > 5.2) runPose(this.rest, this.phase, this.style);
      else walkPose(this.rest, this.phase, Math.min(1, speed / 3.5), this.style);
    } else {
      idlePose(this.rest, this.time, this.style);
    }

    let rate = 14;
    switch (state) {
      case 'attack':
      case 'windup':
      case 'cast':
        if (info && hasAttackPose(info.pose)) {
          attackPose(this.tgt, this.rest, info.pose, st, info.startup, info.active, info.recovery);
          rate = 30;
        } else this.tgt.copy(this.rest);
        break;
      case 'hurt':
        hurtPose(this.tgt, this.rest, st / 14);
        rate = 30;
        break;
      case 'knockdown':
        airbornePose(this.tgt, e.t.vy);
        rate = 16;
        break;
      case 'down':
        lyingPose(this.tgt, 1);
        rate = 16;
        break;
      case 'getup':
        lyingPose(this.tgt, Math.max(0, 1 - st / 16));
        rate = 20;
        break;
      case 'dead':
        lyingPose(this.tgt, 1);
        rate = 12;
        break;
      case 'frozen':
        return; // mantém a pose congelada
      case 'stunned':
        idlePose(this.tgt, this.time, this.style);
        this.tgt.add(J.spine, 0.25, 0, Math.sin(this.time * 8) * 0.15);
        this.tgt.add(J.neck, 0.4, Math.sin(this.time * 6) * 0.4);
        break;
      case 'stagger':
        hurtPose(this.tgt, this.rest, 0.5);
        this.tgt.add(J.spine, -0.2, 0, Math.sin(this.time * 10) * 0.1);
        break;
      case 'jump':
      case 'fall':
        jumpPose(this.tgt, e.t.vy, this.style);
        rate = 12;
        break;
      case 'land':
        landPose(this.tgt);
        rate = 30;
        break;
      case 'spawn':
        lyingPose(this.tgt, Math.max(0, 1 - st / 40), true);
        this.tgt.y -= Math.max(0, 1 - st / 40) * 1.2;
        break;
      default:
        this.tgt.copy(this.rest);
        break;
    }

    const k = 1 - Math.exp(-dt * rate);
    this.cur.lerp(this.tgt, k);
    if (state === 'attack' || state === 'windup') this.cur.lerp(this.tgt, 0.5);

    // camada de mira (braço direito aponta para a mira)
    if (
      this.aim !== null &&
      (state === 'idle' ||
        state === 'walk' ||
        state === 'run' ||
        state === 'jump' ||
        state === 'fall' ||
        state === 'land')
    ) {
      const facing = e.t.facing;
      const ax = Math.cos(this.aim) * facing;
      const az = Math.sin(this.aim);
      // direção no espaço do modelo (desfaz a rotação base)
      const lx = ax * Math.cos(-BASE_YAW) + az * Math.sin(-BASE_YAW);
      const lz = -ax * Math.sin(-BASE_YAW) + az * Math.cos(-BASE_YAW);
      const yaw = Math.atan2(lx, lz);
      const r = this.cur.r;
      r[J.upperArmR * 3] = -1.55;
      r[J.upperArmR * 3 + 1] = yaw * 0.7;
      r[J.upperArmR * 3 + 2] = 0;
      r[J.foreArmR * 3] = -0.05;
      r[J.chest * 3 + 1] = yaw * 0.3;
      r[J.upperArmL * 3] = -1.3;
      r[J.upperArmL * 3 + 1] = yaw * 0.5 - 0.5;
      r[J.foreArmL * 3] = -0.5;
    }
    this.applyPose();
  }

  private applyPose(): void {
    const b = this.rig.bones;
    const r = this.cur.r;
    for (let j = 0; j < JOINT_COUNT && j < b.length; j++) {
      b[j]!.rotation.set(r[j * 3]!, r[j * 3 + 1]!, r[j * 3 + 2]!);
    }
    this.tilt.rotation.x = this.cur.tilt;
    this.tilt.position.y = this.cur.y + Math.abs(Math.sin(this.cur.tilt)) * 0.12;
    this.tilt.position.z = Math.abs(Math.sin(this.cur.tilt)) * 0.85 * Math.sign(-this.cur.tilt || 1);
  }

  private updateMaterial(e: Entity, dt: number): void {
    const mat = this.rig.material as MeshStandardMaterial | MeshLambertMaterial;
    this.flash = Math.max(0, this.flash - dt * 9);
    _c.setRGB(0, 0, 0);
    const statuses = e.statuses;
    let frozen = false;
    if (statuses && statuses.length > 0) {
      for (const s of statuses) {
        const def = STATUS[s.id];
        if (s.id === 'freeze') frozen = true;
        if (def.tint !== undefined) {
          const pulse = s.id === 'burn' ? 0.35 + Math.sin(this.time * 18) * 0.15 : 0.22;
          _c.r += (((def.tint >> 16) & 255) / 255) * pulse;
          _c.g += (((def.tint >> 8) & 255) / 255) * pulse;
          _c.b += ((def.tint & 255) / 255) * pulse;
        }
      }
    }
    if (e.player && e.health && e.health.invuln > 0 && e.fighter?.state !== 'attack') {
      const blink = Math.sin(this.time * 30) > 0 ? 0.25 : 0;
      _c.r += blink;
      _c.g += blink;
      _c.b += blink;
    }
    if (e.player && e.player.powers.invulnerable > 0) {
      const k = 0.35 + Math.sin(this.time * 12) * 0.15;
      _c.r += k;
      _c.g += k * 0.8;
      _c.b += k * 0.3;
    }
    if (e.player && e.player.powers.doubleDamage > 0) _c.r += 0.25 + Math.sin(this.time * 10) * 0.1;
    if (this.flash > 0) {
      _c.r += this.flash;
      _c.g += this.flash;
      _c.b += this.flash;
    }
    mat.emissive.copy(_c);
    this.setIce(frozen);
  }

  private setIce(on: boolean): void {
    if (on && !this.ice) {
      iceGeo ??= new IcosahedronGeometry(1, 1);
      iceMat ??= new MeshStandardMaterial({
        color: 0xbfefff,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.1,
        flatShading: true,
        emissive: 0x3a7a9a,
      });
      this.ice = new Mesh(iceGeo, iceMat);
      const h = this.rig.built.spec.height;
      this.ice.scale.set(0.55, h * 0.55, 0.5);
      this.ice.position.y = h * 0.5;
      this.yaw.add(this.ice);
    } else if (!on && this.ice) {
      this.yaw.remove(this.ice);
      this.ice = null;
    }
  }

  /** Coloca um objeto na mão direita (arma, cajado). */
  setHeld(key: string, obj: Object3D | null, socket = 'handR'): void {
    if (key === this.heldKey) return;
    for (const s of ['handR', 'staffR']) {
      const so = this.rig.sockets[s];
      if (!so) continue;
      for (const c of [...so.children]) so.remove(c);
    }
    this.heldKey = key;
    if (obj) this.rig.sockets[socket]?.add(obj);
  }

  dispose(): void {
    disposeInstance(this.rig);
  }
}

/** Informação de animação de golpe para o estado atual. */
export function animInfoFor(e: Entity, tick = 0): AnimInfo | null {
  const fi = e.fighter;
  if (!fi) return null;
  const b = e.boss;
  if (b && b.pose && fi.state !== 'attack') {
    const el = tick - b.poseStart;
    if (b.intro > 0 || el < b.poseTicks) {
      const T = Math.max(8, b.poseTicks);
      return {
        pose: b.pose,
        startup: Math.round(T * 0.45),
        active: Math.round(T * 0.35),
        recovery: Math.round(T * 0.2),
        st: el,
        force: true,
      };
    }
  }
  if (fi.state === 'attack' && fi.moveId) {
    const m = MOVES[fi.moveId];
    if (m) return { pose: m.pose, startup: m.startup, active: m.active, recovery: m.recovery };
  }
  if (fi.state === 'windup' && e.ai?.attackId && e.kind === 'enemy') {
    const def = ENEMIES[e.defId];
    const atk = def?.attacks.find((a) => a.id === e.ai!.attackId);
    if (atk) {
      const pose =
        atk.move?.pose ??
        (atk.kind === 'ranged' || atk.kind === 'burst' || atk.kind === 'minigun' ? 'cast' : 'claw');
      return { pose, startup: atk.windup, active: 999, recovery: 0 };
    }
  }
  if (fi.state === 'cast') return { pose: 'cast', startup: 6, active: 8, recovery: 10 };
  return null;
}
