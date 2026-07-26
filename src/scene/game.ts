import { FIXED_DT } from '../data/balance';
import { Input } from '../input';
import { createWorld, stepWorld, type SimEvent, type World } from '../sim/world';
import { Hud } from '../ui/hud';
import { SceneView } from './view';

/**
 * Связка симуляции и сцены. Единственный rAF — движковый:
 * аккумулятор фиксированного шага 60 Гц живёт в app.on('update').
 */
export class Game {
  private readonly world: World;
  private readonly view: SceneView;
  private readonly hud: Hud;
  private readonly input = new Input();
  private paused = false;
  private acc = 0;
  private time = 0;
  /** События копятся за кадр: stepWorld чистит world.events каждый тик. */
  private readonly frameEvents: SimEvent[] = [];
  private prevPX = 0;
  private prevPY = 0;
  private readonly aim = { x: 0, y: 0 };
  private fpsAcc = 0;
  private fpsFrames = 0;

  constructor(
    canvas: HTMLCanvasElement,
    hudRoot: HTMLElement,
    private readonly debugEl: HTMLElement | null,
    private readonly seed: number,
  ) {
    this.world = createWorld(seed);
    this.view = new SceneView(canvas);
    this.view.snapTo(this.world.player);
    this.hud = new Hud(hudRoot);
    this.input.attach(canvas);
    if (debugEl) debugEl.hidden = false;

    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
    });

    this.view.app.on('update', this.frame);
  }

  private readonly frame = (dt: number): void => {
    const p = this.world.player;
    if (!this.paused) {
      this.time += dt;
      // Прицел: экран → плоскость геймплея; без указателя клетка стоит.
      this.aim.x = p.x;
      this.aim.y = p.y;
      if (this.input.pointerActive) {
        this.view.screenToSim(this.input.pointerX, this.input.pointerY, this.aim);
      }
      this.acc = Math.min(this.acc + dt, 0.25);
      while (this.acc >= FIXED_DT) {
        this.prevPX = p.x;
        this.prevPY = p.y;
        stepWorld(this.world, { aimX: this.aim.x, aimY: this.aim.y }, FIXED_DT);
        this.frameEvents.push(...this.world.events);
        this.acc -= FIXED_DT;
      }
    }

    const alpha = this.acc / FIXED_DT;
    const renderX = this.prevPX + (p.x - this.prevPX) * alpha;
    const renderY = this.prevPY + (p.y - this.prevPY) * alpha;
    this.view.syncFromWorld(this.world, renderX, renderY, this.frameEvents, dt, this.time);
    this.frameEvents.length = 0;
    this.hud.update(this.world);
    if (this.debugEl) this.updateDebug(dt);
  };

  private updateDebug(dt: number): void {
    this.fpsAcc += dt;
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
