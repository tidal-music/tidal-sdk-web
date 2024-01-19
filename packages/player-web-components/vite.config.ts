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
      reporter: process.env.CI ? ['json', 'json-summary'] : ['html'],
    },
    globals: true,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
