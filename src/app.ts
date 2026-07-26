import { Camera } from './camera';
import { Input } from './input';
import { GameLoop } from './loop';
import { Effects } from './render/effects';
import { Renderer } from './render/renderer';
import { createWorld, stepWorld, type World } from './sim/world';
import { Hud } from './ui/hud';

/** Цвета вспышек поглощения по типу еды. */
const ATE_COLORS = [
  [140, 255, 170],
  [255, 140, 100],
  [255, 215, 90],
] as const;

export class App {
  private readonly world: World;
  private readonly camera = new Camera();
  private readonly input = new Input();
  private readonly renderer: Renderer;
  private readonly hud: Hud;
  private readonly effects = new Effects();
  private readonly loop: GameLoop;
  private paused = false;
  private lastRenderMs: number | null = null;
  private fpsAcc = 0;
  private fpsFrames = 0;

  constructor(
    canvas: HTMLCanvasElement,
    hudRoot: HTMLElement,
    private readonly debugEl: HTMLElement | null,
    private readonly seed: number,
  ) {
    this.world = createWorld(seed);
    this.camera.snapTo(this.world.player.x, this.world.player.y);
    this.renderer = new Renderer(canvas);
    this.hud = new Hud(hudRoot);
    this.input.attach(canvas);
    this.loop = new GameLoop(this.step, this.render);
    if (debugEl) debugEl.hidden = false;

    // Автопауза при уходе со вкладки.
    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
    });
  }

  start(): void {
    this.loop.start();
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.camera.viewportW = cssW;
    this.camera.viewportH = cssH;
    this.renderer.resize(cssW, cssH, dpr);
  }

  private readonly step = (dt: number): void => {
    if (this.paused) return;
    const p = this.world.player;
    const aimX = this.input.pointerActive ? this.camera.screenToWorldX(this.input.pointerX) : p.x;
    const aimY = this.input.pointerActive ? this.camera.screenToWorldY(this.input.pointerY) : p.y;
    stepWorld(this.world, { aimX, aimY }, dt);

    for (const e of this.world.events) {
      if (e.t === 'ate') {
        const c = ATE_COLORS[e.food];
        this.effects.burst(e.x, e.y, c, 6, 70);
      } else if (e.t === 'dnaGain') {
        this.effects.burst(e.x, e.y, ATE_COLORS[2], 10, 95);
      }
    }
  };

  private readonly render = (): void => {
    const now = performance.now();
    const rdt = this.lastRenderMs === null ? 0 : Math.min((now - this.lastRenderMs) / 1000, 0.1);
    this.lastRenderMs = now;

    const p = this.world.player;
    this.camera.follow(p.x, p.y, rdt);
    this.effects.update(rdt);
    this.renderer.draw(this.world, this.camera, now / 1000, this.effects);
    this.hud.update(this.world);
    if (this.debugEl) this.updateDebug(rdt);
  };

  private updateDebug(rdt: number): void {
    this.fpsAcc += rdt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.debugEl!.textContent =
        `fps ${fps}\n` +
        `seed ${this.seed}\n` +
        `food ${this.world.food.length}\n` +
        `tick ${this.world.tick}`;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
  }
}
