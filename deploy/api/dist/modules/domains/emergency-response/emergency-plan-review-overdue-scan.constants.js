"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON = exports.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_JOB_NAME = exports.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE = void 0;
// TDD §13.1 pola job cron generik. Cron 05:00 — slot berikutnya setelah
// seluruh scan job Inspection (04:15/04:30/04:45).
exports.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE = "emergency-plan-review-overdue-scan";
exports.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_JOB_NAME = "scan";
exports.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON = process.env.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON ?? "0 5 * * *";
//# sourceMappingURL=emergency-plan-review-overdue-scan.constants.js.map