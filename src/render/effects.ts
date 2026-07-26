/** Косметические частицы (вспышки поглощения, искры ДНК). Не влияют на симуляцию. */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  life: number;
  size: number;
  color: string;
}

const CAP = 300;

export class Effects {
  private readonly parts: Particle[] = [];

  burst(x: number, y: number, rgb: readonly [number, number, number], count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      if (this.parts.length >= CAP) this.parts.shift();
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      const life = 0.35 + Math.random() * 0.3;
      this.parts.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        ttl: life,
        life,
        size: 1.5 + Math.random() * 2,
        color: `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`,
      });
    }
  }

  update(dt: number): void {
    const drag = Math.exp(-3 * dt);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]!;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        const last = this.parts.pop()!;
        if (i < this.parts.length) this.parts[i] = last;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy *= drag;
    }
  }

  /** Рисует в мировых координатах; вызывающий уже выставил трансформацию. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.parts.length === 0) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      ctx.fillStyle = `rgba(${p.color}, ${(p.ttl / p.life) * 0.85})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
