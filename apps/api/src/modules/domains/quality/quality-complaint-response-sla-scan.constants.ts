// TDD §13.1 pola job cron generik. Cron 06:15 — slot berikutnya setelah
// capa-effectiveness-verification-due-scan (06:00, 4.2).
export const QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_QUEUE = "quality-complaint-response-sla-scan";
export const QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_JOB_NAME = "scan";
export const QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_CRON = process.env.QUALITY_COMPLAINT_RESPONSE_SLA_SCAN_CRON ?? "15 6 * * *";
