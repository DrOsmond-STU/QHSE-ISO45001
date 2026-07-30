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
  // Suite integration (test/*.integration-spec.ts) semuanya boot NestJS app
  // penuh terhadap Postgres+Redis portable LOKAL yang sama (bukan
  // Testcontainers terisolasi, lihat test/rls/generic-tenant-isolation...).
  // Begitu jumlah file test bertambah (127 test/29 suite di task 0.9),
  // worker paralel default Jest membanjiri koneksi DB/Redis lokal dan
  // menimbulkan flake intermiten (bukan bug fungsional — tiap suite lolos
  // 100% saat dijalankan sendiri/subset). maxWorkers rendah terbukti stabil.
  maxWorkers: 2,
};
