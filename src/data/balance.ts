/** Единственный источник всех игровых чисел. Тесты и код берут значения отсюда. */

export const FIXED_DT = 1 / 60;

export const WORLD = {
  size: 6400,
  /** Ширина зоны мягкой пружины у края. */
  edgeMargin: 300,
  /** Максимальное ускорение выталкивания на самой границе, px/с². */
  edgeAccel: 900,
} as const;

export const CAMERA = {
  /** Высота обзора в мировых единицах — постоянна на любом экране. */
  viewHeight: 900,
  /** Скорость экспоненциального следования за игроком, 1/с. */
  followRate: 5,
} as const;

export const PLAYER = {
  radius: 16,
  hpMax: 100,
  energyMax: 100,
  energyStart: 70,
  vMax: 220,
  accel: 900,
  /** Вязкое трение, 1/с (экспоненциальное затухание скорости). */
  drag: 0.4,
  /** Радиус зоны торможения steering «arrive». */
  arriveRadius: 64,
  /** Мёртвая зона у курсора — внутри неё клетка не дёргается. */
  deadZone: 12,
  metabolismPerSec: 1.0,
  starveHpPerSec: 2,
  regenHpPerSec: 0.5,
  /** Реген здоровья работает при энергии не ниже этого порога. */
  regenEnergyMin: 80,
  /** Магнит еды: радиус клетки + это значение. */
  magnetExtra: 24,
  magnetSpeed: 300,
} as const;

export type FoodType = 0 | 1 | 2;

/** 0 — зелень, 1 — белковая капля, 2 — золотой ДНК-сгусток. */
export const FOOD_DEFS = [
  { energy: 4, biomass: 1, dna: 0, radius: 3 },
  { energy: 10, biomass: 3, dna: 0, radius: 6 },
  { energy: 5, biomass: 0, dna: 2, radius: 12 },
] as const;

export const FOOD_SPAWN = {
  /** Кольцо спавна вокруг игрока: не ближе видимого экрана. */
  ringMin: 950,
  ringMax: 1900,
  /** Дальше этого расстояния еда деспавнится. */
  despawn: 2400,
  /** Целевые количества частиц каждого типа в радиусе ringMax. */
  targets: [220, 50, 14] as const,
  /** Сколько частиц максимум спавним за один тик. */
  perTickBudget: 6,
  /** Начальная заливка мира: кольцо вокруг стартовой позиции. */
  initialMin: 80,
  initialMax: 1700,
} as const;
