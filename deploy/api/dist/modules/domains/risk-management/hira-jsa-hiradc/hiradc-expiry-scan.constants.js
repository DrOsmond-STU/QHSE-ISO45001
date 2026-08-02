"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIRADC_EXPIRY_SCAN_CRON = exports.HIRADC_EXPIRY_SCAN_JOB_NAME = exports.HIRADC_EXPIRY_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik — BR-04 (PRD Modul 05 §6). Cron 02:15 —
// setelah risk-management belum py job lain, slot berikutnya setelah
// obligation-due-scan (2.2, 02:00).
exports.HIRADC_EXPIRY_SCAN_QUEUE = "hiradc-expiry-scan";
exports.HIRADC_EXPIRY_SCAN_JOB_NAME = "scan";
exports.HIRADC_EXPIRY_SCAN_CRON = process.env.HIRADC_EXPIRY_SCAN_CRON ?? "15 2 * * *";
//# sourceMappingURL=hiradc-expiry-scan.constants.js.map