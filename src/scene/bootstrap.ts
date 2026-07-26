import { Application, FILLMODE_FILL_WINDOW, RESOLUTION_AUTO } from 'playcanvas';

/**
 * PlayCanvas engine-only: устройства ввода движка не создаём —
 * ввод остаётся на наших нативных pointer-событиях (src/input.ts).
 * WebGL2 обязателен (WebGL1 удалён в v2) — при неудаче конструктор бросит,
 * main.ts покажет DOM-заглушку.
 */
export function createPcApp(canvas: HTMLCanvasElement): Application {
  const app = new Application(canvas, {});
  app.setCanvasResolution(RESOLUTION_AUTO);
  app.setCanvasFillMode(FILLMODE_FILL_WINDOW);
  app.graphicsDevice.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  window.addEventListener('resize', () => app.resizeCanvas());
  return app;
}
