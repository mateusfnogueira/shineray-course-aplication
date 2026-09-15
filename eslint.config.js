'use strict';

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: [
      'apps/**',
      'packages/**',
      'infra/**',
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '*.js',
      '*.cjs',
      '*.mjs',
    ],
  },
];
