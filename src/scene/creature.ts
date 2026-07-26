import {
  BLEND_NORMAL,
  Color,
  CULLFACE_FRONT,
  CULLFACE_NONE,
  Entity,
  Mesh,
  MeshInstance,
  SHADERLANGUAGE_GLSL,
  SphereGeometry,
  StandardMaterial,
  type Application,
  type Texture,
  Vec3,
} from 'playcanvas';
import { clamp, expDecay } from '../core/math';
import { PLAYER } from '../data/balance';
import { CHUNKS_VERSION, FLAGELLA_TRANSFORM_VS, MEMBRANE_EMISSIVE_PS, MEMBRANE_TRANSFORM_VS } from './chunks';
import { FLOOR_Y } from './environment';
import { simLen, simToSceneX, simToSceneZ } from './units';

/** Смещения органелл в объектном пространстве (доли радиуса) — из 2D-версии. */
const GRANULES: ReadonlyArray<readonly [number, number]> = [
  [-0.35, 0.3],
  [0.15, 0.45],
  [0.45, 0.1],
  [-0.1, -0.45],
  [-0.5, -0.1],
  [0.3, -0.35],
];

const FLAG_RIBBONS = 3;
const FLAG_SEGMENTS = 24;

/**
 * Существо игрока: деформируемая двухслойная мембрана, opaque-внутренности,
 * машущие жгутики, постура (yaw/крен/squash&stretch) и фейковая тень на дне.
 */
export class CreatureView {
  readonly root = new Entity('Player');

  private readonly membraneMats: StandardMaterial[] = [];
  private readonly flagellaMat: StandardMaterial;
  private readonly organelles = new Entity('Organelles');
  private readonly shadow = new Entity('ShadowBlob');
  private yaw = 0;
  private roll = 0;
  private pulse = 0;

  constructor(app: Application, cellBackLayerId: number, keyDir: Vec3, radialTex: Texture) {
    const device = app.graphicsDevice;
    const sphere = Mesh.fromGeometry(
      device,
      new SphereGeometry({ radius: 1, latitudeBands: 32, longitudeBands: 48 }),
    );

    const makeMembraneMat = (opacity: number, back: boolean): StandardMaterial => {
      const m = new StandardMaterial();
      m.diffuse = new Color(0.55, 0.78, 1.0);
      m.opacity = opacity;
      m.blendType = BLEND_NORMAL;
      m.depthWrite = false;
      m.gloss = 0.7;
      if (back) m.cull = CULLFACE_FRONT;
      m.shaderChunksVersion = CHUNKS_VERSION;
      const chunks = m.getShaderChunks(SHADERLANGUAGE_GLSL);
      chunks.set('transformVS', MEMBRANE_TRANSFORM_VS);
      chunks.set('emissivePS', MEMBRANE_EMISSIVE_PS);
      m.update();
      m.setParameter('uTime', 0);
      m.setParameter('uPulse', 0);
      m.setParameter('uKeyDir', [keyDir.x, keyDir.y, keyDir.z]);
      return m;
    };

    const backMat = makeMembraneMat(0.25, true);
    const frontMat = makeMembraneMat(0.55, false);
    this.membraneMats.push(backMat, frontMat);

    const backEnt = new Entity('MembraneBack');
    backEnt.addComponent('render', {
      meshInstances: [new MeshInstance(sphere, backMat)],
      layers: [cellBackLayerId],
    });
    const frontEnt = new Entity('MembraneFront');
    frontEnt.addComponent('render', { meshInstances: [new MeshInstance(sphere, frontMat)] });
    this.root.addChild(backEnt);
    this.root.addChild(frontEnt);

    // Ядро — глубокий фиолетовый, смещено от центра.
    const nucleusMat = new StandardMaterial();
    nucleusMat.diffuse = new Color(0.235, 0.078, 0.314);
    nucleusMat.emissive = new Color(0.16, 0.055, 0.235);
    nucleusMat.emissiveIntensity = 0.35;
    nucleusMat.gloss = 0.45;
    nucleusMat.update();
    const nucleus = new Entity('Nucleus');
    nucleus.addComponent('render', { type: 'sphere' });
    nucleus.render!.material = nucleusMat;
    nucleus.setLocalPosition(0.24, 0.06, -0.1);
    nucleus.setLocalScale(0.68, 0.52, 0.6);
    this.root.addChild(nucleus);

    // Органеллы под медленно вращающимся узлом — цитоплазма «течёт».
    const orgMatA = new StandardMaterial();
    orgMatA.diffuse = new Color(0.16, 0.38, 0.48);
    orgMatA.gloss = 0.5;
    orgMatA.update();
    const orgMatB = new StandardMaterial();
    orgMatB.diffuse = new Color(0.22, 0.3, 0.52);
    orgMatB.gloss = 0.5;
    orgMatB.update();
    GRANULES.forEach(([gx, gz], i) => {
      const o = new Entity('Organelle');
      o.addComponent('render', { type: 'sphere' });
      o.render!.material = i % 2 === 0 ? orgMatA : orgMatB;
      const r = 0.1 + (i % 3) * 0.03;
      o.setLocalScale(r * 2, r * 2, r * 2);
      o.setLocalPosition(gx * 0.72, 0.1 + (i % 2) * 0.08, gz * 0.72);
      this.organelles.addChild(o);
    });
    this.root.addChild(this.organelles);

    // Жгутики: три ленты в одном меше, фаза и параметр длины упакованы в position.w.
    this.flagellaMat = new StandardMaterial();
    this.flagellaMat.diffuse = new Color(0.55, 0.78, 1.0);
    this.flagellaMat.emissive = new Color(0.35, 0.55, 0.7);
    this.flagellaMat.emissiveIntensity = 0.35;
    this.flagellaMat.opacity = 0.5;
    this.flagellaMat.blendType = BLEND_NORMAL;
    this.flagellaMat.depthWrite = false;
    this.flagellaMat.cull = CULLFACE_NONE;
    this.flagellaMat.twoSidedLighting = true;
    this.flagellaMat.shaderChunksVersion = CHUNKS_VERSION;
    this.flagellaMat.getShaderChunks(SHADERLANGUAGE_GLSL).set('transformVS', FLAGELLA_TRANSFORM_VS);
    this.flagellaMat.update();
    this.flagellaMat.setParameter('uTime', 0);
    this.flagellaMat.setParameter('uSpeed', 0);
    const flagella = new Entity('Flagella');
    const mi = new MeshInstance(buildFlagellaMesh(app), this.flagellaMat);
    mi.cull = false; // волна выходит за статический AABB
    flagella.addComponent('render', { meshInstances: [mi] });
    this.root.addChild(flagella);

    // Фейковая тень: мягкое тёмное пятно на дне.
    const shadowMat = new StandardMaterial();
    shadowMat.diffuse = new Color(0, 0, 0);
    shadowMat.specular = new Color(0, 0, 0);
    shadowMat.opacityMap = radialTex;
    shadowMat.opacity = 0.25;
    shadowMat.blendType = BLEND_NORMAL;
    shadowMat.depthWrite = false;
    shadowMat.update();
    this.shadow.addComponent('render', { type: 'plane' });
    this.shadow.render!.material = shadowMat;
    app.root.addChild(this.shadow);

    app.root.addChild(this.root);
  }

  /** Всплеск мембраны при поедании. */
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

    // Курс: плавный поворот к направлению движения, крен от скорости поворота.
    if (speedPx > 8) {
      const target = Math.atan2(vx, vy);
      let delta = target - this.yaw;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      const k = expDecay(6, dt);
      this.yaw += delta * k;
      const rollTarget = clamp((-delta * k) / Math.max(dt, 1e-3) * 0.09, -0.35, 0.35);
      this.roll += (rollTarget - this.roll) * expDecay(4, dt);
    } else {
      this.roll += (0 - this.roll) * expDecay(4, dt);
    }
    const deg = (180 / Math.PI);
    this.root.setEulerAngles(0, this.yaw * deg, this.roll * deg);

    // Squash&stretch с сохранением объёма + «линза» по вертикали.
    const R = simLen(radiusPx);
    const stretch = 1 + 0.18 * speed01;
    const squash = 1 / Math.sqrt(stretch);
    this.root.setLocalScale(R * squash, R * 0.62 * squash, R * stretch);

    // Пульс поедания гаснет экспоненциально.
    this.pulse *= Math.exp(-6 * dt);
    for (const m of this.membraneMats) {
      m.setParameter('uTime', time);
      m.setParameter('uPulse', this.pulse);
    }
    this.flagellaMat.setParameter('uTime', time);
    this.flagellaMat.setParameter('uSpeed', speed01);

    const shadowScale = R * 2.5;
    this.shadow.setPosition(x, FLOOR_Y + 0.15, z);
    this.shadow.setLocalScale(shadowScale, 1, shadowScale);
  }
}

/**
 * Ленты жгутиков: FLAG_RIBBONS × (FLAG_SEGMENTS+1) × 2 вершины, позиции 4-компонентные
 * (w = номер ленты + s·0.98). Ленты тянутся назад (−Z), волну добавляет вершинный чанк.
 */
function buildFlagellaMesh(app: Application): Mesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r < FLAG_RIBBONS; r++) {
    const spread = ((r - 1) * 12 * Math.PI) / 180;
    const dirX = Math.sin(spread);
    const dirZ = -Math.cos(spread);
    const sideX = -dirZ;
    const sideZ = dirX;
    const yBase = r === 1 ? -0.08 : 0.06;
    const base = positions.length / 4;
    for (let j = 0; j <= FLAG_SEGMENTS; j++) {
      const s = j / FLAG_SEGMENTS;
      const len = 0.85 + 2.2 * s;
      const half = (0.28 * (1 - s) + 0.04 * s) / 2;
      const cx = dirX * len;
      const cz = dirZ * len;
      const w = r + s * 0.98;
      positions.push(cx + sideX * half, yBase, cz + sideZ * half, w);
      positions.push(cx - sideX * half, yBase, cz - sideZ * half, w);
      normals.push(0, 1, 0, 0, 1, 0);
      if (j < FLAG_SEGMENTS) {
        const a = base + j * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
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
