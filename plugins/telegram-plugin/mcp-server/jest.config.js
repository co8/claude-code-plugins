/**
 * Jest configuration for Telegram Plugin tests
 * Using ES modules with Node's experimental VM modules
 */

export default {
  // Use Node's experimental VM modules for ESM support
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Transform files (skip for pure ES modules)
  transform: {},

  // Coverage configuration
  collectCoverageFrom: [
    'telegram-bot.js',
    'config/**/*.js',
    'utils/**/*.js',
    'services/**/*.js',
    'server/**/*.js',
    '!node_modules/**',
    '!tests/**',
    '!__tests__/**',
    '!coverage/**'
  ],

  coverageDirectory: '../tests/coverage',

  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    }
  },

  // Verbose output
  verbose: true,

  // Test timeout (longer for integration tests)
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Module paths
  roots: ['<rootDir>/../tests', '<rootDir>/__tests__'],

  // Module name mapper (if needed for aliases)
  moduleNameMapper: {},

  // Setup files (run before each test file)
  setupFilesAfterEnv: [],

  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,

  // Maximum workers for parallel execution
  maxWorkers: '50%',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],

  // Watch mode options
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ]
};
