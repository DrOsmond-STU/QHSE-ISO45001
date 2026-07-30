import { OhFitStatus, OhMcuResultOverall, OhMcuResultStatus, OhMcuScheduleStatus } from "@prisma/client";

const SCHEDULE_TRANSITIONS: Record<OhMcuScheduleStatus, OhMcuScheduleStatus[]> = {
  SCHEDULED: ["RESCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"],
  RESCHEDULED: ["RESCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"],
  NO_SHOW: ["RESCHEDULED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function validateMcuScheduleStatusTransition(from: OhMcuScheduleStatus, to: OhMcuScheduleStatus): void {
  if (!SCHEDULE_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transisi mcu_schedules.status dari ${from} ke ${to} tidak valid.`);
  }
}

const RESULT_TRANSITIONS: Record<OhMcuResultStatus, OhMcuResultStatus[]> = {
  DRAFT: ["FINALIZED"],
  FINALIZED: ["SHARED_WITH_EMPLOYEE"],
  SHARED_WITH_EMPLOYEE: [],
};

export function validateMcuResultStatusTransition(from: OhMcuResultStatus, to: OhMcuResultStatus): void {
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
export function requiresFitToWorkAssessment(overallMcuResult: OhMcuResultOverall): boolean {
  return overallMcuResult === "MAJOR_FINDING" || overallMcuResult === "REQUIRES_FOLLOW_UP";
}

export interface PreEmploymentClearanceInput {
  mcuScheduleStatus: OhMcuScheduleStatus;
  hasMcuResult: boolean;
  fitStatus: OhFitStatus | null;
}

// BR-07 (literal §6) — "mcu_schedules.mcu_type = PRE_EMPLOYMENT wajib
// berstatus COMPLETED (dengan mcu_results dan fit_to_work_assessments
// valid, fit_status != UNFIT) sebelum status onboarding karyawan baru
// dapat diaktifkan penuh di Modul 02." Caller WAJIB sudah memfilter
// employeeUserId + mcuType=PRE_EMPLOYMENT sebelum memanggil ini (fungsi
// ini murni evaluasi status, tidak query DB) — lihat banner comment
// schema.prisma blok Modul 13 soal alasan wiring nyata ke UserService
// TIDAK dilakukan pass ini (gap README).
export function isPreEmploymentClearanceComplete(input: PreEmploymentClearanceInput): boolean {
  return input.mcuScheduleStatus === "COMPLETED" && input.hasMcuResult && input.fitStatus !== null && input.fitStatus !== "UNFIT";
}

// PRD §8 baris 1 — "MCU jatuh tempo (H-14/H-7/H-1)" TIGA threshold, TAPI
// mcu_schedules HANYA punya SATU kolom reminder_sent_at (bukan 3) — gap
// TDD §26, diimplementasikan sbg SATU reminder yang fire begitu
// scheduledDate masuk window <=14 hari (bukan persis di H-14/H-7/H-1),
// lalu reminder_sent_at mencegah re-fire. Dipilih drpd persis 3 titik hari
// (yang RISIKO SENYAP kalau scan job sempat downtime tepat di hari itu) —
// robust drpd presisi PRD literal, trade-off didokumentasikan README.
export const MCU_REMINDER_LEAD_DAYS = 14;

export function isMcuReminderDue(scheduledDate: Date, now: Date, reminderSentAt: Date | null): boolean {
  if (reminderSentAt !== null) {
    return false;
  }
  const daysUntil = Math.ceil((scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntil <= MCU_REMINDER_LEAD_DAYS && daysUntil >= 0;
}
