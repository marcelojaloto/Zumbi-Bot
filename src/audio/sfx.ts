import { crusher, distortion, noise, tone, type Ctx } from './synth';

/** Receita de efeito sonoro: desenha em `out` a partir de t0; `v` = variação 0..2. Retorna a duração. */
export type Recipe = (ctx: Ctx, out: AudioNode, t0: number, v: number) => number;

const r = (v: number, a: number, b: number) => a + ((v * 0.37 + 0.13) % 1) * (b - a);

function thump(ctx: Ctx, out: AudioNode, t: number, f0: number, f1: number, dur: number, gain = 1): void {
  tone(ctx, out, t, { freq: f0, freqEnd: f1, dur, env: { a: 0.002, d: dur }, gain });
}

function gun(
  ctx: Ctx,
  out: AudioNode,
  t: number,
  o: { crack: number; body: number; len: number; boom: number; dist?: number },
): number {
  const dist = o.dist ? distortion(ctx, o.dist) : null;
  const dst = dist ?? out;
  if (dist) dist.connect(out);
  noise(ctx, dst, t, {
    dur: o.len,
    filter: 'bandpass',
    freq: o.crack,
    freqEnd: o.crack * 0.4,
    q: 0.8,
    env: { a: 0.001, d: o.len },
    gain: 1.2,
  });
  noise(ctx, dst, t, {
    kind: 'brown',
    dur: o.len * 1.6,
    filter: 'lowpass',
    freq: o.body,
    env: { a: 0.001, d: o.len * 1.6 },
    gain: 1.4,
  });
  thump(ctx, dst, t, o.boom, o.boom * 0.35, o.len * 1.4, 0.9);
  tone(ctx, out, t + 0.002, {
    wave: 'square',
    freq: 3200,
    dur: 0.01,
    env: { a: 0.001, d: 0.01 },
    gain: 0.15,
  });
  return o.len * 2 + 0.1;
}

function click(ctx: Ctx, out: AudioNode, t: number, f: number, gain = 0.4): void {
  noise(ctx, out, t, { dur: 0.025, filter: 'bandpass', freq: f, q: 6, env: { a: 0.001, d: 0.025 }, gain });
  tone(ctx, out, t, {
    wave: 'square',
    freq: f * 0.5,
    dur: 0.02,
    env: { a: 0.001, d: 0.02 },
    gain: gain * 0.3,
  });
}

function chime(
  ctx: Ctx,
  out: AudioNode,
  t: number,
  notes: number[],
  step: number,
  wave: OscillatorType = 'triangle',
  gain = 0.35,
): number {
  notes.forEach((f, i) =>
    tone(ctx, out, t + i * step, { wave, freq: f, dur: 0.35, env: { a: 0.005, d: 0.3 }, gain }),
  );
  return notes.length * step + 0.4;
}

function groanVoice(ctx: Ctx, out: AudioNode, t: number, f: number, dur: number, gain = 0.7): void {
  // voz: dente de serra com vibrato passando por dois formantes
  const f1 = ctx.createBiquadFilter();
  f1.type = 'bandpass';
  f1.frequency.value = 520;
  f1.Q.value = 5;
  const f2 = ctx.createBiquadFilter();
  f2.type = 'bandpass';
  f2.frequency.value = 950;
  f2.Q.value = 6;
  const g = ctx.createGain();
  g.gain.value = gain;
  f1.connect(g);
  f2.connect(g);
  g.connect(out);
  const m = ctx.createGain();
  m.connect(f1);
  m.connect(f2);
  tone(ctx, m, t, {
    wave: 'sawtooth',
    freq: f,
    freqEnd: f * 0.75,
    dur,
    env: { a: 0.08, d: dur * 0.6, s: 0.5, r: dur * 0.4 },
    gain: 2,
    vibrato: { rate: 5.5, depth: f * 0.06 },
  });
  noise(ctx, out, t, {
    kind: 'pink',
    dur,
    filter: 'bandpass',
    freq: 700,
    q: 1.5,
    env: { a: 0.1, d: dur },
    gain: 0.25,
  });
}

export const SFX: Record<string, Recipe> = {
  // --- corpo a corpo ---
  whoosh: (c, o, t, v) => {
    noise(c, o, t, {
      dur: 0.16,
      filter: 'bandpass',
      freq: r(v, 2400, 3200),
      freqEnd: 700,
      q: 1.2,
      env: { a: 0.04, d: 0.12 },
      gain: 0.6,
    });
    return 0.25;
  },
  whooshHeavy: (c, o, t, v) => {
    noise(c, o, t, {
      dur: 0.28,
      filter: 'bandpass',
      freq: r(v, 1600, 2000),
      freqEnd: 300,
      q: 1,
      env: { a: 0.08, d: 0.2 },
      gain: 0.8,
    });
    return 0.35;
  },
  punch: (c, o, t, v) => {
    thump(c, o, t, r(v, 140, 170), 55, 0.09, 1.2);
    noise(c, o, t, { dur: 0.04, filter: 'lowpass', freq: 2500, env: { a: 0.001, d: 0.04 }, gain: 0.7 });
    return 0.15;
  },
  punchHeavy: (c, o, t, v) => {
    const d = distortion(c, 4);
    d.connect(o);
    thump(c, d, t, r(v, 110, 130), 40, 0.16, 1.3);
    noise(c, o, t, {
      kind: 'brown',
      dur: 0.12,
      filter: 'lowpass',
      freq: 1500,
      env: { a: 0.001, d: 0.12 },
      gain: 1,
    });
    return 0.25;
  },
  blade: (c, o, t, v) => {
    noise(c, o, t, { dur: 0.1, filter: 'highpass', freq: 3000, env: { a: 0.001, d: 0.1 }, gain: 0.5 });
    tone(c, o, t, {
      wave: 'triangle',
      freq: r(v, 2200, 2800),
      freqEnd: 1800,
      dur: 0.18,
      env: { a: 0.001, d: 0.18 },
      gain: 0.12,
    });
    thump(c, o, t, 180, 80, 0.06, 0.6);
    return 0.25;
  },
  blunt: (c, o, t, v) => {
    thump(c, o, t, r(v, 100, 130), 45, 0.14, 1.3);
    noise(c, o, t, {
      kind: 'brown',
      dur: 0.1,
      filter: 'lowpass',
      freq: 900,
      env: { a: 0.001, d: 0.1 },
      gain: 0.9,
    });
    return 0.2;
  },
  robotHit: (c, o, t, v) => {
    tone(c, o, t, {
      wave: 'square',
      freq: r(v, 700, 900),
      freqEnd: 400,
      dur: 0.12,
      env: { a: 0.001, d: 0.12 },
      gain: 0.15,
      filter: 'bandpass',
      filterFreq: 1500,
    });
    tone(c, o, t, {
      wave: 'sine',
      freq: r(v, 1800, 2300),
      dur: 0.25,
      env: { a: 0.001, d: 0.25 },
      gain: 0.12,
    });
    noise(c, o, t, { dur: 0.06, filter: 'highpass', freq: 4000, env: { a: 0.001, d: 0.06 }, gain: 0.4 });
    thump(c, o, t, 150, 60, 0.08, 0.7);
    return 0.3;
  },
  splat: (c, o, t, v) => {
    noise(c, o, t, {
      kind: 'pink',
      dur: 0.12,
      filter: 'lowpass',
      freq: r(v, 900, 1300),
      freqEnd: 300,
      env: { a: 0.002, d: 0.12 },
      gain: 0.9,
    });
    thump(c, o, t, 90, 50, 0.08, 0.6);
    return 0.18;
  },
  // --- personagens ---
  groan: (c, o, t, v) => {
    groanVoice(c, o, t, r(v, 70, 110), r(v, 0.9, 1.4));
    return 1.5;
  },
  zombieDeath: (c, o, t, v) => {
    groanVoice(c, o, t, r(v, 95, 120), 0.7, 0.8);
    noise(c, o, t + 0.1, {
      kind: 'pink',
      dur: 0.25,
      filter: 'lowpass',
      freq: 800,
      env: { a: 0.01, d: 0.25 },
      gain: 0.8,
    });
    return 0.9;
  },
  roar: (c, o, t, v) => {
    const d = distortion(c, 8);
    d.connect(o);
    groanVoice(c, d, t, r(v, 55, 70), 1.3, 0.8);
    noise(c, o, t, {
      kind: 'brown',
      dur: 1.2,
      filter: 'lowpass',
      freq: 400,
      env: { a: 0.2, d: 1 },
      gain: 0.9,
    });
    return 1.5;
  },
  robotDeath: (c, o, t, v) => {
    tone(c, o, t, {
      wave: 'square',
      freq: r(v, 900, 1100),
      freqEnd: 60,
      dur: 0.6,
      env: { a: 0.01, d: 0.6 },
      gain: 0.18,
    });
    noise(c, o, t, {
      dur: 0.4,
      filter: 'bandpass',
      freq: 3000,
      freqEnd: 500,
      env: { a: 0.005, d: 0.4 },
      gain: 0.5,
    });
    thump(c, o, t + 0.05, 120, 40, 0.3, 1);
    return 0.8;
  },
  playerHurt: (c, o, t, v) => {
    tone(c, o, t, {
      wave: 'square',
      freq: r(v, 420, 480),
      freqEnd: 180,
      dur: 0.18,
      env: { a: 0.002, d: 0.18 },
      gain: 0.2,
      filter: 'lowpass',
      filterFreq: 2000,
    });
    thump(c, o, t, 140, 50, 0.12, 1);
    return 0.25;
  },
  playerDeath: (c, o, t) => {
    tone(c, o, t, {
      wave: 'sawtooth',
      freq: 800,
      freqEnd: 40,
      dur: 1.4,
      env: { a: 0.01, d: 1.4 },
      gain: 0.2,
      filter: 'lowpass',
      filterFreq: 2500,
    });
    noise(c, o, t, {
      dur: 1,
      filter: 'bandpass',
      freq: 2000,
      freqEnd: 200,
      env: { a: 0.01, d: 1 },
      gain: 0.4,
    });
    return 1.5;
  },
  jump: (c, o, t, v) => {
    tone(c, o, t, {
      wave: 'square',
      freq: r(v, 260, 300),
      freqEnd: 520,
      dur: 0.1,
      env: { a: 0.002, d: 0.1 },
      gain: 0.08,
      filter: 'lowpass',
      filterFreq: 1800,
    });
    noise(c, o, t, { dur: 0.08, filter: 'bandpass', freq: 800, env: { a: 0.002, d: 0.08 }, gain: 0.2 });
    return 0.15;
  },
  doubleJump: (c, o, t) => {
    noise(c, o, t, {
      dur: 0.3,
      filter: 'bandpass',
      freq: 600,
      freqEnd: 2000,
      q: 2,
      env: { a: 0.02, d: 0.28 },
      gain: 0.5,
    });
    tone(c, o, t, { wave: 'sine', freq: 400, freqEnd: 900, dur: 0.2, env: { a: 0.01, d: 0.2 }, gain: 0.15 });
    return 0.35;
  },
  land: (c, o, t, v) => {
    thump(c, o, t, r(v, 90, 110), 40, 0.1, 0.9);
    noise(c, o, t, { dur: 0.08, filter: 'lowpass', freq: 1200, env: { a: 0.002, d: 0.08 }, gain: 0.4 });
    return 0.15;
  },
  step: (c, o, t, v) => {
    noise(c, o, t, {
      dur: 0.04,
      filter: 'bandpass',
      freq: r(v, 500, 800),
      q: 2,
      env: { a: 0.002, d: 0.04 },
      gain: 0.25,
    });
    return 0.06;
  },
  // --- armas de fogo ---
  gun_pistol: (c, o, t) => gun(c, o, t, { crack: 1800, body: 1200, len: 0.07, boom: 130 }),
  gun_shotgun: (c, o, t) => {
    const d = gun(c, o, t, { crack: 1100, body: 900, len: 0.25, boom: 80, dist: 3 });
    click(c, o, t + 0.45, 1400, 0.5);
    click(c, o, t + 0.58, 1000, 0.5);
    return d + 0.5;
  },
  gun_smg: (c, o, t) => gun(c, o, t, { crack: 2400, body: 1600, len: 0.045, boom: 160 }),
  gun_rifle: (c, o, t) => gun(c, o, t, { crack: 2800, body: 1400, len: 0.07, boom: 120 }),
  gun_sniper: (c, o, t) => {
    const d = gun(c, o, t, { crack: 3200, body: 900, len: 0.2, boom: 70, dist: 2 });
    click(c, o, t + 0.55, 1800, 0.4);
    click(c, o, t + 0.75, 1200, 0.4);
    return d + 0.9;
  },
  gun_mg: (c, o, t) => gun(c, o, t, { crack: 2000, body: 1100, len: 0.09, boom: 95, dist: 2 }),
  gun_gl: (c, o, t) => {
    tone(c, o, t, { freq: 220, freqEnd: 80, dur: 0.18, env: { a: 0.002, d: 0.18 }, gain: 1 });
    noise(c, o, t, {
      kind: 'brown',
      dur: 0.15,
      filter: 'lowpass',
      freq: 700,
      env: { a: 0.002, d: 0.15 },
      gain: 0.8,
    });
    return 0.25;
  },
  enemyShot: (c, o, t, v) => {
    tone(c, o, t, {
      wave: 'square',
      freq: r(v, 1400, 1700),
      freqEnd: 300,
      dur: 0.14,
      env: { a: 0.001, d: 0.14 },
      gain: 0.1,
      filter: 'lowpass',
      filterFreq: 3000,
    });
    return 0.18;
  },
  enemyGun: (c, o, t) => gun(c, o, t, { crack: 1600, body: 900, len: 0.05, boom: 140 }),
  spit: (c, o, t, v) => {
    noise(c, o, t, {
      kind: 'pink',
      dur: 0.2,
      filter: 'bandpass',
      freq: r(v, 700, 1000),
      freqEnd: 400,
      q: 3,
      env: { a: 0.01, d: 0.2 },
      gain: 0.8,
    });
    return 0.25;
  },
  reload: (c, o, t) => {
    click(c, o, t, 2200, 0.35);
    click(c, o, t + 0.25, 1500, 0.45);
    click(c, o, t + 0.4, 2600, 0.35);
    return 0.5;
  },
  reloadShell: (c, o, t) => {
    click(c, o, t, 1800, 0.4);
    return 0.06;
  },
  dryfire: (c, o, t) => {
    click(c, o, t, 3000, 0.3);
    return 0.05;
  },
  swap: (c, o, t) => {
    click(c, o, t, 1600, 0.25);
    click(c, o, t + 0.08, 2400, 0.25);
    return 0.15;
  },
  // --- explosões ---
  explosion: (c, o, t, v) => {
    const d = distortion(c, 3);
    d.connect(o);
    noise(c, d, t, {
      kind: 'brown',
      dur: 1.3,
      filter: 'lowpass',
      freq: 900,
      freqEnd: 90,
      env: { a: 0.005, d: 1.3 },
      gain: 2,
    });
    noise(c, o, t, {
      dur: 0.3,
      filter: 'bandpass',
      freq: 1800,
      freqEnd: 300,
      env: { a: 0.002, d: 0.3 },
      gain: 0.6,
    });
    thump(c, o, t, r(v, 70, 85), 28, 0.8, 1.3);
    return 1.4;
  },
  explosionSmall: (c, o, t, v) => {
    noise(c, o, t, {
      kind: 'brown',
      dur: 0.5,
      filter: 'lowpass',
      freq: 1200,
      freqEnd: 150,
      env: { a: 0.003, d: 0.5 },
      gain: 1.5,
    });
    thump(c, o, t, r(v, 100, 120), 40, 0.35, 1);
    return 0.6;
  },
  fuse: (c, o, t) => {
    for (let i = 0; i < 4; i++)
      tone(c, o, t + i * 0.18, {
        wave: 'square',
        freq: 1200 + i * 150,
        dur: 0.06,
        env: { a: 0.002, d: 0.06 },
        gain: 0.12,
      });
    return 0.8;
  },
  propBreak: (c, o, t, v) => {
    noise(c, o, t, {
      dur: 0.25,
      filter: 'bandpass',
      freq: r(v, 900, 1300),
      q: 2,
      env: { a: 0.002, d: 0.25 },
      gain: 0.8,
    });
    thump(c, o, t, 160, 60, 0.12, 0.7);
    for (let i = 0; i < 3; i++) click(c, o, t + 0.05 + i * 0.04, 700 + i * 300, 0.25);
    return 0.35;
  },
  // --- magia ---
  cast_heal: (c, o, t) => {
    chime(c, o, t, [523, 659, 784, 1046], 0.06, 'sine', 0.25);
    noise(c, o, t, { dur: 0.6, filter: 'highpass', freq: 6000, env: { a: 0.1, d: 0.5 }, gain: 0.15 });
    return 0.8;
  },
  cast_fire: (c, o, t, v) => {
    noise(c, o, t, {
      kind: 'pink',
      dur: 0.4,
      filter: 'bandpass',
      freq: r(v, 800, 1100),
      freqEnd: 300,
      q: 0.8,
      env: { a: 0.02, d: 0.38 },
      gain: 0.9,
    });
    for (let i = 0; i < 5; i++) click(c, o, t + 0.05 + i * 0.05, 1500 + i * 200, 0.12);
    return 0.5;
  },
  cast_water: (c, o, t) => {
    for (let i = 0; i < 6; i++)
      tone(c, o, t + i * 0.035, {
        freq: 500 + ((i * 337) % 700),
        freqEnd: 900 + i * 90,
        dur: 0.06,
        env: { a: 0.002, d: 0.06 },
        gain: 0.15,
      });
    noise(c, o, t, { dur: 0.3, filter: 'bandpass', freq: 1500, env: { a: 0.02, d: 0.28 }, gain: 0.35 });
    return 0.4;
  },
  cast_ice: (c, o, t) => {
    chime(c, o, t, [1568, 2093, 2637], 0.04, 'sine', 0.15);
    noise(c, o, t, { dur: 0.3, filter: 'highpass', freq: 5000, env: { a: 0.005, d: 0.3 }, gain: 0.3 });
    return 0.45;
  },
  cast_electric: (c, o, t, v) => {
    const cr = crusher(c, 6);
    cr.connect(o);
    tone(c, cr, t, {
      wave: 'sawtooth',
      freq: r(v, 90, 130),
      dur: 0.35,
      env: { a: 0.005, d: 0.35 },
      gain: 0.35,
      vibrato: { rate: 40, depth: 60 },
    });
    noise(c, o, t, { dur: 0.25, filter: 'highpass', freq: 3000, env: { a: 0.001, d: 0.25 }, gain: 0.5 });
    return 0.4;
  },
  cast_toxic: (c, o, t) => {
    for (let i = 0; i < 5; i++)
      tone(c, o, t + i * 0.07, {
        freq: 200 + i * 40,
        freqEnd: 120,
        dur: 0.1,
        env: { a: 0.01, d: 0.1 },
        gain: 0.2,
        filter: 'lowpass',
        filterFreq: 600,
      });
    noise(c, o, t, {
      kind: 'pink',
      dur: 0.4,
      filter: 'lowpass',
      freq: 700,
      env: { a: 0.05, d: 0.35 },
      gain: 0.5,
    });
    return 0.5;
  },
  cast_cyber: (c, o, t) => {
    const cr = crusher(c, 4);
    cr.connect(o);
    [880, 1320, 660, 1760, 990].forEach((f, i) =>
      tone(c, cr, t + i * 0.05, {
        wave: 'square',
        freq: f,
        dur: 0.05,
        env: { a: 0.001, d: 0.05 },
        gain: 0.15,
      }),
    );
    return 0.35;
  },
  cast_wind: (c, o, t) => {
    noise(c, o, t, {
      dur: 0.6,
      filter: 'bandpass',
      freq: 400,
      freqEnd: 2500,
      q: 3,
      env: { a: 0.1, d: 0.5 },
      gain: 0.8,
    });
    return 0.65;
  },
  cast_earth: (c, o, t) => {
    noise(c, o, t, {
      kind: 'brown',
      dur: 0.7,
      filter: 'lowpass',
      freq: 300,
      env: { a: 0.05, d: 0.65 },
      gain: 1.6,
    });
    thump(c, o, t, 60, 30, 0.5, 1);
    return 0.75;
  },
  cast_necro: (c, o, t) => {
    tone(c, o, t, {
      wave: 'sawtooth',
      freq: 110,
      freqEnd: 220,
      dur: 0.7,
      env: { a: 0.3, d: 0.4 },
      gain: 0.15,
      filter: 'lowpass',
      filterFreq: 900,
    });
    tone(c, o, t, {
      wave: 'sawtooth',
      freq: 116,
      freqEnd: 233,
      dur: 0.7,
      env: { a: 0.3, d: 0.4 },
      gain: 0.15,
      filter: 'lowpass',
      filterFreq: 900,
    });
    noise(c, o, t, { dur: 0.7, filter: 'bandpass', freq: 600, q: 4, env: { a: 0.3, d: 0.4 }, gain: 0.3 });
    return 0.8;
  },
  zap: (c, o, t) => {
    noise(c, o, t, { dur: 0.12, filter: 'highpass', freq: 2500, env: { a: 0.001, d: 0.12 }, gain: 0.6 });
    tone(c, o, t, { wave: 'square', freq: 90, dur: 0.12, env: { a: 0.001, d: 0.12 }, gain: 0.2 });
    return 0.15;
  },
  shatter: (c, o, t) => {
    for (let i = 0; i < 6; i++)
      tone(c, o, t + i * 0.02, {
        wave: 'triangle',
        freq: 2000 + ((i * 739) % 2500),
        dur: 0.2,
        env: { a: 0.001, d: 0.2 },
        gain: 0.1,
      });
    noise(c, o, t, { dur: 0.3, filter: 'highpass', freq: 4000, env: { a: 0.001, d: 0.3 }, gain: 0.5 });
    return 0.4;
  },
  steam: (c, o, t) => {
    noise(c, o, t, { dur: 0.6, filter: 'highpass', freq: 3000, env: { a: 0.02, d: 0.55 }, gain: 0.5 });
    return 0.6;
  },
  // --- itens e interface ---
  pickup: (c, o, t) => chime(c, o, t, [880, 1320], 0.06),
  pickupHealth: (c, o, t) => chime(c, o, t, [523, 784, 1046], 0.06, 'sine'),
  pickupAmmo: (c, o, t) => {
    click(c, o, t, 1800, 0.4);
    click(c, o, t + 0.07, 2400, 0.4);
    return 0.15;
  },
  pickupPower: (c, o, t) => chime(c, o, t, [523, 659, 784, 1046, 1318], 0.05, 'square', 0.12),
  coin: (c, o, t) => chime(c, o, t, [1318, 1760], 0.05, 'square', 0.1),
  loot: (c, o, t) => chime(c, o, t, [784, 988, 1175, 1568], 0.07, 'triangle', 0.25),
  levelUp: (c, o, t) => chime(c, o, t, [523, 659, 784, 1046, 784, 1046], 0.08, 'square', 0.14),
  unlock: (c, o, t) => chime(c, o, t, [392, 523, 659, 784, 1046], 0.09, 'triangle', 0.3),
  ui_hover: (c, o, t) => {
    tone(c, o, t, { wave: 'square', freq: 1600, dur: 0.03, env: { a: 0.001, d: 0.03 }, gain: 0.05 });
    return 0.05;
  },
  ui_click: (c, o, t) => {
    tone(c, o, t, {
      wave: 'square',
      freq: 900,
      freqEnd: 1400,
      dur: 0.06,
      env: { a: 0.001, d: 0.06 },
      gain: 0.1,
    });
    return 0.08;
  },
  ui_back: (c, o, t) => {
    tone(c, o, t, {
      wave: 'square',
      freq: 1100,
      freqEnd: 600,
      dur: 0.07,
      env: { a: 0.001, d: 0.07 },
      gain: 0.1,
    });
    return 0.09;
  },
  go: (c, o, t) => {
    tone(c, o, t, { wave: 'square', freq: 988, dur: 0.1, env: { a: 0.002, d: 0.1 }, gain: 0.12 });
    tone(c, o, t + 0.15, { wave: 'square', freq: 988, dur: 0.1, env: { a: 0.002, d: 0.1 }, gain: 0.12 });
    return 0.3;
  },
  alarm: (c, o, t) => {
    tone(c, o, t, {
      wave: 'sawtooth',
      freq: 600,
      freqEnd: 900,
      dur: 0.4,
      env: { a: 0.01, d: 0.39 },
      gain: 0.15,
      filter: 'lowpass',
      filterFreq: 2000,
    });
    return 0.45;
  },
  bossPhase: (c, o, t) => {
    const d = distortion(c, 6);
    d.connect(o);
    tone(c, d, t, { wave: 'sawtooth', freq: 55, freqEnd: 40, dur: 1.2, env: { a: 0.05, d: 1.1 }, gain: 0.4 });
    noise(c, o, t, {
      kind: 'brown',
      dur: 1.2,
      filter: 'lowpass',
      freq: 300,
      env: { a: 0.05, d: 1.1 },
      gain: 1,
    });
    return 1.3;
  },
  victory: (c, o, t) => chime(c, o, t, [523, 659, 784, 1046, 1318, 1568], 0.12, 'square', 0.15),
  gameover: (c, o, t) => chime(c, o, t, [392, 349, 311, 262], 0.28, 'triangle', 0.3),
  telegraph: (c, o, t) => {
    tone(c, o, t, { wave: 'sine', freq: 300, freqEnd: 600, dur: 0.3, env: { a: 0.05, d: 0.25 }, gain: 0.15 });
    return 0.35;
  },
  // perigos ambientais
  hz_fireJet: (c, o, t) => {
    noise(c, o, t, {
      kind: 'pink',
      dur: 0.8,
      filter: 'bandpass',
      freq: 600,
      q: 0.7,
      env: { a: 0.05, d: 0.75 },
      gain: 0.7,
    });
    return 0.85;
  },
  hz_electricTile: (c, o, t) => SFX.zap!(c, o, t, 0),
  hz_gasVent: (c, o, t) => SFX.steam!(c, o, t, 0),
  hz_artillery: (c, o, t) => {
    tone(c, o, t, {
      wave: 'sine',
      freq: 1800,
      freqEnd: 300,
      dur: 0.9,
      env: { a: 0.05, d: 0.85 },
      gain: 0.08,
    });
    return 1;
  },
  hz_gust: (c, o, t) => SFX.cast_wind!(c, o, t, 0),
  hz_laserTrip: (c, o, t) => SFX.alarm!(c, o, t, 0),
};
