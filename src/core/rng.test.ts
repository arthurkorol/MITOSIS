import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('rng (mulberry32)', () => {
  it('одинаковый seed даёт одинаковую последовательность', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 10; i++) expect(a.next()).toBe(b.next());
  });

  it('разные seed дают разные последовательности', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('next в [0, 1), range в [min, max)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      const r = rng.range(5, 8);
      expect(r).toBeGreaterThanOrEqual(5);
      expect(r).toBeLessThan(8);
    }
  });

  it('int даёт целые в [min, maxExcl)', () => {
    const rng = createRng(9);
    for (let i = 0; i < 500; i++) {
      const v = rng.int(2, 5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick возвращает элемент массива и бросает на пустом', () => {
    const rng = createRng(11);
    const arr = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i++) expect(arr).toContain(rng.pick(arr));
    expect(() => rng.pick([])).toThrow();
  });

  it('распределение примерно равномерно', () => {
    const rng = createRng(123);
    let sum = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) sum += rng.next();
    expect(sum / n).toBeGreaterThan(0.45);
    expect(sum / n).toBeLessThan(0.55);
  });
});
