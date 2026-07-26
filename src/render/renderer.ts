import type { Camera } from '../camera';
import { CAMERA } from '../data/balance';
import type { World } from '../sim/world';
import { Background } from './background';
import type { Effects } from './effects';
import { drawPlayerCell, makeFoodSprites } from './sprites';

const TAU = Math.PI * 2;

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly bg = new Background();
  private foodSprites = makeFoodSprites(1);
  private spriteScale = 1;
  private cssW = 1;
  private cssH = 1;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssW * dpr));
    this.canvas.height = Math.max(1, Math.round(cssH * dpr));
    this.bg.resize(cssW, cssH);
    // Перезапекаем спрайты под фактическую плотность пикселей.
    this.spriteScale = dpr * (cssH / CAMERA.viewHeight);
    this.foodSprites = makeFoodSprites(this.spriteScale);
  }

  draw(world: World, cam: Camera, time: number, effects: Effects): void {
    const { ctx, dpr, cssW, cssH } = this;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bg.draw(ctx, cam, cssW, cssH, time);

    // Мировая трансформация: центр экрана = позиция камеры.
    const s = cam.scale;
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cssW / 2 - cam.x * s), dpr * (cssH / 2 - cam.y * s));

    this.drawFood(world, cam, time);
    const p = world.player;
    drawPlayerCell(ctx, p.x, p.y, p.radius, time);
    effects.draw(ctx);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawFood(world: World, cam: Camera, time: number): void {
    const { ctx } = this;
    const halfW = this.cssW / 2 / cam.scale + 50;
    const halfH = this.cssH / 2 / cam.scale + 50;

    for (const f of world.food) {
      if (Math.abs(f.x - cam.x) > halfW || Math.abs(f.y - cam.y) > halfH) continue;
      const sprite = this.foodSprites[f.type]!;
      // Покачивание в вязкой жидкости.
      const bx = f.x + Math.sin(time * 1.6 + f.seed) * 2;
      const by = f.y + Math.cos(time * 1.3 + f.seed * 1.7) * 2;
      // ДНК-сгустки пульсируют с частотой 2 Гц.
      const scale = f.type === 2 ? 1 + 0.15 * Math.sin(TAU * 2 * time + f.seed) : 1;
      // Спрайт запечён в физических пикселях — возвращаем в мировые единицы.
      const w = (sprite.width / this.spriteScale) * scale;
      ctx.drawImage(sprite, bx - w / 2, by - w / 2, w, w);
    }
  }
}
