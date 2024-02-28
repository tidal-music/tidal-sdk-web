import { defineConfig } from 'vitest/config';

// used by ci for coverage reporting
export default defineConfig({
  test: {
    coverage: {
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
});
