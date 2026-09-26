import type { Entity, EntityId } from '../sim/Entity';
import type { World } from '../sim/World';

/**
 * Estado do mundo que o anfitrião manda aos outros jogadores (~20 vezes por segundo).
 *
 * Só vai o que a tela precisa (sem a "memória" da IA, listas de acertos, entradas do tick anterior...), com números
 * arredondados, e só o que mudou desde o último envio: entidades novas vão inteiras, as que já existiam mandam só os
 * campos alterados (dois níveis: componente → campo) e as que sumiram vão numa lista de ids.
 */

type Obj = Record<string, unknown>;

/** Alterações de um objeto: `s` troca valores, `p` altera objetos internos, `d` apaga chaves. */
export interface Patch {
  s?: Obj;
  p?: Record<string, Patch>;
  d?: string[];
}

export interface SnapDelta {
  /** Tick do anfitrião. */
  k: number;
  /** Quadro completo (o cliente descarta o que tinha). */
  f?: 1;
  /** Dados do mundo (câmera, trava, faixa, fim de fase, progresso da fase). */
  m?: Patch;
  /** Entidades novas (inteiras). */
  a?: Obj[];
  /** Entidades alteradas: [id, alterações]. */
  u?: [EntityId, Patch][];
  /** Entidades removidas. */
  r?: EntityId[];
}

/** Campos que a tela não usa (ou que o cliente recria) — não viajam pela rede. */
const STRIP: Record<string, readonly string[]> = {
  t: ['px', 'py', 'pz'],
  fighter: ['hitSet', 'buffer', 'bufferTicks'],
  health: ['poiseTimer', 'lastHitBy', 'lastHitType', 'sinceHit'],
  player: [
    'prevButtons',
    'prevMoveX',
    'coyote',
    'jumpBuffer',
    'tapRun',
    'tapDir',
    'tapTick',
    'mash',
    'lastFireTick',
    'manaDelay',
    'aimTicks',
  ],
  boss: [
    'steps',
    'pc',
    'stepTick',
    'stepData',
    'cooldowns',
    'idle',
    'addsTimer',
    'cycleTimer',
    'cycleIdx',
    'lastPattern',
    'markX',
    'markZ',
    'chargeHits',
  ],
  projectile: ['hitSet', 'hit', 'onImpact', 'falloff', 'homingTarget', 'ox', 'oz', 'crit', 'fuse', 'turnAt'],
  hazard: ['hitSet', 'hit', 'tickAcc'],
};

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Cópia com números arredondados (2 casas). */
function copy(v: unknown): unknown {
  if (typeof v === 'number') return Number.isFinite(v) ? round(v) : null;
  if (Array.isArray(v)) return v.map(copy);
  if (v && typeof v === 'object') {
    const o: Obj = {};
    for (const [k, x] of Object.entries(v as Obj)) if (x !== undefined) o[k] = copy(x);
    return o;
  }
  return v;
}

/** Versão "de rede" de uma entidade. */
export function reduceEntity(e: Entity): Obj {
  const out: Obj = {};
  for (const [k, v] of Object.entries(e)) {
    if (v === undefined || k === 'age') continue;
    if (k === 'ai') {
      // a tela só usa o golpe sendo preparado (aviso de ataque)
      out.ai = { attackId: (v as Entity['ai'])!.attackId };
      continue;
    }
    if (k === 'statuses') {
      out.statuses = (v as NonNullable<Entity['statuses']>).map((s) => ({
        id: s.id,
        ticks: s.ticks,
        stacks: s.stacks,
      }));
      continue;
    }
    const c = copy(v);
    const strip = STRIP[k];
    if (strip && c && typeof c === 'object') for (const f of strip) delete (c as Obj)[f];
    out[k] = c;
  }
  return out;
}

/** Dados do mundo fora das entidades que a tela usa. */
export function worldMeta(w: World): Obj {
  const ls = w.levelState;
  return copy({
    camX: w.camX,
    lock: w.lock,
    zBand: w.zBand,
    finished: w.finished,
    finishedTick: w.finishedTick,
    slowmo: w.slowmo,
    ls: {
      segmentIdx: ls.segmentIdx,
      active: ls.active,
      cleared: ls.cleared,
      bossSpawned: ls.bossSpawned,
      bossId: ls.bossId,
      bossDead: ls.bossDead,
      timeTicks: ls.timeTicks,
    },
  }) as Obj;
}

function isObj(v: unknown): v is Obj {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    if (a.length !== bb.length) return false;
    for (let i = 0; i < a.length; i++) if (!same(a[i], bb[i])) return false;
    return true;
  }
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (!same((a as Obj)[k], (b as Obj)[k])) return false;
  return true;
}

/** Diferença de `a` para `b`, descendo até `depth` níveis em objetos; null = iguais. */
export function diff(a: Obj, b: Obj, depth: number): Patch | null {
  let s: Obj | undefined;
  let p: Record<string, Patch> | undefined;
  let d: string[] | undefined;
  for (const k of Object.keys(b)) {
    const av = a[k];
    const bv = b[k];
    if (av === bv) continue;
    if (depth > 0 && isObj(av) && isObj(bv)) {
      const sub = diff(av, bv, depth - 1);
      if (sub) (p ??= {})[k] = sub;
    } else if (!same(av, bv)) (s ??= {})[k] = bv;
  }
  for (const k of Object.keys(a)) if (!(k in b)) (d ??= []).push(k);
  if (!s && !p && !d) return null;
  const out: Patch = {};
  if (s) out.s = s;
  if (p) out.p = p;
  if (d) out.d = d;
  return out;
}

export function applyPatch(o: Obj, p: Patch): void {
  if (p.s) for (const k of Object.keys(p.s)) o[k] = p.s[k];
  if (p.p)
    for (const k of Object.keys(p.p)) {
      if (!isObj(o[k])) o[k] = {};
      applyPatch(o[k] as Obj, p.p[k]!);
    }
  if (p.d) for (const k of p.d) delete o[k];
}

/** Anfitrião: lembra o último estado enviado e gera só as diferenças. */
export class SnapshotEncoder {
  private last = new Map<EntityId, Obj>();
  private meta: Obj | null = null;

  /** Próximo envio será um quadro completo (ex.: alguém entrou). */
  reset(): void {
    this.last.clear();
    this.meta = null;
  }

  encode(w: World): SnapDelta {
    const out: SnapDelta = { k: w.tick };
    if (!this.meta) out.f = 1;
    const meta = worldMeta(w);
    if (this.meta) {
      const m = diff(this.meta, meta, 2);
      if (m) out.m = m;
    } else out.m = { s: meta };
    this.meta = meta;
    const seen = new Set<EntityId>();
    for (const e of w.entities) {
      seen.add(e.id);
      const now = reduceEntity(e);
      const prev = this.last.get(e.id);
      this.last.set(e.id, now);
      if (!prev) (out.a ??= []).push(now);
      else {
        const p = diff(prev, now, 2);
        if (p) (out.u ??= []).push([e.id, p]);
      }
    }
    for (const id of this.last.keys())
      if (!seen.has(id)) {
        this.last.delete(id);
        (out.r ??= []).push(id);
      }
    return out;
  }
}

/** Completa os campos que não viajam pela rede (listas vazias, posição anterior = atual). */
function fill(e: Entity): void {
  const t = e.t;
  if (t.px === undefined) {
    t.px = t.x;
    t.py = t.y;
    t.pz = t.z;
  }
  if (e.fighter && !e.fighter.hitSet) e.fighter.hitSet = [];
  if (e.projectile && !e.projectile.hitSet) e.projectile.hitSet = [];
  if (e.hazard && !e.hazard.hitSet) e.hazard.hitSet = [];
  if (e.age === undefined) e.age = 0;
}

/**
 * Cliente: aplica os estados recebidos no mundo "espelho" (que não roda a simulação, só mostra).
 * Devolve os ids das entidades novas (sem posição anterior para interpolar).
 */
export function applyDelta(w: World, d: SnapDelta): Set<EntityId> {
  const added = new Set<EntityId>();
  if (d.f) {
    w.entities = [];
    w.byId.clear();
    w.players = [];
  }
  w.tick = d.k;
  if (d.m) {
    const meta = worldMeta(w);
    applyPatch(meta, d.m);
    const ls = meta.ls as Obj;
    w.camX = meta.camX as number;
    w.lock = (meta.lock as World['lock']) ?? null;
    w.zBand = meta.zBand as [number, number];
    w.finished = (meta.finished as World['finished']) ?? null;
    w.finishedTick = meta.finishedTick as number;
    w.slowmo = meta.slowmo as number;
    Object.assign(w.levelState, ls);
  }
  if (d.r) for (const id of d.r) w.remove(id);
  if (d.a)
    for (const o of d.a) {
      const e = o as unknown as Entity;
      if (w.byId.has(e.id)) w.remove(e.id);
      fill(e);
      w.entities.push(e);
      w.byId.set(e.id, e);
      if (e.kind === 'player') w.players.push(e.id);
      added.add(e.id);
    }
  if (d.u)
    for (const [id, p] of d.u) {
      const e = w.byId.get(id);
      if (!e) continue;
      applyPatch(e as unknown as Obj, p);
      fill(e);
    }
  if (d.a) {
    w.entities.sort((a, b) => a.id - b.id);
    w.players.sort((a, b) => a - b);
  }
  w.updateBounds();
  return added;
}
