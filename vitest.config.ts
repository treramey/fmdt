import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'ccexp/**/*', 'LAAIRDevOps/**/*'],
    globals: true,
    environment: 'node',
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
});
