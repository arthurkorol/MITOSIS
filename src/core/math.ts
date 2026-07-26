export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Доля пути к цели за dt при экспоненциальном сглаживании со скоростью rate (1/с). */
export const expDecay = (rate: number, dt: number): number => 1 - Math.exp(-rate * dt);

export const length = (x: number, y: number): number => Math.sqrt(x * x + y * y);

export const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};
