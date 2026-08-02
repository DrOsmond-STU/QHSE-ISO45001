"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notification_time_1 = require("./notification-time");
describe("notification-time — konversi TIME Postgres <-> string HH:mm", () => {
    it("isValidTimeString menerima format HH:mm valid", () => {
        expect((0, notification_time_1.isValidTimeString)("00:00")).toBe(true);
        expect((0, notification_time_1.isValidTimeString)("22:30")).toBe(true);
        expect((0, notification_time_1.isValidTimeString)("23:59")).toBe(true);
    });
    it("isValidTimeString menolak format tidak valid", () => {
        expect((0, notification_time_1.isValidTimeString)("24:00")).toBe(false);
        expect((0, notification_time_1.isValidTimeString)("12:60")).toBe(false);
        expect((0, notification_time_1.isValidTimeString)("9:00")).toBe(false); // wajib 2 digit
        expect((0, notification_time_1.isValidTimeString)("12:00:00")).toBe(false);
        expect((0, notification_time_1.isValidTimeString)("bukan-waktu")).toBe(false);
    });
    it("timeStringToDate null/undefined -> null", () => {
        expect((0, notification_time_1.timeStringToDate)(null)).toBeNull();
        expect((0, notification_time_1.timeStringToDate)(undefined)).toBeNull();
    });
    it("timeStringToDate menghasilkan Date dgn tanggal dasar 1970-01-01 UTC", () => {
        const date = (0, notification_time_1.timeStringToDate)("22:30");
        expect(date.toISOString()).toBe("1970-01-01T22:30:00.000Z");
    });
    it("timeStringToDate melempar error utk format tidak valid", () => {
        expect(() => (0, notification_time_1.timeStringToDate)("bukan-waktu")).toThrow();
    });
    it("dateToTimeString null/undefined -> null", () => {
        expect((0, notification_time_1.dateToTimeString)(null)).toBeNull();
        expect((0, notification_time_1.dateToTimeString)(undefined)).toBeNull();
    });
    it("dateToTimeString round-trip dgn timeStringToDate", () => {
        expect((0, notification_time_1.dateToTimeString)((0, notification_time_1.timeStringToDate)("07:05"))).toBe("07:05");
        expect((0, notification_time_1.dateToTimeString)((0, notification_time_1.timeStringToDate)("00:00"))).toBe("00:00");
    });
});
