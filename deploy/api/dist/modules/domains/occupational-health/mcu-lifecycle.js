"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCU_REMINDER_LEAD_DAYS = void 0;
exports.validateMcuScheduleStatusTransition = validateMcuScheduleStatusTransition;
exports.validateMcuResultStatusTransition = validateMcuResultStatusTransition;
exports.requiresFitToWorkAssessment = requiresFitToWorkAssessment;
exports.isPreEmploymentClearanceComplete = isPreEmploymentClearanceComplete;
exports.isMcuReminderDue = isMcuReminderDue;
const SCHEDULE_TRANSITIONS = {
    SCHEDULED: ["RESCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"],
    RESCHEDULED: ["RESCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"],
    NO_SHOW: ["RESCHEDULED"],
    COMPLETED: [],
    CANCELLED: [],
};
function validateMcuScheduleStatusTransition(from, to) {
    if (!SCHEDULE_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi mcu_schedules.status dari ${from} ke ${to} tidak valid.`);
    }
}
const RESULT_TRANSITIONS = {
    DRAFT: ["FINALIZED"],
    FINALIZED: ["SHARED_WITH_EMPLOYEE"],
    SHARED_WITH_EMPLOYEE: [],
};
function validateMcuResultStatusTransition(from, to) {
    if (!RESULT_TRANSITIONS[from].includes(to)) {
        throw new Error(`Transisi mcu_results.status dari ${from} ke ${to} tidak valid.`);
    }
}
// PRD §4.1 poin 3: "jika ada temuan (MAJOR_FINDING/REQUIRES_FOLLOW_UP) ->
// memicu fit_to_work_assessments" — PRD melabeli ini "(BR-07)" tapi BR-07
// literal di §6 SEBENARNYA soal gate pre-employment (lihat
// isPreEmploymentClearanceComplete di bawah), bukan soal pemicu ini —
// kesalahan silang-rujukan PRD yang SAMA polanya dgn "capa_actions" Modul
// 11/12 (gap TDD §26, "trust literal skema/tabel yang genuinely ada" bukan
// label BR yang salah tempel).
function requiresFitToWorkAssessment(overallMcuResult) {
    return overallMcuResult === "MAJOR_FINDING" || overallMcuResult === "REQUIRES_FOLLOW_UP";
}
// BR-07 (literal §6) — "mcu_schedules.mcu_type = PRE_EMPLOYMENT wajib
// berstatus COMPLETED (dengan mcu_results dan fit_to_work_assessments
// valid, fit_status != UNFIT) sebelum status onboarding karyawan baru
// dapat diaktifkan penuh di Modul 02." Caller WAJIB sudah memfilter
// employeeUserId + mcuType=PRE_EMPLOYMENT sebelum memanggil ini (fungsi
// ini murni evaluasi status, tidak query DB) — lihat banner comment
// schema.prisma blok Modul 13 soal alasan wiring nyata ke UserService
// TIDAK dilakukan pass ini (gap README).
function isPreEmploymentClearanceComplete(input) {
    return input.mcuScheduleStatus === "COMPLETED" && input.hasMcuResult && input.fitStatus !== null && input.fitStatus !== "UNFIT";
}
// PRD §8 baris 1 — "MCU jatuh tempo (H-14/H-7/H-1)" TIGA threshold, TAPI
// mcu_schedules HANYA punya SATU kolom reminder_sent_at (bukan 3) — gap
// TDD §26, diimplementasikan sbg SATU reminder yang fire begitu
// scheduledDate masuk window <=14 hari (bukan persis di H-14/H-7/H-1),
// lalu reminder_sent_at mencegah re-fire. Dipilih drpd persis 3 titik hari
// (yang RISIKO SENYAP kalau scan job sempat downtime tepat di hari itu) —
// robust drpd presisi PRD literal, trade-off didokumentasikan README.
exports.MCU_REMINDER_LEAD_DAYS = 14;
function isMcuReminderDue(scheduledDate, now, reminderSentAt) {
    if (reminderSentAt !== null) {
        return false;
    }
    const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= exports.MCU_REMINDER_LEAD_DAYS && daysUntil >= 0;
}
//# sourceMappingURL=mcu-lifecycle.js.map