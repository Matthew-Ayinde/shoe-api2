module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: ["src/**/*.js", "!src/tests/**", "!src/scripts/**"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.js"],
  testTimeout: 30000,
}
