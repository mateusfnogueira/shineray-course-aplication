'use strict';

const nestConfig = require('@compliance/eslint-config/nest');

module.exports = [
  ...nestConfig,
  {
    ignores: ['dist/**', 'node_modules/**', 'webpack.config.js', '*.config.js'],
  },
];
