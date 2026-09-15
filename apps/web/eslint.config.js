'use strict';

const nextConfig = require('@compliance/eslint-config/next');

module.exports = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
];
