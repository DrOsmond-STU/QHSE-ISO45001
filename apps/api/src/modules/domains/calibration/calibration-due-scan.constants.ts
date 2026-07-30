// PRD §11.3 "Job pengecekan OVERDUE & reminder berjalan HARIAN (batch)" —
// cron harian, jam digeser dari maintenance-due-scan (6.1, 06:45) supaya
// tidak bertabrakan beban query dgn scan job lain yg jalan pagi hari.
export const CALIBRATION_DUE_SCAN_CRON = process.env.CALIBRATION_DUE_SCAN_CRON ?? "0 7 * * *";
export const CALIBRATION_DUE_SCAN_QUEUE = "calibration-due-scan";
export const CALIBRATION_DUE_SCAN_JOB_NAME = "scan";

// PRD §5/§8 default tier reminder [30,14,7,1] — lihat banner comment
// calibration-lifecycle.ts poin (3) soal kolom idempotency tetap
// menggantikan reminder_days_before configurable.
export const CALIBRATION_REMINDER_TIERS_DAYS = [30, 14, 7, 1] as const;

// PRD §8 baris 5 — "mendekati H-60" utk akreditasi provider.
export const CALIBRATION_PROVIDER_ACCREDITATION_WARNING_WINDOW_DAYS = 60;
