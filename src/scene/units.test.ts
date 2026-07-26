import { describe, expect, it } from 'vitest';
import { WORLD } from '../data/balance';
import { PX_PER_UNIT, sceneToSimX, sceneToSimY, simLen, simToSceneX, simToSceneZ } from './units';

describe('units: маппинг sim↔сцена', () => {
  it('центр мира — origin сцены', () => {
    expect(simToSceneX(WORLD.size / 2)).toBe(0);
    expect(simToSceneZ(WORLD.size / 2)).toBe(0);
  });

  it('туда-обратно без потерь', () => {
    for (const v of [0, 123.5, 3200, 6400]) {
      expect(sceneToSimX(simToSceneX(v))).toBeCloseTo(v, 9);
      expect(sceneToSimY(simToSceneZ(v))).toBeCloseTo(v, 9);
    }
  });

  it('радиус игрока = 1 юнит', () => {
    expect(simLen(16)).toBe(1);
    expect(simLen(WORLD.size)).toBe(WORLD.size / PX_PER_UNIT);
  });
});
