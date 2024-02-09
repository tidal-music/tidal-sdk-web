import dts from 'vite-plugin-dts';
import { type UserConfig, defineConfig } from 'vitest/config';

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
                target: 'https://openapi.tidal.com/',
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
        reportOnFailure: true,
        reporter: process.env.CI ? ['json', 'json-summary'] : ['html'],
        thresholds: {
          branches: 80,
          functions: 73.77,
          lines: 69.46,
          statements: 69.46,
        },
      },
      globals: true,
      restoreMocks: true,
      unstubGlobals: true,
    },
    ...serverExtras,
  };
});
