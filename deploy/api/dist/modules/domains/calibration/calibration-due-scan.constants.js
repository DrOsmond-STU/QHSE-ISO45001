"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CALIBRATION_PROVIDER_ACCREDITATION_WARNING_WINDOW_DAYS = exports.CALIBRATION_REMINDER_TIERS_DAYS = exports.CALIBRATION_DUE_SCAN_JOB_NAME = exports.CALIBRATION_DUE_SCAN_QUEUE = exports.CALIBRATION_DUE_SCAN_CRON = void 0;
// PRD §11.3 "Job pengecekan OVERDUE & reminder berjalan HARIAN (batch)" —
// cron harian, jam digeser dari maintenance-due-scan (6.1, 06:45) supaya
// tidak bertabrakan beban query dgn scan job lain yg jalan pagi hari.
exports.CALIBRATION_DUE_SCAN_CRON = process.env.CALIBRATION_DUE_SCAN_CRON ?? "0 7 * * *";
exports.CALIBRATION_DUE_SCAN_QUEUE = "calibration-due-scan";
exports.CALIBRATION_DUE_SCAN_JOB_NAME = "scan";
// PRD §5/§8 default tier reminder [30,14,7,1] — lihat banner comment
// calibration-lifecycle.ts poin (3) soal kolom idempotency tetap
// menggantikan reminder_days_before configurable.
exports.CALIBRATION_REMINDER_TIERS_DAYS = [30, 14, 7, 1];
// PRD §8 baris 5 — "mendekati H-60" utk akreditasi provider.
exports.CALIBRATION_PROVIDER_ACCREDITATION_WARNING_WINDOW_DAYS = 60;
//# sourceMappingURL=calibration-due-scan.constants.js.map