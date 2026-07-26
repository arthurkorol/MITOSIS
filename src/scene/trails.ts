import {
  BLEND_NORMAL,
  Color,
  Entity,
  StandardMaterial,
  type Application,
  type Texture,
} from 'playcanvas';
import { simToSceneX, simToSceneZ } from './units';

const SWIRL_POOL = 20;
const SWIRL_LIFE = 2.6;
const RIPPLE_POOL = 6;
const RIPPLE_LIFE = 1.1;
/** Интервал между завитками следа (с). */
const SWIRL_PERIOD = 0.16;

interface Piece {
  entity: Entity;
  mat: StandardMaterial;
  ttl: number;
  spin: number;
  baseScale: number;
  alpha: number;
}

/**
 * Вихревые следы и кольцевая рябь — за каждой клеткой в Spore тянутся
 * бледные изогнутые завитки. Именно они делают воду вязкой и живой.
 */
export class Trails {
  private readonly swirls: Piece[] = [];
  private readonly ripples: Piece[] = [];
  private swirlCursor = 0;
  private rippleCursor = 0;
  private sinceSwirl = 0;

  constructor(app: Application, swirlTex: Texture, rippleTex: Texture) {
    const make = (tex: Texture, pool: Piece[], count: number, alpha: number): void => {
      for (let i = 0; i < count; i++) {
        const mat = new StandardMaterial();
        mat.diffuse = new Color(1, 1, 1);
        mat.useLighting = false;
        mat.opacityMap = tex;
        mat.opacity = 0;
        mat.blendType = BLEND_NORMAL;
        mat.depthWrite = false;
        mat.update();
        const e = new Entity('Trail');
        e.addComponent('render', { type: 'plane' });
        e.render!.material = mat;
        e.enabled = false;
        app.root.addChild(e);
        pool.push({ entity: e, mat, ttl: 0, spin: 0, baseScale: 1, alpha });
      }
    };
    make(swirlTex, this.swirls, SWIRL_POOL, 0.5);
    make(rippleTex, this.ripples, RIPPLE_POOL, 0.45);
  }

  /** Роняет завитки позади движущегося существа. */
  emit(simX: number, simY: number, vx: number, vy: number, radius: number, dt: number): void {
    const speed = Math.hypot(vx, vy);
    this.sinceSwirl += dt;
    if (speed < 30 || this.sinceSwirl < SWIRL_PERIOD) return;
    this.sinceSwirl = 0;

    const p = this.swirls[this.swirlCursor]!;
    this.swirlCursor = (this.swirlCursor + 1) % SWIRL_POOL;
    // Завиток рождается позади существа, со сносом вбок — получается «штопор».
    const back = -radius * 1.1;
    const nx = vx / speed;
    const ny = vy / speed;
    const side = ((this.swirlCursor % 2) * 2 - 1) * radius * 0.5;
    p.entity.enabled = true;
    p.entity.setPosition(
      simToSceneX(simX + nx * back - ny * side),
      -0.25,
      simToSceneZ(simY + ny * back + nx * side),
    );
    p.ttl = SWIRL_LIFE;
    p.spin = (this.swirlCursor % 2 === 0 ? 1 : -1) * 26;
    p.baseScale = (radius / 16) * 2.6;
    p.entity.setEulerAngles(0, Math.atan2(nx, ny) * (180 / Math.PI), 0);
  }

  /** Кольцевая рябь — например, в точке поедания. */
  ripple(simX: number, simY: number, scale: number): void {
    const p = this.ripples[this.rippleCursor]!;
    this.rippleCursor = (this.rippleCursor + 1) % RIPPLE_POOL;
    p.entity.enabled = true;
    p.entity.setPosition(simToSceneX(simX), 0.1, simToSceneZ(simY));
    p.ttl = RIPPLE_LIFE;
    p.spin = 0;
    p.baseScale = scale;
  }

  update(dt: number): void {
    for (const p of this.swirls) {
      if (p.ttl <= 0) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        p.entity.enabled = false;
        continue;
      }
      const t = 1 - p.ttl / SWIRL_LIFE;
      const s = p.baseScale * (1 + t * 0.7);
      p.entity.setLocalScale(s, 1, s);
      p.entity.rotateLocal(0, p.spin * dt, 0);
      // Появляется быстро, растворяется медленно.
      p.mat.opacity = p.alpha * Math.min(1, t * 6) * (1 - t) ** 1.4;
      p.mat.update();
    }
    for (const p of this.ripples) {
      if (p.ttl <= 0) continue;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        p.entity.enabled = false;
        continue;
      }
      const t = 1 - p.ttl / RIPPLE_LIFE;
      const s = p.baseScale * (0.4 + t * 2.2);
      p.entity.setLocalScale(s, 1, s);
      p.mat.opacity = p.alpha * (1 - t) ** 1.6;
      p.mat.update();
    }
  }
}
