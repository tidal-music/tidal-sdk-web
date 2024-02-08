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
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    globals: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
