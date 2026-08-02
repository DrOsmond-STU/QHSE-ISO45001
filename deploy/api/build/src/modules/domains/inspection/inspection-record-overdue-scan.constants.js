"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSPECTION_RECORD_OVERDUE_SCAN_CRON = exports.INSPECTION_RECORD_OVERDUE_SCAN_JOB_NAME = exports.INSPECTION_RECORD_OVERDUE_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 04:30 — setelah inspection-record-
// generation-scan (04:15), supaya record baru digenerate DULU sebelum scan
// overdue jalan pada tenggat hari yang sama.
exports.INSPECTION_RECORD_OVERDUE_SCAN_QUEUE = "inspection-record-overdue-scan";
exports.INSPECTION_RECORD_OVERDUE_SCAN_JOB_NAME = "scan";
exports.INSPECTION_RECORD_OVERDUE_SCAN_CRON = process.env.INSPECTION_RECORD_OVERDUE_SCAN_CRON ?? "30 4 * * *";
