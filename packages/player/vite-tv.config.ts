import { type PluginOption } from 'vite';
import dts from 'vite-plugin-dts';
import topLevelAwait from 'vite-plugin-top-level-await';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist/tv',
    target: 'chrome76',
  },
  plugins: [
    topLevelAwait(),
    dts({
      rollupTypes: true,
      tsconfigPath: 'tsconfig.build.json',
    }) as PluginOption,
  ],
  server: {
    open: '/demo/index.html',
  },
  test: {
    coverage: {
      reporter: process.env.CI ? ['json', 'json-summary'] : ['html'],
    },
    globals: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
