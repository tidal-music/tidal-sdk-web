import dts from 'vite-plugin-dts';
import { defineConfig, type UserConfig } from 'vitest/config';

const config: UserConfig = defineConfig({
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

export default config;
