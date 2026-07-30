// TDD §13.1 pola job cron generik. Cron 04:00 — slot berikutnya setelah
// incident-regulatory-report-overdue-scan (3.5, 03:30).
export const INCIDENT_STATISTICS_RECALC_SCAN_QUEUE = "incident-statistics-recalc-scan";
export const INCIDENT_STATISTICS_RECALC_SCAN_JOB_NAME = "scan";
export const INCIDENT_STATISTICS_RECALC_SCAN_CRON = process.env.INCIDENT_STATISTICS_RECALC_SCAN_CRON ?? "0 4 * * *";
