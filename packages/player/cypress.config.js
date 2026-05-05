import { defineConfig } from 'cypress';

const config = defineConfig({
  e2e: {
    baseUrl: 'https://dev.tidal.com:5173',
    setupNodeEvents(on) {
      // The dev server uses a locally-trusted mkcert certificate for
      // dev.tidal.com. Headless Chromium in CI does not have the mkcert
      // root CA in its trust store, so accept the cert unconditionally.
      // (Local Cypress runs against a CA-trusted cert ignore this no-op.)
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--ignore-certificate-errors');
        }
        return launchOptions;
      });
    },
    specPattern: ['cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'],
    supportFile: false,
  },
});

// eslint-disable-next-line import/no-default-export
export default config;
