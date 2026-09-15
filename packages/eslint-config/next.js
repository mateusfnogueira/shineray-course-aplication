'use strict';

const baseConfig = require('./index.js');

module.exports = [
  ...baseConfig,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      // React Hook Form passes async handlers to JSX event attributes — allow this pattern
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: { attributes: false },
      }],
    },
  },
];
