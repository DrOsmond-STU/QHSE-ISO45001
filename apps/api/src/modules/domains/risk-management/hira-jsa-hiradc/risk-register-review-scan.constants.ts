// TDD §13.1 pola job cron generik — BR-05 (PRD Modul 05 §6). Cron 02:30.
export const RISK_REGISTER_REVIEW_SCAN_QUEUE = "risk-register-review-scan";
export const RISK_REGISTER_REVIEW_SCAN_JOB_NAME = "scan";
export const RISK_REGISTER_REVIEW_SCAN_CRON = process.env.RISK_REGISTER_REVIEW_SCAN_CRON ?? "30 2 * * *";
