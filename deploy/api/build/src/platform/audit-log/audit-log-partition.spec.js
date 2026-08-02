"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const audit_log_partition_1 = require("./audit-log-partition");
describe("partitionSpecForMonth", () => {
    it("Juli 2026 -> nama partisi + rentang bulan kalender penuh", () => {
        const spec = (0, audit_log_partition_1.partitionSpecForMonth)(new Date(Date.UTC(2026, 6, 24, 15, 30)));
        expect(spec).toEqual({
            tableName: "system_audit_logs_y2026m07",
            rangeStartDate: "2026-07-01",
            rangeEndDate: "2026-08-01",
        });
    });
    it("Desember -> rentang menyeberang ke Januari tahun berikutnya", () => {
        const spec = (0, audit_log_partition_1.partitionSpecForMonth)(new Date(Date.UTC(2026, 11, 5)));
        expect(spec).toEqual({
            tableName: "system_audit_logs_y2026m12",
            rangeStartDate: "2026-12-01",
            rangeEndDate: "2027-01-01",
        });
    });
    it("bulan 1 digit di-zero-pad (m07, bukan m7)", () => {
        const spec = (0, audit_log_partition_1.partitionSpecForMonth)(new Date(Date.UTC(2026, 0, 1)));
        expect(spec.tableName).toBe("system_audit_logs_y2026m01");
    });
});
describe("addMonthsUtc", () => {
    it("menambah 1 bulan dalam tahun yang sama", () => {
        const result = (0, audit_log_partition_1.addMonthsUtc)(new Date(Date.UTC(2026, 6, 24)), 1);
        expect(result.getUTCFullYear()).toBe(2026);
        expect(result.getUTCMonth()).toBe(7); // Agustus (0-based)
    });
    it("menambah lintas pergantian tahun", () => {
        const result = (0, audit_log_partition_1.addMonthsUtc)(new Date(Date.UTC(2026, 11, 24)), 1);
        expect(result.getUTCFullYear()).toBe(2027);
        expect(result.getUTCMonth()).toBe(0); // Januari
    });
});
