// TDD §13.1 pola job cron generik. Cron 05:30 — slot berikutnya setelah
// auditor-competency-expiry-scan (05:15).
export const AUDIT_FINDING_CLOSURE_DUE_SCAN_QUEUE = "audit-finding-closure-due-scan";
export const AUDIT_FINDING_CLOSURE_DUE_SCAN_JOB_NAME = "scan";
export const AUDIT_FINDING_CLOSURE_DUE_SCAN_CRON = process.env.AUDIT_FINDING_CLOSURE_DUE_SCAN_CRON ?? "30 5 * * *";
