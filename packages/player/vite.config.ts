import dts from 'vite-plugin-dts';
import version from 'vite-plugin-package-version';
import { type UserConfig, defineConfig } from 'vitest/config';

const config: UserConfig = defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    target: 'es2022',
  },
  plugins: [
    version(),
    dts({ rollupTypes: true, tsconfigPath: 'tsconfig.build.json' }),
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

export default config;
