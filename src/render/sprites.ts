import { FOOD_DEFS } from '../data/balance';

const FOOD_COLORS = ['#66ff99', '#ee4444', '#ffcc00'] as const;

/**
 * Пре-рендеренные спрайты еды с мягким свечением — градиенты считаются
 * при старте и ресайзе, в кадре только drawImage.
 *
 * pixelScale = dpr × масштаб камеры: спрайт запекается в физических пикселях,
 * иначе на retina-экранах еда мылится рядом с векторной клеткой игрока.
 */
export function makeFoodSprites(pixelScale: number): HTMLCanvasElement[] {
  return FOOD_DEFS.map((def, i) => {
    const glow = def.radius * 3;
    // Запас ×1.35 — белковая капля растянута по X в 1.3 раза, глоу не должен резаться.
    const half = glow * 1.35;
    const size = Math.max(2, Math.ceil(half * pixelScale) * 2);
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.scale(pixelScale, pixelScale);
    const cx = size / (2 * pixelScale);

    const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, glow);
    g.addColorStop(0, FOOD_COLORS[i as 0 | 1 | 2]);
    g.addColorStop(0.35, withAlpha(FOOD_COLORS[i as 0 | 1 | 2], 0.5));
    g.addColorStop(1, withAlpha(FOOD_COLORS[i as 0 | 1 | 2], 0));
    ctx.fillStyle = g;

    if (i === 1) {
      // Белковая капля — слегка вытянутая.
      ctx.save();
      ctx.translate(cx, cx);
      ctx.scale(1.3, 0.85);
      ctx.translate(-cx, -cx);
      ctx.fillRect(0, 0, size, size);
      ctx.restore();
    } else {
      ctx.fillRect(0, 0, size, size);
    }

    // Фазово-контрастная обводка.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (i === 1) ctx.ellipse(cx, cx, def.radius * 1.3, def.radius * 0.85, 0, 0, Math.PI * 2);
    else ctx.arc(cx, cx, def.radius, 0, Math.PI * 2);
    ctx.stroke();
    return c;
  });
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Гранулы органелл: фиксированные смещения в долях радиуса. */
const GRANULES = [
  [-0.35, 0.3],
  [0.15, 0.45],
  [0.45, 0.1],
  [-0.1, -0.45],
  [-0.5, -0.1],
  [0.3, -0.35],
] as const;

/**
 * Клетка игрока: полупрозрачная «дышащая» мембрана, смещённое ядро,
 * гранулы и влажный блик. Рисуется каждый кадр в мировых координатах.
 */
export function drawPlayerCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  baseR: number,
  time: number,
): void {
  const r = baseR * (1 + 0.025 * Math.sin(time * 2.1) + 0.012 * Math.sin(time * 3.7 + 1.3));

  // Мембрана.
  ctx.fillStyle = 'rgba(140, 200, 255, 0.55)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ядро, смещённое от центра.
  ctx.fillStyle = 'rgba(60, 20, 80, 0.95)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.24, y - r * 0.12, r * 0.36, r * 0.3, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Цитоплазматические гранулы.
  ctx.fillStyle = 'rgba(30, 60, 90, 0.35)';
  for (const [gx, gy] of GRANULES) {
    ctx.beginPath();
    ctx.arc(x + gx * r, y + gy * r, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // Блик влажности сверху-слева.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.32, y - r * 0.38, r * 0.4, r * 0.22, -0.6, 0, Math.PI * 2);
  ctx.fill();
}
