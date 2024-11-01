import dts from 'vite-plugin-dts';
import { defineConfig } from 'vitest/config';

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
      reporter: process.env.CI ? ['json', 'json-summary'] : ['html'],
    },
    globals: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
