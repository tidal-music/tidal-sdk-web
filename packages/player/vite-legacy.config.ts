import topLevelAwait from 'vite-plugin-top-level-await';
import { defineConfig, mergeConfig, type UserConfig } from 'vitest/config';

import defaultViteConfig from './vite.config';

const config: UserConfig = mergeConfig(
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

export default config;
