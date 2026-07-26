import { FIXED_DT } from './data/balance';

/**
 * rAF + аккумулятор с фиксированным шагом логики 60 Гц.
 * Кламп аккумулятора не даёт «спирали смерти» после лагов и сворачивания вкладки.
 */
export class GameLoop {
  private last: number | null = null;
  private acc = 0;
  private rafId = 0;
  private running = false;

  constructor(
    private readonly step: (dt: number) => void,
    private readonly render: () => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = null;
    this.acc = 0;
    this.rafId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly frame = (nowMs: number): void => {
    if (!this.running) return;
    if (this.last !== null) {
      this.acc = Math.min(this.acc + (nowMs - this.last) / 1000, 0.25);
    }
    this.last = nowMs;
    while (this.acc >= FIXED_DT) {
      this.step(FIXED_DT);
      this.acc -= FIXED_DT;
    }
    this.render();
    this.rafId = requestAnimationFrame(this.frame);
  };
}
