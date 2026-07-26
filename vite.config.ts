import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/MITOSIS/',
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
