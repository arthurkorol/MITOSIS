import {
  BLEND_NORMAL,
  Color,
  Curve,
  CurveSet,
  EMITTERSHAPE_BOX,
  Entity,
  FOG_LINEAR,
  StandardMaterial,
  Vec3,
  type Application,
  type Texture,
} from 'playcanvas';
import { createRng } from '../core/rng';
import { WORLD } from '../data/balance';
import { PALETTE } from './palette';
import { simLen } from './units';

/** Подложка воды под плоскостью геймплея (юниты). */
export const WATER_Y = -13;
const GIANTS_Y = -9.5;

interface DriftLayer {
  y: number;
  spanY: number;
  count: number;
  sizeMin: number;
  sizeMax: number;
  alpha: number;
}

/**
 * Пузыри в трёх масштабах и marine snow. Пустая вода — не по-споровски:
 * крупные ближние пузыри уходят в боке под nearBlur, дальние — в дымку.
 */
const BUBBLES: DriftLayer[] = [
  { y: 9.5, spanY: 4, count: 7, sizeMin: 0.7, sizeMax: 1.9, alpha: 0.3 },
  { y: 1.5, spanY: 3, count: 18, sizeMin: 0.25, sizeMax: 0.7, alpha: 0.35 },
  { y: -6, spanY: 3, count: 12, sizeMin: 1.2, sizeMax: 3.0, alpha: 0.18 },
];
const SNOW: DriftLayer = {
  y: 0.5,
  spanY: 6,
  count: 150,
  sizeMin: 0.05,
  sizeMax: 0.13,
  alpha: 0.7,
};

const GIANT_COUNT = 6;
/** Шаг сетки, по которой раскладываются силуэты гигантов (юниты). */
const GIANT_CELL = 52;

export class Environment {
  private readonly giants: Entity[] = [];

  constructor(
    app: Application,
    rig: Entity,
    tex: { water: Texture; bubble: Texture; radial: Texture; giant: Texture },
  ) {
    const scene = app.scene;
    // Светлая сцена: ambient несёт основную заливку, свет лишь лепит объём.
    scene.ambientLight = new Color(0.82, 0.92, 0.96);
    scene.fog.type = FOG_LINEAR;
    scene.fog.color = PALETTE.fog;
    scene.fog.start = 60;
    scene.fog.end = 260;

    // Свет почти сверху: при виде top-down именно он лепит спины существ.
    const key = new Entity('KeyLight');
    key.addComponent('light', {
      type: 'directional',
      color: new Color(1.0, 0.98, 0.92),
      intensity: 1.7,
      castShadows: false,
    });
    key.setEulerAngles(78, 18, 0);
    app.root.addChild(key);

    const fill = new Entity('FillLight');
    fill.addComponent('light', {
      type: 'directional',
      color: new Color(0.55, 0.82, 0.9),
      intensity: 0.55,
      castShadows: false,
    });
    fill.setEulerAngles(-40, 205, 0);
    app.root.addChild(fill);

    // Подложка воды: одна акварельная текстура на весь мир, без тайлов.
    const worldUnits = simLen(WORLD.size);
    const waterMat = new StandardMaterial();
    waterMat.diffuse = new Color(1, 1, 1);
    waterMat.diffuseMap = tex.water;
    waterMat.useLighting = false; // ровный painterly-тон, без бликов
    waterMat.update();
    const water = new Entity('WaterBed');
    water.addComponent('render', { type: 'plane' });
    water.render!.material = waterMat;
    water.setLocalScale(worldUnits, 1, worldUnits);
    water.setPosition(0, WATER_Y, 0);
    app.root.addChild(water);

    // Размытые силуэты гигантов в глубине — «murky visions of larger animals».
    const rng = createRng(0x91a7);
    for (let i = 0; i < GIANT_COUNT; i++) {
      const mat = new StandardMaterial();
      mat.diffuse = i % 2 === 0 ? new Color(0.32, 0.18, 0.28) : new Color(0.24, 0.3, 0.42);
      mat.useLighting = false;
      mat.opacityMap = tex.giant;
      mat.opacity = i % 2 === 0 ? 0.28 : 0.22;
      mat.blendType = BLEND_NORMAL;
      mat.depthWrite = false;
      mat.update();
      const g = new Entity('Giant');
      g.addComponent('render', { type: 'plane' });
      g.render!.material = mat;
      const size = rng.range(26, 62);
      g.setLocalScale(size, 1, size * rng.range(0.55, 0.8));
      g.setEulerAngles(0, rng.range(0, 360), 0);
      app.root.addChild(g);
      this.giants.push(g);
    }

    // Пузыри и marine snow дрейфуют вместе с ригом камеры.
    for (const layer of BUBBLES) this.addDrift(rig, layer, tex.bubble, 1, 0.55);
    this.addDrift(rig, SNOW, tex.radial, 0.9, 1);
  }

  private addDrift(
    rig: Entity,
    layer: DriftLayer,
    map: Texture,
    tint: number,
    rise: number,
  ): void {
    const e = new Entity('Drift');
    e.setLocalPosition(0, layer.y, 0);
    e.addComponent('particlesystem', {
      numParticles: layer.count,
      lifetime: 16,
      rate: 16 / layer.count,
      rate2: 16 / layer.count,
      loop: true,
      preWarm: true,
      autoPlay: true,
      emitterShape: EMITTERSHAPE_BOX,
      emitterExtents: new Vec3(130, layer.spanY * 2, 130),
      blendType: BLEND_NORMAL,
      colorMap: map,
      localSpace: false,
      depthWrite: false,
      scaleGraph: new Curve([0, layer.sizeMin, 1, layer.sizeMax]),
      alphaGraph: new Curve([0, 0, 0.15, layer.alpha, 0.75, layer.alpha, 1, 0]),
      colorGraph: new CurveSet([
        [0, tint],
        [0, tint],
        [0, tint],
      ]),
      velocityGraph: new CurveSet([
        [0, -0.3],
        [0, 0.05 * rise],
        [0, -0.3],
      ]),
      velocityGraph2: new CurveSet([
        [0, 0.3],
        [0, 0.4 * rise],
        [0, 0.3],
      ]),
    });
    rig.addChild(e);
  }

  /** Раскладывает силуэты по детерминированной сетке вокруг игрока. */
  update(time: number, playerX: number, playerZ: number): void {
    const baseCx = Math.floor(playerX / GIANT_CELL);
    const baseCz = Math.floor(playerZ / GIANT_CELL);
    for (let i = 0; i < this.giants.length; i++) {
      const cx = baseCx + (i % 3) - 1;
      const cz = baseCz + Math.floor(i / 3) - 1;
      const h = Math.abs(Math.sin(cx * 127.1 + cz * 311.7 + i * 17.3) * 43758.5453) % 1;
      const drift = time * 0.35 * (0.4 + h);
      this.giants[i]!.setPosition(
        (cx + h) * GIANT_CELL + Math.sin(drift) * 6,
        GIANTS_Y - h * 2,
        (cz + ((h * 7) % 1)) * GIANT_CELL + Math.cos(drift * 0.7) * 6,
      );
    }
  }
}
