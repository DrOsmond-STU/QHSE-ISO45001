"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const inspection_schedule_recurrence_1 = require("./inspection-schedule-recurrence");
describe("computeNextGenerationDate", () => {
    const base = new Date("2026-07-25T00:00:00.000Z");
    it("DAILY -> +1 hari", () => {
        expect((0, inspection_schedule_recurrence_1.computeNextGenerationDate)(base, "DAILY").toISOString()).toBe("2026-07-26T00:00:00.000Z");
    });
    it("WEEKLY -> +7 hari", () => {
        expect((0, inspection_schedule_recurrence_1.computeNextGenerationDate)(base, "WEEKLY").toISOString()).toBe("2026-08-01T00:00:00.000Z");
    });
    it("MONTHLY -> +1 bulan", () => {
        expect((0, inspection_schedule_recurrence_1.computeNextGenerationDate)(base, "MONTHLY").toISOString()).toBe("2026-08-25T00:00:00.000Z");
    });
    it("QUARTERLY -> +3 bulan", () => {
        expect((0, inspection_schedule_recurrence_1.computeNextGenerationDate)(base, "QUARTERLY").toISOString()).toBe("2026-10-25T00:00:00.000Z");
    });
    it("CUSTOM_CRON -> null (tidak diimplementasikan)", () => {
        expect((0, inspection_schedule_recurrence_1.computeNextGenerationDate)(base, "CUSTOM_CRON")).toBeNull();
    });
});
describe("findSchedulesDueForGeneration", () => {
    const now = new Date("2026-07-25T00:00:00.000Z");
    it("menyertakan jadwal aktif yang nextGenerationDate sudah tiba, dalam rentang start/end", () => {
        const result = (0, inspection_schedule_recurrence_1.findSchedulesDueForGeneration)([{ scheduleId: "a", nextGenerationDate: new Date("2026-07-24T00:00:00.000Z"), isActive: true, startDate: null, endDate: null }], now);
        expect(result).toHaveLength(1);
    });
    it("mengecualikan jadwal isActive=false", () => {
        const result = (0, inspection_schedule_recurrence_1.findSchedulesDueForGeneration)([{ scheduleId: "a", nextGenerationDate: new Date("2026-07-24T00:00:00.000Z"), isActive: false, startDate: null, endDate: null }], now);
        expect(result).toHaveLength(0);
    });
    it("mengecualikan jadwal yang belum mencapai startDate atau sudah lewat endDate", () => {
        const result = (0, inspection_schedule_recurrence_1.findSchedulesDueForGeneration)([
            { scheduleId: "future", nextGenerationDate: new Date("2026-07-24T00:00:00.000Z"), isActive: true, startDate: new Date("2026-08-01T00:00:00.000Z"), endDate: null },
            { scheduleId: "ended", nextGenerationDate: new Date("2026-07-24T00:00:00.000Z"), isActive: true, startDate: null, endDate: new Date("2026-07-01T00:00:00.000Z") },
        ], now);
        expect(result).toHaveLength(0);
    });
});
