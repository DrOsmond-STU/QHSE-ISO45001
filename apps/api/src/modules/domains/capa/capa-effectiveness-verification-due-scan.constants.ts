// TDD §13.1 pola job cron generik. Cron 06:00 — slot berikutnya setelah
// capa-root-cause-sla-scan (05:45).
export const CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_QUEUE = "capa-effectiveness-verification-due-scan";
export const CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_JOB_NAME = "scan";
export const CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_CRON = process.env.CAPA_EFFECTIVENESS_VERIFICATION_DUE_SCAN_CRON ?? "0 6 * * *";
