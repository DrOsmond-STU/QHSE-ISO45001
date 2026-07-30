// TDD §13.1 pola job cron generik. Cron 06:30 — slot berikutnya setelah
// quality-complaint-response-sla-scan (06:15, 5.1).
export const WASTE_STORAGE_DURATION_SCAN_QUEUE = "waste-storage-duration-scan";
export const WASTE_STORAGE_DURATION_SCAN_JOB_NAME = "scan";
export const WASTE_STORAGE_DURATION_SCAN_CRON = process.env.WASTE_STORAGE_DURATION_SCAN_CRON ?? "30 6 * * *";
