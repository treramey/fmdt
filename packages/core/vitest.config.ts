import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'core',
    include: ['tests/**/*.test.ts'],
    globals: true,
    environment: 'node',
  },
});
