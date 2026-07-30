// TDD §13.1 pola job cron generik. Cron 06:45 — slot berikutnya setelah
// occupational-health-reassessment-scan (belum py cron eksplisit tercatat,
// slot aman berurutan lintas modul sesi ini).
export const MAINTENANCE_DUE_SCAN_QUEUE = "maintenance-due-scan";
export const MAINTENANCE_DUE_SCAN_JOB_NAME = "scan";
export const MAINTENANCE_DUE_SCAN_CRON = process.env.MAINTENANCE_DUE_SCAN_CRON ?? "45 6 * * *";
