import {
  BLEND_NORMAL,
  Color,
  Entity,
  StandardMaterial,
  type Application,
  type Quat,
  type Texture,
} from 'playcanvas';
import { simToSceneX, simToSceneZ } from './units';

const POOL = 10;
const LIFE = 0.35;

interface Flash {
  entity: Entity;
  mat: StandardMaterial;
  ttl: number;
}

/**
 * Вспышки поглощения. На светлой воде аддитив почти не виден,
 * поэтому используем обычный блендинг с плотным цветом еды.
 */
export class FxSystem {
  private readonly flashes: Flash[] = [];
  private cursor = 0;

  constructor(app: Application, radialTex: Texture, billboardRot: Quat) {
    for (let i = 0; i < POOL; i++) {
      const mat = new StandardMaterial();
      mat.diffuse = new Color(1, 1, 1);
      mat.useLighting = false;
      mat.opacityMap = radialTex;
      mat.opacity = 0;
      mat.blendType = BLEND_NORMAL;
      mat.depthWrite = false;
      mat.update();
      const e = new Entity('Flash');
      e.addComponent('render', { type: 'plane' });
      e.render!.material = mat;
      e.setRotation(billboardRot);
      e.enabled = false;
      app.root.addChild(e);
      this.flashes.push({ entity: e, mat, ttl: 0 });
    }
  }

  burst(simX: number, simY: number, color: Color): void {
    const f = this.flashes[this.cursor]!;
    this.cursor = (this.cursor + 1) % POOL;
    f.ttl = LIFE;
    f.entity.enabled = true;
    f.entity.setPosition(simToSceneX(simX), 0.25, simToSceneZ(simY));
    f.mat.diffuse = color;
    f.mat.update();
  }

  update(dt: number): void {
    for (const f of this.flashes) {
      if (f.ttl <= 0) continue;
      f.ttl -= dt;
      if (f.ttl <= 0) {
        f.entity.enabled = false;
        continue;
      }
      const t = 1 - f.ttl / LIFE;
      const scale = 0.8 + t * 2.4;
      f.entity.setLocalScale(scale, 1, scale);
      f.mat.opacity = (1 - t) * 0.8;
      f.mat.update();
    }
  }
}
