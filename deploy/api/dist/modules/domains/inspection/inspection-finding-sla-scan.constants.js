"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSPECTION_FINDING_SLA_SCAN_CRON = exports.INSPECTION_FINDING_SLA_SCAN_JOB_NAME = exports.INSPECTION_FINDING_SLA_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 04:45 — slot berikutnya setelah
// inspection-record-overdue-scan (04:30).
exports.INSPECTION_FINDING_SLA_SCAN_QUEUE = "inspection-finding-sla-scan";
exports.INSPECTION_FINDING_SLA_SCAN_JOB_NAME = "scan";
exports.INSPECTION_FINDING_SLA_SCAN_CRON = process.env.INSPECTION_FINDING_SLA_SCAN_CRON ?? "45 4 * * *";
//# sourceMappingURL=inspection-finding-sla-scan.constants.js.map