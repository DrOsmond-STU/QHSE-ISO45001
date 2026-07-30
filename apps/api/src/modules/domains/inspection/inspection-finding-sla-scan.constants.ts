// TDD §13.1 pola job cron generik. Cron 04:45 — slot berikutnya setelah
// inspection-record-overdue-scan (04:30).
export const INSPECTION_FINDING_SLA_SCAN_QUEUE = "inspection-finding-sla-scan";
export const INSPECTION_FINDING_SLA_SCAN_JOB_NAME = "scan";
export const INSPECTION_FINDING_SLA_SCAN_CRON = process.env.INSPECTION_FINDING_SLA_SCAN_CRON ?? "45 4 * * *";
