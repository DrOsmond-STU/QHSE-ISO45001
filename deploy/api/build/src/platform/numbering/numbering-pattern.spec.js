"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const numbering_pattern_1 = require("./numbering-pattern");
describe("computePeriodKey", () => {
    const date = new Date(Date.UTC(2026, 6, 24)); // 24 Juli 2026 (bulan 0-based)
    it("YEARLY -> tahun 4 digit", () => {
        expect((0, numbering_pattern_1.computePeriodKey)("YEARLY", date)).toBe("2026");
    });
    it("MONTHLY -> tahun-bulan, bulan 2 digit zero-padded", () => {
        expect((0, numbering_pattern_1.computePeriodKey)("MONTHLY", date)).toBe("2026-07");
    });
    it("NEVER -> null (tidak pernah reset)", () => {
        expect((0, numbering_pattern_1.computePeriodKey)("NEVER", date)).toBeNull();
    });
    it("MONTHLY bulan Januari tetap 2 digit (01, bukan 1)", () => {
        expect((0, numbering_pattern_1.computePeriodKey)("MONTHLY", new Date(Date.UTC(2026, 0, 5)))).toBe("2026-01");
    });
});
describe("renderNumberPattern", () => {
    const now = new Date(Date.UTC(2026, 6, 24)); // Q3, 24 Juli 2026
    it("contoh literal Master PRD §10: INC/JKT-01/2026/0001", () => {
        const result = (0, numbering_pattern_1.renderNumberPattern)("{PREFIX}/{SITE_CODE}/{YYYY}/{SEQ:4}", {
            prefix: "INC",
            sequence: 1,
            now,
            variables: { SITE_CODE: "JKT-01" },
        });
        expect(result).toBe("INC/JKT-01/2026/0001");
    });
    it("{SEQ:n} zero-pad sesuai lebar, tidak terpotong walau sequence sudah besar", () => {
        expect((0, numbering_pattern_1.renderNumberPattern)("{SEQ:3}", { prefix: "X", sequence: 7, now })).toBe("007");
        expect((0, numbering_pattern_1.renderNumberPattern)("{SEQ:3}", { prefix: "X", sequence: 12345, now })).toBe("12345");
    });
    it("{SEQ} tanpa lebar padding -> throw eksplisit (config pattern invalid)", () => {
        expect(() => (0, numbering_pattern_1.renderNumberPattern)("{PREFIX}/{SEQ}", { prefix: "X", sequence: 1, now })).toThrow(/lebar padding/);
    });
    it("token tanggal diresolusi sendiri: {MM} {QUARTER} {YYYYMMDD}", () => {
        expect((0, numbering_pattern_1.renderNumberPattern)("{MM}", { prefix: "X", sequence: 1, now })).toBe("07");
        expect((0, numbering_pattern_1.renderNumberPattern)("{QUARTER}", { prefix: "X", sequence: 1, now })).toBe("3");
        expect((0, numbering_pattern_1.renderNumberPattern)("{YYYYMMDD}", { prefix: "X", sequence: 1, now })).toBe("20260724");
    });
    it("token custom (mis. {COMPANY_CODE}) diambil dari variables", () => {
        const result = (0, numbering_pattern_1.renderNumberPattern)("{PREFIX}/{COMPANY_CODE}/{SEQ:2}", {
            prefix: "PQ",
            sequence: 4,
            now,
            variables: { COMPANY_CODE: "PT-ABC" },
        });
        expect(result).toBe("PQ/PT-ABC/04");
    });
    it("token tidak dikenal dan tidak ada di variables -> throw eksplisit (bukan diam-diam biarkan literal {TOKEN})", () => {
        expect(() => (0, numbering_pattern_1.renderNumberPattern)("{PREFIX}/{SITE_CODE}/{SEQ:4}", { prefix: "X", sequence: 1, now })).toThrow(/\{SITE_CODE\}/);
    });
});
