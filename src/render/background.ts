import type { Camera } from '../camera';
import { createRng } from '../core/rng';

const TILE = 512;
/** Параллакс и медленный дрейф двух слоёв взвеси. */
const LAYERS = [
  { parallax: 0.35, driftX: 4, driftY: 2.5, alpha: 0.75 },
  { parallax: 0.6, driftX: -2.5, driftY: 3.5, alpha: 1 },
] as const;

/** Фон: кэшированный радиальный градиент + два тайловых слоя плавающей мути. */
export class Background {
  private gradient: HTMLCanvasElement | null = null;
  private readonly tiles = [makeSuspensionTile(1), makeSuspensionTile(2)];

  resize(cssW: number, cssH: number): void {
    const c = document.createElement('canvas');
    c.width = Math.max(1, cssW);
    c.height = Math.max(1, cssH);
    const ctx = c.getContext('2d')!;
    const r = Math.hypot(cssW, cssH) / 2;
    const g = ctx.createRadialGradient(cssW / 2, cssH / 2, r * 0.15, cssW / 2, cssH / 2, r);
    g.addColorStop(0, '#0b2b3b');
    g.addColorStop(1, '#03161e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);
    this.gradient = c;
  }

  draw(ctx: CanvasRenderingContext2D, cam: Camera, cssW: number, cssH: number, time: number): void {
    if (this.gradient) ctx.drawImage(this.gradient, 0, 0);
    for (let l = 0; l < LAYERS.length; l++) {
      const layer = LAYERS[l]!;
      const tile = this.tiles[l]!;
      const wrap = (v: number): number => ((v % TILE) + TILE) % TILE;
      const ox = wrap(-(cam.x * cam.scale * layer.parallax + time * layer.driftX));
      const oy = wrap(-(cam.y * cam.scale * layer.parallax + time * layer.driftY));
      ctx.globalAlpha = layer.alpha;
      for (let x = ox - TILE; x < cssW; x += TILE) {
        for (let y = oy - TILE; y < cssH; y += TILE) {
          ctx.drawImage(tile, x, y);
        }
      }
      ctx.globalAlpha = 1;
    }
  }
}

/** Тайл полупрозрачных клякс и волокон — рисуется один раз при старте. */
function makeSuspensionTile(seed: number): HTMLCanvasElement {
  const rng = createRng(seed * 7919);
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d')!;

  for (let i = 0; i < 26; i++) {
    const x = rng.range(0, TILE);
    const y = rng.range(0, TILE);
    const r = rng.range(10, 48);
    const a = rng.range(0.015, 0.05);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(185, 230, 255, ${a})`);
    g.addColorStop(1, 'rgba(185, 230, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  ctx.strokeStyle = 'rgba(200, 240, 255, 0.035)';
  for (let i = 0; i < 7; i++) {
    ctx.lineWidth = rng.range(1, 2.5);
    ctx.beginPath();
    const x = rng.range(0, TILE);
    const y = rng.range(0, TILE);
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + rng.range(-90, 90),
      y + rng.range(-90, 90),
      x + rng.range(-90, 90),
      y + rng.range(-90, 90),
      x + rng.range(-140, 140),
      y + rng.range(-140, 140),
    );
    ctx.stroke();
  }
  return c;
}
