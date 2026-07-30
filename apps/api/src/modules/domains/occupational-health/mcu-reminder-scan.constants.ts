// TDD §13.1 pola job cron generik. Cron 06:45 — slot berikutnya setelah
// waste-storage-duration-scan (06:30, 5.2).
export const MCU_REMINDER_SCAN_QUEUE = "mcu-reminder-scan";
export const MCU_REMINDER_SCAN_JOB_NAME = "scan";
export const MCU_REMINDER_SCAN_CRON = process.env.MCU_REMINDER_SCAN_CRON ?? "45 6 * * *";
