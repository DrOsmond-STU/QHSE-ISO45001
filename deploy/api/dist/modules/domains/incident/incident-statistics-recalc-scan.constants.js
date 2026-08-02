"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INCIDENT_STATISTICS_RECALC_SCAN_CRON = exports.INCIDENT_STATISTICS_RECALC_SCAN_JOB_NAME = exports.INCIDENT_STATISTICS_RECALC_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 04:00 — slot berikutnya setelah
// incident-regulatory-report-overdue-scan (3.5, 03:30).
exports.INCIDENT_STATISTICS_RECALC_SCAN_QUEUE = "incident-statistics-recalc-scan";
exports.INCIDENT_STATISTICS_RECALC_SCAN_JOB_NAME = "scan";
exports.INCIDENT_STATISTICS_RECALC_SCAN_CRON = process.env.INCIDENT_STATISTICS_RECALC_SCAN_CRON ?? "0 4 * * *";
//# sourceMappingURL=incident-statistics-recalc-scan.constants.js.map