"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const holiday_calendar_1 = require("./holiday-calendar");
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
describe("isHoliday()", () => {
    it("true untuk tanggal one-off yang persis cocok", () => {
        const entries = [{ holidayDate: utc(2026, 8, 17), isRecurringYearly: false }];
        expect((0, holiday_calendar_1.isHoliday)(utc(2026, 8, 17), entries)).toBe(true);
    });
    it("false untuk tanggal one-off tahun berikutnya (bukan recurring)", () => {
        const entries = [{ holidayDate: utc(2026, 8, 17), isRecurringYearly: false }];
        expect((0, holiday_calendar_1.isHoliday)(utc(2027, 8, 17), entries)).toBe(false);
    });
    it("true untuk tanggal recurring yearly di tahun manapun (mis. 17 Agustus)", () => {
        const entries = [{ holidayDate: utc(2020, 8, 17), isRecurringYearly: true }];
        expect((0, holiday_calendar_1.isHoliday)(utc(2031, 8, 17), entries)).toBe(true);
    });
    it("false kalau tidak ada entry yang cocok", () => {
        const entries = [{ holidayDate: utc(2026, 1, 1), isRecurringYearly: true }];
        expect((0, holiday_calendar_1.isHoliday)(utc(2026, 8, 17), entries)).toBe(false);
    });
});
describe("isBusinessDay()", () => {
    it("false untuk Sabtu/Minggu walau tidak ada di holiday_calendar_entries", () => {
        // 2026-07-25 = Sabtu, 2026-07-26 = Minggu (diverifikasi kalender).
        expect((0, holiday_calendar_1.isBusinessDay)(utc(2026, 7, 25), [])).toBe(false);
        expect((0, holiday_calendar_1.isBusinessDay)(utc(2026, 7, 26), [])).toBe(false);
    });
    it("false untuk hari kerja (Senin-Jumat) yang merupakan holiday entry", () => {
        // 2026-08-17 = Senin.
        const entries = [{ holidayDate: utc(2026, 8, 17), isRecurringYearly: false }];
        expect((0, holiday_calendar_1.isBusinessDay)(utc(2026, 8, 17), entries)).toBe(false);
    });
    it("true untuk hari kerja biasa tanpa holiday entry", () => {
        // 2026-07-27 = Senin.
        expect((0, holiday_calendar_1.isBusinessDay)(utc(2026, 7, 27), [])).toBe(true);
    });
});
describe("addBusinessDays()", () => {
    it("melompati akhir pekan", () => {
        // 2026-07-23 Kamis + 2 hari kerja -> lompat Sabtu/Minggu -> 2026-07-27 Senin.
        const result = (0, holiday_calendar_1.addBusinessDays)(utc(2026, 7, 23), 2, []);
        expect(result.getUTCFullYear()).toBe(2026);
        expect(result.getUTCMonth()).toBe(6); // Juli = index 6
        expect(result.getUTCDate()).toBe(27);
    });
    it("melompati hari libur di tengah rentang", () => {
        // 2026-08-14 Jumat + 1 hari kerja: Sabtu/Minggu dilompati, Senin
        // 2026-08-17 adalah recurring holiday -> lompat lagi -> Selasa 2026-08-18.
        const entries = [{ holidayDate: utc(2020, 8, 17), isRecurringYearly: true }];
        const result = (0, holiday_calendar_1.addBusinessDays)(utc(2026, 8, 14), 1, entries);
        expect(result.getUTCMonth()).toBe(7); // Agustus = index 7
        expect(result.getUTCDate()).toBe(18);
    });
    it("days=0 mengembalikan tanggal yang sama", () => {
        const start = utc(2026, 7, 27);
        const result = (0, holiday_calendar_1.addBusinessDays)(start, 0, []);
        expect(result.getTime()).toBe(start.getTime());
    });
});
//# sourceMappingURL=holiday-calendar.spec.js.map