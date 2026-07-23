// @qhse/eslint-config — konfigurasi lint bersama seluruh apps/packages.
// Boundary rule (eslint-plugin-boundaries, TDD §3.2 — modul domain tidak boleh
// saling impor internal) ditambahkan begitu apps/api/src/modules/domains mulai
// berisi lebih dari satu modul (Phase 1 TASK_INSTRUCTION.md), bukan di sini.
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
];
