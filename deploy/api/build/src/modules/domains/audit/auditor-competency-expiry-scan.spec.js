"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auditor_competency_expiry_scan_1 = require("./auditor-competency-expiry-scan");
const now = new Date("2026-07-25T00:00:00.000Z");
describe("findExpiredCompetencyRecords", () => {
    it("kembalikan record ACTIVE yang expiryDate sudah lewat", () => {
        const result = (0, auditor_competency_expiry_scan_1.findExpiredCompetencyRecords)([{ competencyRecordId: "c1", status: "ACTIVE", expiryDate: new Date("2026-07-01") }], now);
        expect(result).toHaveLength(1);
    });
    it("kecualikan record yang sudah EXPIRED/REVOKED (idempotent)", () => {
        const result = (0, auditor_competency_expiry_scan_1.findExpiredCompetencyRecords)([
            { competencyRecordId: "c1", status: "EXPIRED", expiryDate: new Date("2026-07-01") },
            { competencyRecordId: "c2", status: "REVOKED", expiryDate: new Date("2026-07-01") },
        ], now);
        expect(result).toHaveLength(0);
    });
    it("kecualikan record dengan expiryDate belum lewat", () => {
        const result = (0, auditor_competency_expiry_scan_1.findExpiredCompetencyRecords)([{ competencyRecordId: "c1", status: "ACTIVE", expiryDate: new Date("2026-08-25") }], now);
        expect(result).toHaveLength(0);
    });
    it("kecualikan record dengan expiryDate null (tanpa tenggat)", () => {
        const result = (0, auditor_competency_expiry_scan_1.findExpiredCompetencyRecords)([{ competencyRecordId: "c1", status: "ACTIVE", expiryDate: null }], now);
        expect(result).toHaveLength(0);
    });
});
describe("findCompetencyRecordsApproachingExpiry", () => {
    it("kembalikan record ACTIVE dalam jendela 30 hari", () => {
        const result = (0, auditor_competency_expiry_scan_1.findCompetencyRecordsApproachingExpiry)([{ competencyRecordId: "c1", status: "ACTIVE", expiryDate: new Date("2026-08-10") }], now);
        expect(result).toHaveLength(1);
    });
    it("kecualikan record di luar jendela 30 hari", () => {
        const result = (0, auditor_competency_expiry_scan_1.findCompetencyRecordsApproachingExpiry)([{ competencyRecordId: "c1", status: "ACTIVE", expiryDate: new Date("2026-12-01") }], now);
        expect(result).toHaveLength(0);
    });
    it("kecualikan record yang sudah lewat expiry (sudah masuk findExpiredCompetencyRecords, bukan di sini)", () => {
        const result = (0, auditor_competency_expiry_scan_1.findCompetencyRecordsApproachingExpiry)([{ competencyRecordId: "c1", status: "ACTIVE", expiryDate: new Date("2026-07-01") }], now);
        expect(result).toHaveLength(0);
    });
});
