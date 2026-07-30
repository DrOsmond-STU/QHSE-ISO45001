// TDD §13.1 pola job cron generik. Cron 05:45 — slot berikutnya setelah
// audit-finding-closure-due-scan (05:30, 4.1).
export const CAPA_ROOT_CAUSE_SLA_SCAN_QUEUE = "capa-root-cause-sla-scan";
export const CAPA_ROOT_CAUSE_SLA_SCAN_JOB_NAME = "scan";
export const CAPA_ROOT_CAUSE_SLA_SCAN_CRON = process.env.CAPA_ROOT_CAUSE_SLA_SCAN_CRON ?? "45 5 * * *";
