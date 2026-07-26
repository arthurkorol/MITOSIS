import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Симуляция обязана оставаться headless: никакого PlayCanvas и слоя сцены.
 * Иначе vitest (environment: node) потянет движок, которому нужен DOM.
 */
describe('sim не зависит от движка', () => {
  const simDir = dirname(fileURLToPath(import.meta.url));
  const files = readdirSync(simDir).filter((f) => f.endsWith('.ts') && !f.includes('.test.'));

  it.each(files)('%s не импортирует playcanvas и scene', (file) => {
    const src = readFileSync(join(simDir, file), 'utf8');
    expect(src).not.toContain("from 'playcanvas'");
    expect(src).not.toContain('../scene');
  });
});
