// TDD §13.1 pola job cron generik — PRD §8 baris 3/5 (evaluasi jatuh
// tempo H-30 + obligation overdue), berbasis compliance_obligations.next_due_date
// (BR-06). Cron 02:00 — setelah license-expiry-scan (01:45), belum ada job
// lain di slot ini.
export const OBLIGATION_DUE_SCAN_QUEUE = "obligation-due-scan";
export const OBLIGATION_DUE_SCAN_JOB_NAME = "scan";
export const OBLIGATION_DUE_SCAN_CRON = process.env.OBLIGATION_DUE_SCAN_CRON ?? "0 2 * * *";
