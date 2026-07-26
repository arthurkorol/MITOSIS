import { CameraFrame, Layer, type Application } from 'playcanvas';
import type { Cell } from '../sim/cell';
import type { SimEvent, World } from '../sim/world';
import { createPcApp } from './bootstrap';
import { CAM_DIST, FollowCamera } from './camera';
import { CreatureView } from './creature';
import { Environment } from './environment';
import { FoodPool } from './food';
import { FxSystem } from './fx';
import { floorTexture, radialEmissiveTexture, radialTexture, shaftTexture } from './textures';

/** Цвета вспышек поглощения по типу еды (RGB 0–255). */
const ATE_COLORS = [
  [140, 255, 170],
  [255, 140, 100],
  [255, 215, 90],
] as const;

/**
 * Фасад 3D-сцены: PlayCanvas-приложение, слои, пост-эффекты и все визуальные
 * подсистемы. Потребляет World после шагов симуляции.
 */
export class SceneView {
  readonly app: Application;
  private readonly camera: FollowCamera;
  private readonly creature: CreatureView;
  private readonly food: FoodPool;
  private readonly fx: FxSystem;
  private readonly env: Environment;

  constructor(canvas: HTMLCanvasElement) {
    const app = createPcApp(canvas);
    this.app = app;

    // Слои: CellBack (задние полусферы мембран) до World-transparent, FX — после всего.
    const comp = app.scene.layers;
    const worldLayer = comp.getLayerByName('World')!;
    const cellBack = new Layer({ name: 'CellBack' });
    const fxLayer = new Layer({ name: 'FX' });
    comp.insertTransparent(cellBack, comp.getTransparentIndex(worldLayer));
    comp.pushTransparent(fxLayer);

    this.camera = new FollowCamera(app);
    const camComp = this.camera.entity.camera!;
    camComp.layers = [...camComp.layers, cellBack.id, fxLayer.id];

    const device = app.graphicsDevice;
    const radial = radialTexture(device);
    const textures = { floor: floorTexture(device), radial, shaft: shaftTexture(device) };

    this.env = new Environment(app, this.camera.rig, this.camera.entity, textures, fxLayer.id);

    // Направление ключевого света — для псевдо-SSS мембраны.
    const keyDir = app.root.findByName('KeyLight')!.forward;
    this.creature = new CreatureView(app, cellBack.id, keyDir, radial);
    this.food = new FoodPool(app);
    this.fx = new FxSystem(app, fxLayer.id, radialEmissiveTexture(device), this.camera.entity.getRotation());

    // Пост-эффекты: bloom на эмиссивной еде, виньетка-«окуляр», DoF на плоскости геймплея.
    const frame = new CameraFrame(app, camComp);
    frame.bloom.intensity = 0.02;
    frame.bloom.blurLevel = 5;
    frame.vignette.intensity = 0.6;
    frame.vignette.inner = 0.5;
    frame.vignette.outer = 1.0;
    frame.vignette.curvature = 0.5;
    frame.dof.enabled = true;
    frame.dof.focusDistance = CAM_DIST;
    frame.dof.focusRange = 30;
    frame.dof.blurRadius = 3;
    frame.dof.nearBlur = true;
    frame.update();

    app.start();
  }

  snapTo(player: Cell): void {
    this.camera.snapTo(player.x, player.y);
  }

  screenToSim(sx: number, sy: number, out: { x: number; y: number }): boolean {
    return this.camera.screenToSim(sx, sy, out);
  }

  /** Синхронизация после сим-шагов кадра. renderX/renderY — интерполированная позиция игрока. */
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
        this.creature.poke();
      } else if (e.t === 'dnaGain') {
        this.fx.burst(e.x, e.y, ATE_COLORS[2]);
      }
    }

    const p = world.player;
    this.creature.update(renderX, renderY, p.vx, p.vy, p.radius, dt, time);
    this.food.sync(world.food, time);
    this.fx.update(dt);
    this.camera.follow(renderX, renderY, dt);
    const rig = this.camera.rig.getPosition();
    this.env.update(time, rig.x, rig.z);
  }
}
