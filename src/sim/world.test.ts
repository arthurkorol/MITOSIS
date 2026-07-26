import { describe, expect, it } from 'vitest';
import { FIXED_DT, FOOD_DEFS, FOOD_SPAWN, PLAYER, WORLD } from '../data/balance';
import { createWorld, stepWorld, type PlayerIntent, type World } from './world';

const stay = (w: World): PlayerIntent => ({ aimX: w.player.x, aimY: w.player.y });

const run = (w: World, ticks: number, intent?: (w: World) => PlayerIntent): void => {
  for (let i = 0; i < ticks; i++) stepWorld(w, (intent ?? stay)(w), FIXED_DT);
};

describe('createWorld', () => {
  it('игрок в центре, еда залита по целевым количествам', () => {
    const w = createWorld(1);
    expect(w.player.x).toBe(WORLD.size / 2);
    expect(w.player.y).toBe(WORLD.size / 2);
    const total = FOOD_SPAWN.targets[0] + FOOD_SPAWN.targets[1] + FOOD_SPAWN.targets[2];
    expect(w.food.length).toBe(total);
  });
});

describe('питание', () => {
  it('съеденная зелень даёт энергию и событие ate', () => {
    const w = createWorld(7);
    w.food.length = 0;
    w.food.push({ x: w.player.x, y: w.player.y, type: 0, seed: 0 });
    stepWorld(w, stay(w), FIXED_DT);
    expect(w.player.energy).toBeCloseTo(
      PLAYER.energyStart + FOOD_DEFS[0].energy - PLAYER.metabolismPerSec * FIXED_DT,
      3,
    );
    expect(w.player.biomass).toBe(FOOD_DEFS[0].biomass);
    expect(w.events.some((e) => e.t === 'ate')).toBe(true);
  });

  it('ДНК-сгусток даёт ДНК и событие dnaGain', () => {
    const w = createWorld(7);
    w.food.length = 0;
    w.food.push({ x: w.player.x, y: w.player.y, type: 2, seed: 0 });
    stepWorld(w, stay(w), FIXED_DT);
    expect(w.dna).toBe(FOOD_DEFS[2].dna);
    expect(w.events.some((e) => e.t === 'dnaGain')).toBe(true);
  });

  it('магнит подтягивает еду в радиусе, не съедая мгновенно', () => {
    const w = createWorld(7);
    w.food.length = 0;
    const startDist = w.player.radius + PLAYER.magnetExtra - 4;
    w.food.push({ x: w.player.x + startDist, y: w.player.y, type: 0, seed: 0 });
    stepWorld(w, stay(w), FIXED_DT);
    const f = w.food.find((f) => f.type === 0 && Math.abs(f.y - w.player.y) < 1);
    expect(f).toBeDefined();
    expect(f!.x - w.player.x).toBeLessThan(startDist);
  });
});

describe('метаболизм', () => {
  it('энергия падает со временем', () => {
    const w = createWorld(3);
    w.food.length = 0;
    run(w, 600); // 10 секунд; еда спавнится за экраном и недостижима
    expect(w.player.energy).toBeCloseTo(PLAYER.energyStart - 10 * PLAYER.metabolismPerSec, 1);
  });

  it('голодание при нулевой энергии бьёт по здоровью', () => {
    const w = createWorld(3);
    w.food.length = 0;
    w.player.energy = 0.5;
    run(w, 120);
    expect(w.player.energy).toBe(0);
    expect(w.player.hp).toBeLessThan(PLAYER.hpMax);
  });

  it('при высокой энергии здоровье восстанавливается', () => {
    const w = createWorld(3);
    w.food.length = 0;
    w.player.hp = 50;
    w.player.energy = PLAYER.energyMax;
    run(w, 60);
    expect(w.player.hp).toBeGreaterThan(50);
    expect(w.player.hp).toBeLessThanOrEqual(50 + PLAYER.regenHpPerSec + 0.01);
  });
});

describe('движение', () => {
  it('клетка плывёт к цели и останавливается в мёртвой зоне', () => {
    const w = createWorld(5);
    w.food.length = 0;
    const startX = w.player.x;
    const target = { aimX: startX + 300, aimY: w.player.y };
    run(w, 240, () => target);
    expect(w.player.x).toBeGreaterThan(startX + 250);
    expect(Math.abs(w.player.x - target.aimX)).toBeLessThan(PLAYER.arriveRadius);
  });

  it('край мира не выпускает клетку', () => {
    const w = createWorld(5);
    w.food.length = 0;
    const target = { aimX: -500, aimY: w.player.y };
    w.player.x = 100;
    run(w, 600, () => target);
    expect(w.player.x).toBeGreaterThanOrEqual(w.player.radius);
  });
});

describe('спавнер', () => {
  it('плотность еды держится около целевой при движении', () => {
    const w = createWorld(9);
    run(w, 1200, (w) => ({ aimX: w.player.x + 400, aimY: w.player.y }));
    const total = FOOD_SPAWN.targets[0] + FOOD_SPAWN.targets[1] + FOOD_SPAWN.targets[2];
    expect(w.food.length).toBeGreaterThan(total * 0.75);
    expect(w.food.length).toBeLessThanOrEqual(total + FOOD_SPAWN.perTickBudget);
  });
});

describe('детерминизм', () => {
  it('одинаковый seed и intents дают идентичный мир', () => {
    const a = createWorld(42);
    const b = createWorld(42);
    const intent = { aimX: 3300, aimY: 3100 };
    for (let i = 0; i < 1200; i++) {
      stepWorld(a, intent, FIXED_DT);
      stepWorld(b, intent, FIXED_DT);
    }
    expect(a.player).toEqual(b.player);
    expect(a.dna).toBe(b.dna);
    expect(a.food).toEqual(b.food);
  });
});
