import { getMusic } from '../data/music';
import type { MusicDef, MusicId } from '../data/types';
import type { AudioEngine } from './AudioEngine';
import { noiseBuffer } from './synth';

/** 0 = exploração, 1 = combate (segmento travado), 2 = chefe. */
export type Intensity = 0 | 1 | 2;

const LOOKAHEAD = 0.18;
const TICK_MS = 30;

const midiHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Hash determinístico (mulberry32) para a melodia: frases repetem a cada 4 compassos. */
function rand(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

interface Track {
  def: MusicDef;
  out: GainNode;
  drums: GainNode;
  bass: GainNode;
  pad: GainNode;
  lead: GainNode;
  padFilter: BiquadFilterNode;
  nodes: AudioNode[];
}

/**
 * Música procedural: sequenciador de semicolcheias agendado à frente no relógio do áudio.
 * Cada mapa define BPM, escala, progressão de acordes e padrões; a intensidade liga camadas
 * (bateria completa, baixo, melodia) e acelera o andamento na luta contra o chefe.
 */
export class MusicPlayer {
  private track: Track | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private intensity: Intensity = 0;
  private current: MusicId | null = null;

  constructor(private engine: AudioEngine) {}

  get playing(): MusicId | null {
    return this.current;
  }

  play(id: MusicId, intensity: Intensity = 0): void {
    const ctx = this.engine.ctx;
    this.intensity = intensity;
    if (!ctx) {
      this.current = id;
      return;
    }
    if (this.current === id && this.track) {
      this.applyMix(0.8);
      return;
    }
    this.fadeOut(1.2);
    this.current = id;
    this.track = this.build(getMusic(id));
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.applyMix(0.01);
    const out = this.track.out.gain;
    out.setValueAtTime(0.0001, ctx.currentTime);
    out.exponentialRampToValueAtTime(0.6, ctx.currentTime + 1.5);
    this.timer ??= setInterval(() => this.tick(), TICK_MS);
  }

  /** Retoma a trilha pedida antes de o áudio ser destravado (primeiro gesto do usuário). */
  resume(): void {
    if (this.current && !this.track && this.engine.ctx) {
      const id = this.current;
      this.current = null;
      this.play(id, this.intensity);
    }
  }

  /** Pausa: música abafada e mais baixa. */
  muffle(on: boolean): void {
    const ctx = this.engine.ctx;
    const tr = this.track;
    if (!ctx || !tr) return;
    const g = tr.out.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(0.0001, g.value), ctx.currentTime);
    g.linearRampToValueAtTime(on ? 0.22 : 0.6, ctx.currentTime + 0.3);
  }

  setIntensity(i: Intensity): void {
    if (i === this.intensity) return;
    this.intensity = i;
    this.applyMix(i === 2 ? 0.3 : 1.2);
  }

  stop(fadeS = 1.5): void {
    this.fadeOut(fadeS);
    this.current = null;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private fadeOut(s: number): void {
    const ctx = this.engine.ctx;
    const tr = this.track;
    this.track = null;
    if (!ctx || !tr) return;
    const g = tr.out.gain;
    g.cancelScheduledValues(ctx.currentTime);
    g.setValueAtTime(Math.max(0.0001, g.value), ctx.currentTime);
    g.exponentialRampToValueAtTime(0.0001, ctx.currentTime + s);
    setTimeout(
      () => {
        for (const n of tr.nodes) n.disconnect();
      },
      (s + 1.5) * 1000,
    );
  }

  private build(def: MusicDef): Track {
    const ctx = this.engine.ctx!;
    const bus = this.engine.musicBus()!;
    const out = ctx.createGain();
    out.connect(bus);
    const rv = this.engine.reverbInput();
    const send = ctx.createGain();
    send.gain.value = 0.22;
    out.connect(send);
    if (rv) send.connect(rv);
    const mk = () => {
      const g = ctx.createGain();
      g.connect(out);
      return g;
    };
    const drums = mk();
    const bass = mk();
    const pad = mk();
    const lead = mk();
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 900;
    padFilter.connect(pad);
    // eco da melodia (colcheia pontuada)
    const delay = ctx.createDelay(1);
    delay.delayTime.value = (60 / def.bpm) * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    lead.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(out);
    return {
      def,
      out,
      drums,
      bass,
      pad,
      lead,
      padFilter,
      nodes: [out, send, drums, bass, pad, lead, padFilter, delay, fb, wet],
    };
  }

  /** Volumes das camadas conforme a intensidade. */
  private applyMix(rampS: number): void {
    const ctx = this.engine.ctx;
    const tr = this.track;
    if (!ctx || !tr) return;
    const i = this.intensity;
    const t = ctx.currentTime;
    const set = (g: GainNode, v: number) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(v, t + rampS);
    };
    set(tr.drums, [0.45, 0.9, 1][i]!);
    set(tr.bass, [0.55, 0.85, 1][i]!);
    set(tr.pad, [1, 0.8, 0.7][i]!);
    set(tr.lead, [0.55, 0.85, 1][i]!);
    tr.padFilter.frequency.setTargetAtTime([800, 1100, 1700][i]!, t, 0.5);
  }

  private stepDur(def: MusicDef): number {
    const bpm = this.intensity === 2 ? (def.bossBpm ?? def.bpm * 1.2) : def.bpm;
    return 60 / bpm / 4;
  }

  private tick(): void {
    const ctx = this.engine.ctx;
    const tr = this.track;
    if (!ctx || !tr) return;
    if (ctx.state !== 'running') return;
    // aba em segundo plano: não acumula notas atrasadas
    if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      const d = this.stepDur(tr.def);
      this.schedule(tr, this.step, this.nextTime, d);
      this.nextTime += d;
      this.step++;
    }
  }

  private schedule(tr: Track, step: number, t: number, d: number): void {
    const def = tr.def;
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const i = this.intensity;
    const deg = def.progression[bar % def.progression.length]!;
    const note = (k: number) => {
      const n = def.scale.length;
      return def.root + def.scale[k % n]! + 12 * Math.floor(k / n);
    };
    const chord = [note(deg), note(deg + 2), note(deg + 4)];

    // bateria
    const kick = def.drums.kick[s]! || (i === 2 && s % 4 === 0 ? 1 : 0);
    if (kick && (i > 0 || s === 0 || s === 8)) this.kick(tr, t, kick);
    const snare = def.drums.snare[s]!;
    if (snare && i > 0) this.snare(tr, t, snare);
    const hat = def.drums.hat[s]!;
    if (hat && (i > 0 || s % 4 === 2)) this.hat(tr, t, hat);

    // baixo
    const b = def.bass[s]!;
    if (b >= 0 && (i > 0 || s % 8 === 0)) {
      const root = chord[0]! - 12;
      const m = b === 0 ? root : b === 1 ? chord[2]! - 12 : b === 2 ? root + 12 : chord[1]! - 12;
      this.bass(tr, t, m, d * (i === 0 ? 3.5 : 1.6));
    }

    // acorde no início do compasso
    if (s === 0) this.pad(tr, t, chord, d * 16);

    // melodia
    const phrase = bar % 4;
    const r = rand(def.lead.seed * 1000 + phrase * 37 + s);
    const dens = def.lead.density * [0.45, 1, 1.35][i]!;
    if ((s % 2 === 0 || i === 2) && r < dens) {
      const r2 = rand(def.lead.seed * 7 + phrase * 13 + s * 5);
      const chordTone = r2 < 0.6;
      const k = chordTone ? deg + [0, 2, 4][Math.floor(r2 * 5) % 3]! : deg + Math.floor(r2 * 7);
      const m = note(k) + 12 * (def.lead.octave - 1);
      const len = rand(def.lead.seed + s * 3 + phrase) < 0.3 ? 4 : 2;
      this.lead(tr, t, m, d * len, def.lead.wave);
    }
  }

  // ------------------------------------------------------------------ instrumentos
  private kick(tr: Track, t: number, v: number): void {
    const ctx = this.engine.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.75 * (v === 2 ? 1 : 0.8), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g);
    g.connect(tr.drums);
    o.start(t);
    o.stop(t + 0.4);
  }

  private snare(tr: Track, t: number, v: number): void {
    const ctx = this.engine.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 'white', 1);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1900;
    f.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.32 * (v === 2 ? 1 : 0.6), t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    src.connect(f);
    f.connect(g);
    g.connect(tr.drums);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.22);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.18, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g2);
    g2.connect(tr.drums);
    o.start(t);
    o.stop(t + 0.12);
  }

  private hat(tr: Track, t: number, v: number): void {
    const ctx = this.engine.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, 'white', 1);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1 * (v === 2 ? 1.4 : 1), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (v === 2 ? 0.09 : 0.045));
    src.connect(f);
    f.connect(g);
    g.connect(tr.drums);
    src.start(t, Math.random() * 0.8);
    src.stop(t + 0.1);
  }

  private bass(tr: Track, t: number, m: number, dur: number): void {
    const ctx = this.engine.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = midiHz(m);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 5;
    f.frequency.setValueAtTime(260 + this.intensity * 220, t);
    f.frequency.exponentialRampToValueAtTime(140, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.006);
    g.gain.setTargetAtTime(0.13, t + 0.02, 0.08);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.85, 0.03);
    o.connect(f);
    f.connect(g);
    g.connect(tr.bass);
    o.start(t);
    o.stop(t + dur + 0.2);
  }

  private pad(tr: Track, t: number, chord: number[], dur: number): void {
    const ctx = this.engine.ctx!;
    const def = tr.def;
    for (const m of chord) {
      for (const cents of [-def.pad.detune, def.pad.detune]) {
        const o = ctx.createOscillator();
        o.type = def.pad.wave;
        o.frequency.value = midiHz(m);
        o.detune.value = cents;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.028, t + Math.min(0.8, dur * 0.3));
        g.gain.setTargetAtTime(0.0001, t + dur * 0.92, 0.25);
        o.connect(g);
        g.connect(tr.padFilter);
        o.start(t);
        o.stop(t + dur + 1.2);
      }
    }
  }

  private lead(tr: Track, t: number, m: number, dur: number, wave: OscillatorType): void {
    const ctx = this.engine.ctx!;
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.value = midiHz(m);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2200 + this.intensity * 600;
    const g = ctx.createGain();
    const peak = wave === 'sawtooth' || wave === 'square' ? 0.05 : 0.09;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.012);
    g.gain.setTargetAtTime(peak * 0.6, t + 0.03, 0.1);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.9, 0.04);
    o.connect(f);
    f.connect(g);
    g.connect(tr.lead);
    o.start(t);
    o.stop(t + dur + 0.3);
  }
}
