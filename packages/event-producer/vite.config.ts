import { type PluginOption } from 'vite';
import dts from 'vite-plugin-dts';
import { type UserConfig, defineConfig } from 'vitest/config';

export default defineConfig(({ command, mode }) => {
  // needed for demo cors
  const serverExtras: UserConfig =
    command === 'serve'
      ? {
          server: {
            cors: true,
            open: '/test/index.html',
            proxy: {
              '/api/event-batch': {
                changeOrigin: true,
                target:
                  'https://event-collector.obelix-staging-use1.tidalhi.fi',
              },
              '/api/public/event-batch': {
                changeOrigin: true,
                target:
                  'https://event-collector.obelix-staging-use1.tidalhi.fi',
              },
            },
          },
        }
      : {};

  const userConfig: UserConfig = {
    build: {
      lib: {
        entry: 'src/index.ts',
        fileName: 'index',
        formats: ['es'],
      },
      minify: mode === 'development' ? false : 'esbuild',
    },
    plugins: [dts({ rollupTypes: true, tsconfigPath: 'tsconfig.build.json' })],
    test: {
      coverage: {
        reporter: process.env.CI ? ['json', 'json-summary'] : ['html'],
      },
      environment: 'happy-dom',
      globals: true,
      restoreMocks: true,
      unstubGlobals: true,
    },
    worker: {
      format: 'es',
      // @ts-expect-error - vite-plugin-dts types are not up to date... i think
      plugins: [
        dts({
          rollupTypes: true,
          tsconfigPath: 'tsconfig.build.json',
        }) as PluginOption,
      ],
    },
    ...serverExtras,
  };
  return userConfig;
});
