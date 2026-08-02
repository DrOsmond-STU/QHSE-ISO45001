"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OH_REASSESSMENT_SCAN_CRON = exports.OH_REASSESSMENT_SCAN_JOB_NAME = exports.OH_REASSESSMENT_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 07:00 — slot berikutnya setelah
// mcu-reminder-scan (06:45).
exports.OH_REASSESSMENT_SCAN_QUEUE = "occupational-health-reassessment-scan";
exports.OH_REASSESSMENT_SCAN_JOB_NAME = "scan";
exports.OH_REASSESSMENT_SCAN_CRON = process.env.OH_REASSESSMENT_SCAN_CRON ?? "0 7 * * *";
