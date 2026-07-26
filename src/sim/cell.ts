import { PLAYER } from '../data/balance';

export type CellKind = 'player' | 'flora' | 'hunter' | 'darter' | 'rotifer' | 'rival';

export interface Cell {
  id: number;
  kind: CellKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  energy: number;
  biomass: number;
  /** Оттенок для NPC (hsl); у игрока не используется. */
  hue: number;
  alive: boolean;
}

export function createPlayerCell(id: number, x: number, y: number): Cell {
  return {
    id,
    kind: 'player',
    x,
    y,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    hp: PLAYER.hpMax,
    energy: PLAYER.energyStart,
    biomass: 0,
    hue: 0,
    alive: true,
  };
}
