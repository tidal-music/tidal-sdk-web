import { loadEnv } from 'vite';
import dts from 'vite-plugin-dts';
import mkcert from 'vite-plugin-mkcert';
import version from 'vite-plugin-package-version';
import { defineConfig } from 'vitest/config';

// Dev server runs at https://dev.tidal.com:5173. Requires
// `127.0.0.1 dev.tidal.com` in /etc/hosts; vite-plugin-mkcert installs a
// local CA into the system trust store on first run. See README for setup.
const DEV_HOST = 'dev.tidal.com';
const DEV_PORT = 5173;

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
      dts({ rollupTypes: false, tsconfigPath: 'tsconfig.build.json' }),
      mkcert({ hosts: [DEV_HOST] }),
    ],
    server: {
      host: DEV_HOST,
      open: `https://${DEV_HOST}:${DEV_PORT}/demo/index.html`,
      port: DEV_PORT,
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
