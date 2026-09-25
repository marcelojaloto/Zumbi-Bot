import { impulse } from './synth';
import { SFX } from './sfx';

export type Bus = 'music' | 'sfx' | 'ui';
export type Reverb = 'room' | 'hall' | 'outdoor' | 'cave';

const REVERBS: Record<Reverb, { s: number; decay: number; mix: number }> = {
  room: { s: 0.6, decay: 3, mix: 0.12 },
  hall: { s: 2.5, decay: 2.2, mix: 0.22 },
  outdoor: { s: 1.2, decay: 4, mix: 0.08 },
  cave: { s: 3, decay: 1.8, mix: 0.3 },
};

const VARIANTS = 3;
const MAX_VOICES = 32;
const MAX_PER_ID = 4;

interface Voice {
  id: string;
  src: AudioBufferSourceNode;
  end: number;
}

/**
 * Motor de áudio: um AudioContext, barramentos (música/efeitos/interface) → master → limitador,
 * reverb por convolução gerada, efeitos pré-renderizados (OfflineAudioContext) e gestão de vozes.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses = {} as Record<Bus, GainNode>;
  private reverbSend!: GainNode;
  private convolver!: ConvolverNode;
  private buffers = new Map<string, AudioBuffer[]>();
  private baking: Promise<void> | null = null;
  private voices: Voice[] = [];
  private lastPlay = new Map<string, number>();
  private duckUntil = 0;
  volumes = { master: 0.8, music: 0.6, sfx: 0.9, ui: 0.8 };
  muted = false;
  /** Posição X da câmera e meia-largura visível (pan estéreo). */
  listenerX = 0;
  halfWidth = 7;

  constructor(private disabled = false) {}

  get ready(): boolean {
    return !!this.ctx && this.buffers.size > 0;
  }

  /** Cria/retoma o contexto (precisa de um gesto do usuário). */
  unlock(): void {
    if (this.disabled) return;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext({ latencyHint: 'interactive' });
      } catch {
        this.disabled = true;
        return;
      }
      const ctx = this.ctx;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      this.master = ctx.createGain();
      this.master.connect(limiter);
      limiter.connect(ctx.destination);
      for (const b of ['music', 'sfx', 'ui'] as Bus[]) {
        const g = ctx.createGain();
        g.connect(this.master);
        this.buses[b] = g;
      }
      this.convolver = ctx.createConvolver();
      this.reverbSend = ctx.createGain();
      this.reverbSend.connect(this.convolver);
      this.convolver.connect(this.master);
      this.setReverb('outdoor');
      this.applyVolumes();
      this.bake();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setReverb(kind: Reverb): void {
    if (!this.ctx) return;
    const r = REVERBS[kind];
    this.convolver.buffer = impulse(this.ctx, r.s, r.decay);
    this.reverbSend.gain.value = r.mix;
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const v = (x: number) => x * x;
    this.master.gain.value = this.muted ? 0 : v(this.volumes.master);
    this.buses.music.gain.value = v(this.volumes.music);
    this.buses.sfx.gain.value = v(this.volumes.sfx);
    this.buses.ui.gain.value = v(this.volumes.ui);
  }

  /** Renderiza todas as receitas em buffers (3 variações cada). */
  bake(): Promise<void> {
    if (this.baking) return this.baking;
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve();
    const sr = Math.min(ctx.sampleRate, 44100);
    this.baking = (async () => {
      for (const [id, recipe] of Object.entries(SFX)) {
        const list: AudioBuffer[] = [];
        for (let v = 0; v < VARIANTS; v++) {
          try {
            // duração estimada por uma passada "a seco" em contexto curto
            const off = new OfflineAudioContext(1, Math.ceil(sr * 2.2), sr);
            const dur = recipe(off, off.destination, 0.001, v);
            const len = Math.ceil(sr * Math.min(2.2, dur + 0.05));
            const off2 = new OfflineAudioContext(1, len, sr);
            recipe(off2, off2.destination, 0.001, v);
            list.push(await off2.startRendering());
          } catch (err) {
            console.warn('falha ao gerar som', id, err);
          }
        }
        if (list.length) this.buffers.set(id, list);
        // cede o thread entre receitas
        await new Promise((r) => setTimeout(r, 0));
      }
    })();
    return this.baking;
  }

  /** Toca um efeito. `x` = posição no mundo para pan/atenuação (omita para som de interface). */
  play(id: string, o: { x?: number; vol?: number; bus?: Bus; rate?: number; reverb?: number } = {}): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const list = this.buffers.get(id);
    if (!list || list.length === 0) return;
    const now = ctx.currentTime;
    const last = this.lastPlay.get(id) ?? -1;
    if (now - last < 0.03) return;
    this.lastPlay.set(id, now);
    this.voices = this.voices.filter((v) => v.end > now);
    const same = this.voices.filter((v) => v.id === id);
    if (same.length >= MAX_PER_ID) {
      try {
        same[0]!.src.stop();
      } catch {
        /* já parado */
      }
    }
    if (this.voices.length >= MAX_VOICES) return;
    const buf = list[Math.floor(Math.random() * list.length)]!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = (o.rate ?? 1) * (0.95 + Math.random() * 0.1);
    const g = ctx.createGain();
    let vol = o.vol ?? 1;
    let pan = 0;
    if (o.x !== undefined) {
      const dx = (o.x - this.listenerX) / this.halfWidth;
      pan = Math.max(-1, Math.min(1, dx)) * 0.8;
      vol *= Math.max(0.15, 1 - Math.max(0, Math.abs(dx) - 1) * 0.6);
    }
    g.gain.value = vol;
    src.connect(g);
    let out: AudioNode = g;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    const bus = this.buses[o.bus ?? 'sfx'];
    out.connect(bus);
    if ((o.reverb ?? 1) > 0 && o.bus !== 'ui') {
      const send = ctx.createGain();
      send.gain.value = o.reverb ?? 1;
      out.connect(send);
      send.connect(this.reverbSend);
    }
    src.start();
    this.voices.push({ id, src, end: now + buf.duration / src.playbackRate.value });
  }

  /** Abaixa a música brevemente (explosões, rugidos). */
  duck(amount = 0.5, seconds = 0.35): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now < this.duckUntil) return;
    this.duckUntil = now + seconds;
    const g = this.buses.music.gain;
    const base = this.volumes.music * this.volumes.music;
    g.cancelScheduledValues(now);
    g.setValueAtTime(base * amount, now);
    g.linearRampToValueAtTime(base, now + seconds);
  }

  musicBus(): GainNode | null {
    return this.ctx ? this.buses.music : null;
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }
}
