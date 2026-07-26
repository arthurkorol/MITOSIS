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
 * (тень, кляксы) и colorMap частиц.
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
 * Пузырь: прозрачная середина, светлая окантовка и блик сверху-слева.
 * Пузыри — визитная карточка клеточной стадии, их должно быть много.
 */
export function bubbleTexture(device: GraphicsDevice, size = 128): Texture {
  return canvasTexture(device, size, (ctx, s) => {
    const r = s / 2 - 2;
    // Мягкая оболочка.
    const shell = ctx.createRadialGradient(s / 2, s / 2, r * 0.55, s / 2, s / 2, r);
    shell.addColorStop(0, 'rgba(255,255,255,0.05)');
    shell.addColorStop(0.82, 'rgba(255,255,255,0.5)');
    shell.addColorStop(0.94, 'rgba(255,255,255,0.72)');
    shell.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    ctx.fill();
    // Блик.
    const hx = s * 0.36;
    const hy = s * 0.33;
    const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.28);
    hl.addColorStop(0, 'rgba(255,255,255,0.95)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, s, s);
  });
}

/**
 * Вихревой след: изогнутая дуга-лента, бледная, растворяющаяся к концам.
 * За каждой клеткой в Spore тянутся такие завитки — они делают воду вязкой.
 */
export function swirlTexture(device: GraphicsDevice, size = 256): Texture {
  return canvasTexture(device, size, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) {
      const inset = 0.16 + pass * 0.12;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * (0.5 - inset), Math.PI * 0.15, Math.PI * 1.05);
      const grad = ctx.createLinearGradient(0, 0, s, s);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.45, `rgba(255,255,255,${0.85 - pass * 0.35})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = s * (0.035 - pass * 0.012);
      ctx.stroke();
    }
  });
}

/** Кольцевая рябь вокруг движущихся клеток. */
export function rippleTexture(device: GraphicsDevice, size = 256): Texture {
  return canvasTexture(device, size, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = s * 0.018;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = s * 0.01;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.33, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/**
 * Подложка воды: акварельно-мраморные разводы бирюзы — «капля под микроскопом».
 * Одна текстура на весь мир: тайлов и швов не существует.
 */
export function waterTexture(device: GraphicsDevice): Texture {
  return canvasTexture(device, 2048, (ctx, s) => {
    const rng = createRng(0x5c0e);
    ctx.fillStyle = '#63c6d9';
    ctx.fillRect(0, 0, s, s);

    // Крупные мраморные разводы светлее и глубже базового тона.
    for (let i = 0; i < 220; i++) {
      const x = rng.range(0, s);
      const y = rng.range(0, s);
      const r = rng.range(120, 460);
      const light = rng.next() < 0.55;
      const a = rng.range(0.05, 0.14);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, light ? `rgba(163, 226, 236, ${a})` : `rgba(46, 130, 158, ${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Тёплые песочные «осадки» — намёк на дно чашки Петри.
    for (let i = 0; i < 70; i++) {
      const x = rng.range(0, s);
      const y = rng.range(0, s);
      const r = rng.range(60, 260);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(222, 212, 190, ${rng.range(0.04, 0.11)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // Мягкое осветление к центру мира — «свет микроскопа».
    const glow = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.62);
    glow.addColorStop(0, 'rgba(214, 244, 250, 0.35)');
    glow.addColorStop(1, 'rgba(214, 244, 250, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, s, s);

    // Затемнение у самых краёв мира — граница арены читается без забора.
    const edge = ctx.createRadialGradient(s / 2, s / 2, s * 0.4, s / 2, s / 2, s * 0.72);
    edge.addColorStop(0, 'rgba(24, 86, 112, 0)');
    edge.addColorStop(1, 'rgba(24, 86, 112, 0.5)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, s, s);
  });
}

/** Размытый силуэт гиганта в глубине — «murky visions of larger animals». */
export function giantSilhouetteTexture(device: GraphicsDevice, size = 512): Texture {
  return canvasTexture(device, size, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    // Вытянутая туша с «горбом» — читается как крупное существо, а не круг.
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.scale(1, 0.52);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(s * 0.66, s * 0.44);
    ctx.scale(1, 0.6);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
