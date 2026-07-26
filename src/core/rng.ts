export interface Rng {
  /** Равномерное число в [0, 1). */
  next(): number;
  /** Равномерное число в [min, max). */
  range(min: number, max: number): number;
  /** Целое в [min, maxExcl). */
  int(min: number, maxExcl: number): number;
  pick<T>(arr: readonly T[]): T;
}

/** mulberry32 — быстрый сидированный PRNG; вся случайность симуляции идёт через него. */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, maxExcl) => min + Math.floor(next() * (maxExcl - min)),
    pick: (arr) => {
      if (arr.length === 0) throw new Error('pick from empty array');
      return arr[Math.floor(next() * arr.length)] as (typeof arr)[number];
    },
  };
}
