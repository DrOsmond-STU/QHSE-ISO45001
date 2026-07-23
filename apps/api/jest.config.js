/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: [
    "<rootDir>/test/**/*.integration-spec.ts",
    "<rootDir>/test/**/*.e2e-spec.ts",
    "<rootDir>/src/**/*.spec.ts",
  ],
  setupFiles: ["<rootDir>/test/jest.setup.ts"],
  testTimeout: 20000,
};
