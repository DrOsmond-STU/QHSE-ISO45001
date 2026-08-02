"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHoliday = isHoliday;
exports.isBusinessDay = isBusinessDay;
exports.addBusinessDays = addBusinessDays;
// Sabtu/Minggu (getUTCDay() 6/0) — asumsi hari kerja standar Indonesia
// (Master PRD default_timezone Asia/Jakarta, data_residency_region ID),
// TIDAK ada di teks PRD Modul 01 §5 secara eksplisit (gap TDD §26): PRD
// hanya membahas holiday_calendar_entries, bukan pola akhir pekan. Tanpa
// asumsi ini, "business-day aware" (istilah literal TASK_INSTRUCTION.md
// 1.2) tidak lengkap — sebuah SLA yang cuma mengecualikan hari libur
// nasional tapi tetap menghitung Sabtu/Minggu sebagai hari kerja bukan
// "business-day aware" dalam pengertian umum.
const WEEKEND_UTC_DAYS = new Set([0, 6]);
function isSameUtcDate(a, b) {
    return (a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate());
}
function isHoliday(date, entries) {
    return entries.some((entry) => entry.isRecurringYearly
        ? entry.holidayDate.getUTCMonth() === date.getUTCMonth() && entry.holidayDate.getUTCDate() === date.getUTCDate()
        : isSameUtcDate(entry.holidayDate, date));
}
function isBusinessDay(date, entries) {
    if (WEEKEND_UTC_DAYS.has(date.getUTCDay()))
        return false;
    return !isHoliday(date, entries);
}
/** Maju N hari kerja dari startDate (startDate sendiri TIDAK dihitung,
 * sama semantik business.js/date-fns umum — "5 hari kerja dari hari ini"
 * berarti hasilnya SETELAH 5 hari kerja berikutnya, bukan termasuk hari ini
 * walau hari ini kebetulan hari kerja). */
function addBusinessDays(startDate, days, entries) {
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
//# sourceMappingURL=holiday-calendar.js.map