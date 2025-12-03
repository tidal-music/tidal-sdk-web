import { type UserConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command }) => {
  // needed for demo cors
  const serverExtras: UserConfig =
    command === 'serve'
      ? {
          server: {
            cors: true,
            proxy: {
              '/api/': {
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api/, ''),
                target: 'https://openapi.tidal.com/v2/',
              },
            },
          },
        }
      : {};

  return {
    build: {
      lib: {
        entry: 'src/index.ts',
        fileName: 'index',
        formats: ['es'],
      },
      minify: false,
      sourcemap: true,
    },
    plugins: [dts({ rollupTypes: true, tsconfigPath: 'tsconfig.build.json' })],
    test: {
      coverage: {
        exclude: ['examples/**'],
        provider: 'v8',
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
    ...serverExtras,
  };
});
