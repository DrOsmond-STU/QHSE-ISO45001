"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUDIT_FINDING_CLOSURE_DUE_SCAN_CRON = exports.AUDIT_FINDING_CLOSURE_DUE_SCAN_JOB_NAME = exports.AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 05:30 — slot berikutnya setelah
// auditor-competency-expiry-scan (05:15).
exports.AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE = "audit-finding-closure-due-scan";
exports.AUDIT_FINDING_CLOSURE_DUE_SCAN_JOB_NAME = "scan";
exports.AUDIT_FINDING_CLOSURE_DUE_SCAN_CRON = process.env.AUDIT_FINDING_CLOSURE_DUE_SCAN_CRON ?? "30 5 * * *";
//# sourceMappingURL=audit-finding-closure-due-scan.constants.js.map