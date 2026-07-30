// PRD Modul 01 §5/§7 — holiday_calendars dipakai "kalkulasi sla_hours
// efektif (mengecualikan hari libur)" oleh Workflow Engine (task 0.9).
// Pure/sync, tidak menyentuh DB — dipanggil dari HolidayCalendarService
// setelah entries di-load, pola sama site-lifecycle.ts/department-hierarchy.ts
// (task 1.1). Primitif ini SIAP dipakai modul lain (acceptance criterion
// literal TASK_INSTRUCTION.md 1.2: "jika berlaku") tapi task 1.2 SENGAJA
// TIDAK me-retrofit workflow-sla-scan.worker.ts (0.9) — belum ada
// permintaan eksplisit task manapun, pola sama audit_log_trigger yang
// task 1.1 tidak retrofit ke seluruh tabel Phase 0 (gap TDD §26).
export interface HolidayEntryLike {
  holidayDate: Date;
  isRecurringYearly: boolean;
}

// Sabtu/Minggu (getUTCDay() 6/0) — asumsi hari kerja standar Indonesia
// (Master PRD default_timezone Asia/Jakarta, data_residency_region ID),
// TIDAK ada di teks PRD Modul 01 §5 secara eksplisit (gap TDD §26): PRD
// hanya membahas holiday_calendar_entries, bukan pola akhir pekan. Tanpa
// asumsi ini, "business-day aware" (istilah literal TASK_INSTRUCTION.md
// 1.2) tidak lengkap — sebuah SLA yang cuma mengecualikan hari libur
// nasional tapi tetap menghitung Sabtu/Minggu sebagai hari kerja bukan
// "business-day aware" dalam pengertian umum.
const WEEKEND_UTC_DAYS: ReadonlySet<number> = new Set([0, 6]);

function isSameUtcDate(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function isHoliday(date: Date, entries: readonly HolidayEntryLike[]): boolean {
  return entries.some((entry) =>
    entry.isRecurringYearly
      ? entry.holidayDate.getUTCMonth() === date.getUTCMonth() && entry.holidayDate.getUTCDate() === date.getUTCDate()
      : isSameUtcDate(entry.holidayDate, date),
  );
}

export function isBusinessDay(date: Date, entries: readonly HolidayEntryLike[]): boolean {
  if (WEEKEND_UTC_DAYS.has(date.getUTCDay())) return false;
  return !isHoliday(date, entries);
}

/** Maju N hari kerja dari startDate (startDate sendiri TIDAK dihitung,
 * sama semantik business.js/date-fns umum — "5 hari kerja dari hari ini"
 * berarti hasilnya SETELAH 5 hari kerja berikutnya, bukan termasuk hari ini
 * walau hari ini kebetulan hari kerja). */
export function addBusinessDays(startDate: Date, days: number, entries: readonly HolidayEntryLike[]): Date {
  const result = new Date(startDate.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (isBusinessDay(result, entries)) {
      remaining -= 1;
    }
  }
  return result;
}
