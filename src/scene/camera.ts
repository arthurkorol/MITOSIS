import { Entity, Plane, Ray, TONEMAP_NEUTRAL, Vec3, type Application } from 'playcanvas';
import { expDecay } from '../core/math';
import { CAMERA } from '../data/balance';
import { PALETTE } from './palette';
import { sceneToSimX, sceneToSimY, simToSceneX, simToSceneZ } from './units';

/**
 * В Spore камера смотрит строго сверху, вид почти ортографический —
 * лёгкий наклон оставлен только чтобы читалась толщина существ.
 */
const PITCH_DEG = -84;
const FOV_DEG = 40;
/** Дистанция до плоскости геймплея: существо занимает заметную долю экрана. */
export const CAM_DIST = 19;

export class FollowCamera {
  readonly rig = new Entity('CameraRig');
  readonly entity = new Entity('Camera');

  private readonly ray = new Ray();
  private readonly plane = new Plane(Vec3.UP, 0);
  private readonly hit = new Vec3();
  private readonly from = new Vec3();
  private readonly dir = new Vec3();

  constructor(app: Application) {
    this.entity.addComponent('camera', {
      fov: FOV_DEG,
      nearClip: 0.5,
      farClip: 400,
      clearColor: PALETTE.fog,
    });
    // NEUTRAL сохраняет светлые тона воды; ACES их заметно притемнял.
    this.entity.camera!.toneMapping = TONEMAP_NEUTRAL;
    const pitch = (-PITCH_DEG * Math.PI) / 180;
    this.entity.setLocalPosition(0, CAM_DIST * Math.sin(pitch), CAM_DIST * Math.cos(pitch));
    this.entity.setLocalEulerAngles(PITCH_DEG, 0, 0);
    this.rig.addChild(this.entity);
    app.root.addChild(this.rig);
  }

  snapTo(simX: number, simY: number): void {
    this.rig.setPosition(simToSceneX(simX), 0, simToSceneZ(simY));
  }

  follow(simX: number, simY: number, dt: number): void {
    const k = expDecay(CAMERA.followRate, dt);
    const p = this.rig.getPosition();
    this.rig.setPosition(
      p.x + (simToSceneX(simX) - p.x) * k,
      0,
      p.z + (simToSceneZ(simY) - p.z) * k,
    );
  }

  /** Экран (CSS px) → точка на плоскости геймплея в sim-координатах. */
  screenToSim(sx: number, sy: number, out: { x: number; y: number }): boolean {
    const cam = this.entity.camera!;
    cam.screenToWorld(sx, sy, cam.nearClip, this.from);
    cam.screenToWorld(sx, sy, cam.farClip, this.dir);
    this.dir.sub(this.from).normalize();
    this.ray.set(this.from, this.dir);
    if (!this.plane.intersectsRay(this.ray, this.hit)) return false;
    out.x = sceneToSimX(this.hit.x);
    out.y = sceneToSimY(this.hit.z);
    return true;
  }
}
