import tidal from 'eslint-config-tidal';
import disableAutofix from 'eslint-plugin-disable-autofix';
import jsdoc from 'eslint-plugin-jsdoc';

/** @type { import("eslint").Linter.FlatConfig[] } */
// eslint-disable-next-line import/no-default-export
export default [
  ...tidal,
  {
    files: [
      'packages/*/src/**/*.ts',
      'packages/*/test/*/*.ts',
      'packages/*/*.ts',
    ],
  },
  {
    ignores: [
      'node_modules/*',
      'packages/*/node_modules/*',
      'packages/*/dist/*',
      'coverage',
    ],
  },
  {
    plugins: {
      'disable-autofix': disableAutofix,
      jsdoc,
    },
    rules: {
      '@typescript-eslint/ban-types': [
        'warn',
        {
          types: {
            null: "Use 'undefined' instead of 'null', or better yet '?' optional syntax",
          },
        },
      ],
      'disable-autofix/jsdoc/require-description': 'error',
      'disable-autofix/jsdoc/require-jsdoc': 'warn', // disable-autofix makes sure the normal jsdoc rule doesn't auto-add empty comments to pass the rule
      'jsdoc/tag-lines': ['warn', 'any', { startLines: 1 }],
      // prevent unnecessary imports and also importing stuff from happydom breaks vitest in a bad way
      'no-restricted-imports': [
        'error',
        {
          patterns: ['vitest', 'happydom'],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          message: 'Never use Date.now! always use trueTime.now()',
          selector:
            'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
        },
      ],
    },
  },
  // ignore some rules for eslint/vite config files
  {
    files: ['packages/*/vite*config.*s', 'eslint.config.js'],
    rules: {
      'import/no-default-export': 'off',
      'no-restricted-imports': 'off',
    },
  },
];
