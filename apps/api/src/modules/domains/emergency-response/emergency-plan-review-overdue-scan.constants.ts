// TDD §13.1 pola job cron generik. Cron 05:00 — slot berikutnya setelah
// seluruh scan job Inspection (04:15/04:30/04:45).
export const EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_QUEUE = "emergency-plan-review-overdue-scan";
export const EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_JOB_NAME = "scan";
export const EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON = process.env.EMERGENCY_PLAN_REVIEW_OVERDUE_SCAN_CRON ?? "0 5 * * *";
