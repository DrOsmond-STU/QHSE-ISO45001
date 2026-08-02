"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSPECTION_RECORD_GENERATION_SCAN_CRON = exports.INSPECTION_RECORD_GENERATION_SCAN_JOB_NAME = exports.INSPECTION_RECORD_GENERATION_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 04:15 — slot berikutnya setelah
// incident-statistics-recalc-scan (3.5, 04:00).
exports.INSPECTION_RECORD_GENERATION_SCAN_QUEUE = "inspection-record-generation-scan";
exports.INSPECTION_RECORD_GENERATION_SCAN_JOB_NAME = "scan";
exports.INSPECTION_RECORD_GENERATION_SCAN_CRON = process.env.INSPECTION_RECORD_GENERATION_SCAN_CRON ?? "15 4 * * *";
//# sourceMappingURL=inspection-record-generation-scan.constants.js.map