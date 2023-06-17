// eslint-disable-next-line import/no-extraneous-dependencies, node/no-extraneous-require
const { defaults } = require('jest-config');

module.exports = {
  // ...
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'js', 'mjs'],
  modulePathIgnorePatterns: ['./src/__tests__/config.js', './src/__tests__/db.config.js'],
  watchPathIgnorePatterns: ['./src/__tests__/config.js', './src/__tests__/db.config.js'],
  testPathIgnorePatterns: ['./src/__tests__/config.js', './src/__tests__/db.config.js'],
  coveragePathIgnorePatterns: ['./src/__tests__/config.js', './src/__tests__/db.config.js'],
};
