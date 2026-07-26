import { CameraFrame, type Application } from 'playcanvas';
import type { Cell } from '../sim/cell';
import type { SimEvent, World } from '../sim/world';
import { createPcApp } from './bootstrap';
import { CAM_DIST, FollowCamera } from './camera';
import { CreatureView } from './creature';
import { Environment } from './environment';
import { FoodPool } from './food';
import { FxSystem } from './fx';
import { PALETTE } from './palette';
import {
  bubbleTexture,
  giantSilhouetteTexture,
  radialTexture,
  rippleTexture,
  swirlTexture,
  waterTexture,
} from './textures';
import { Trails } from './trails';

/** Цвет вспышки по типу съеденного. */
const ATE_COLORS = [PALETTE.plantFoodBright, PALETTE.meatFoodPink, PALETTE.dnaFood] as const;

/** Фасад 3D-сцены: приложение, пост-эффекты и все визуальные подсистемы. */
export class SceneView {
  readonly app: Application;
  private readonly camera: FollowCamera;
  private readonly creature: CreatureView;
  private readonly food: FoodPool;
  private readonly fx: FxSystem;
  private readonly trails: Trails;
  private readonly env: Environment;

  constructor(canvas: HTMLCanvasElement) {
    const app = createPcApp(canvas);
    this.app = app;

    this.camera = new FollowCamera(app);
    const camComp = this.camera.entity.camera!;

    const device = app.graphicsDevice;
    const radial = radialTexture(device);
    this.env = new Environment(app, this.camera.rig, {
      water: waterTexture(device),
      bubble: bubbleTexture(device),
      radial,
      giant: giantSilhouetteTexture(device),
    });

    this.creature = new CreatureView(app, radial);
    this.food = new FoodPool(app);
    this.trails = new Trails(app, swirlTexture(device), rippleTexture(device));
    this.fx = new FxSystem(app, radial, this.camera.entity.getRotation());

    // Пост-эффекты: главное — сильная глубина резкости (половина «объёма»
    // в Spore); bloom едва заметен, обводок и жёстких свечений там нет.
    const frame = new CameraFrame(app, camComp);
    frame.bloom.intensity = 0.008;
    frame.bloom.blurLevel = 6;
    frame.vignette.intensity = 0.35;
    frame.vignette.inner = 0.6;
    frame.vignette.outer = 1.3;
    frame.vignette.curvature = 0.5;
    frame.dof.enabled = true;
    frame.dof.focusDistance = CAM_DIST;
    frame.dof.focusRange = 5;
    frame.dof.blurRadius = 5;
    frame.dof.nearBlur = true;
    frame.grading.enabled = true;
    frame.grading.saturation = 1.12;
    frame.grading.brightness = 1.04;
    frame.update();

    app.start();
  }

  snapTo(player: Cell): void {
    this.camera.snapTo(player.x, player.y);
  }

  screenToSim(sx: number, sy: number, out: { x: number; y: number }): boolean {
    return this.camera.screenToSim(sx, sy, out);
  }

  syncFromWorld(
    world: World,
    renderX: number,
    renderY: number,
    events: readonly SimEvent[],
    dt: number,
    time: number,
  ): void {
    for (const e of events) {
      if (e.t === 'ate') {
        this.fx.burst(e.x, e.y, ATE_COLORS[e.food]);
        this.trails.ripple(e.x, e.y, 2.2);
        this.creature.poke();
      } else if (e.t === 'dnaGain') {
        this.fx.burst(e.x, e.y, PALETTE.dnaFood);
      }
    }

    const p = world.player;
    this.creature.update(renderX, renderY, p.vx, p.vy, p.radius, dt, time);
    this.trails.emit(renderX, renderY, p.vx, p.vy, p.radius, dt);
    this.trails.update(dt);
    this.food.sync(world.food, time);
    this.fx.update(dt);
    this.camera.follow(renderX, renderY, dt);
    const rig = this.camera.rig.getPosition();
    this.env.update(time, rig.x, rig.z);
  }
}
