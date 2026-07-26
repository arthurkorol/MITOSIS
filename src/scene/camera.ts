import { Color, Entity, Plane, Ray, TONEMAP_ACES, Vec3, type Application } from 'playcanvas';
import { expDecay } from '../core/math';
import { CAMERA } from '../data/balance';
import { sceneToSimX, sceneToSimY, simToSceneX, simToSceneZ } from './units';

/** Наклон камеры: 16° от надира — параллакс и глубина без потери читаемости. */
const PITCH_DEG = -74;
const FOV_DEG = 45;
/**
 * Дистанция до плоскости геймплея. 68 дало бы охват ≈ CAMERA.viewHeight px
 * как в 2D; берём ближе — существо и детали среды должны читаться.
 */
export const CAM_DIST = 54;

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
      clearColor: new Color(0.016, 0.106, 0.149),
    });
    this.entity.camera!.toneMapping = TONEMAP_ACES;
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
