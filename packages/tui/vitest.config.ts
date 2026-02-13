import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'tui',
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: true,
    environment: 'node',
  },
});
