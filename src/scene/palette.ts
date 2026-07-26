import { Color } from 'playcanvas';

/**
 * Палитра клеточной стадии Spore: «капля воды под микроскопом», а не тёмный океан.
 * Вода светлая бирюзово-циановая, тела существ — леденцовые насыщенные,
 * ВСЕ придатки (шипы, жвалы, реснички, стебельки глаз) — костяно-кремовые.
 */
export const PALETTE = {
  /** Вода: светлый циан, к краям чуть глубже. */
  waterLight: new Color(0.56, 0.86, 0.91),
  waterBase: new Color(0.388, 0.776, 0.851),
  waterDeep: new Color(0.231, 0.612, 0.722),
  /** Туман уводит даль в светлую дымку, а не в черноту. */
  fog: new Color(0.45, 0.79, 0.86),

  /** Кость: шипы, жвалы, реснички, стебельки — всегда этот тон. */
  bone: new Color(0.929, 0.878, 0.753),
  boneDark: new Color(0.847, 0.769, 0.604),

  /** Тело игрока — леденцовый оранжево-золотой, контраст к бирюзе. */
  playerBody: new Color(0.949, 0.475, 0.161),
  playerBodyDeep: new Color(0.784, 0.286, 0.11),

  /** Еда. */
  plantFood: new Color(0.184, 0.749, 0.227),
  plantFoodBright: new Color(0.498, 0.878, 0.157),
  meatFood: new Color(0.851, 0.263, 0.239),
  meatFoodPink: new Color(0.91, 0.502, 0.62),
  dnaFood: new Color(0.98, 0.82, 0.15),

  eyeWhite: new Color(1, 1, 1),
  eyePupil: new Color(0.05, 0.05, 0.07),
  eyeIris: new Color(0.2, 0.55, 0.85),
} as const;
