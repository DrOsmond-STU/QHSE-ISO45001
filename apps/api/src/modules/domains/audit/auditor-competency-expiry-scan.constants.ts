// TDD §13.1 pola job cron generik. Cron 05:15 — slot berikutnya setelah
// Emergency Response (05:00).
export const AUDITOR_COMPETENCY_EXPIRY_SCAN_QUEUE = "auditor-competency-expiry-scan";
export const AUDITOR_COMPETENCY_EXPIRY_SCAN_JOB_NAME = "scan";
export const AUDITOR_COMPETENCY_EXPIRY_SCAN_CRON = process.env.AUDITOR_COMPETENCY_EXPIRY_SCAN_CRON ?? "15 5 * * *";
