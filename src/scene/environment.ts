import {
  BLEND_ADDITIVE,
  BLEND_NORMAL,
  Color,
  Curve,
  CurveSet,
  EMITTERSHAPE_BOX,
  Entity,
  FOG_EXP2,
  StandardMaterial,
  Vec3,
  type Application,
  type Texture,
} from 'playcanvas';
import { createRng } from '../core/rng';
import { WORLD } from '../data/balance';
import { simLen } from './units';

/** Y-уровни толщи воды (юниты). Плоскость геймплея — Y=0. */
export const FLOOR_Y = -16.25;
const BLOBS_Y = -14.4;

interface SuspensionLayer {
  y: number;
  spanY: number;
  count: number;
  sizeMin: number;
  sizeMax: number;
  alpha: number;
}

/** Три слоя взвеси: над плоскостью (ловит nearBlur-боке), на уровне, в глубине. */
const SUSPENSION: SuspensionLayer[] = [
  { y: 7.5, spanY: 3.75, count: 60, sizeMin: 0.19, sizeMax: 0.38, alpha: 0.1 },
  { y: -1.9, spanY: 1.9, count: 120, sizeMin: 0.12, sizeMax: 0.25, alpha: 0.16 },
  { y: -10, spanY: 2.5, count: 80, sizeMin: 0.5, sizeMax: 1.0, alpha: 0.09 },
];

const SHAFT_COUNT = 8;
/** Шаг детерминированной сетки лучей света (юниты). */
const SHAFT_CELL = 94;

export class Environment {
  private readonly shafts: Entity[] = [];
  private readonly shaftMats: StandardMaterial[] = [];

  constructor(
    app: Application,
    rig: Entity,
    cameraEntity: Entity,
    tex: { floor: Texture; radial: Texture; shaft: Texture },
    fxLayerId: number,
  ) {
    const scene = app.scene;
    scene.ambientLight = new Color(0.063, 0.188, 0.243);
    scene.fog.type = FOG_EXP2;
    scene.fog.color = new Color(0.016, 0.106, 0.149);
    scene.fog.density = 0.0072;

    // Ключевой свет сверху-слева и заполняющий «отсвет глубины» снизу.
    const key = new Entity('KeyLight');
    key.addComponent('light', {
      type: 'directional',
      color: new Color(0.81, 0.91, 1.0),
      intensity: 1.1,
      castShadows: false,
    });
    key.setEulerAngles(60, 30, 0);
    app.root.addChild(key);

    const fill = new Entity('FillLight');
    fill.addComponent('light', {
      type: 'directional',
      color: new Color(0.12, 0.35, 0.43),
      intensity: 0.25,
      castShadows: false,
    });
    fill.setEulerAngles(-50, 200, 0);
    app.root.addChild(fill);

    // Дно: одна плоскость с единой текстурой на весь мир — швов не существует.
    const worldUnits = simLen(WORLD.size);
    const floorMat = new StandardMaterial();
    floorMat.diffuse = new Color(1, 1, 1);
    floorMat.diffuseMap = tex.floor;
    floorMat.gloss = 0.15;
    floorMat.update();
    const floor = new Entity('SeaFloor');
    floor.addComponent('render', { type: 'plane' });
    floor.render!.material = floorMat;
    floor.setLocalScale(worldUnits, 1, worldUnits);
    floor.setPosition(0, FLOOR_Y, 0);
    app.root.addChild(floor);

    // Крупные мягкие кляксы на дне — под farBlur DoF дают глубину.
    const blobMat = new StandardMaterial();
    blobMat.diffuse = new Color(0.1, 0.29, 0.37);
    blobMat.opacityMap = tex.radial;
    blobMat.opacity = 0.15;
    blobMat.blendType = BLEND_NORMAL;
    blobMat.depthWrite = false;
    blobMat.update();
    const rng = createRng(0xb70b5);
    for (let i = 0; i < 40; i++) {
      const blob = new Entity('FloorBlob');
      blob.addComponent('render', { type: 'plane' });
      blob.render!.material = blobMat;
      const size = rng.range(19, 56);
      blob.setLocalScale(size, 1, size);
      blob.setPosition(
        rng.range(-worldUnits / 2, worldUnits / 2),
        BLOBS_Y + rng.range(-0.5, 0.5),
        rng.range(-worldUnits / 2, worldUnits / 2),
      );
      blob.setEulerAngles(0, rng.range(0, 360), 0);
      app.root.addChild(blob);
    }

    // Взвесь: три particlesystem на риге камеры. sort=NONE обязателен (GPU-симуляция).
    for (const layer of SUSPENSION) {
      const e = new Entity('Suspension');
      e.setLocalPosition(0, layer.y, 0);
      e.addComponent('particlesystem', {
        numParticles: layer.count,
        lifetime: 12,
        rate: 12 / layer.count,
        rate2: 12 / layer.count,
        loop: true,
        preWarm: true,
        autoPlay: true,
        emitterShape: EMITTERSHAPE_BOX,
        emitterExtents: new Vec3(150, layer.spanY * 2, 150),
        blendType: BLEND_ADDITIVE,
        colorMap: tex.radial,
        localSpace: false,
        screenSpace: false,
        scaleGraph: new Curve([0, layer.sizeMin, 1, layer.sizeMax]),
        alphaGraph: new Curve([0, 0, 0.2, layer.alpha, 0.8, layer.alpha, 1, 0]),
        colorGraph: new CurveSet([
          [0, 0.72],
          [0, 0.9],
          [0, 1],
        ]),
        velocityGraph: new CurveSet([[0, -0.35], [0, -0.08], [0, -0.35]]),
        velocityGraph2: new CurveSet([[0, 0.35], [0, 0.14], [0, 0.35]]),
      });
      rig.addChild(e);
    }

    // Лучи света: пул наклонных аддитивных квадов, билборды к камере.
    // Затухание — в emissiveMap: у аддитива emissive не умножается на opacity.
    const camRot = cameraEntity.getRotation().clone();
    for (let i = 0; i < SHAFT_COUNT; i++) {
      const mat = new StandardMaterial();
      mat.diffuse = new Color(0, 0, 0);
      mat.emissive = new Color(0.5, 0.85, 0.91);
      mat.emissiveMap = tex.shaft;
      mat.emissiveIntensity = 0.18;
      mat.blendType = BLEND_ADDITIVE;
      mat.depthWrite = false;
      mat.update();
      const shaft = new Entity('LightShaft');
      shaft.addComponent('render', { type: 'plane', layers: [fxLayerId] });
      shaft.render!.material = mat;
      shaft.setRotation(camRot);
      shaft.rotateLocal(90, 0, 0);
      shaft.rotateLocal(0, 0, i % 2 === 0 ? 14 : -11);
      app.root.addChild(shaft);
      this.shafts.push(shaft);
      this.shaftMats.push(mat);
    }
  }

  /** Перекладывает лучи по детерминированной сетке вокруг игрока, пульсирует яркость. */
  update(time: number, playerX: number, playerZ: number): void {
    const baseCx = Math.floor(playerX / SHAFT_CELL);
    const baseCz = Math.floor(playerZ / SHAFT_CELL);
    for (let i = 0; i < this.shafts.length; i++) {
      const cx = baseCx + (i % 3) - 1;
      const cz = baseCz + Math.floor(i / 3) - 1;
      const h = Math.abs(Math.sin(cx * 127.1 + cz * 311.7 + i * 17.3) * 43758.5453) % 1;
      const shaft = this.shafts[i]!;
      shaft.setPosition(
        (cx + h) * SHAFT_CELL,
        2,
        (cz + (h * 7) % 1) * SHAFT_CELL,
      );
      const w = 12 + h * 10;
      shaft.setLocalScale(w, 1, 78);
      const pulse = 0.18 * (1 + 0.3 * Math.sin(time * 0.31 + h * 6.28));
      this.shaftMats[i]!.emissiveIntensity = pulse;
    }
  }
}
