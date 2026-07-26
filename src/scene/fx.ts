import {
  BLEND_ADDITIVE,
  Color,
  Entity,
  StandardMaterial,
  type Application,
  type Quat,
  type Texture,
} from 'playcanvas';
import { simToSceneX, simToSceneZ } from './units';

const POOL = 8;
const LIFE = 0.25;

interface Flash {
  entity: Entity;
  mat: StandardMaterial;
  ttl: number;
}

/** Пул вспышек поглощения: аддитивные билборд-квады, без create/destroy в кадре. */
export class FxSystem {
  private readonly flashes: Flash[] = [];
  private cursor = 0;

  constructor(app: Application, fxLayerId: number, radialTex: Texture, billboardRot: Quat) {
    for (let i = 0; i < POOL; i++) {
      const mat = new StandardMaterial();
      mat.diffuse = new Color(0, 0, 0);
      mat.emissive = new Color(1, 1, 1);
      mat.emissiveMap = radialTex;
      mat.emissiveIntensity = 0;
      mat.blendType = BLEND_ADDITIVE;
      mat.depthWrite = false;
      mat.update();
      const e = new Entity('Flash');
      e.addComponent('render', { type: 'plane', layers: [fxLayerId] });
      e.render!.material = mat;
      e.setRotation(billboardRot);
      e.rotateLocal(90, 0, 0);
      e.enabled = false;
      app.root.addChild(e);
      this.flashes.push({ entity: e, mat, ttl: 0 });
    }
  }

  burst(simX: number, simY: number, color: readonly [number, number, number]): void {
    const f = this.flashes[this.cursor]!;
    this.cursor = (this.cursor + 1) % POOL;
    f.ttl = LIFE;
    f.entity.enabled = true;
    f.entity.setPosition(simToSceneX(simX), 0.3, simToSceneZ(simY));
    f.mat.emissive = new Color(color[0] / 255, color[1] / 255, color[2] / 255);
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
      const scale = 0.6 + t * 1.6;
      f.entity.setLocalScale(scale, 1, scale);
      f.mat.emissiveIntensity = (1 - t) * 2.2;
    }
  }
}
