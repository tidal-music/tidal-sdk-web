import topLevelAwait from 'vite-plugin-top-level-await';
import { defineConfig, mergeConfig } from 'vitest/config';

import defaultViteConfig from './vite.config';

export default mergeConfig(
  defaultViteConfig,
  defineConfig({
    build: {
      lib: {
        entry: 'src/index.ts',
        fileName: 'index',
        formats: ['es'],
      },
      outDir: 'dist/legacy',
      target: 'chrome76',
    },
    plugins: [topLevelAwait()],
  }),
);
