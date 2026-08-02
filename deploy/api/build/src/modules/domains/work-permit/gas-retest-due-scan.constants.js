"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAS_RETEST_DUE_SCAN_CRON = exports.GAS_RETEST_DUE_SCAN_JOB_NAME = exports.GAS_RETEST_DUE_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik — BR-05 (PRD Modul 06 §6). Cron 03:15 —
// slot berikutnya setelah work-permit-expiry-scan (03:00).
exports.GAS_RETEST_DUE_SCAN_QUEUE = "gas-retest-due-scan";
exports.GAS_RETEST_DUE_SCAN_JOB_NAME = "scan";
exports.GAS_RETEST_DUE_SCAN_CRON = process.env.GAS_RETEST_DUE_SCAN_CRON ?? "15 3 * * *";
