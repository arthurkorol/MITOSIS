import { describe, expect, it } from 'vitest';
import { clamp, dist2, expDecay, length, lerp } from './math';

describe('math', () => {
  it('clamp ограничивает значение', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('lerp интерполирует', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('expDecay даёт долю пути в (0, 1) и растёт с dt', () => {
    const slow = expDecay(5, 1 / 60);
    const fast = expDecay(5, 1 / 10);
    expect(slow).toBeGreaterThan(0);
    expect(fast).toBeLessThan(1);
    expect(fast).toBeGreaterThan(slow);
  });

  it('length и dist2 согласованы', () => {
    expect(length(3, 4)).toBe(5);
    expect(dist2(0, 0, 3, 4)).toBe(25);
  });
});
