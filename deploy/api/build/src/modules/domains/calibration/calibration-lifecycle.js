"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNextCalibrationDueDate = calculateNextCalibrationDueDate;
exports.shouldAutoCreateOutOfToleranceRecord = shouldAutoCreateOutOfToleranceRecord;
exports.isCapaRequiredAtOotCreation = isCapaRequiredAtOotCreation;
exports.isCapaRequiredAfterImpactAssessment = isCapaRequiredAfterImpactAssessment;
exports.canCloseOutOfToleranceRecord = canCloseOutOfToleranceRecord;
exports.isCertificateReviewAllowedByAccreditation = isCertificateReviewAllowedByAccreditation;
exports.isWithinReminderWindow = isWithinReminderWindow;
exports.isCalibrationScheduleOverdue = isCalibrationScheduleOverdue;
exports.calculateDaysOverdue = calculateDaysOverdue;
const MS_PER_DAY = 1000 * 60 * 60 * 24;
// BR-03 — next_due_date WAJIB dihitung server-side, tidak pernah diterima
// langsung dari input (mencegah manipulasi jadwal). PRD §5 HANYA sediakan
// SATU tipe interval (calibration_interval_months), BEDA dari Asset 6.1
// (DAYS/WEEKS/MONTHS/RUNNING_HOURS) — tidak perlu switch tipe interval.
function calculateNextCalibrationDueDate(calibrationDate, intervalMonths) {
    const next = new Date(calibrationDate);
    next.setUTCMonth(next.getUTCMonth() + intervalMonths);
    return next;
}
// BR-04 — hasil FAIL wajib OTOMATIS membuat out_of_tolerance_records,
// TIDAK BISA di-skip user. CONDITIONAL_PASS TIDAK memicu (PRD §5 enum literal
// hanya 3 nilai: PASS/CONDITIONAL_PASS/FAIL — HANYA FAIL yang eksplisit
// disebut §4.2 poin 1 "calibration_result = FAIL/OUT_OF_TOLERANCE").
function shouldAutoCreateOutOfToleranceRecord(result) {
    return result === "FAIL";
}
// BR-06 (§6 literal) — is_critical_measurement=TRUE WAJIB requires_capa=TRUE
// SEJAK OOT record dibuat (§4.2 poin 1, SEBELUM penilaian dampak terjadi —
// impact_level masih null di titik ini, TIDAK BISA jadi bagian kondisi).
function isCapaRequiredAtOotCreation(isCriticalMeasurement) {
    return isCriticalMeasurement;
}
// §4.2 poin 3 (prosa alur bisnis, BUKAN BR-06 §6 formal) — "Jika
// calibration_items terkait ditandai kritis DAN/ATAU dampak dinilai
// MEDIUM/HIGH/CRITICAL: Wajib membuat CAPA". Prosa ini LEBIH LUAS dari BR-06
// formal (yang HANYA sebut is_critical_measurement) — direkonsiliasi via
// URUTAN WAKTU, bukan dianggap kontradiksi: BR-06 §6 mengatur nilai default
// SAAT CREATE (fungsi di atas, sebelum impact_level ada), fungsi INI
// mengatur RE-EVALUASI requires_capa SETELAH penilaian dampak (§4.2 poin 2,
// assessImpact()) — begitu impact_level genuinely terisi, kondisi OR penuh
// baru bisa dievaluasi. Kedua teks PRD sama-sama benar pada titik waktunya
// masing-masing.
function isCapaRequiredAfterImpactAssessment(isCriticalMeasurement, impactLevel) {
    if (isCriticalMeasurement)
        return true;
    return impactLevel === "MEDIUM" || impactLevel === "HIGH" || impactLevel === "CRITICAL";
}
// BR-07 — status TIDAK BISA CLOSED jika requires_capa=true tapi
// linked_capa_id masih kosong.
function canCloseOutOfToleranceRecord(requiresCapa, capaRegisterId) {
    if (!requiresCapa)
        return true;
    return capaRegisterId !== null;
}
// BR-05 — certificate TIDAK BISA REVIEWED jika accreditation_valid_until
// provider sudah lewat pada calibration_date, KECUALI INTERNAL_LAB (tidak
// butuh akreditasi eksternal). accreditation_valid_until null utk
// EXTERNAL_LAB diperlakukan FAIL-CLOSED (belum ada bukti akreditasi = belum
// boleh direview), pola sama seluruh gate fail-closed platform ini (RBAC/
// tenant context). Override manual dgn justifikasi (PRD §6 literal) TIDAK
// dimodelkan sbg parameter fungsi ini SENGAJA — pola sama
// AssetService.assertDisposalAllowedDirectly() (BR-03 6.1): gate murni di
// sini, mekanisme override (AuditLogService.record()) ditegakkan terpisah
// di service layer supaya fungsi ini tetap pure/testable tanpa efek samping.
function isCertificateReviewAllowedByAccreditation(providerType, accreditationValidUntil, calibrationDate) {
    if (providerType === "INTERNAL_LAB")
        return true;
    if (!accreditationValidUntil)
        return false;
    return accreditationValidUntil.getTime() >= calibrationDate.getTime();
}
// PRD §5 "reminder_days_before default [30,14,7,1]" — satu fungsi generik
// dipanggil scan job 4x dgn windowDays berbeda (30/14/7/1), pola sama
// Asset 6.1 isMaintenanceDueSoon (window tunggal H-7) TAPI di-reuse utk
// N ambang berbeda drpd N variant terpisah.
function isWithinReminderWindow(dueDate, now, windowDays) {
    const diffDays = (dueDate.getTime() - now.getTime()) / MS_PER_DAY;
    return diffDays >= 0 && diffDays <= windowDays;
}
// BR-09 — status otomatis OVERDUE ketika due_date terlewati (job terjadwal).
function isCalibrationScheduleOverdue(dueDate, now) {
    return dueDate.getTime() < now.getTime();
}
function calculateDaysOverdue(dueDate, now) {
    return Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / MS_PER_DAY));
}
