import { dist2 } from '../core/math';
import { FOOD_SPAWN, WORLD, type FoodType } from '../data/balance';
import { removeFood, type World } from './world';

const TAU = Math.PI * 2;

/** Начальная заливка: еда в диске вокруг стартовой позиции игрока. */
export function fillInitialFood(world: World): void {
  for (let t = 0; t < 3; t++) {
    const type = t as FoodType;
    const target = FOOD_SPAWN.targets[type];
    for (let i = 0; i < target; i++) {
      spawnFood(world, type, FOOD_SPAWN.initialMin, FOOD_SPAWN.initialMax);
    }
  }
}

/**
 * Поддерживает плотность еды вокруг игрока: деспавнит слишком далёкую,
 * доспавнивает недостающую в кольце за пределами экрана.
 */
export function updateFoodSpawner(world: World): void {
  const p = world.player;
  const despawn2 = FOOD_SPAWN.despawn * FOOD_SPAWN.despawn;
  const counts: [number, number, number] = [0, 0, 0];

  for (let i = world.food.length - 1; i >= 0; i--) {
    const f = world.food[i]!;
    if (dist2(p.x, p.y, f.x, f.y) > despawn2) {
      removeFood(world, i);
    } else {
      counts[f.type]++;
    }
  }

  let budget = FOOD_SPAWN.perTickBudget;
  for (let t = 0; t < 3 && budget > 0; t++) {
    const type = t as FoodType;
    let deficit = FOOD_SPAWN.targets[type] - counts[type];
    while (deficit > 0 && budget > 0) {
      spawnFood(world, type, FOOD_SPAWN.ringMin, FOOD_SPAWN.ringMax);
      deficit--;
      budget--;
    }
  }
}

function spawnFood(world: World, type: FoodType, rMin: number, rMax: number): void {
  const p = world.player;
  // Точки вне мира перевыбираем, а не клампим: кламп схлопывал кольцо у границы,
  // и еда материализовалась в кадре и прямо под клеткой игрока.
  for (let attempt = 0; attempt < 8; attempt++) {
    const angle = world.rng.range(0, TAU);
    const r = world.rng.range(rMin, rMax);
    const x = p.x + Math.cos(angle) * r;
    const y = p.y + Math.sin(angle) * r;
    if (x < 0 || x > WORLD.size || y < 0 || y > WORLD.size) continue;
    world.food.push({ id: world.foodSeq++, x, y, type, seed: world.rng.range(0, TAU) });
    return;
  }
  // В самом углу мира допустимого сектора может не найтись — пропускаем, доспавним позже.
}
