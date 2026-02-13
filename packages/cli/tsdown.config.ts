import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm'],
  external: ['@opentui/core', '@opentui/solid', 'solid-js', '@napi-rs/keyring', '@folder/xdg'],
  outDir: 'dist',
  clean: true,
});
