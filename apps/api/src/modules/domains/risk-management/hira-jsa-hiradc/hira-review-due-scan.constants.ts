// TDD §13.1 pola job cron generik — PRD §8 baris 2 (HIRA review_due_date
// H-30). Cron 02:45.
export const HIRA_REVIEW_DUE_SCAN_QUEUE = "hira-review-due-scan";
export const HIRA_REVIEW_DUE_SCAN_JOB_NAME = "scan";
export const HIRA_REVIEW_DUE_SCAN_CRON = process.env.HIRA_REVIEW_DUE_SCAN_CRON ?? "45 2 * * *";
