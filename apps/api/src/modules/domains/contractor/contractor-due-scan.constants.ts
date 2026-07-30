export const CONTRACTOR_DUE_SCAN_CRON = process.env.CONTRACTOR_DUE_SCAN_CRON ?? "15 7 * * *";
export const CONTRACTOR_DUE_SCAN_QUEUE = "contractor-due-scan";
export const CONTRACTOR_DUE_SCAN_JOB_NAME = "scan";

// PRD §8 baris 3 "valid_until mendekati H-60".
export const PREQUALIFICATION_RENEWAL_WARNING_WINDOW_DAYS = 60;
