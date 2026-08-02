"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PASSWORD_POLICY = exports.LOGIN_RATE_LIMIT_PER_MINUTE = exports.REFRESH_TOKEN_BYTES = exports.AUTH_CODE_TTL_SECONDS = exports.ACCESS_TOKEN_TTL_SECONDS = void 0;
// Task 0.6 — nilai tetap sesuai spek TDD §8.1 (bukan env-configurable; TDD
// memperlakukan 15 menit sebagai nilai spek, bukan rekomendasi awal).
exports.ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 900
exports.AUTH_CODE_TTL_SECONDS = 60;
exports.REFRESH_TOKEN_BYTES = 48;
exports.LOGIN_RATE_LIMIT_PER_MINUTE = 20;
// Fallback kalau tenant belum punya baris password_policies sendiri (Modul 01
// provisioning tenant / task 1.1 belum ada) — sama persis dengan default kolom
// di schema.prisma model PasswordPolicy, supaya tidak crash sebelum Phase 1.
exports.DEFAULT_PASSWORD_POLICY = {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    sessionTimeoutMinutes: 60,
    mfaRequired: false,
};
//# sourceMappingURL=auth.constants.js.map