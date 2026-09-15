'use strict';

const baseConfig = require('@compliance/eslint-config');

module.exports = [
  ...baseConfig,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
