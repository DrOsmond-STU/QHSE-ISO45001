// TDD §13.1 pola job cron generik — BR-05 (PRD Modul 06 §6). Cron 03:15 —
// slot berikutnya setelah work-permit-expiry-scan (03:00).
export const GAS_RETEST_DUE_SCAN_QUEUE = "gas-retest-due-scan";
export const GAS_RETEST_DUE_SCAN_JOB_NAME = "scan";
export const GAS_RETEST_DUE_SCAN_CRON = process.env.GAS_RETEST_DUE_SCAN_CRON ?? "15 3 * * *";
