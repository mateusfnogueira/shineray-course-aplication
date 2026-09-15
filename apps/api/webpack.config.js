'use strict';

const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const nodeExternals = require('webpack-node-externals');

/**
 * Custom webpack config for NestJS.
 * Adds TsconfigPathsPlugin so workspace package aliases (e.g. @compliance/shared)
 * resolve to their TypeScript source at build time.
 * Excludes @compliance/* workspace packages from nodeExternals so they are
 * bundled inline instead of loaded as raw TypeScript at runtime.
 *
 * @param {import('webpack').Configuration} options
 * @returns {import('webpack').Configuration}
 */
module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: [/^@compliance\//],
      }),
    ],
    resolve: {
      ...options.resolve,
      plugins: [
        ...(options.resolve?.plugins ?? []),
        new TsconfigPathsPlugin({
          configFile: './tsconfig.build.json',
        }),
      ],
    },
  };
};
