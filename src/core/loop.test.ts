import { describe, expect, it } from 'vitest';
import { FixedStepLoop } from './loop';
import { DT } from './time';

function makeLoop() {
  let steps = 0;
  const loop = new FixedStepLoop({
    step: () => steps++,
    render: () => {},
    raf: () => 0,
    caf: () => {},
  });
  return { loop, steps: () => steps };
}

describe('FixedStepLoop', () => {
  it('executa um passo por DT acumulado', () => {
    const { loop, steps } = makeLoop();
    loop.advance(DT * 3 + DT / 2);
    expect(steps()).toBe(3);
    expect(loop.alpha).toBeCloseTo(0.5, 5);
  });

  it('limita passos por frame (sem espiral da morte)', () => {
    const { loop, steps } = makeLoop();
    loop.advance(10);
    expect(steps()).toBe(5);
    expect(loop.alpha).toBeLessThan(1);
  });

  it('respeita pausa e timeScale', () => {
    const { loop, steps } = makeLoop();
    loop.paused = true;
    loop.advance(DT * 4);
    expect(steps()).toBe(0);
    loop.paused = false;
    loop.timeScale = 0.5;
    loop.advance(DT * 4);
    expect(steps()).toBe(2);
  });
});
