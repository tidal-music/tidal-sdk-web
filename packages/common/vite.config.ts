import dts from 'vite-plugin-dts';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
  },
  plugins: [dts({ rollupTypes: true, tsconfigPath: 'tsconfig.build.json' })],
  test: {
    coverage: {
      exclude: ['./src/index.ts'].concat(configDefaults.coverage.exclude ?? []), // ignore barrel file
      reportOnFailure: true,
      reporter: process.env.CI ? ['json', 'json-summary'] : ['html'],
      thresholds: {
        autoUpdate: true,
        branches: 42.85,
        functions: 37.5,
        lines: 50,
        statements: 50,
      },
    },
    globals: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
