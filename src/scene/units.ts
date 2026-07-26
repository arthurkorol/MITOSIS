import { WORLD } from '../data/balance';

/**
 * Маппинг координат симуляции (px, 2D x/y) в сцену (юниты, плоскость XZ).
 * 1 юнит = 16 px = радиус игрока; центр мира — origin сцены.
 * Камера смотрит вниз: sim +x → сцена +X (право экрана), sim +y → сцена +Z (низ экрана).
 * Модуль чистый — без playcanvas, тестируется в node.
 */
export const PX_PER_UNIT = 16;

const HALF = WORLD.size / 2;

export const simToSceneX = (simX: number): number => (simX - HALF) / PX_PER_UNIT;
export const simToSceneZ = (simY: number): number => (simY - HALF) / PX_PER_UNIT;
export const sceneToSimX = (sceneX: number): number => sceneX * PX_PER_UNIT + HALF;
export const sceneToSimY = (sceneZ: number): number => sceneZ * PX_PER_UNIT + HALF;
/** Длины/радиусы: px → юниты. */
export const simLen = (px: number): number => px / PX_PER_UNIT;
