import { loadEnv } from 'vite';
import dts from 'vite-plugin-dts';
import version from 'vite-plugin-package-version';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    build: {
      lib: {
        entry: 'src/index.ts',
        fileName: 'index',
        formats: ['es'],
      },
      sourcemap: true,
      target: 'es2022',
    },
    define:
      mode === 'development'
        ? {
            // Expose TEST_USER for demo pages (dev mode only - never in builds)
            'import.meta.env.TEST_USER': JSON.stringify(env.TEST_USER),
          }
        : {},
    plugins: [
      version(),
      dts({ rollupTypes: true, tsconfigPath: 'tsconfig.build.json' }),
    ],
    server: {
      open: '/demo/index.html',
    },
    test: {
      coverage: {
        provider: 'v8',
        reporter: process.env.CI ? ['json', 'json-summary'] : ['html'],
      },
      globals: true,
      restoreMocks: true,
      unstubGlobals: true,
    },
  };
});
