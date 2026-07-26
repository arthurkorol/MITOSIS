import {
  BLEND_NORMAL,
  Color,
  CULLFACE_NONE,
  Entity,
  Mesh,
  MeshInstance,
  SHADERLANGUAGE_GLSL,
  SphereGeometry,
  StandardMaterial,
  type Application,
  type Texture,
} from 'playcanvas';
import { clamp, expDecay } from '../core/math';
import { PLAYER } from '../data/balance';
import { CHUNKS_VERSION, FLAGELLA_TRANSFORM_VS, MEMBRANE_TRANSFORM_VS } from './chunks';
import { PALETTE } from './palette';
import { WATER_Y } from './environment';
import { simLen, simToSceneX, simToSceneZ } from './units';

const CILIA_COUNT = 14;
const FLAG_RIBBONS = 2;
const FLAG_SEGMENTS = 20;

/**
 * Существо игрока в духе клеточной стадии Spore:
 * каплевидное леденцовое тело, костяно-кремовые придатки, огромные
 * мультяшные глаза на стебельках, жвалы-рот и венец ресничек.
 * Обводок нет — только мягкий свет и глянцевый блик.
 */
export class CreatureView {
  readonly root = new Entity('Player');
  private readonly skin: Texture;

  private readonly bodyMat: StandardMaterial;
  private readonly flagellaMat: StandardMaterial;
  private readonly ciliaMat: StandardMaterial;
  private readonly eyes: Entity[] = [];
  private readonly jawL = new Entity('JawL');
  private readonly jawR = new Entity('JawR');
  private readonly shadow = new Entity('ShadowBlob');
  private yaw = 0;
  private roll = 0;
  private pulse = 0;

  constructor(app: Application, radialTex: Texture, skinTex: Texture) {
    const device = app.graphicsDevice;
    this.skin = skinTex;
    const sphere = Mesh.fromGeometry(
      device,
      new SphereGeometry({ radius: 1, latitudeBands: 28, longitudeBands: 40 }),
    );

    // Тело: непрозрачное леденцовое, глянцевое, с лёгкой шумовой «живостью».
    this.bodyMat = new StandardMaterial();
    // Цвет тела живёт в текстуре кожи; diffuse держим белым, иначе тон
    // умножается на себя и леденцовый оранжевый уходит в тёмно-бурый.
    this.bodyMat.diffuse = new Color(1, 1, 1);
    this.bodyMat.diffuseMap = this.skin;
    // Лёгкий самосвет не даёт спине уходить в тень при виде сверху.
    this.bodyMat.emissive = PALETTE.playerBody;
    this.bodyMat.emissiveIntensity = 0.18;
    this.bodyMat.specular = new Color(1, 0.95, 0.85);
    this.bodyMat.gloss = 0.82;
    this.bodyMat.useMetalness = false;
    this.bodyMat.shaderChunksVersion = CHUNKS_VERSION;
    this.bodyMat.getShaderChunks(SHADERLANGUAGE_GLSL).set('transformVS', MEMBRANE_TRANSFORM_VS);
    this.bodyMat.update();
    this.bodyMat.setParameter('uTime', 0);
    this.bodyMat.setParameter('uPulse', 0);

    const body = new Entity('Body');
    body.addComponent('render', { meshInstances: [new MeshInstance(sphere, this.bodyMat)] });
    // Каплевидность: длиннее, чем шире, и приплюснуто сверху.
    body.setLocalScale(0.78, 0.62, 1.15);
    this.root.addChild(body);

    // Кремовые материалы придатков — правило «яркое тело + костяные детали».
    const boneMat = new StandardMaterial();
    boneMat.diffuse = PALETTE.bone;
    boneMat.gloss = 0.6;
    boneMat.update();

    // Жвалы: две костяные клешни спереди (−Z — направление движения).
    for (const [jaw, side] of [
      [this.jawL, -1],
      [this.jawR, 1],
    ] as const) {
      jaw.addComponent('render', { type: 'cone' });
      jaw.render!.material = boneMat;
      jaw.setLocalScale(0.42, 0.62, 0.42);
      // Тело простирается по Z до 1.15 — жвалы обязаны выйти за его край.
      jaw.setLocalPosition(side * 0.3, 0.02, -1.5);
      // Остриё смотрит строго вперёд (−Z), клешни слегка разведены.
      jaw.setLocalEulerAngles(-90, 0, side * 20);
      this.root.addChild(jaw);
    }

    // Глаза на стебельках: белая склера + радужка + крупный чёрный зрачок.
    const scleraMat = new StandardMaterial();
    scleraMat.diffuse = PALETTE.eyeWhite;
    scleraMat.gloss = 0.9;
    scleraMat.update();
    const irisMat = new StandardMaterial();
    irisMat.diffuse = PALETTE.eyeIris;
    irisMat.gloss = 0.85;
    irisMat.update();
    const pupilMat = new StandardMaterial();
    pupilMat.diffuse = PALETTE.eyePupil;
    pupilMat.gloss = 0.95;
    pupilMat.update();

    for (const side of [-1, 1]) {
      const stalk = new Entity('EyeStalk');
      stalk.addComponent('render', { type: 'cylinder' });
      stalk.render!.material = boneMat;
      stalk.setLocalScale(0.12, 0.4, 0.12);
      stalk.setLocalPosition(side * 0.3, 0.42, -0.42);
      stalk.setLocalEulerAngles(-22, 0, side * 20);
      this.root.addChild(stalk);

      // Глаз крупный (~25% длины тела) и поднят над спиной: камера смотрит
      // сверху, поэтому зрачок и радужка вынесены на ВЕРХНЮЮ полусферу.
      const eye = new Entity('Eye');
      eye.addComponent('render', { type: 'sphere' });
      eye.render!.material = scleraMat;
      eye.setLocalScale(0.56, 0.56, 0.56);
      eye.setLocalPosition(side * 0.44, 0.78, -0.6);
      this.root.addChild(eye);
      this.eyes.push(eye);

      const iris = new Entity('Iris');
      iris.addComponent('render', { type: 'sphere' });
      iris.render!.material = irisMat;
      iris.setLocalScale(0.66, 0.36, 0.66);
      iris.setLocalPosition(0, 0.4, -0.16);
      eye.addChild(iris);

      const pupil = new Entity('Pupil');
      pupil.addComponent('render', { type: 'sphere' });
      pupil.render!.material = pupilMat;
      pupil.setLocalScale(0.4, 0.3, 0.4);
      pupil.setLocalPosition(0, 0.48, -0.2);
      eye.addChild(pupil);
    }

    // Венец ресничек по периметру тела — кремовые, машут волной.
    this.ciliaMat = new StandardMaterial();
    this.ciliaMat.diffuse = PALETTE.bone;
    this.ciliaMat.opacity = 0.95;
    this.ciliaMat.blendType = BLEND_NORMAL;
    this.ciliaMat.cull = CULLFACE_NONE;
    this.ciliaMat.twoSidedLighting = true;
    this.ciliaMat.gloss = 0.5;
    this.ciliaMat.update();
    const cilia = new Entity('Cilia');
    const ciliaMi = new MeshInstance(buildCiliaMesh(app), this.ciliaMat);
    ciliaMi.cull = false;
    cilia.addComponent('render', { meshInstances: [ciliaMi] });
    this.root.addChild(cilia);

    // Жгутик сзади: две кремовые ленты с бегущей волной.
    this.flagellaMat = new StandardMaterial();
    this.flagellaMat.diffuse = PALETTE.boneDark;
    this.flagellaMat.opacity = 0.9;
    this.flagellaMat.blendType = BLEND_NORMAL;
    this.flagellaMat.cull = CULLFACE_NONE;
    this.flagellaMat.twoSidedLighting = true;
    this.flagellaMat.shaderChunksVersion = CHUNKS_VERSION;
    this.flagellaMat.getShaderChunks(SHADERLANGUAGE_GLSL).set('transformVS', FLAGELLA_TRANSFORM_VS);
    this.flagellaMat.update();
    this.flagellaMat.setParameter('uTime', 0);
    this.flagellaMat.setParameter('uSpeed', 0);
    const flagella = new Entity('Flagella');
    const mi = new MeshInstance(buildFlagellaMesh(app), this.flagellaMat);
    mi.cull = false;
    flagella.addComponent('render', { meshInstances: [mi] });
    this.root.addChild(flagella);

    // Мягкая тень на подложке — «сажает» существо в толщу воды.
    const shadowMat = new StandardMaterial();
    shadowMat.diffuse = new Color(0.05, 0.2, 0.28);
    shadowMat.useLighting = false;
    shadowMat.opacityMap = radialTex;
    shadowMat.opacity = 0.3;
    shadowMat.blendType = BLEND_NORMAL;
    shadowMat.depthWrite = false;
    shadowMat.update();
    this.shadow.addComponent('render', { type: 'plane' });
    this.shadow.render!.material = shadowMat;
    app.root.addChild(this.shadow);

    app.root.addChild(this.root);
  }

  /** Всплеск тела и щелчок жвал при поедании. */
  poke(): void {
    this.pulse = 1;
  }

  update(
    simX: number,
    simY: number,
    vx: number,
    vy: number,
    radiusPx: number,
    dt: number,
    time: number,
  ): void {
    const x = simToSceneX(simX);
    const z = simToSceneZ(simY);
    this.root.setPosition(x, 0, z);

    const speedPx = Math.hypot(vx, vy);
    const speed01 = clamp(speedPx / PLAYER.vMax, 0, 1);

    // Нос смотрит по курсу; на вираже существо закладывает крен.
    if (speedPx > 8) {
      const target = Math.atan2(vx, vy) + Math.PI;
      let delta = target - this.yaw;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const k = expDecay(6, dt);
      this.yaw += delta * k;
      const rollTarget = clamp(((-delta * k) / Math.max(dt, 1e-3)) * 0.09, -0.35, 0.35);
      this.roll += (rollTarget - this.roll) * expDecay(4, dt);
    } else {
      this.roll += (0 - this.roll) * expDecay(4, dt);
    }
    const deg = 180 / Math.PI;
    this.root.setEulerAngles(0, this.yaw * deg, this.roll * deg);

    const R = simLen(radiusPx);
    const stretch = 1 + 0.16 * speed01;
    const squash = 1 / Math.sqrt(stretch);
    this.root.setLocalScale(R * squash, R * squash, R * stretch);

    this.pulse *= Math.exp(-6 * dt);
    this.bodyMat.setParameter('uTime', time);
    this.bodyMat.setParameter('uPulse', this.pulse);
    this.flagellaMat.setParameter('uTime', time);
    this.flagellaMat.setParameter('uSpeed', speed01);

    // Жвалы щёлкают при поедании, глаза покачиваются на стебельках.
    const bite = this.pulse * 24;
    this.jawL.setLocalEulerAngles(-90, 0, 20 + bite);
    this.jawR.setLocalEulerAngles(-90, 0, -20 - bite);
    for (let i = 0; i < this.eyes.length; i++) {
      const wobble = Math.sin(time * 2.3 + i * 2.1) * 4 + speed01 * 6;
      this.eyes[i]!.setLocalEulerAngles(wobble, 0, 0);
    }

    const shadowScale = R * 2.6;
    this.shadow.setPosition(x, WATER_Y + 0.2, z);
    this.shadow.setLocalScale(shadowScale, 1, shadowScale);
  }
}

/** Венец ресничек: короткие кремовые нити по периметру, машущие волной. */
function buildCiliaMesh(app: Application): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const SEG = 5;

  for (let c = 0; c < CILIA_COUNT; c++) {
    const a = (c / CILIA_COUNT) * Math.PI * 2;
    // Стартуют на самой кромке тела (полуоси 0.78 × 1.15), иначе прячутся внутри.
    const ox = Math.sin(a) * 0.8;
    const oz = Math.cos(a) * 1.17;
    const outX = Math.sin(a);
    const outZ = Math.cos(a);
    const sideX = outZ;
    const sideZ = -outX;
    const base = positions.length / 4;
    for (let j = 0; j <= SEG; j++) {
      const s = j / SEG;
      const len = 0.5 * s;
      const half = (0.11 * (1 - s) + 0.02 * s) / 2;
      const cx = ox + outX * len;
      const cz = oz + outZ * len;
      const w = (c % FLAG_RIBBONS) + s * 0.98;
      positions.push(cx + sideX * half, 0, cz + sideZ * half, w);
      positions.push(cx - sideX * half, 0, cz - sideZ * half, w);
      normals.push(0, 1, 0, 0, 1, 0);
      if (j < SEG) {
        const i0 = base + j * 2;
        indices.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
      }
    }
  }

  const mesh = new Mesh(app.graphicsDevice);
  mesh.setPositions(positions, 4);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update();
  return mesh;
}

/**
 * Жгутик: ленты тянутся назад (+Z, «хвост»), волну добавляет вершинный чанк.
 * В position.w упакованы номер ленты (целая часть) и параметр длины s.
 */
function buildFlagellaMesh(app: Application): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < FLAG_RIBBONS; r++) {
    const spread = ((r - 0.5) * 16 * Math.PI) / 180;
    const dirX = Math.sin(spread);
    const dirZ = Math.cos(spread);
    const sideX = -dirZ;
    const sideZ = dirX;
    const base = positions.length / 4;
    for (let j = 0; j <= FLAG_SEGMENTS; j++) {
      const s = j / FLAG_SEGMENTS;
      // Корень — за кормой тела (Z до 1.15), иначе жгутик не виден.
      const len = 1.2 + 2.2 * s;
      const half = (0.3 * (1 - s) + 0.06 * s) / 2;
      const cx = dirX * len;
      const cz = dirZ * len;
      const w = r + s * 0.98;
      positions.push(cx + sideX * half, 0, cz + sideZ * half, w);
      positions.push(cx - sideX * half, 0, cz - sideZ * half, w);
      normals.push(0, 1, 0, 0, 1, 0);
      if (j < FLAG_SEGMENTS) {
        const i0 = base + j * 2;
        indices.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
      }
    }
  }

  const mesh = new Mesh(app.graphicsDevice);
  mesh.setPositions(positions, 4);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update();
  return mesh;
}
