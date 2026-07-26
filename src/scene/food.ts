import { Color, Entity, StandardMaterial, type Application } from 'playcanvas';
import { FOOD_DEFS, type FoodType } from '../data/balance';
import type { Food } from '../sim/world';
import { PALETTE } from './palette';
import { simLen, simToSceneX, simToSceneZ } from './units';

const TAU = Math.PI * 2;

/**
 * Еда в духе Spore: растительная — насыщенно-зелёные шарики,
 * мясная — красно-розовые бугристые «малинки», ДНК-сгустки — золотые.
 * Цвета плотные и диффузные: на светлой воде эмиссив не читается.
 */
const STYLE = [
  { color: PALETTE.plantFood, emissive: 0.35, gloss: 0.75 },
  { color: PALETTE.meatFood, emissive: 0.28, gloss: 0.65 },
  { color: PALETTE.dnaFood, emissive: 0.9, gloss: 0.85 },
] as const;

interface Slot {
  entity: Entity;
  type: FoodType;
}

/** Пул визуальных сущностей еды: enabled on/off, ключ — Food.id. */
export class FoodPool {
  private readonly mats: StandardMaterial[];
  private readonly byId = new Map<number, Slot>();
  private readonly free: Entity[][] = [[], [], []];
  private readonly seen = new Set<number>();

  constructor(
    private readonly app: Application,
    prealloc = 150,
  ) {
    this.mats = STYLE.map((s) => {
      const m = new StandardMaterial();
      m.diffuse = s.color;
      m.emissive = s.color;
      m.emissiveIntensity = s.emissive;
      m.specular = new Color(1, 1, 1);
      m.gloss = s.gloss;
      m.update();
      return m;
    });
    for (let t = 0; t < 3; t++) {
      for (let i = 0; i < prealloc / 3; i++) this.free[t]!.push(this.spawnEntity(t as FoodType));
    }
  }

  /** Мясная еда — «малинка»: центральная сфера плюс бугорки-дольки. */
  private spawnEntity(type: FoodType): Entity {
    const e = new Entity('Food');
    e.addComponent('render', { type: 'sphere' });
    e.render!.material = this.mats[type]!;
    if (type === 1) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        const lobe = new Entity('Lobe');
        lobe.addComponent('render', { type: 'sphere' });
        lobe.render!.material = this.mats[1]!;
        lobe.setLocalScale(0.62, 0.62, 0.62);
        lobe.setLocalPosition(Math.cos(a) * 0.4, 0.14, Math.sin(a) * 0.4);
        e.addChild(lobe);
      }
    }
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
      // Покачивание в вязкой жидкости.
      const bx = simToSceneX(f.x) + Math.sin(time * 1.6 + f.seed) * 0.1;
      const bz = simToSceneZ(f.y) + Math.cos(time * 1.3 + f.seed * 1.7) * 0.1;
      const by = 0.12 * Math.sin(time * 0.9 + f.seed * 2.3);
      e.setPosition(bx, by, bz);
      // Еда крупнее, чем радиус коллизии: в кадре она должна читаться формой.
      const r = simLen(FOOD_DEFS[f.type].radius) * 1.6;
      const pulse = f.type === 2 ? 1 + 0.12 * Math.sin(TAU * 2 * time + f.seed) : 1;
      const d = r * 2 * pulse;
      e.setLocalScale(d, d * (f.type === 1 ? 0.8 : 1), d);
      e.setEulerAngles(0, f.seed * 57.3 + time * 12, 0);
    }
    for (const [id, slot] of this.byId) {
      if (this.seen.has(id)) continue;
      slot.entity.enabled = false;
      this.free[slot.type]!.push(slot.entity);
      this.byId.delete(id);
    }
  }
}
