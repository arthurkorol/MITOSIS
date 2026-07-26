import { PLAYER } from '../data/balance';
import type { World } from '../sim/world';

/** DOM-HUD поверх canvas: бары здоровья/энергии и счётчик ДНК. */
export class Hud {
  private readonly hpFill: HTMLElement;
  private readonly energyFill: HTMLElement;
  private readonly dnaValue: HTMLElement;
  private lastHp = -1;
  private lastEnergy = -1;
  private lastDna = -1;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="bars">
        <div class="bar hp"><div class="fill"></div></div>
        <div class="bar energy"><div class="fill"></div></div>
      </div>
      <div class="dna">🧬 <span class="dna-value">0</span></div>
    `;
    this.hpFill = root.querySelector<HTMLElement>('.bar.hp .fill')!;
    this.energyFill = root.querySelector<HTMLElement>('.bar.energy .fill')!;
    this.dnaValue = root.querySelector<HTMLElement>('.dna-value')!;
  }

  update(world: World): void {
    const hp = world.player.hp / PLAYER.hpMax;
    const energy = world.player.energy / PLAYER.energyMax;
    if (Math.abs(hp - this.lastHp) > 0.003) {
      this.lastHp = hp;
      this.hpFill.style.transform = `scaleX(${hp.toFixed(3)})`;
    }
    if (Math.abs(energy - this.lastEnergy) > 0.003) {
      this.lastEnergy = energy;
      this.energyFill.style.transform = `scaleX(${energy.toFixed(3)})`;
    }
    if (world.dna !== this.lastDna) {
      this.lastDna = world.dna;
      this.dnaValue.textContent = String(world.dna);
    }
  }
}
