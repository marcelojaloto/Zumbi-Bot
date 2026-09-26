import type { Entity, PlayerSlot } from './Entity';
import { isCharacter, isHostile } from './Entity';
import { Btn, emptyFrame, type InputFrame, type InputSource } from './InputFrame';
import type { World } from './World';

/**
 * Piloto automático (testes E2E e demonstração): avança para a direita, luta corpo a corpo
 * quando perto, atira de longe, cura com pouca vida e pula ondas de choque.
 */
export class Autopilot implements InputSource {
  private t = 0;
  private stuck = 0;
  private lastX = 0;
  /** Itens que não deu para pegar (ex.: vida cheia): ignorados depois de algumas tentativas. */
  private skip = new Set<number>();
  private tryId = 0;
  private tries = 0;
  /** Vigia de progresso: sem inimigos e sem avançar por muito tempo, ignora o que está perto. */
  private bestX = -Infinity;
  private idleTicks = 0;

  constructor(
    private getWorld: () => World | null,
    readonly slot: PlayerSlot = 0,
  ) {}

  sample(tick: number): InputFrame {
    const f = emptyFrame(tick);
    const w = this.getWorld();
    const p = w?.get(this.slot + 1);
    if (!w || !p?.player || p.player.respawn > 0) return f;
    this.t++;
    const pc = p.player;
    let b = 0;
    // alvo mais próximo
    let tgt: Entity | undefined;
    let bd = Infinity;
    for (const e of w.entities) {
      if (!isCharacter(e) || !isHostile(p.team, e.team) || e.fighter?.state === 'dead') continue;
      if (e.t.x < w.bounds.minX - 0.5 || e.t.x > w.bounds.maxX + 0.5) continue;
      const d = Math.abs(e.t.x - p.t.x) + Math.abs(e.t.z - p.t.z) * 1.5;
      if (d < bd) {
        bd = d;
        tgt = e;
      }
    }
    // objetos quebráveis à frente
    let prop: Entity | undefined;
    if (!tgt) {
      for (const e of w.entities) {
        if (e.kind !== 'prop' || !e.alive || this.skip.has(e.id)) continue;
        if (e.t.x > p.t.x - 0.5 && e.t.x < p.t.x + 4) prop = e;
      }
    }
    // perigo: onda de choque vindo → pular
    for (const e of w.entities) {
      const hz = e.hazard;
      if (!hz || hz.delay > 0 || hz.shape.k !== 'rect' || hz.height > 1.5 || hz.env) continue;
      const dx = e.t.x - p.t.x;
      if (Math.abs(dx) < 2.2 && Math.sign(e.t.vx) === -Math.sign(dx || 1)) b |= Btn.Jump;
    }
    // pouca vida: cura
    if (p.health!.hp < p.health!.max * 0.45 && pc.mana >= 30 && (pc.staffCd.heal ?? 0) <= 0) {
      if (pc.mode !== 'staff') b |= Btn.ModeStaff;
      else {
        const hi = pc.staffs.indexOf('heal');
        if (pc.staffIdx !== hi) b |= this.t % 2 ? Btn.Next : 0;
        else b |= Btn.Fire;
      }
      f.buttons = b;
      return f;
    }
    if (pc.mode === 'staff') b |= Btn.ModeGun;

    if (tgt || p.t.x > this.bestX + 0.5) {
      this.bestX = Math.max(this.bestX, p.t.x);
      this.idleTicks = 0;
    } else if (++this.idleTicks > 360) {
      this.idleTicks = 0;
      for (const e of w.entities)
        if ((e.kind === 'prop' || e.kind === 'pickup') && Math.abs(e.t.x - p.t.x) < 6) this.skip.add(e.id);
      prop = undefined;
    }

    if (tgt) {
      const dx = tgt.t.x - p.t.x;
      const dz = tgt.t.z - p.t.z;
      const big = tgt.kind === 'boss';
      const reach = big ? (tgt.body?.radius ?? 1) + 0.9 : 1.0;
      const want = Math.sign(dx) || 1;
      if (Math.abs(dz) > 0.35) {
        f.moveZ = Math.sign(dz);
        f.moveX = Math.abs(dx) > reach ? want : 0;
        if (Math.abs(dx) > 4 && Math.abs(dz) < 1 && this.t % 14 < 2) b |= Btn.Fire;
      } else if (Math.abs(dx) > reach) {
        f.moveX = want;
        if (Math.abs(dx) > 4 && this.t % 14 < 2) b |= Btn.Fire;
      } else if (p.t.facing !== want) {
        f.moveX = want * 0.4;
      } else {
        // combo de socos (aperta e solta)
        if (this.t % 7 === 0) b |= Btn.Punch;
        if (tgt.fighter?.state === 'windup' && big && this.t % 20 === 0) b |= Btn.Jump;
        // Giro Turbo contra chefes quando sobra mana (guarda para a cura)
        else if (big && pc.mana > 70 && this.t % 45 === 0) b |= Btn.Special;
      }
      f.aimYaw = Math.atan2(dz, dx);
      f.aimMode = 0;
    } else if (prop) {
      const dx = prop.t.x - p.t.x;
      const dz = prop.t.z - p.t.z;
      if (Math.abs(dx) > 1.0 || Math.abs(dz) > 0.4) {
        f.moveX = Math.sign(dx);
        f.moveZ = Math.abs(dz) > 0.3 ? Math.sign(dz) : 0;
      } else if (this.t % 8 === 0) b |= Btn.Punch;
    } else {
      // avança; pega itens próximos
      f.moveX = 1;
      let best: Entity | undefined;
      for (const e of w.entities) {
        if (e.kind !== 'pickup' || this.skip.has(e.id)) continue;
        if (Math.abs(e.t.x - p.t.x) < 4 && e.t.x > p.t.x - 1) best = e;
      }
      if (best) {
        const dz = best.t.z - p.t.z;
        f.moveZ = Math.abs(dz) > 0.3 ? Math.sign(dz) : 0;
        if (!best.pickup?.auto && Math.abs(best.t.x - p.t.x) < 0.8) {
          f.moveX = 0;
          if (Math.abs(dz) < 0.45 && this.t % 12 === 0) {
            b |= Btn.Punch;
            if (this.tryId !== best.id) {
              this.tryId = best.id;
              this.tries = 0;
            }
            if (++this.tries > 6) this.skip.add(best.id);
          }
        }
      } else f.moveZ = p.t.z > 0.2 ? -0.5 : p.t.z < -0.2 ? 0.5 : 0;
      if (this.t % 90 < 45) b |= Btn.Run;
    }
    // preso contra algo: pula
    if (Math.abs(p.t.x - this.lastX) < 0.001 && f.moveX !== 0) this.stuck++;
    else this.stuck = 0;
    this.lastX = p.t.x;
    if (this.stuck > 60 && this.t % 30 === 0) b |= Btn.Jump;
    f.buttons = b;
    return f;
  }
}
