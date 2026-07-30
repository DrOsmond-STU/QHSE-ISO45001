// TDD §13.1 pola job cron generik — BR-04 (PRD Modul 05 §6). Cron 02:15 —
// setelah risk-management belum py job lain, slot berikutnya setelah
// obligation-due-scan (2.2, 02:00).
export const HIRADC_EXPIRY_SCAN_QUEUE = "hiradc-expiry-scan";
export const HIRADC_EXPIRY_SCAN_JOB_NAME = "scan";
export const HIRADC_EXPIRY_SCAN_CRON = process.env.HIRADC_EXPIRY_SCAN_CRON ?? "15 2 * * *";
