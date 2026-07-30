// TDD §13.1 pola job cron generik. Cron 07:00 — slot berikutnya setelah
// mcu-reminder-scan (06:45).
export const OH_REASSESSMENT_SCAN_QUEUE = "occupational-health-reassessment-scan";
export const OH_REASSESSMENT_SCAN_JOB_NAME = "scan";
export const OH_REASSESSMENT_SCAN_CRON = process.env.OH_REASSESSMENT_SCAN_CRON ?? "0 7 * * *";
