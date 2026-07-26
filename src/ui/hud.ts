import { PLAYER } from '../data/balance';
import type { World } from '../sim/world';

/**
 * HUD в стиле клеточной стадии Spore: тёмное сине-стальное «стекло»
 * узкой полосой по нижней кромке. Намеренно НЕ органический —
 * он контрастирует с яркой акварельной картинкой.
 */
export class Hud {
  private readonly dnaValue: HTMLElement;
  private readonly progressFill: HTMLElement;
  private readonly healthFill: HTMLElement;
  private readonly energyFill: HTMLElement;
  private lastHp = -1;
  private lastEnergy = -1;
  private lastDna = -1;
  private lastProgress = -1;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <div class="bar-strip">
        <div class="dna-chip"><span class="dna-icon">🧬</span><span class="dna-value">0</span></div>
        <div class="progress">
          <div class="progress-fill"></div>
          <i class="tick" style="left:20%"></i>
          <i class="tick" style="left:40%"></i>
          <i class="tick" style="left:60%"></i>
          <i class="tick" style="left:80%"></i>
        </div>
        <div class="vitals">
          <div class="vital health"><div class="vital-fill"></div></div>
          <div class="vital energy"><div class="vital-fill"></div></div>
        </div>
      </div>
    `;
    this.dnaValue = root.querySelector<HTMLElement>('.dna-value')!;
    this.progressFill = root.querySelector<HTMLElement>('.progress-fill')!;
    this.healthFill = root.querySelector<HTMLElement>('.health .vital-fill')!;
    this.energyFill = root.querySelector<HTMLElement>('.energy .vital-fill')!;
  }

  update(world: World): void {
    const hp = world.player.hp / PLAYER.hpMax;
    const energy = world.player.energy / PLAYER.energyMax;
    if (Math.abs(hp - this.lastHp) > 0.003) {
      this.lastHp = hp;
      this.healthFill.style.transform = `scaleX(${hp.toFixed(3)})`;
    }
    if (Math.abs(energy - this.lastEnergy) > 0.003) {
      this.lastEnergy = energy;
      this.energyFill.style.transform = `scaleX(${energy.toFixed(3)})`;
    }
    if (world.dna !== this.lastDna) {
      this.lastDna = world.dna;
      this.dnaValue.textContent = String(world.dna);
    }
    // Полоса прогресса стадии — по накопленной биомассе, вехи через 20%.
    const progress = Math.min(1, world.player.biomass / 500);
    if (Math.abs(progress - this.lastProgress) > 0.002) {
      this.lastProgress = progress;
      this.progressFill.style.transform = `scaleX(${progress.toFixed(3)})`;
    }
  }
}
