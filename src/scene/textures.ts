import { ADDRESS_CLAMP_TO_EDGE, Texture, type GraphicsDevice } from 'playcanvas';
import { createRng } from '../core/rng';

/** Runtime-текстуры из canvas — никаких внешних ассетов. */
function canvasTexture(
  device: GraphicsDevice,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
): Texture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  draw(c.getContext('2d')!, size);
  const tex = new Texture(device, { width: size, height: size, mipmaps: true });
  tex.setSource(c);
  tex.addressU = ADDRESS_CLAMP_TO_EDGE;
  tex.addressV = ADDRESS_CLAMP_TO_EDGE;
  return tex;
}

/**
 * Мягкое радиальное пятно с альфа-градиентом — для opacityMap
 * (тень, кляксы дна) и colorMap частиц.
 */
export function radialTexture(device: GraphicsDevice, size = 128, hardness = 0): Texture {
  return canvasTexture(device, size, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, (s / 2) * hardness, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/**
 * Радиальное пятно «белое на чёрном» (без альфы) — для emissiveMap аддитивных
 * материалов: у BLEND_ADDITIVE emissive НЕ умножается на opacity, затухание
 * обязано сидеть в самом цвете.
 */
export function radialEmissiveTexture(device: GraphicsDevice, size = 128): Texture {
  return canvasTexture(device, size, (ctx, s) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, s, s);
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** Полоса луча «белое на чёрном» — emissiveMap для аддитивных лучей света. */
export function shaftTexture(device: GraphicsDevice): Texture {
  return canvasTexture(device, 128, (ctx, s) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x++) {
      // Горизонтальное сужение × вертикальное затухание.
      const nx = x / s;
      const horiz = Math.max(0, 1 - Math.abs(nx - 0.5) * 2.6);
      const grad = ctx.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      const peak = Math.round(horiz * horiz * 255);
      grad.addColorStop(0.35, `rgb(${peak},${peak},${peak})`);
      grad.addColorStop(0.85, `rgb(${Math.round(peak * 0.35)},${Math.round(peak * 0.35)},${Math.round(peak * 0.35)})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 1, s);
    }
  });
}

/**
 * Дно: ЕДИНАЯ текстура 2048², растянутая на весь мир — тайлов и швов не существует.
 * Палитра дока #03161E → #0B2B3B, пятна рельефа, затемнение к краям мира.
 */
export function floorTexture(device: GraphicsDevice): Texture {
  return canvasTexture(device, 2048, (ctx, s) => {
    const rng = createRng(0xf10c);
    ctx.fillStyle = '#071e29';
    ctx.fillRect(0, 0, s, s);
    // Крупные мягкие пятна двух оттенков.
    for (let i = 0; i < 260; i++) {
      const x = rng.range(0, s);
      const y = rng.range(0, s);
      const r = rng.range(40, 260);
      const dark = rng.next() < 0.5;
      const a = rng.range(0.05, 0.16);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, dark ? `rgba(3, 22, 30, ${a})` : `rgba(11, 43, 59, ${a})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Редкие светлые «отложения».
    for (let i = 0; i < 60; i++) {
      const x = rng.range(0, s);
      const y = rng.range(0, s);
      const r = rng.range(15, 70);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(26, 74, 94, ${rng.range(0.04, 0.1)})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Затемнение к краям мира — граница арены читается атмосферно.
    const edge = ctx.createRadialGradient(s / 2, s / 2, s * 0.33, s / 2, s / 2, s * 0.72);
    edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
    edge.addColorStop(1, 'rgba(1, 8, 12, 0.85)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, s, s);
  });
}
