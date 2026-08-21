// Jest configuration. Uses the jest-expo preset so platform modules
// (expo-secure-store, expo-file-system, expo-notifications, expo-task-manager)
// are mocked automatically. We only run pure-logic unit tests here — no
// device/Android behavior is exercised by `jest`.
// See tests/CODEBASE.md for the full testing strategy.
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/unit/**/*.test.js"],
  // setupFilesAfterEnv runs after the test framework is loaded, so the setup
  // file can register its own beforeEach() to reset the fakes between tests.
  setupFilesAfterEnv: ["<rootDir>/tests/unit/setup.js"],
};
