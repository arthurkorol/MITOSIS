import { expDecay } from './core/math';
import { CAMERA } from './data/balance';

/**
 * Камера-центр: держит постоянную высоту обзора в мировых единицах,
 * плавно следует за целью. Обновляется в фазе рендера.
 */
export class Camera {
  x = 0;
  y = 0;
  /** Вьюпорт в CSS-пикселях. */
  viewportW = 1;
  viewportH = 1;

  get scale(): number {
    return this.viewportH / CAMERA.viewHeight;
  }

  snapTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  follow(targetX: number, targetY: number, dt: number): void {
    const k = expDecay(CAMERA.followRate, dt);
    this.x += (targetX - this.x) * k;
    this.y += (targetY - this.y) * k;
  }

  screenToWorldX(sx: number): number {
    return this.x + (sx - this.viewportW / 2) / this.scale;
  }

  screenToWorldY(sy: number): number {
    return this.y + (sy - this.viewportH / 2) / this.scale;
  }
}
