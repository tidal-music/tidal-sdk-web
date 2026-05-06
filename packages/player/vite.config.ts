import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const here = fileURLToPath(new URL('.', import.meta.url));
const srcEntry = resolve(here, 'src/index.ts');

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  // In dev (and tests), short-circuit `../` and `../dist` imports from the
  // demo pages so they resolve to the live `src/` entry. Without this Vite
  // serves the prebuilt `dist/index.js` and aggressively memory-caches it,
  // which means source changes do not show up in the browser until you
  // rebuild AND restart the dev server. Using src/ enables real HMR.
  const isProd = mode === 'production';

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
      dts({ bundleTypes: false, tsconfigPath: 'tsconfig.build.json' }),
      mkcert({ hosts: [DEV_HOST] }),
    ],
    resolve: isProd
      ? undefined
      : {
          alias: [
            {
              find: /^\.\.\/dist$/,
              replacement: srcEntry,
            },
            {
              find: /^\.\.\/$/,
              replacement: srcEntry,
            },
          ],
        },
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
