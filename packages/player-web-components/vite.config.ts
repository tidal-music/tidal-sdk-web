import dts from 'vite-plugin-dts';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    target: 'es2022',
  },
  plugins: [dts({ rollupTypes: true, tsconfigPath: 'tsconfig.build.json' })],
  server: {
    open: '/demo/index.html',
  },
  test: {
    coverage: {
      reportOnFailure: true,
      reporter: process.env.CI ? ['json', 'json-summary'] : ['html'],
      thresholds: {
        branches: 66.6,
        functions: 30,
        lines: 8.81,
        statements: 8.81,
      },
    },
    globals: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
