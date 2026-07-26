import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Симуляция обязана быть детерминированной: вся случайность — через world.rng.
 * Прямые Math.random/Date.now в src/sim ломают воспроизводимость по seed.
 */
describe('детерминизм исходников sim', () => {
  const simDir = dirname(fileURLToPath(import.meta.url));
  const files = readdirSync(simDir).filter((f) => f.endsWith('.ts') && !f.includes('.test.'));

  it.each(files)('%s не использует Math.random и Date.now', (file) => {
    const src = readFileSync(join(simDir, file), 'utf8');
    expect(src).not.toContain('Math.random');
    expect(src).not.toContain('Date.now');
    expect(src).not.toContain('performance.now');
  });
});
