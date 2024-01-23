import rollupCommonjs from '@rollup/plugin-commonjs';
import rollupReplace from '@rollup/plugin-replace';
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { fromRollup } from '@web/dev-server-rollup';
import { chromeLauncher } from '@web/test-runner';

// import { playwrightLauncher } from '@web/test-runner-playwright';

const commonjs = fromRollup(rollupCommonjs);
const replace = fromRollup(rollupReplace);
// Async code issues? Check https://github.com/mochajs/mocha/issues/1128#issuecomment-924888221 ;)

// eslint-disable-next-line import/no-default-export
export default {
  browsers: [
    // playwrightLauncher({ product: 'chromium', launchOptions: { args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] } }),
    chromeLauncher({
      launchOptions: {
        args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
      },
    }),
    // playwrightLauncher({ product: 'firefox' }),
    // playwrightLauncher({ product: 'webkit' })
  ],
  concurrency: 1,
  coverage: true,
  files: ['src/**/*.test.ts'],
  nodeResolve: true,
  plugins: [
    // Transform dependencies that doesn't provide ESM from CJS to ESM.
    commonjs(),
    replace({
      preventAssignment: true,
      'process.env.TEST_USER': process.env.TEST_USER,
    }),
    esbuildPlugin({ ts: true, tsconfig: './tsconfig.json' }),
  ],
  // In a monorepo you need to set set the root dir to resolve modules (https://modern-web.dev/docs/test-runner/cli-and-configuration/)
  rootDir: '../../',
  testFramework: {
    config: {
      timeout: '20000',
      ui: 'bdd',
    },
  },
  testRunnerHtml: testFramework =>
    `<html>
      <body>
        <script>window.process = { env: { NODE_ENV: "development" } }</script>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>`,
};
