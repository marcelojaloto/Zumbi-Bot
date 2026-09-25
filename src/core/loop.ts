import { DT } from './time';

export interface LoopOptions {
  step(): void;
  render(alpha: number, frameDt: number): void;
  maxSteps?: number;
  /** Injeção para testes. */
  raf?: (cb: (t: number) => void) => number;
  caf?: (id: number) => void;
}

/**
 * Loop de passo fixo (60 Hz) com renderização interpolada.
 * A simulação avança em passos de DT; o render recebe `alpha` ∈ [0,1) para interpolar.
 */
export class FixedStepLoop {
  timeScale = 1;
  paused = false;
  private acc = 0;
  private last = -1;
  private rafId = 0;
  private running = false;
  private readonly maxSteps: number;
  private readonly raf: (cb: (t: number) => void) => number;
  private readonly caf: (id: number) => void;

  constructor(private readonly o: LoopOptions) {
    this.maxSteps = o.maxSteps ?? 5;
    this.raf = o.raf ?? ((cb) => requestAnimationFrame(cb));
    this.caf = o.caf ?? ((id) => cancelAnimationFrame(id));
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = -1;
    this.rafId = this.raf(this.frame);
  }

  stop(): void {
    this.running = false;
    this.caf(this.rafId);
  }

  resetAccumulator(): void {
    this.acc = 0;
    this.last = -1;
  }

  /** Avança N passos imediatamente (debug / testes). */
  stepOnce(n = 1): void {
    for (let i = 0; i < n; i++) this.o.step();
  }

  /** Processa um intervalo de tempo real; retorna quantos passos foram executados. Exposto para testes. */
  advance(frameDt: number): number {
    const dt = Math.min(Math.max(frameDt, 0), 0.25);
    if (!this.paused) this.acc += dt * this.timeScale;
    let steps = 0;
    while (this.acc >= DT && steps < this.maxSteps) {
      this.o.step();
      this.acc -= DT;
      steps++;
    }
    if (steps >= this.maxSteps && this.acc >= DT) this.acc = 0; // evita espiral da morte
    return steps;
  }

  get alpha(): number {
    return this.acc / DT;
  }

  private frame = (t: number): void => {
    if (!this.running) return;
    const frameDt = this.last < 0 ? DT : (t - this.last) / 1000;
    this.last = t;
    this.advance(frameDt);
    this.o.render(this.alpha, frameDt);
    this.rafId = this.raf(this.frame);
  };
}
