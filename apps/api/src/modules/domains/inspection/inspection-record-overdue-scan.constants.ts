// TDD §13.1 pola job cron generik. Cron 04:30 — setelah inspection-record-
// generation-scan (04:15), supaya record baru digenerate DULU sebelum scan
// overdue jalan pada tenggat hari yang sama.
export const INSPECTION_RECORD_OVERDUE_SCAN_QUEUE = "inspection-record-overdue-scan";
export const INSPECTION_RECORD_OVERDUE_SCAN_JOB_NAME = "scan";
export const INSPECTION_RECORD_OVERDUE_SCAN_CRON = process.env.INSPECTION_RECORD_OVERDUE_SCAN_CRON ?? "30 4 * * *";
