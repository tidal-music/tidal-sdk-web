import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

// eslint-disable-next-line import/no-default-export
export default [
  {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'es',
        manualChunks(id) {
          if (id.includes('mux.js') || id.includes('shaka-player')) {
            return 'shakaPlayerVendor';
          }

          if (id.includes('basePlayer')) {
            return 'basePlayer';
          }

          if (id.includes('shakaPlayer')) {
            return 'shakaPlayer';
          }

          if (id.includes('node_modules')) {
            return 'vendor';
          }

          if (id.includes('internal/')) {
            return 'internal';
          }

          if (id.includes('api/')) {
            return 'api';
          }

          if (id.includes('nativePlayer')) {
            return 'nativePlayer';
          }

          if (id.includes('player/')) {
            return 'player';
          }
        },
      },
    ],
    plugins: [
      nodeResolve(),
      commonjs({
        include: [
          'node_modules/shaka-player/dist/shaka-player.compiled.js',
          'node_modules/mux.js/**/*.js',
          'node_modules/global/window.js',
          'node_modules/js-levenshtein/index.js',
        ],
        transformMixedEsModules: true,
      }),
      typescript(),
      terser(),
    ],
  },
];
