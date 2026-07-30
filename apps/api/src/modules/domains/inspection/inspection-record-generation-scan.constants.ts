// TDD §13.1 pola job cron generik. Cron 04:15 — slot berikutnya setelah
// incident-statistics-recalc-scan (3.5, 04:00).
export const INSPECTION_RECORD_GENERATION_SCAN_QUEUE = "inspection-record-generation-scan";
export const INSPECTION_RECORD_GENERATION_SCAN_JOB_NAME = "scan";
export const INSPECTION_RECORD_GENERATION_SCAN_CRON = process.env.INSPECTION_RECORD_GENERATION_SCAN_CRON ?? "15 4 * * *";
