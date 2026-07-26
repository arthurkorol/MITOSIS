import { clamp, dist2, length } from '../core/math';
import { createRng, type Rng } from '../core/rng';
import { FOOD_DEFS, PLAYER, WORLD, type FoodType } from '../data/balance';
import { createPlayerCell, type Cell } from './cell';
import { fillInitialFood, updateFoodSpawner } from './spawner';

export interface Food {
  x: number;
  y: number;
  type: FoodType;
  /** Фаза покачивания для рендера; на симуляцию не влияет. */
  seed: number;
}

export type SimEvent =
  | { t: 'ate'; x: number; y: number; food: FoodType }
  | { t: 'dnaGain'; x: number; y: number; amount: number };

export interface PlayerIntent {
  /** Точка прицеливания в мировых координатах. */
  aimX: number;
  aimY: number;
}

export interface World {
  tick: number;
  rng: Rng;
  player: Cell;
  food: Food[];
  /** События последнего тика; потребитель читает после stepWorld. */
  events: SimEvent[];
  dna: number;
}

export function createWorld(seed: number): World {
  const center = WORLD.size / 2;
  const world: World = {
    tick: 0,
    rng: createRng(seed),
    player: createPlayerCell(1, center, center),
    food: [],
    events: [],
    dna: 0,
  };
  fillInitialFood(world);
  return world;
}

export function stepWorld(world: World, intent: PlayerIntent, dt: number): void {
  world.events.length = 0;
  updateFoodSpawner(world);
  stepMovement(world.player, intent, dt);
  applyEdgeSpring(world.player, dt);
  integrate(world.player, dt);
  eatFood(world, dt);
  metabolize(world.player, dt);
  world.tick++;
}

/** Steering «arrive»: клетка стремится к цели, плавно тормозя рядом с ней. */
function stepMovement(c: Cell, intent: PlayerIntent, dt: number): void {
  const dx = intent.aimX - c.x;
  const dy = intent.aimY - c.y;
  const d = length(dx, dy);

  let targetVx = 0;
  let targetVy = 0;
  if (d > PLAYER.deadZone) {
    const speed = PLAYER.vMax * clamp((d - PLAYER.deadZone) / PLAYER.arriveRadius, 0, 1);
    targetVx = (dx / d) * speed;
    targetVy = (dy / d) * speed;
  }

  let dvx = targetVx - c.vx;
  let dvy = targetVy - c.vy;
  const dv = length(dvx, dvy);
  const maxDv = PLAYER.accel * dt;
  if (dv > maxDv) {
    dvx = (dvx / dv) * maxDv;
    dvy = (dvy / dv) * maxDv;
  }
  c.vx += dvx;
  c.vy += dvy;

  const drag = Math.exp(-PLAYER.drag * dt);
  c.vx *= drag;
  c.vy *= drag;
}

/** Мягкая пружина у краёв мира: чем глубже в кромку, тем сильнее выталкивает. */
function applyEdgeSpring(c: Cell, dt: number): void {
  const m = WORLD.edgeMargin;
  const s = WORLD.size;
  if (c.x < m) c.vx += WORLD.edgeAccel * ((m - c.x) / m) * dt;
  if (c.x > s - m) c.vx -= WORLD.edgeAccel * ((c.x - (s - m)) / m) * dt;
  if (c.y < m) c.vy += WORLD.edgeAccel * ((m - c.y) / m) * dt;
  if (c.y > s - m) c.vy -= WORLD.edgeAccel * ((c.y - (s - m)) / m) * dt;
}

function integrate(c: Cell, dt: number): void {
  c.x = clamp(c.x + c.vx * dt, c.radius, WORLD.size - c.radius);
  c.y = clamp(c.y + c.vy * dt, c.radius, WORLD.size - c.radius);
}

function eatFood(world: World, dt: number): void {
  const c = world.player;
  const magnetR = c.radius + PLAYER.magnetExtra;
  const magnetR2 = magnetR * magnetR;
  for (let i = world.food.length - 1; i >= 0; i--) {
    const f = world.food[i]!;
    const d2 = dist2(c.x, c.y, f.x, f.y);
    const def = FOOD_DEFS[f.type];
    const eatR = c.radius + def.radius;
    if (d2 <= eatR * eatR) {
      c.energy = clamp(c.energy + def.energy, 0, PLAYER.energyMax);
      c.biomass += def.biomass;
      world.events.push({ t: 'ate', x: f.x, y: f.y, food: f.type });
      if (def.dna > 0) {
        world.dna += def.dna;
        world.events.push({ t: 'dnaGain', x: f.x, y: f.y, amount: def.dna });
      }
      removeFood(world, i);
    } else if (d2 <= magnetR2) {
      // Магнит: частица подтягивается к центру клетки.
      const d = Math.sqrt(d2);
      const pull = Math.min(PLAYER.magnetSpeed * dt, d);
      f.x += ((c.x - f.x) / d) * pull;
      f.y += ((c.y - f.y) / d) * pull;
    }
  }
}

function metabolize(c: Cell, dt: number): void {
  c.energy = Math.max(0, c.energy - PLAYER.metabolismPerSec * dt);
  if (c.energy <= 0) {
    c.hp = Math.max(0, c.hp - PLAYER.starveHpPerSec * dt);
  } else if (c.energy >= PLAYER.regenEnergyMin) {
    c.hp = Math.min(PLAYER.hpMax, c.hp + PLAYER.regenHpPerSec * dt);
  }
}

export function removeFood(world: World, index: number): void {
  const last = world.food.pop()!;
  if (index < world.food.length) world.food[index] = last;
}
