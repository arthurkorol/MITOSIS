import { Color, Entity, StandardMaterial, type Application } from 'playcanvas';
import { FOOD_DEFS, type FoodType } from '../data/balance';
import type { Food } from '../sim/world';
import { simLen, simToSceneX, simToSceneZ } from './units';

const TAU = Math.PI * 2;

/** Эмиссивные цвета еды: bloom подсвечивает только их — сцена намеренно тёмная. */
const STYLE = [
  { color: new Color(0.4, 1.0, 0.6), intensity: 1.2 },
  { color: new Color(0.93, 0.27, 0.27), intensity: 0.8 },
  { color: new Color(1.0, 0.8, 0.0), intensity: 2.0 },
] as const;

interface Slot {
  entity: Entity;
  type: FoodType;
}

/**
 * Пул визуальных сущностей еды: enabled on/off, ключ — Food.id.
 * Никаких create/destroy в кадре.
 */
export class FoodPool {
  private readonly mats: StandardMaterial[];
  private readonly byId = new Map<number, Slot>();
  private readonly free: Entity[][] = [[], [], []];
  private readonly seen = new Set<number>();

  constructor(
    private readonly app: Application,
    prealloc = 120,
  ) {
    this.mats = STYLE.map((s) => {
      const m = new StandardMaterial();
      m.diffuse = new Color(s.color.r * 0.25, s.color.g * 0.25, s.color.b * 0.25);
      m.emissive = s.color;
      m.emissiveIntensity = s.intensity;
      m.gloss = 0.6;
      m.update();
      return m;
    });
    for (let t = 0; t < 3; t++) {
      for (let i = 0; i < prealloc / 3; i++) this.free[t]!.push(this.spawnEntity(t as FoodType));
    }
  }

  private spawnEntity(type: FoodType): Entity {
    const e = new Entity('Food');
    e.addComponent('render', { type: 'sphere' });
    e.render!.material = this.mats[type]!;
    e.enabled = false;
    this.app.root.addChild(e);
    return e;
  }

  sync(food: readonly Food[], time: number): void {
    this.seen.clear();
    for (const f of food) {
      this.seen.add(f.id);
      let slot = this.byId.get(f.id);
      if (!slot) {
        const e = this.free[f.type]!.pop() ?? this.spawnEntity(f.type);
        e.enabled = true;
        slot = { entity: e, type: f.type };
        this.byId.set(f.id, slot);
      }
      const e = slot.entity;
      // Покачивание в вязкой жидкости — как в 2D-версии.
      const bx = simToSceneX(f.x) + Math.sin(time * 1.6 + f.seed) * 0.12;
      const bz = simToSceneZ(f.y) + Math.cos(time * 1.3 + f.seed * 1.7) * 0.12;
      const by = 0.15 * Math.sin(time * 0.9 + f.seed * 2.3);
      e.setPosition(bx, by, bz);
      const r = simLen(FOOD_DEFS[f.type].radius);
      const pulse = f.type === 2 ? 1 + 0.15 * Math.sin(TAU * 2 * time + f.seed) : 1;
      const d = r * 2 * pulse;
      if (f.type === 1) {
        e.setLocalScale(d * 1.3, d * 0.85, d);
        e.setEulerAngles(0, f.seed * 57.3, 0);
      } else {
        e.setLocalScale(d, d, d);
      }
    }
    for (const [id, slot] of this.byId) {
      if (this.seen.has(id)) continue;
      slot.entity.enabled = false;
      this.free[slot.type]!.push(slot.entity);
      this.byId.delete(id);
    }
  }
}
