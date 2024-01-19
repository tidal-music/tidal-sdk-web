import { defineConfig } from 'cypress';

const config = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: ['cypress/e2e/**/*.cy.{js,jsx,ts,tsx}'],
    supportFile: false,
  },
});

// eslint-disable-next-line import/no-default-export
export default config;
