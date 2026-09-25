/**
 * Primitivas de síntese para renderização offline de efeitos sonoros.
 * Todas recebem um BaseAudioContext (OfflineAudioContext na "cozinha" de sons).
 */

export type Ctx = BaseAudioContext;

const noiseCache = new WeakMap<Ctx, Record<string, AudioBuffer>>();

export function noiseBuffer(ctx: Ctx, kind: 'white' | 'pink' | 'brown', seconds = 2): AudioBuffer {
  let c = noiseCache.get(ctx);
  if (!c) noiseCache.set(ctx, (c = {}));
  const key = `${kind}${seconds}`;
  if (c[key]) return c[key]!;
  const n = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };
  if (kind === 'white') for (let i = 0; i < n; i++) d[i] = rnd();
  else if (kind === 'pink') {
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = rnd();
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = (last + 0.02 * rnd()) / 1.02;
      d[i] = last * 3.5;
    }
  }
  c[key] = b;
  return b;
}

export interface Env {
  a: number;
  d: number;
  s?: number;
  r?: number;
  peak?: number;
}

/** Aplica envelope ADSR a um GainNode. */
export function env(g: GainNode, t0: number, e: Env): number {
  const peak = e.peak ?? 1;
  const s = e.s ?? 0;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + Math.max(0.001, e.a));
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * s || 0.0001), t0 + e.a + e.d);
  const end = t0 + e.a + e.d + (e.r ?? 0);
  if (e.r) g.gain.exponentialRampToValueAtTime(0.0001, end);
  return end;
}

export function noise(
  ctx: Ctx,
  out: AudioNode,
  t0: number,
  o: {
    kind?: 'white' | 'pink' | 'brown';
    dur: number;
    filter?: BiquadFilterType;
    freq?: number;
    freqEnd?: number;
    q?: number;
    env: Env;
    gain?: number;
  },
): void {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, o.kind ?? 'white');
  const g = ctx.createGain();
  let node: AudioNode = src;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter;
    f.frequency.setValueAtTime(o.freq ?? 1000, t0);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + o.dur);
    f.Q.value = o.q ?? 1;
    node.connect(f);
    node = f;
  }
  node.connect(g);
  const g2 = ctx.createGain();
  g2.gain.value = o.gain ?? 1;
  g.connect(g2);
  g2.connect(out);
  env(g, t0, o.env);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + o.dur + 0.05);
}

export function tone(
  ctx: Ctx,
  out: AudioNode,
  t0: number,
  o: {
    wave?: OscillatorType;
    freq: number;
    freqEnd?: number;
    dur: number;
    env: Env;
    gain?: number;
    detune?: number;
    filter?: BiquadFilterType;
    filterFreq?: number;
    vibrato?: { rate: number; depth: number };
  },
): void {
  const osc = ctx.createOscillator();
  osc.type = o.wave ?? 'sine';
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t0 + o.dur);
  if (o.detune) osc.detune.value = o.detune;
  if (o.vibrato) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = o.vibrato.rate;
    const lg = ctx.createGain();
    lg.gain.value = o.vibrato.depth;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + o.dur + 0.05);
  }
  const g = ctx.createGain();
  let node: AudioNode = osc;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter;
    f.frequency.value = o.filterFreq ?? 1000;
    node.connect(f);
    node = f;
  }
  node.connect(g);
  const g2 = ctx.createGain();
  g2.gain.value = o.gain ?? 1;
  g.connect(g2);
  g2.connect(out);
  env(g, t0, o.env);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

/** Distorção por waveshaper. */
export function distortion(ctx: Ctx, amount: number): WaveShaperNode {
  const ws = ctx.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * 2 - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  ws.curve = curve;
  return ws;
}

/** Bitcrush (quantização por degraus). */
export function crusher(ctx: Ctx, steps: number): WaveShaperNode {
  const ws = ctx.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * 2 - 1;
    curve[i] = Math.round(x * steps) / steps;
  }
  ws.curve = curve;
  return ws;
}

/** Resposta ao impulso sintética para reverb (ruído estéreo com decaimento exponencial). */
export function impulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const n = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let seed = 777 + c * 31;
    for (let i = 0; i < n; i++) {
      seed = (seed * 16807) % 2147483647;
      const w = (seed / 2147483647) * 2 - 1;
      d[i] = w * Math.pow(1 - i / n, decay);
    }
  }
  return b;
}

export function midiToHz(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}
