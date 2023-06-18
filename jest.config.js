// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-require
const { defaults } = require('jest-config');

module.exports = {
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'js', 'mjs'],
  modulePathIgnorePatterns: ['./src/__tests__/config.js', './src/__tests__/setup.js'],
  watchPathIgnorePatterns: ['./src/__tests__/config.js', './src/__tests__/setup.js'],
  testPathIgnorePatterns: ['./src/__tests__/config.js', './src/__tests__/setup.js'],
  coveragePathIgnorePatterns: ['./src/__tests__/config.js', './src/__tests__/setup.js'],
  setupFiles: ['dotenv/config', './src/associations.js', './src/__tests__/setup.js'],
};
