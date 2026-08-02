export interface HolidayEntryLike {
    holidayDate: Date;
    isRecurringYearly: boolean;
}
export declare function isHoliday(date: Date, entries: readonly HolidayEntryLike[]): boolean;
export declare function isBusinessDay(date: Date, entries: readonly HolidayEntryLike[]): boolean;
/** Maju N hari kerja dari startDate (startDate sendiri TIDAK dihitung,
 * sama semantik business.js/date-fns umum — "5 hari kerja dari hari ini"
 * berarti hasilnya SETELAH 5 hari kerja berikutnya, bukan termasuk hari ini
 * walau hari ini kebetulan hari kerja). */
export declare function addBusinessDays(startDate: Date, days: number, entries: readonly HolidayEntryLike[]): Date;
