"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMaintenanceDueSoon = isMaintenanceDueSoon;
exports.isMaintenanceOverdue = isMaintenanceOverdue;
exports.calculateDaysOverdue = calculateDaysOverdue;
exports.shouldDeactivateSchedulesOnLifecycleChange = shouldDeactivateSchedulesOnLifecycleChange;
exports.isSafetyCriticalNewlyFlagged = isSafetyCriticalNewlyFlagged;
exports.requiresDisposalWorkflow = requiresDisposalWorkflow;
exports.isSafetyCriticalOutOfServiceAlertRequired = isSafetyCriticalOutOfServiceAlertRequired;
exports.calculateNextDueDate = calculateNextDueDate;
const TERMINAL_LIFECYCLE_STATUSES = ["RETIRED", "DISPOSED"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;
// PRD §8 "next_due_date mendekati (H-7)" — jendela 7 hari SEBELUM
// jatuh tempo, TERMASUK hari-H itu sendiri (>=0), TIDAK termasuk yang
// sudah lewat (overdue punya event terpisah di bawah).
const DUE_SOON_WINDOW_DAYS = 7;
function isMaintenanceDueSoon(nextDueDate, now) {
    const diffDays = (nextDueDate.getTime() - now.getTime()) / MS_PER_DAY;
    return diffDays >= 0 && diffDays <= DUE_SOON_WINDOW_DAYS;
}
function isMaintenanceOverdue(nextDueDate, now) {
    return nextDueDate.getTime() < now.getTime();
}
function calculateDaysOverdue(nextDueDate, now) {
    return Math.max(0, Math.floor((now.getTime() - nextDueDate.getTime()) / MS_PER_DAY));
}
// BR-01 — aset RETIRED/DISPOSED tidak boleh punya jadwal maintenance aktif.
function shouldDeactivateSchedulesOnLifecycleChange(newStatus) {
    return TERMINAL_LIFECYCLE_STATUSES.includes(newStatus);
}
// BR-02 — HANYA transisi false->true yang memicu notifikasi review (bukan
// true->true/false->false/true->false, PRD §6 literal "perubahan ... dari
// false menjadi true").
function isSafetyCriticalNewlyFlagged(previous, next) {
    return !previous && next;
}
// BR-03 — disposal (lifecycle_status -> DISPOSED) wajib Workflow Engine
// HANYA kalau kategori aset mewajibkannya; kategori lain tetap bisa
// DISPOSED langsung tanpa approval (PRD §4.3/§6 "opsional per kategori").
function requiresDisposalWorkflow(newStatus, categoryRequiresDisposalApproval) {
    return newStatus === "DISPOSED" && categoryRequiresDisposalApproval;
}
// BR-04 — alert prioritas tinggi HANYA irisan is_safety_critical=true DAN
// condition_status=OUT_OF_SERVICE (bukan salah satu saja).
function isSafetyCriticalOutOfServiceAlertRequired(isSafetyCritical, conditionStatus) {
    return isSafetyCritical && conditionStatus === "OUT_OF_SERVICE";
}
// next_due_date (maintenance_schedules, PRD §5 "Dihitung otomatis dari
// maintenance terakhir") — DAYS/WEEKS/MONTHS murni kalender, dihitung dari
// performedDate maintenance_records terbaru (atau tanggal dasar awal kalau
// belum pernah ada maintenance sama sekali). RUNNING_HOURS SENGAJA
// mengembalikan null (BUKAN error) — PRD tidak sediakan kolom odometer/jam-
// operasi di skema §5 literal manapun (assets/maintenance_records), tidak
// ada nilai numerik utk dihitung interval-nya; caller (MaintenanceScheduleService)
// WAJIB biarkan next_due_date lama tidak berubah kalau intervalType ini,
// gap TDD §26.
function calculateNextDueDate(fromDate, intervalType, intervalValue) {
    if (intervalType === "RUNNING_HOURS") {
        return null;
    }
    const next = new Date(fromDate);
    switch (intervalType) {
        case "DAYS":
            next.setUTCDate(next.getUTCDate() + intervalValue);
            break;
        case "WEEKS":
            next.setUTCDate(next.getUTCDate() + intervalValue * 7);
            break;
        case "MONTHS":
            next.setUTCMonth(next.getUTCMonth() + intervalValue);
            break;
    }
    return next;
}
//# sourceMappingURL=asset-lifecycle.js.map