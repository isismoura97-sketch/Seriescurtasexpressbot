module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/series-app'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'series-app/**/*.js',
    '!series-app/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov'],
};
