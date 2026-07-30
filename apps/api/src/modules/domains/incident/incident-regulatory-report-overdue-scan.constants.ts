// TDD §13.1 pola job cron generik. Cron 03:30 — slot berikutnya setelah
// work-permit (3.4, 03:00/03:15).
export const INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_QUEUE = "incident-regulatory-report-overdue-scan";
export const INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_JOB_NAME = "scan";
export const INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_CRON = process.env.INCIDENT_REGULATORY_REPORT_OVERDUE_SCAN_CRON ?? "30 3 * * *";
