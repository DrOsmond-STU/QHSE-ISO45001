"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_CRON = exports.INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_JOB_NAME = exports.INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 03:30 — slot berikutnya setelah
// work-permit (3.4, 03:00/03:15).
exports.INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_QUEUE = "incident-regulatory-report-overdue-scan";
exports.INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_JOB_NAME = "scan";
exports.INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_CRON = process.env.INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_CRON ?? "30 3 * * *";
//# sourceMappingURL=incident-regulatory-report-overdue-scan.constants.js.map