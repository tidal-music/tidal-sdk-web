import topLevelAwait from 'vite-plugin-top-level-await';
import {
  type UserConfigFnObject,
  defineConfig,
  mergeConfig,
} from 'vitest/config';

import defaultViteConfig from './vite.config';

const config: UserConfigFnObject = defineConfig(configEnv =>
  mergeConfig(
    defaultViteConfig(configEnv),
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
  ),
);

export default config;
