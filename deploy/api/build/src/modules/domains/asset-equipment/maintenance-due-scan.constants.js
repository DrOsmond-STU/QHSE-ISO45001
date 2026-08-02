"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAINTENANCE_DUE_SCAN_CRON = exports.MAINTENANCE_DUE_SCAN_JOB_NAME = exports.MAINTENANCE_DUE_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 06:45 — slot berikutnya setelah
// occupational-health-reassessment-scan (belum py cron eksplisit tercatat,
// slot aman berurutan lintas modul sesi ini).
exports.MAINTENANCE_DUE_SCAN_QUEUE = "maintenance-due-scan";
exports.MAINTENANCE_DUE_SCAN_JOB_NAME = "scan";
exports.MAINTENANCE_DUE_SCAN_CRON = process.env.MAINTENANCE_DUE_SCAN_CRON ?? "45 6 * * *";
